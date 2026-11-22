import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/InsurancePoliciesSection.tsx", "utf8");
const loadStart = source.indexOf("  const load = async () => {");
assert.notEqual(loadStart, -1, "load() must exist");
const loadBody = source.slice(loadStart, source.indexOf("  useEffect(() => {", loadStart));
assert.match(loadBody, /setWorkspaceId\(null\)/, "workspace ID must be cleared before condominium lookup");
assert.match(loadBody, /setDbCondominiumId\(null\)/, "database condominium ID must be cleared before lookup");
assert.match(loadBody, /setPolicies\(\[\]\)/, "previous policies must be cleared before lookup");
assert.ok(loadBody.indexOf("setWorkspaceId(null)") < loadBody.indexOf(".from(\"condominiums\")"), "clear stale workspace before lookup");
assert.ok(loadBody.indexOf("setDbCondominiumId(null)") < loadBody.indexOf(".from(\"condominiums\")"), "clear stale condominium before lookup");
console.log("Insurance condominium context stale-state regression: PASS");
