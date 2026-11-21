import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadPaginatedWorkspaceRows } from "../src/lib/paginatedWorkspaceRows.ts";

const source = await readFile("src/main.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const start = source.indexOf("const exportWorkspaceBackup = async () => {");
const end = source.indexOf("/* =========================================================\n     CONDOMINI", start);
assert.ok(start >= 0 && end > start, "workspace backup export must exist");
const exportFn = source.slice(start, end);
assert.match(exportFn, /const orderBy = table === "workspace_members" \? "user_id" : "id"/, "backup pagination must use workspace_members composite-key order");
assert.match(exportFn, /loadPaginatedWorkspaceRows\(supabase, profile\.workspaceId, table, orderBy, null\)/, "backup export must paginate all tables");
assert.doesNotMatch(exportFn, /\.from\(table\)\.select\("\*")\.eq("workspace_id", profile\.workspaceId)/, "backup must not use a single unpaginated query");
assert.ok(packageJson.scripts.test.includes("test-workspace-backup-pagination.mjs"), "backup pagination regression test must run via npm test");

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, filters: [], orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, from, to });
          if (from === errorOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
const nextPage = [{ id: "1000" }, { id: "1001" }];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, nextPage]]));
const exportedRows = await loadPaginatedWorkspaceRows(client, "workspace-1", "condominium_ledger_entries", "id", null);
assert.equal(exportedRows.length, 1002, "backup pagination must retain rows beyond PostgREST's first page");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.deepEqual(requests[0].orders, [["id", { ascending: true }]], "id ordering must be stable for backup tables");

const memberMock = mockClient(new Map([[0, [{ user_id: "member-1" }]]]));
await loadPaginatedWorkspaceRows(memberMock.client, "workspace-1", "workspace_members", "user_id", null);
assert.deepEqual(memberMock.requests[0].orders, [["user_id", { ascending: true }]], "workspace_members must order by its composite key without a nonexistent id");

const failingMock = mockClient(new Map([[0, firstPage]]), 1000);
await assert.rejects(
  loadPaginatedWorkspaceRows(failingMock.client, "workspace-1", "documents", "id", null),
  /page failed/,
  "a failed page must reject rather than create a partial backup"
);
console.log("Workspace-backup pagination regression checks passed.");
