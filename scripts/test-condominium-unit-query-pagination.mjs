import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadCondominiumUnitRows } from "../src/lib/condominiumUnitRows.js";

const pageSize = 1000;
const firstPage = Array.from({ length: pageSize }, (_, index) => ({
  id: `unit-${String(index).padStart(4, "0")}`,
  unit_code: String(index + 1),
}));
const secondPage = [{ id: "unit-after-limit", unit_code: "A-1001" }];

function createMockClient(pages, errorAtOffset = null) {
  const calls = { ranges: [], orders: [], filters: [] };
  const client = {
    from(table) {
      assert.equal(table, "condominium_units");
      return {
        select(columns) {
          return {
            eq(column, value) {
              calls.filters.push({ column, value });
              return this;
            },
            order(column, options) {
              calls.orders.push({ column, options });
              return this;
            },
            range(from, to) {
              calls.ranges.push({ from, to });
              if (from === errorAtOffset) return Promise.resolve({ data: null, error: new Error("second page failed") });
              return Promise.resolve({ data: pages[from / pageSize] ?? [], error: null });
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

// Unit 1001 is beyond Supabase's default 1,000-row response limit and must still be loaded.
{
  const { client, calls } = createMockClient([firstPage, secondPage]);
  const rows = await loadCondominiumUnitRows(client, "condo-1", "id, unit_code", "workspace-1");
  assert.equal(rows.length, 1001);
  assert.deepEqual(rows.at(-1), secondPage[0]);
  assert.deepEqual(calls.ranges, [{ from: 0, to: 999 }, { from: 1000, to: 1999 }]);
  assert.equal(calls.orders.length, 2);
  assert.ok(calls.orders.every((order) => order.column === "id" && order.options.ascending === true));
  assert.equal(calls.filters.filter((filter) => filter.column === "condominium_id" && filter.value === "condo-1").length, 2);
  assert.equal(calls.filters.filter((filter) => filter.column === "workspace_id" && filter.value === "workspace-1").length, 2);
}

// A failure in a later page must not silently return a truncated unit list.
{
  const { client, calls } = createMockClient([firstPage], 1000);
  await assert.rejects(loadCondominiumUnitRows(client, "condo-1", "id, unit_code"), /second page failed/);
  assert.deepEqual(calls.ranges, [{ from: 0, to: 999 }, { from: 1000, to: 1999 }]);
}

// Save/edit/member-delete flows must use the shared paginated lookup instead of direct capped queries.
{
  const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(backend, /import\s*\{\s*loadCondominiumUnitRows\s*\}\s*from\s*["']\.\/condominiumUnitRows["']/);
  const declarations = [...backend.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g)];
  function extractExportedFunction(name) {
    const index = declarations.findIndex((match) => match[1] === name);
    assert.notEqual(index, -1, `missing exported function ${name}`);
    const start = declarations[index].index;
    const end = index + 1 < declarations.length ? declarations[index + 1].index : backend.length;
    return backend.slice(start, end);
  }
  for (const name of ["saveCondominiumUnit", "saveCondominiumMember", "deleteCondominiumMember"]) {
    const body = extractExportedFunction(name);
    assert.match(body, /loadCondominiumUnitRows\s*\(/, `${name} must use paginated unit lookup`);
    assert.doesNotMatch(body, /\.from\(["']condominium_units["']\)/, `${name} must not contain a capped direct unit query`);
  }
  assert.match(pkg.scripts.test, /test-condominium-unit-query-pagination\.mjs/, "regression test must be integrated into npm test");
}

console.log("PASS condominium-unit query pagination: row 1001 is retrieved, stable page ordering, workspace scope, later-page errors, and three production callers wired.");
