import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceRowsForState } from "../src/lib/backendStatePagination.ts";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const start = source.indexOf("export async function loadBackendState(");
const queryStart = source.indexOf("const [", start);
const queryEnd = source.indexOf("\n  ]);", queryStart);
assert.ok(start >= 0 && queryStart > start && queryEnd > queryStart, "loadBackendState query section must exist");
const querySection = source.slice(queryStart, queryEnd);
assert.match(querySection, /loadWorkspaceRows\("condominium_works"\)/, "backend hydration must paginate condominium works");
assert.doesNotMatch(querySection, /supabase\.from\("condominium_works"\)/, "backend hydration must not use a single capped works query");
assert.match(source, /loadWorkspaceRowsForState\(client, workspaceId, table, columns, orderBy, filters\)/, "local workspace loader must use the shared helper");
assert.ok(packageJson.scripts.test.includes("test-backend-state-condominium-works-pagination.mjs"), "regression test must be wired into npm test");

function mockClient(pages, failOffset = null) {
  const requests = [];
  const client = {
    from(table) {
      const state = { table, columns: null, workspaceId: null, orders: [] };
      const query = {
        select(columns) { state.columns = columns; return query; },
        eq(column, value) { if (column === "workspace_id") state.workspaceId = value; return query; },
        order(column, options) { state.orders.push([column, options]); return query; },
        range(from, to) {
          requests.push({ ...state, orders: state.orders.slice(), from, to });
          if (from === failOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({ id: "work-" + String(index).padStart(4, "0"), created_at: "2026-01-01" }));
const secondPage = [{ id: "work-1000", created_at: "2026-01-02" }];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const result = await loadWorkspaceRowsForState(client, "workspace-1", "condominium_works");
assert.equal(result.data.length, 1001, "work state beyond the 1,000-row cap must be retained");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.equal(requests[0].table, "condominium_works");
assert.equal(requests[0].workspaceId, "workspace-1");
assert.deepEqual(requests[0].orders, [["created_at", { ascending: true }], ["id", { ascending: true }]], "pages must have stable ordering");

const failing = mockClient(new Map([[0, firstPage], [1000, secondPage]]), 1000);
await assert.rejects(
  loadWorkspaceRowsForState(failing.client, "workspace-1", "condominium_works"),
  /page failed/,
  "a failed later page must reject instead of returning partial work state",
);
console.log("Backend-state condominium-works pagination regression checks passed.");
