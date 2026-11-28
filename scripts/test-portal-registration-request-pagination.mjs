import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadPortalRegistrationRequests } from "../src/lib/portalRegistrationRequestPagination.ts";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("const loadRegistrationRequests = async () => {");
const end = source.indexOf("void loadRegistrationRequests();", start);
assert.ok(start >= 0 && end > start, "registration-request loading effect must exist");
const effect = source.slice(start, end);
assert.match(effect, /loadPortalRegistrationRequests\(supabase, profile\.workspaceId\)/, "admin registration request list must use the paginated loader");
assert.doesNotMatch(effect, /supabase\s*\.from\("portal_registration_requests"\)/, "effect must not retain unpaginated direct list queries");
assert.ok(packageJson.scripts.test.includes("test-portal-registration-request-pagination.mjs"), "regression test must run via npm test");

function compareIds(left, right) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortByCreatedAt(rows) {
  return rows.slice().sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || "")) ||
    compareIds(a.id, b.id)
  );
}

function mockClient({
  assignedRows = [],
  unassignedRows = [],
  insertBeforeAssignedPage = null,
  insertRows = [],
  deleteBeforeAssignedPage = null,
  deleteIds = [],
  failAssignedPage = null,
  invalidAssignedPage = null,
} = {}) {
  const records = { assigned: assignedRows.slice(), unassigned: unassignedRows.slice() };
  const requests = [];
  const pageNumbers = { assigned: 0, unassigned: 0 };
  const client = {
    from(table) {
      const state = { table, workspace: undefined, statuses: undefined, orders: [], idCursor: null };
      const kind = () => state.workspace === null ? "unassigned" : "assigned";
      const query = {
        select() { return query; },
        eq(column, value) { if (column === "workspace_id") state.workspace = value; return query; },
        is(column, value) { if (column === "workspace_id") state.workspace = value; return query; },
        in(column, value) { if (column === "status") state.statuses = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        gt(column, value) { if (column === "id") state.idCursor = value; return query; },
        range(from, to) {
          const requestKind = kind();
          const pageNumber = ++pageNumbers[requestKind];
          if (requestKind === "assigned" && pageNumber === insertBeforeAssignedPage) {
            records.assigned.push(...insertRows);
          }
          if (requestKind === "assigned" && pageNumber === deleteBeforeAssignedPage) {
            for (const id of deleteIds) {
              const index = records.assigned.findIndex((row) => row.id === id);
              if (index >= 0) records.assigned.splice(index, 1);
            }
          }
          requests.push({
            table,
            workspace: state.workspace,
            statuses: state.statuses,
            orders: state.orders.slice(),
            cursor: state.idCursor,
            from,
            to,
            kind: requestKind,
            pageNumber,
          });
          if (requestKind === "assigned" && pageNumber === failAssignedPage) {
            return Promise.resolve({ data: null, error: new Error("page failed") });
          }
          if (requestKind === "assigned" && pageNumber === invalidAssignedPage) {
            return Promise.resolve({ data: null, error: null });
          }

          const rows = records[requestKind]
            .filter((row) => state.statuses?.includes(row.status))
            .filter((row) => state.idCursor === null || compareIds(row.id, state.idCursor) > 0)
            .sort((a, b) => compareIds(a.id, b.id));
          return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
        },
      };
      return query;
    },
  };
  return { client, requests, records };
}

// Reproduce the former offset implementation, including a mutation between pages.
async function loadLegacyOffsetRows(initialRows, { insertBeforePage = null, inserts = [], deleteBeforePage = null, deleteIds = [] } = {}) {
  const records = initialRows.slice();
  const rows = [];
  for (let offset = 0, pageNumber = 1; ; offset += 1000, pageNumber += 1) {
    if (pageNumber === insertBeforePage) records.push(...inserts);
    if (pageNumber === deleteBeforePage) {
      for (const id of deleteIds) {
        const index = records.findIndex((row) => row.id === id);
        if (index >= 0) records.splice(index, 1);
      }
    }
    const page = sortByCreatedAt(records).slice(offset, offset + 1000);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const firstAssigned = Array.from({ length: 1000 }, (_, index) => ({
  id: `assigned-${String(index).padStart(4, "0")}`,
  workspace_id: "workspace-1",
  status: "pending",
  created_at: "2026-11-01T00:00:00Z",
}));
const secondAssigned = [
  { id: "assigned-1000", workspace_id: "workspace-1", status: "pending", created_at: "2026-11-03T00:00:00Z" },
  { id: "assigned-1001", workspace_id: "workspace-1", status: "email_mismatch", created_at: "2026-11-03T00:00:00Z" },
];
const unassigned = [
  { id: "unassigned-0001", workspace_id: null, status: "pending", created_at: "2026-11-04T00:00:00Z" },
];
const { client, requests } = mockClient({
  assignedRows: [...firstAssigned, ...secondAssigned],
  unassignedRows: unassigned,
});
const rows = await loadPortalRegistrationRequests(client, "workspace-1");
assert.equal(rows.length, 1003, "assigned requests beyond the 1,000-row cap and unassigned requests must be retained");
assert.deepEqual(requests.filter((r) => r.kind === "assigned").map(({ from, to }) => [from, to]), [[0, 999], [0, 999]], "assigned requests must use bounded keyset pages");
assert.deepEqual(requests.filter((r) => r.kind === "unassigned").map(({ from, to }) => [from, to]), [[0, 999]], "unassigned requests must paginate independently");
const assignedPages = requests.filter((r) => r.kind === "assigned");
assert.equal(assignedPages[0].workspace, "workspace-1", "assigned requests must stay workspace-scoped");
assert.deepEqual(assignedPages[0].statuses, ["pending", "email_mismatch"], "only actionable statuses should load");
assert.deepEqual(assignedPages[0].orders, [["id", { ascending: true }]], "assigned pagination must use immutable ID ordering");
assert.equal(assignedPages[0].cursor, null);
assert.equal(assignedPages[1].cursor, "assigned-0999", "the next page must continue strictly after the last ID");
const unassignedFirst = requests.find((r) => r.kind === "unassigned");
assert.equal(unassignedFirst.workspace, null, "unassigned query must preserve its null-workspace scope");
assert.deepEqual(unassignedFirst.orders, [["id", { ascending: true }]], "unassigned pagination must use immutable ID ordering");
assert.equal(rows[0].id, "unassigned-0001", "combined requests must remain newest first");
assert.equal(rows[1].id, "assigned-1000", "newer assigned requests must precede older ones");
assert.equal(rows[2].id, "assigned-1001", "equal timestamps must have deterministic ID ordering");

// Reproduce the old offset drift: a new request inserted before page two duplicates an already-read row.
const originalRows = Array.from({ length: 1001 }, (_, index) => ({
  id: `assigned-${String(index).padStart(4, "0")}`,
  workspace_id: "workspace-1",
  status: "pending",
  created_at: "2026-11-01T00:00:00Z",
}));
const concurrentInsert = {
  id: "assigned-0500a",
  workspace_id: "workspace-1",
  status: "pending",
  created_at: "2026-11-02T00:00:00Z",
};
const legacyInsertRows = await loadLegacyOffsetRows(originalRows, {
  insertBeforePage: 2,
  inserts: [concurrentInsert],
});
const legacyInsertIds = legacyInsertRows.map((row) => row.id);
assert.equal(legacyInsertIds.filter((id) => id === "assigned-0999").length, 2,
  "legacy offset paging must reproduce a duplicate after a new request shifts the prefix");

const keysetInsert = mockClient({
  assignedRows: originalRows,
  insertBeforeAssignedPage: 2,
  insertRows: [concurrentInsert],
});
const keysetInsertRows = await loadPortalRegistrationRequests(keysetInsert.client, "workspace-1");
const keysetInsertIds = keysetInsertRows.map((row) => row.id);
assert.equal(keysetInsertIds.length, originalRows.length,
  "keyset paging must preserve the original request set when a new request is inserted before the cursor");
assert.equal(new Set(keysetInsertIds).size, originalRows.length,
  "keyset paging must not duplicate original requests after concurrent insertion");
assert.ok(originalRows.every((row) => keysetInsertIds.filter((id) => id === row.id).length === 1));
assert.ok(!keysetInsertIds.includes(concurrentInsert.id),
  "an insert behind the immutable cursor is deferred to the next refresh rather than shifting existing pages");

// Reproduce the old offset omission after a request is removed from the first page.
const legacyDeleteRows = await loadLegacyOffsetRows(originalRows, {
  deleteBeforePage: 2,
  deleteIds: ["assigned-0000"],
});
assert.ok(!legacyDeleteRows.some((row) => row.id === "assigned-1000"),
  "legacy offset paging must reproduce an omitted request after a prior row is removed");
const keysetDelete = mockClient({
  assignedRows: originalRows,
  deleteBeforeAssignedPage: 2,
  deleteIds: ["assigned-0000"],
});
const keysetDeleteRows = await loadPortalRegistrationRequests(keysetDelete.client, "workspace-1");
const keysetDeleteIds = keysetDeleteRows.map((row) => row.id);
assert.equal(keysetDeleteIds.length, originalRows.length,
  "keyset paging must preserve the already-read page and still reach the final unread request after deletion");
assert.equal(new Set(keysetDeleteIds).size, originalRows.length);
assert.ok(keysetDeleteIds.includes("assigned-1000"));

// A failed later page must reject instead of silently omitting requests.
const failing = mockClient({
  assignedRows: [...firstAssigned, ...secondAssigned],
  unassignedRows: unassigned,
  failAssignedPage: 2,
});
await assert.rejects(
  loadPortalRegistrationRequests(failing.client, "workspace-1"),
  /page failed/,
  "a failed later page must reject instead of silently omitting requests",
);

// A successful SELECT must return an array; null data is not an empty result.
const malformed = mockClient({
  assignedRows: firstAssigned,
  invalidAssignedPage: 1,
});
await assert.rejects(
  loadPortalRegistrationRequests(malformed.client, "workspace-1"),
  /Pagina richieste portale non valida/,
  "a malformed successful page must fail closed",
);

console.log("Portal-registration request keyset pagination and concurrent-mutation regressions passed.");
