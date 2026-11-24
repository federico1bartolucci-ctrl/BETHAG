import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadPortalRegistrationRequests } from "../src/lib/portalRegistrationRequestPagination.ts";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const start = source.indexOf("const loadRegistrationRequests = async () => {");
const end = source.indexOf("void loadRegistrationRequests();", start);
assert.ok(start >= 0 && end > start, "registration-request loading effect must exist");
const effect = source.slice(start, end);
assert.match(effect, /const workspaceId = profile\.workspaceId;/, "admin registration request list must capture the active workspace ID");
assert.match(effect, /loadPortalRegistrationRequests\(supabase, workspaceId\)/, "admin registration request list must use the paginated loader for the captured workspace");
assert.doesNotMatch(effect, /supabase\s*\.from\("portal_registration_requests"\)/, "effect must not retain unpaginated direct list queries");
assert.ok(packageJson.scripts.test.includes("test-portal-registration-request-pagination.mjs"), "regression test must run via npm test");

function mockClient(pages, errorOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, workspace: undefined, statuses: undefined, orders: [] };
      const kind = () => state.workspace === null ? "unassigned" : "assigned";
      const query = {
        select() { return query; },
        eq(column, value) { if (column === "workspace_id") state.workspace = value; return query; },
        is(column, value) { if (column === "workspace_id") state.workspace = value; return query; },
        in(column, value) { if (column === "status") state.statuses = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ table, workspace: state.workspace, statuses: state.statuses, orders: state.orders.slice(), from, to, kind: kind() });
          if (from === errorOffset && kind() === "assigned") return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(`${kind()}:${from}`) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstAssigned = Array.from({ length: 1000 }, (_, index) => ({
  id: `assigned-${index}`, workspace_id: "workspace-1", status: "pending", created_at: "2026-11-01T00:00:00Z",
}));
const secondAssigned = [
  { id: "assigned-late-1", workspace_id: "workspace-1", status: "pending", created_at: "2026-11-03T00:00:00Z" },
  { id: "assigned-late-2", workspace_id: "workspace-1", status: "email_mismatch", created_at: "2026-11-03T00:00:00Z" },
];
const unassigned = [
  { id: "unassigned-1", workspace_id: null, status: "pending", created_at: "2026-11-04T00:00:00Z" },
];
const pages = new Map([["assigned:0", firstAssigned], ["assigned:1000", secondAssigned], ["unassigned:0", unassigned]]);
const { client, requests } = mockClient(pages);
const rows = await loadPortalRegistrationRequests(client, "workspace-1");
assert.equal(rows.length, 1003, "assigned requests beyond the 1,000-row cap and unassigned requests must be retained");
assert.deepEqual(requests.filter(r => r.kind === "assigned").map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "assigned requests must paginate");
assert.deepEqual(requests.filter(r => r.kind === "unassigned").map(({ from, to }) => [from, to]), [[0, 999]], "unassigned requests must paginate independently");
const assignedFirst = requests.find(r => r.kind === "assigned" && r.from === 0);
assert.equal(assignedFirst.workspace, "workspace-1", "assigned requests must stay workspace-scoped");
assert.deepEqual(assignedFirst.statuses, ["pending", "email_mismatch"], "only actionable statuses should load");
assert.deepEqual(assignedFirst.orders, [["created_at", { ascending: false }], ["id", { ascending: true }]], "assigned page order must be stable");
const unassignedFirst = requests.find(r => r.kind === "unassigned" && r.from === 0);
assert.equal(unassignedFirst.workspace, null, "unassigned query must preserve its null-workspace scope");
assert.deepEqual(unassignedFirst.orders, [["created_at", { ascending: false }], ["id", { ascending: true }]], "unassigned page order must be stable");
assert.equal(rows[0].id, "unassigned-1", "combined requests must remain newest first");
assert.equal(rows[1].id, "assigned-late-1", "newer assigned requests must precede older ones");

const failing = mockClient(new Map([["assigned:0", firstAssigned], ["unassigned:0", unassigned]]), 1000);
await assert.rejects(
  loadPortalRegistrationRequests(failing.client, "workspace-1"),
  /page failed/,
  "a failed later page must reject instead of silently omitting requests",
);
console.log("Portal-registration request pagination regression checks passed.");
