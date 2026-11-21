import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadCondominiumUnitsForRiparto } from "../src/lib/condominiumUnitRipartoPagination.ts";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf('if (document.aiDocumentType === "Riparto spese"');
const end = source.indexOf('if (document.aiDocumentType === "Fattura"', start);
assert.ok(start >= 0 && end > start, "AI riparto confirmation branch must exist");
const branch = source.slice(start, end);
assert.match(branch, /loadCondominiumUnitsForRiparto\(supabase, workspaceId, condominium\.id\)/, "AI riparto must use paginated unit lookup");
assert.doesNotMatch(branch, /\.from\("condominium_units"\)/, "AI riparto branch must not use a direct unpaginated unit lookup");
assert.ok(packageJson.scripts.test.includes("test-ai-riparto-unit-pagination.mjs"), "regression test must run through npm test");

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
          requests.push({ ...state, filters: state.filters.slice(), orders: state.orders.slice(), from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `unit-${index}`, unit_code: `U${String(index + 1).padStart(4, "0")}`, data: {},
}));
const secondPage = [
  { id: "unit-1000", unit_code: "U1001", data: {} },
  { id: "unit-1001", unit_code: "U1002", data: {} },
];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const rows = await loadCondominiumUnitsForRiparto(client, "workspace-1", "condominium-1");
assert.equal(rows.length, 1002, "units beyond the PostgREST 1,000-row cap must be retained");
assert.equal(rows.at(-1).unit_code, "U1002", "late units must be present for AI riparto matching");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "unit lookup must paginate in 1,000-row windows");
assert.equal(requests[0].table, "condominium_units");
assert.equal(requests[0].columns, "id,unit_code,data");
assert.deepEqual(requests[0].filters, [["workspace_id", "workspace-1"], ["condominium_id", "condominium-1"]], "lookup must preserve workspace and condominium scope");
assert.deepEqual(requests[0].orders, [["unit_code", { ascending: true }], ["id", { ascending: true }]], "pagination must use stable ordering");

const failing = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadCondominiumUnitsForRiparto(failing.client, "workspace-1", "condominium-1"),
  /page failed/,
  "a failed later page must reject instead of producing a partial unit list",
);
const missing = mockClient(new Map());
assert.deepEqual(await loadCondominiumUnitsForRiparto(missing.client, "", "condominium-1"), [], "missing workspace must avoid queries");
assert.equal(missing.requests.length, 0);
console.log("AI riparto condominium-unit pagination regression checks passed.");
