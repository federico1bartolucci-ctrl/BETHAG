import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
const pkg = JSON.parse(await readFile("package.json", "utf8"));

assert.match(backend, /loadWorkspaceRows\("deadlines"\)/);
assert.doesNotMatch(backend, /supabase\.from\("deadlines"\)\.select\("\*"\)\.eq\("workspace_id", workspaceId\)/);
assert.match(backend, /const loadWorkspaceRows = async[\s\S]*?\.range\(offset, offset \+ 999\)/);
assert.match(pkg.scripts.test, /test-deadlines-pagination\.mjs/);

console.log("Deadline hydration pagination regression checks passed.");
