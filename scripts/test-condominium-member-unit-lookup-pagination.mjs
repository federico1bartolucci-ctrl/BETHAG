import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadCondominiumUnitsForLookup } from "../src/lib/condominiumUnitLookupPagination.ts";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("export async function saveCondominiumMember(");
const end = source.indexOf("\nexport async function ", start + 1);
assert.ok(start >= 0 && end > start, "saveCondominiumMember function must exist");
const section = source.slice(start, end);
assert.match(section, /loadCondominiumUnitsForLookup\(supabase, condominium\.id\)/, "member save must use the paginated unit lookup");
assert.doesNotMatch(section, /\.from\("condominium_units"\)\s*\.select\("id, unit_code, data"\)\s*\.eq\("condominium_id", condominium\.id\)/, "member save must not retain the capped unit lookup");
assert.ok(packageJson.scripts.test.includes("test-condominium-member-unit-lookup-pagination.mjs"), "regression test must be wired into npm test");

const unitSaveStart = source.indexOf("export async function saveCondominiumUnit(");
const unitSaveEnd = source.indexOf("\nexport async function ", unitSaveStart + 1);
assert.ok(unitSaveStart >= 0 && unitSaveEnd > unitSaveStart, "saveCondominiumUnit function must exist");
const unitSaveSection = source.slice(unitSaveStart, unitSaveEnd);
assert.match(unitSaveSection, /loadCondominiumUnitsForLookup\(supabase, condominium\.id\)/, "unit save must use the paginated existing-unit lookup");
assert.doesNotMatch(unitSaveSection, /\.from\("condominium_units"\)\s*\.select\("id, unit_code, building_code, lifecycle_status"\)\s*\.eq\("condominium_id", condominium\.id\)/, "unit save must not retain the capped existing-unit lookup");

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
          requests.push({ table, columns: state.columns, filters: state.filters.slice(), orders: state.orders.slice(), from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("later page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `unit-${index}`,
  unit_code: `Unit ${String(index + 1).padStart(4, "0")}`,
  building_code: "A",
  lifecycle_status: "Attiva",
}));
const secondPage = [
  { id: "unit-1000", unit_code: "Unit 1001", building_code: "A", lifecycle_status: "Attiva" },
  { id: "unit-1001", unit_code: "Unit 1002", building_code: "A", lifecycle_status: "Attiva" },
];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const rows = await loadCondominiumUnitsForLookup(client, "condominium-1");
assert.equal(rows.length, 1002, "unit rows beyond the 1,000-row cap must be retained");
assert.equal(
  rows.find((unit) => String(unit.unit_code).trim().toLowerCase() === "unit 1001")?.id,
  "unit-1000",
  "an existing unit after the cap must be found for member association",
);
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "unit lookup must request subsequent pages");
assert.equal(requests[0].table, "condominium_units");
assert.equal(requests[0].columns, "id, unit_code, building_code, lifecycle_status");
assert.deepEqual(requests[0].filters, [["condominium_id", "condominium-1"]], "lookup must preserve condominium scope");
assert.deepEqual(requests[0].orders, [["unit_code", { ascending: true }], ["id", { ascending: true }]], "pagination must use stable ordering");

const failing = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadCondominiumUnitsForLookup(failing.client, "condominium-1"),
  /later page failed/,
  "failed later page must not silently return partial units",
);
const empty = mockClient(new Map());
assert.deepEqual(await loadCondominiumUnitsForLookup(empty.client, ""), [], "missing condominium must avoid queries");
assert.equal(empty.requests.length, 0);
console.log("Condominium member unit lookup pagination regression checks passed.");
