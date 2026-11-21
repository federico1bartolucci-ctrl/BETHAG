import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/lib/bethagBackend.ts", "utf8");
const paginatedTables = [
  "documents",
  "deadlines",
  "assemblies",
  "suppliers",
  "activities",
  "communications",
  "condominium_requests",
  "portal_access",
  "condominium_works",
];
for (const table of paginatedTables) {
  assert.match(
    source,
    new RegExp('loadWorkspaceRows\\("' + table + '"'),
    "loadBackendState must paginate " + table
  );
  assert.doesNotMatch(
    source,
    new RegExp('supabase\\.from\\("' + table + '"\\)\\.select\\("\*"\\)\\.eq\\("workspace_id", workspaceId\\)'),
    "loadBackendState must not keep a single-page query for " + table
  );
}
const paginationHelper = await readFile("src/lib/backendStatePagination.ts", "utf8");
assert.match(paginationHelper, /\.range\(offset, offset \+ 999\)/, "Workspace pagination must request bounded pages");
assert.match(paginationHelper, /\.order\("id", \{ ascending: true \}\)/, "Pagination must use deterministic ID tie-breaking");
console.log("Backend-state pagination regression checks passed.");
