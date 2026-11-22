import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getScopedInsurancePolicyContext } from "../src/lib/insurance-policy-scope.mjs";

const previousScope = {
  workspaceId: "workspace-A",
  condominiumId: 42,
  dbCondominiumId: "condominium-uuid-A",
  policies: [{ id: "policy-A", policy_number: "POL-A", company_name: "Previous condominium" }],
};
assert.equal(getScopedInsurancePolicyContext(previousScope, "workspace-A", 42), previousScope);
const switchedCondominium = getScopedInsurancePolicyContext(previousScope, "workspace-A", 43);
assert.equal(switchedCondominium, null, "Old scope must be invalid before the load effect resolves.");
assert.deepEqual(switchedCondominium?.policies ?? [], [], "Previous policies must be hidden synchronously.");
assert.equal(switchedCondominium?.workspaceId ?? null, null, "Old workspace context must not be usable for mutations.");
assert.equal(switchedCondominium?.dbCondominiumId ?? null, null, "Old DB condominium ID must not be usable for mutations.");
assert.equal(getScopedInsurancePolicyContext(previousScope, "workspace-B", 42), null, "Workspace switch must invalidate old context.");
assert.equal(getScopedInsurancePolicyContext(null, "workspace-A", 42), null);

const source = await readFile(new URL("../src/InsurancePoliciesSection.tsx", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(source, /getScopedInsurancePolicyContext\(policyScope, workspaceId, condominiumId\)/, "Policy rows must be derived from a scope-tagged context.");
assert.match(source, /InsurancePoliciesSection\(\{\s*workspaceId,\s*condominiumId,/s, "Component must receive the active workspace prop.");
assert.match(source, /const activeWorkspaceId = activePolicyScope\?\.workspaceId \?\? null;/, "Mutation workspace must be scoped to the current selection.");
assert.match(source, /const activeDbCondominiumId = activePolicyScope\?\.dbCondominiumId \?\? null;/, "Mutation condominium ID must be scoped to the current selection.");
assert.match(source, /setPolicyScope\(\{\s*workspaceId,\s*condominiumId,\s*dbCondominiumId: condominium\.id,\s*policies:/, "Loaded policy rows must be tagged with the context that produced them.");
assert.match(source, /\.eq\("workspace_id", workspaceId\)\s*\.eq\("legacy_id", condominiumId\)/, "Condominium lookup must be workspace scoped.");
assert.match(source, /if \(!supabase \|\| !activeWorkspaceId \|\| !activeDbCondominiumId\) return;/, "Policy save must fail closed while context is unresolved.");
assert.match(main, /workspaceId=\{profile\.workspaceId\}/, "Current workspace must be passed to the condominium page.");
assert.match(main, /<InsurancePoliciesSection condominiumId=\{item\.id\} workspaceId=\{workspaceId\} isAdministrator=\{isAdministrator\} \/>/, "Insurance section must receive workspace scope.");
assert.match(packageJson.scripts.test, /test-insurance-policy-scope-isolation\.mjs/, "Regression must run in npm test.");
console.log("Insurance policy workspace/condominium scope isolation runtime regression: PASS");
