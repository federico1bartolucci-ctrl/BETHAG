import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  loadExistingCondominiumUnits,
  requireCondominiumUnitRenameResult,
} from "../src/lib/condominiumUnitGeneration.mjs";

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, columns: null, filters: [], orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({
            table,
            columns: state.columns,
            filters: state.filters.slice(),
            orders: state.orders.slice(),
            from,
            to,
          });
          if (from === errorOffset) {
            return Promise.resolve({ data: null, error: new Error("later unit page failed") });
          }
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `unit-${index + 1}`,
  unit_code: index === 999 ? "Interno 1000" : String(index + 1),
  data: { unitCode: index === 999 ? "Interno 1000" : String(index + 1) },
}));
const secondPage = [{
  id: "unit-1001",
  unit_code: "Interno 1001",
  data: { unitCode: "Interno 1001", millesimi: 75 },
}];
const paged = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const rows = await loadExistingCondominiumUnits(paged.client, "condominium-1", "workspace-1");
assert.equal(rows.length, 1001, "unit generation must read rows beyond the first 1,000");
assert.equal(rows[1000].id, "unit-1001");
assert.deepEqual(
  paged.requests.map(({ from, to }) => [from, to]),
  [[0, 999], [1000, 1999]],
  "unit generation must read deterministic consecutive pages",
);
assert.equal(paged.requests[0].table, "condominium_units");
assert.equal(paged.requests[0].columns, "id, unit_code, data");
assert.deepEqual(
  paged.requests[0].filters,
  [["condominium_id", "condominium-1"], ["workspace_id", "workspace-1"]],
  "unit lookup must remain scoped to the condominium and workspace",
);
assert.deepEqual(paged.requests[0].orders, [["id", { ascending: true }]]);

const pageFailure = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadExistingCondominiumUnits(pageFailure.client, "condominium-1", "workspace-1"),
  /later unit page failed/,
  "a later-page error must abort unit generation rather than accept a partial snapshot",
);
const empty = mockClient(new Map());
assert.deepEqual(await loadExistingCondominiumUnits(empty.client, "", "workspace-1"), []);
assert.equal(empty.requests.length, 0);

function mockUpdate(result) {
  const calls = { selected: null, maybeSingle: 0 };
  const query = {
    select(columns) { calls.selected = columns; return query; },
    async maybeSingle() { calls.maybeSingle += 1; return result; },
  };
  return { query, calls };
}
const success = mockUpdate({ data: { id: "legacy-unit-7" }, error: null });
assert.deepEqual(
  await requireCondominiumUnitRenameResult(success.query, "legacy-unit-7", "7"),
  { id: "legacy-unit-7" },
);
assert.deepEqual(success.calls, { selected: "id", maybeSingle: 1 });

const zeroRows = mockUpdate({ data: null, error: null });
await assert.rejects(
  requireCondominiumUnitRenameResult(zeroRows.query, "legacy-unit-7", "7"),
  /condominio è stato salvato.*unità legacy 7 non è stata rinominata/i,
);

const wrongRow = mockUpdate({ data: { id: "another-unit" }, error: null });
await assert.rejects(
  requireCondominiumUnitRenameResult(wrongRow.query, "legacy-unit-7", "7"),
  /non è stata rinominata/i,
);

const dbError = new Error("RLS or network failure");
const failedUpdate = mockUpdate({ data: null, error: dbError });
await assert.rejects(
  requireCondominiumUnitRenameResult(failedUpdate.query, "legacy-unit-7", "7"),
  error => error === dbError,
);

const backendSource = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = backendSource.indexOf("export async function saveCondominium(");
const end = backendSource.indexOf("\nexport async function archiveCondominium(", start);
assert.ok(start >= 0 && end > start, "saveCondominium boundaries must exist");
const body = backendSource.slice(start, end);
assert.match(body, /loadExistingCondominiumUnits\(\s*supabase,\s*condominiumDbId,\s*activeWorkspaceId/);
const legacyStart = body.indexOf("if (legacy) {");
const insertStart = body.indexOf("const { error: insertError }", legacyStart);
assert.ok(legacyStart >= 0 && insertStart > legacyStart, "legacy unit rename branch must exist");
const legacyBranch = body.slice(legacyStart, insertStart);
assert.match(legacyBranch, /\.eq\("id", legacy\.id\)/);
assert.match(legacyBranch, /\.eq\("condominium_id", condominiumDbId\)/);
assert.match(legacyBranch, /\.eq\("workspace_id", activeWorkspaceId\)/);
assert.match(legacyBranch, /requireCondominiumUnitRenameResult\([\s\S]*legacy\.id,[\s\S]*code/);
assert.ok(
  legacyBranch.indexOf("requireCondominiumUnitRenameResult") < legacyBranch.indexOf("continue;"),
  "the legacy rename must be verified before continuing",
);
assert.ok(
  packageJson.scripts.test.includes("test-condominium-unit-legacy-rename-zero-row.mjs"),
  "runtime regression must be wired into npm test",
);
console.log("Condominium unit pagination and legacy-rename zero-row runtime regression: PASS");
