import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceSuppliers } from "../src/lib/workspaceSupplierHydration.mjs";

function mockClient({ pages, errorPage = -1 } = {}) {
  const calls = [];
  let pageIndex = 0;
  const query = {
    select(columns) { calls.push(["select", columns]); return query; },
    eq(column, value) { calls.push(["eq", column, value]); return query; },
    order(column, options) { calls.push(["order", column, options]); return query; },
    range(start, end) {
      calls.push(["range", start, end]);
      const index = pageIndex++;
      if (index === errorPage) return Promise.resolve({ data: null, error: new Error("page failure") });
      return Promise.resolve({ data: pages[index] ?? [], error: null });
    },
  };
  return { client: { from(table) { calls.push(["from", table]); return query; } }, calls };
}

const firstPage = Array.from({ length: 1000 }, (_, id) => ({ id: String(id).padStart(4, "0"), name: `Supplier ${id}` }));
const secondPage = [{ id: "1000", name: "Supplier 1000" }];
const paginated = mockClient({ pages: [firstPage, secondPage, []] });
const result = await loadWorkspaceSuppliers(paginated.client, "workspace-a");
assert.equal(result.error, null);
assert.equal(result.data.length, 1001, "Rows beyond the PostgREST page limit are retained.");
assert.deepEqual(paginated.calls.filter((call) => call[0] === "range"), [["range", 0, 999], ["range", 1000, 1999]]);
assert.deepEqual(paginated.calls.filter((call) => call[0] === "eq"), [["eq", "workspace_id", "workspace-a"], ["eq", "workspace_id", "workspace-a"]]);
assert.deepEqual(paginated.calls.filter((call) => call[0] === "order"), [
  ["order", "name", { ascending: true }],
  ["order", "id", { ascending: true }],
  ["order", "name", { ascending: true }],
  ["order", "id", { ascending: true }],
]);

const failedPage = mockClient({ pages: [firstPage, []], errorPage: 1 });
const failure = await loadWorkspaceSuppliers(failedPage.client, "workspace-a");
assert.equal(failure.data, null, "A later-page failure must not expose a partial supplier list.");
assert.match(failure.error.message, /page failure/);
assert.deepEqual(failedPage.calls.filter((call) => call[0] === "range"), [["range", 0, 999], ["range", 1000, 1999]]);

const empty = mockClient({ pages: [[]] });
assert.deepEqual(await loadWorkspaceSuppliers(empty.client, "workspace-a"), { data: [], error: null });
assert.deepEqual(empty.calls.filter((call) => call[0] === "range"), [["range", 0, 999]]);
await assert.rejects(() => loadWorkspaceSuppliers(paginated.client, "workspace-a", 0), RangeError);
const invalidContext = await loadWorkspaceSuppliers(paginated.client, " ");
assert.equal(invalidContext.data, null);
assert.match(invalidContext.error.message, /requires a client and workspace ID/);

const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const stateStart = backend.indexOf("export async function loadBackendState");
const stateEnd = backend.indexOf("export async function ", stateStart + 1);
const stateBlock = backend.slice(stateStart, stateEnd > stateStart ? stateEnd : undefined);
assert.ok(stateStart >= 0, "Backend state loader exists");
assert.match(backend, /import\s*\{\s*loadWorkspaceSuppliers\s*\}\s*from\s*["']\.\/workspaceSupplierHydration\.mjs["']/);
assert.match(stateBlock, /loadWorkspaceSuppliers\(supabase,\s*workspaceId\)/);
assert.doesNotMatch(stateBlock, /supabase\.from\(["']suppliers["']\)\.select\(["']\*["']\)\.eq\(["']workspace_id["']/);
assert.match(packageJson.scripts.test, /test-workspace-supplier-hydration-pagination\.mjs/);
console.log("Workspace suppliers hydration pagination runtime regression: PASS");
