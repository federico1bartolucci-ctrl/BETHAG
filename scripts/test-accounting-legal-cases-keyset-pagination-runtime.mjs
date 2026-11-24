import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAccountingLegalCases } from "../src/lib/accountingLegalCasesPagination.mjs";

function sortRows(rows) {
  return rows.sort((a, b) => {
    if (a.opened_date === null && b.opened_date !== null) return 1;
    if (a.opened_date !== null && b.opened_date === null) return -1;
    if (a.opened_date !== null && b.opened_date !== null) {
      const dateCompare = b.opened_date.localeCompare(a.opened_date);
      if (dateCompare) return dateCompare;
    }
    return a.id.localeCompare(b.id);
  });
}
function mockClient(initialRows, { injectBeforePage = 2, inserts = [], deleteBeforePage = null, deleteIds = [], failPage = null } = {}) {
  const records = initialRows.slice();
  const requests = [];
  let pageNumber = 0;
  const client = {
    from(table) {
      const state = { table, filters: [], orders: [], cursorOr: null, nullDate: false, gtId: null };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        or(filter) { state.cursorOr = filter; return query; },
        is(column, value) { if (column === "opened_date" && value === null) state.nullDate = true; return query; },
        gt(column, value) { if (column === "id") state.gtId = value; return query; },
        range(from, to) {
          pageNumber += 1;
          requests.push({ ...state, filters: state.filters.slice(), orders: state.orders.slice(), from, to, pageNumber });
          if (pageNumber === injectBeforePage) records.push(...inserts);
          if (pageNumber === deleteBeforePage) {
            for (const id of deleteIds) { const index = records.findIndex(row => row.id === id); if (index >= 0) records.splice(index, 1); }
          }
          if (pageNumber === failPage) return Promise.resolve({ data: null, error: new Error("legal-case page failure") });
          const workspaceId = state.filters.find(([col]) => col === "workspace_id")?.[1];
          let filtered = records.filter(row => row.workspace_id === workspaceId);
          if (state.nullDate) filtered = filtered.filter(row => row.opened_date === null && row.id > state.gtId);
          if (state.cursorOr) {
            const match = state.cursorOr.match(/^opened_date\.lt\.(\d{4}-\d{2}-\d{2}),and\(opened_date\.eq\.(\d{4}-\d{2}-\d{2}),id\.gt\.(.+)\),opened_date\.is\.null$/);
            assert.ok(match, "PostgREST cursor filter should use opened_date and id");
            const [, lessThanDate, equalDate, greaterId] = match;
            filtered = filtered.filter(row => row.opened_date === null || row.opened_date < lessThanDate || (row.opened_date === equalDate && row.id > greaterId));
          }
          const sorted = sortRows(filtered);
          return Promise.resolve({ data: sorted.slice(from, to + 1), error: null });
        },
      };
      return query;
    },
  };
  return { client, records, requests };
}

// Reproduce legacy offset pagination: concurrent inserts ahead of the page
// boundary shift page two, returning duplicate rows.
const original = Array.from({ length: 1001 }, (_, i) => ({
  id: `case-${String(i).padStart(4, "0")}`,
  workspace_id: "workspace-1",
  opened_date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
}));
const concurrentInserts = [
  { id: "new-0001", workspace_id: "workspace-1", opened_date: "2030-01-01" },
  { id: "new-0002", workspace_id: "workspace-1", opened_date: "2030-01-02" },
];
const foreign = [{ id: "foreign-1", workspace_id: "workspace-2", opened_date: "2030-01-03" }];
const legacy = mockClient([...original, ...foreign], { injectBeforePage: 2, inserts: concurrentInserts });
const legacyRows = [];
let offset = 0;
for (;;) {
  const { data, error } = await legacy.client.from("condominium_legal_cases").select("*").eq("workspace_id", "workspace-1").order("opened_date", { ascending: false }).order("id", { ascending: true }).range(offset, offset + 999);
  assert.equal(error, null);
  legacyRows.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
const legacyIds = legacyRows.map(row => row.id);
assert.ok(legacyIds.length > original.length, "legacy offset pagination reproduces duplicate rows after concurrent inserts");
assert.ok(new Set(legacyIds).size < legacyIds.length, "legacy offset pagination duplicates rows after concurrent inserts");

// Reproduce omission after concurrent deletions ahead of the page boundary.
const largerOriginal = Array.from({ length: 2001 }, (_, i) => ({
  id: `case-${String(i).padStart(4, "0")}`,
  workspace_id: "workspace-1",
  opened_date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10),
}));
const deletedAhead = ["case-1002", "case-1001"];
const legacyDelete = mockClient(largerOriginal, { deleteBeforePage: 2, deleteIds: deletedAhead });
const legacyDeleteRows = [];
let deleteOffset = 0;
for (;;) {
  const { data, error } = await legacyDelete.client.from("condominium_legal_cases").select("*").eq("workspace_id", "workspace-1").order("opened_date", { ascending: false }).order("id", { ascending: true }).range(deleteOffset, deleteOffset + 999);
  assert.equal(error, null);
  legacyDeleteRows.push(...data);
  if (data.length < 1000) break;
  deleteOffset += 1000;
}
const legacyDeleteIds = new Set(legacyDeleteRows.map(row => row.id));
assert.ok(["case-1000", "case-0999"].some(id => !legacyDeleteIds.has(id)), "legacy offset pagination omits rows after concurrent deletes ahead of the offset");

// Keyset pagination retains the already-fetched first page and continues without skipping later rows after deletes.
const keysetDelete = mockClient(largerOriginal, { deleteBeforePage: 2, deleteIds: deletedAhead });
const deleteResult = await loadAccountingLegalCases(keysetDelete.client, "workspace-1", 1000);
assert.equal(deleteResult.error, null);
assert.equal(deleteResult.data.length, largerOriginal.length, "keyset pagination must not skip rows after concurrent deletes");
assert.equal(new Set(deleteResult.data.map(row => row.id)).size, largerOriginal.length, "keyset pagination must not duplicate rows after concurrent deletes");
assert.deepEqual(new Set(deleteResult.data.map(row => row.id)), new Set(largerOriginal.map(row => row.id)), "keyset paging must preserve the fetched first page and all remaining rows");


// Keyset paging excludes rows inserted before the cursor and preserves all originals.
const keyset = mockClient([...original, ...foreign], { injectBeforePage: 2, inserts: concurrentInserts });
const result = await loadAccountingLegalCases(keyset.client, "workspace-1", 1000);
assert.equal(result.error, null);
assert.equal(result.data.length, original.length, "concurrent inserts before cursor must not change original-row coverage");
assert.equal(new Set(result.data.map(row => row.id)).size, result.data.length, "keyset pagination must not duplicate rows");
assert.deepEqual(new Set(result.data.map(row => row.id)), new Set(original.map(row => row.id)), "all original rows must be returned exactly once");
assert.ok(keyset.requests.every(request => request.from === 0 && request.to === 999), "cursor pagination must request fixed page ranges");
assert.deepEqual(keyset.requests.map(request => request.filters), [[["workspace_id", "workspace-1"]], [[ "workspace_id", "workspace-1" ]]], "workspace scope must remain on every page");
assert.deepEqual(keyset.requests[0].orders, [["opened_date", { ascending: false, nullsFirst: false }], ["id", { ascending: true }]], "cursor order must be explicit and deterministic");
assert.ok(keyset.requests[1].cursorOr, "subsequent date pages must use a cursor filter");

// NULL dates sort last; an all-NULL dataset continues by ID.
const nullRows = Array.from({ length: 1001 }, (_, i) => ({ id: `null-${String(i).padStart(4, "0")}`, workspace_id: "workspace-1", opened_date: null }));
const nullClient = mockClient(nullRows, { injectBeforePage: 2, inserts: [{ id: "null-0500-new", workspace_id: "workspace-1", opened_date: null }] });
const nullResult = await loadAccountingLegalCases(nullClient.client, "workspace-1", 1000);
assert.equal(nullResult.error, null);
assert.equal(nullResult.data.length, nullRows.length);
assert.equal(new Set(nullResult.data.map(row => row.id)).size, nullRows.length);
assert.ok(nullClient.requests[1].nullDate && nullClient.requests[1].gtId, "null-date cursor must use opened_date IS NULL and ID > last ID");

// A full non-null page must transition into trailing NULL-date records.
const mixedRows = Array.from({ length: 1000 }, (_, i) => ({ id: "dated-" + String(i).padStart(4, "0"), workspace_id: "workspace-1", opened_date: new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10) })).concat(Array.from({ length: 5 }, (_, i) => ({ id: "null-tail-" + i, workspace_id: "workspace-1", opened_date: null })));
const mixedClient = mockClient(mixedRows);
const mixedResult = await loadAccountingLegalCases(mixedClient.client, "workspace-1", 1000);
assert.equal(mixedResult.error, null);
assert.equal(mixedResult.data.length, mixedRows.length, "non-null pages must transition to trailing NULL dates");
assert.deepEqual(new Set(mixedResult.data.map(row => row.id)), new Set(mixedRows.map(row => row.id)), "all trailing NULL rows must be included exactly once");
assert.ok(mixedClient.requests[1].cursorOr.includes("opened_date.is.null"), "date cursor must include the trailing NULL group");

// Any later-page error aborts and discards partial results.
const failing = mockClient(original, { failPage: 2 });
const failed = await loadAccountingLegalCases(failing.client, "workspace-1", 1000);
assert.equal(failed.data, null);
assert.match(failed.error.message, /legal-case page failure/);
assert.equal(failing.requests.length, 2);

// Integration and npm test wiring must be present.
const source = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(source, /accountingLegalCasesPagination\.mjs/);
assert.match(source, /loadAccountingLegalCases\(supabase, workspaceId\)/);
assert.match(packageJson.scripts.test, /test-accounting-legal-cases-keyset-pagination-runtime\.mjs/);
console.log("Accounting legal cases concurrent-mutation keyset pagination runtime regression: PASS");
