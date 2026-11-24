import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAccountingCondominiumMembers } from "../src/lib/accountingCondominiumMembers.mjs";

const source = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const loadStart = source.indexOf("async function load()");
const loadEnd = source.indexOf("\n  useEffect(() => {", loadStart);
assert.ok(loadStart >= 0 && loadEnd > loadStart, "Accounting load function must exist");
const loadSection = source.slice(loadStart, loadEnd);
assert.match(source, /import \{ loadAccountingCondominiumMembers \} from ["']\.\/lib\/accountingCondominiumMembers\.mjs["']/);
assert.match(loadSection, /loadAccountingCondominiumMembers\(supabase, workspaceId\)/, "Accounting must use the scoped member loader");
assert.doesNotMatch(loadSection, /supabase\.from\(["']condominium_members["']\)/, "Accounting must not query members without workspace relation scope");
assert.ok(packageJson.scripts.test.includes("test-accounting-condominium-members-scope-pagination.mjs"), "runtime regression must be wired into npm test");

function mockClient(records, failOffset = null) {
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
          if (from === failOffset) return Promise.resolve({ data: null, error: new Error("member page failed") });
          const workspaceFilter = state.filters.find(([column]) => column === "condominiums.workspace_id")?.[1];
          const filtered = workspaceFilter === undefined
            ? records.slice()
            : records.filter(row => row.condominiums?.workspace_id === workspaceFilter);
          filtered.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)));
          return Promise.resolve({ data: filtered.slice(from, to + 1), error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const currentWorkspaceRows = Array.from({ length: 1001 }, (_, index) => ({
  id: "member-" + String(index).padStart(4, "0"),
  condominium_id: "condo-1",
  unit_id: "unit-" + String(index).padStart(4, "0"),
  active: true,
  name: "Member " + index,
  email: null,
  data: {},
  created_at: "2026-01-01T00:00:00Z",
  condominiums: { workspace_id: "workspace-1" },
}));
const foreignWorkspaceRows = [
  { id: "foreign-1", condominium_id: "condo-foreign", unit_id: "unit-foreign-1", active: true, name: "Foreign member", email: "foreign@example.invalid", data: {}, created_at: "2026-01-01T00:00:00Z", condominiums: { workspace_id: "workspace-2" } },
  { id: "foreign-2", condominium_id: "condo-foreign", unit_id: "unit-foreign-2", active: true, name: "Another foreign member", email: "foreign2@example.invalid", data: {}, created_at: "2026-01-02T00:00:00Z", condominiums: { workspace_id: "workspace-2" } },
];
const records = [...currentWorkspaceRows, ...foreignWorkspaceRows];

// Reproduce the old unscoped query: it can return another workspace's members.
const legacy = mockClient(records);
const legacyResult = await legacy.client.from("condominium_members").select("id, name, email, data").order("created_at", { ascending: true }).range(0, 999);
assert.ok(legacyResult.data.some(row => row.condominiums.workspace_id !== "workspace-1"), "unscoped query reproduces cross-workspace rows");

// Verify the corrected runtime query applies relation workspace scope and fetches every page.
const scoped = mockClient(records);
const result = await loadAccountingCondominiumMembers(scoped.client, "workspace-1");
assert.equal(result.data.length, 1001, "all scoped members beyond the 1,000-row cap must be returned");
assert.ok(result.data.every(row => row.condominiums.workspace_id === "workspace-1"), "foreign-workspace rows must not be returned");
assert.deepEqual(scoped.requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]], "query must paginate at 1,000 rows");
assert.deepEqual(scoped.requests.map(request => request.filters), [
  [["condominiums.workspace_id", "workspace-1"]],
  [["condominiums.workspace_id", "workspace-1"]],
], "workspace scope must be applied on every page");
assert.deepEqual(scoped.requests[0].orders, [
  ["created_at", { ascending: true }],
  ["id", { ascending: true }],
], "paging order must be stable");
assert.match(scoped.requests[0].columns, /condominiums!inner\(workspace_id\)/, "query must use the inner condominium workspace relation");

// A later page error must not yield a partial member snapshot.
const failing = mockClient(records, 1000);
await assert.rejects(
  loadAccountingCondominiumMembers(failing.client, "workspace-1"),
  /member page failed/,
  "later-page errors must abort hydration",
);
assert.equal(failing.requests.length, 2);

// Empty workspace and invalid arguments are handled safely.
const empty = mockClient([]);
assert.deepEqual(await loadAccountingCondominiumMembers(empty.client, "workspace-empty"), { data: [], error: null });
assert.equal(empty.requests.length, 1);
await assert.rejects(loadAccountingCondominiumMembers(scoped.client, ""), /Workspace non disponibile/);
await assert.rejects(loadAccountingCondominiumMembers(null, "workspace-1"), /Client Supabase non disponibile/);

console.log("Accounting condominium-members workspace-scope pagination runtime regression: PASS");
