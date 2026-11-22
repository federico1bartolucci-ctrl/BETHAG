import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const backend = await readFile("src/lib/bethagBackend.ts", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(backend, /loadWorkspaceRows\("condominium_fiscal_years", "\*", "start_date"\)/);
assert.doesNotMatch(backend, /supabase\.from\("condominium_fiscal_years"\)\.select\("\*"\)\.eq\("workspace_id", workspaceId\)\.order\("start_date"\)/);
assert.match(backend, /const loadWorkspaceRows = async[\s\S]*?\.range\(offset, offset \+ 999\)/);
assert.match(packageJson.scripts.test, /test-fiscal-years-hydration-pagination\.mjs/);
console.log("Fiscal years hydration pagination regression checks passed.");
