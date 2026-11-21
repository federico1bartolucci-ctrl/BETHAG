import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkspaceRowsForState } from "../src/lib/backendStatePagination.ts";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const helperSource = await readFile("src/lib/backendStatePagination.ts", "utf8");
const start = source.indexOf("export async function loadBackendState(");
const queryStart = source.indexOf("const [", start);
const queryEnd = source.indexOf("\n  ]);", queryStart);
assert.ok(start >= 0 && queryStart > start && queryEnd > queryStart, "loadBackendState query section must exist");
const querySection = source.slice(queryStart, queryEnd);
assert.match(querySection, /loadWorkspaceRows\("workspace_members",\s*"\*",\s*"created_at",\s*\[\["role",\s*"collaborator"\]\]\)/, "backend hydration must paginate only collaborator memberships");
assert.doesNotMatch(querySection, /supabase\.from\("workspace_members"\)/, "backend hydration must not use a single capped workspace-members query");
assert.match(helperSource, /for \(const \[column, value\] of filters\)/, "shared pagination helper must apply filters to each page");
assert.ok(packageJson.scripts.test.includes("test-backend-state-workspace-members-pagination.mjs"), "regression test must be wired into npm test");

function mockClient(pages, failOffset = null) {
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
          if (from === failOffset) return Promise.resolve({ data: null, error: new Error("page failed") });
          return Promise.resolve({ data: pages.get(from) ?? [], error: null });
        },
      };
      return query;
    },
  };
  return { client, requests };
}

const firstPage = Array.from({ length: 1000 }, (_, index) => ({ id: "member-" + String(index).padStart(4, "0"), role: "collaborator" }));
const secondPage = [{ id: "member-1000", role: "collaborator" }];
const { client, requests } = mockClient(new Map([[0, firstPage], [1000, secondPage]]));
const result = await loadWorkspaceRowsForState(client, "workspace-1", "workspace_members", "*", "created_at", [["role", "collaborator"]]);
assert.equal(result.data.length, 1001, "collaborators beyond the 1,000-row cap must be retained");
assert.deepEqual(requests.map(({ from, to }) => [from, to]), [[0, 999], [1000, 1999]]);
assert.deepEqual(requests[0].filters, [["workspace_id", "workspace-1"], ["role", "collaborator"]], "workspace and role scope must be preserved on every page");
assert.deepEqual(requests[0].orders, [["created_at", { ascending: true }], ["id", { ascending: true }]], "pages must use stable ordering");

const failing = mockClient(new Map([[0, firstPage], [1000, secondPage]]), 1000);
await assert.rejects(
  loadWorkspaceRowsForState(failing.client, "workspace-1", "workspace_members", "*", "created_at", [["role", "collaborator"]]),
  /page failed/,
  "a failed later page must reject instead of returning a partial collaborator list",
);
console.log("Backend-state workspace-member pagination regression checks passed.");
