import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/InsurancePoliciesSection.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const saveStart = source.indexOf("const save = async (event: React.FormEvent) => {");
const removeStart = source.indexOf("const remove = async (policy: InsurancePolicy) => {", saveStart);
const summaryStart = source.indexOf("const summary = useMemo", removeStart);
assert.ok(saveStart >= 0 && removeStart > saveStart && summaryStart > removeStart, "insurance handlers must exist");
const saveHandler = source.slice(saveStart, removeStart);
const removeHandler = source.slice(removeStart, summaryStart);
assert.match(saveHandler, /\.eq\("id", editing\.id\)\.eq\("workspace_id", workspaceId\)\.eq\("condominium_id", dbCondominiumId\)/, "updates must be scoped to the active workspace and condominium");
assert.match(removeHandler, /\.eq\("id", policy\.id\)\s*\.eq\("workspace_id", workspaceId \?\? ""\)\s*\.eq\("condominium_id", dbCondominiumId \?\? ""\)/, "deletes must be scoped to the active workspace and condominium");
assert.ok(packageJson.scripts.test.includes("test-insurance-policy-scope-guards.mjs"), "scope regression test must run via npm test");
console.log("Insurance policy workspace/condominium scope regression checks passed.");
