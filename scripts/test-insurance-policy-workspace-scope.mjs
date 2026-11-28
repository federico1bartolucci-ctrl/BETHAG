import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveInsurancePolicyCondominium } from "../src/lib/insurancePolicyCondominiumScope.mjs";

const rows = [
  { id: "condo-a", workspace_id: "workspace-a", legacy_id: 42 },
  { id: "condo-b", workspace_id: "workspace-b", legacy_id: 42 },
];
function makeClient() {
  const calls = [];
  const filters = [];
  const query = {
    eq(column, value) { calls.push(["eq", column, value]); filters.push([column, value]); return query; },
    maybeSingle() {
      calls.push(["maybeSingle"]);
      const matches = rows.filter(row => filters.every(([key, value]) => String(row[key]) === String(value)));
      return Promise.resolve({
        data: matches.length === 1 ? matches[0] : null,
        error: matches.length > 1 ? new Error("multiple rows returned") : null,
      });
    },
  };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return { select(columns) { calls.push(["select", columns]); return query; } };
    },
  };
  return { client, calls };
}

const scoped = makeClient();
const resolved = await resolveInsurancePolicyCondominium({
  client: scoped.client,
  workspaceId: "workspace-a",
  legacyCondominiumId: 42,
});
assert.equal(resolved.id, "condo-a", "the duplicate legacy ID must resolve only inside the requested workspace");
assert.deepEqual(scoped.calls, [
  ["from", "condominiums"],
  ["select", "id, workspace_id"],
  ["eq", "workspace_id", "workspace-a"],
  ["eq", "legacy_id", 42],
  ["maybeSingle"],
]);

await assert.rejects(
  resolveInsurancePolicyCondominium({ client: scoped.client, workspaceId: "", legacyCondominiumId: 42 }),
  /Workspace del condominio obbligatorio/,
);
await assert.rejects(
  resolveInsurancePolicyCondominium({ client: scoped.client, workspaceId: "workspace-a", legacyCondominiumId: 0 }),
  /ID legacy del condominio non valido/,
);

const wrongWorkspaceClient = {
  from() {
    const query = {
      select() { return query; },
      eq() { return query; },
      maybeSingle() { return Promise.resolve({ data: { id: "condo-b", workspace_id: "workspace-b" }, error: null }); },
    };
    return query;
  },
};
await assert.rejects(
  resolveInsurancePolicyCondominium({ client: wrongWorkspaceClient, workspaceId: "workspace-a", legacyCondominiumId: 42 }),
  /non trovato nel workspace selezionato/,
);

const policySource = await readFile("src/InsurancePoliciesSection.tsx", "utf8");
const mainSource = await readFile("src/main.tsx", "utf8");
const baseline = await readFile("supabase/migrations/20261017000001_bethag_baseline_schema.sql", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(policySource, /resolveInsurancePolicyCondominium\(/, "policy load must use the workspace-scoped resolver");
assert.match(policySource, /\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", condominium\.id\)/, "policy list must be scoped to both workspace and condominium");
assert.match(policySource, /policiesWorkspaceId === workspaceId/, "policy data must not be reused when two workspaces share a legacy condominium ID");
assert.match(policySource, /currentWorkspaceIdRef\.current === workspaceId[\s\S]*currentCondominiumIdRef\.current === condominiumId/, "stale loads must be invalidated across workspace as well as condominium changes");
assert.match(policySource, /\}, \[workspaceId, condominiumId\]\);/, "workspace changes must trigger a new policy load");
assert.match(mainSource, /workspaceId=\{profile\.workspaceId\}[\s\S]*<CondominiumDetails/, "the active workspace must be passed into condominium details");
assert.match(mainSource, /<InsurancePoliciesSection workspaceId=\{workspaceId\} condominiumId=\{item\.id\}/, "the active workspace must reach the policy section");
assert.match(baseline, /condominiums_workspace_legacy_unique[^\n]*UNIQUE \(workspace_id, legacy_id\)/, "legacy condominium IDs are unique per workspace, not globally");
assert.equal((packageJson.scripts.test.match(/test-insurance-policy-workspace-scope\.mjs/g) || []).length, 1, "the regression must be registered exactly once in npm test");

console.log("Insurance policy duplicate legacy-ID workspace isolation regression: PASS");
