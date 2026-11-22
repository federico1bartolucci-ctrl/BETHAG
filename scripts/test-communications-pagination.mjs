import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const backend = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

assert.match(backend, /loadWorkspaceRows\("communications"\)/);
assert.doesNotMatch(backend, /supabase\.from\("communications"\)\.select\("\*"\)\.eq\("workspace_id", workspaceId\)/);
assert.match(backend, /\.range\(offset, offset \+ 999\)/);
assert.match(packageJson.scripts.test, /test-communications-pagination\.mjs/);

console.log("Communications pagination regression checks passed.");
