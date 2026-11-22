import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(backend, /loadWorkspaceRows\("condominium_funds"\)/);
assert.doesNotMatch(backend, /supabase\.from\("condominium_funds"\)\.select\("\*"\)\.eq\("workspace_id", workspaceId\)/);
assert.match(backend, /const loadWorkspaceRows = async[\s\S]*?\.range\(offset, offset \+ 999\)/);
assert.match(packageJson.scripts.test, /test-funds-hydration-pagination\.mjs/);
console.log("Funds hydration pagination regression checks passed.");
