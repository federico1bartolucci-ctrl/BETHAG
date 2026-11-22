import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(backend, /loadWorkspaceRows\("assemblies"\)/);
assert.doesNotMatch(backend, /supabase\.from\("assemblies"\)\.select\("\*"\)\.eq\("workspace_id", workspaceId\)/);
assert.match(backend, /const loadWorkspaceRows = async[\s\S]*?\.range\(offset, offset \+ 999\)/);
assert.match(packageJson.scripts.test, /test-assemblies-hydration-pagination\.mjs/);
console.log("Assemblies hydration pagination regression checks passed.");
