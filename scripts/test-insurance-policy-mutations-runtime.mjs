import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateInsurancePolicy, deleteInsurancePolicy } from "../src/lib/insurancePolicyMutations.mjs";

const scope = { policyId: "policy-1", workspaceId: "workspace-1", condominiumId: "condo-1" };
const payload = { company_name: "Test insurer", active: true };

function mockClient(response) {
  const state = { table: null, operation: null, payload: null, filters: [], selected: null, steps: [] };
  const query = {
    update(value) { state.operation = "update"; state.payload = value; state.steps.push("update"); return this; },
    delete() { state.operation = "delete"; state.steps.push("delete"); return this; },
    eq(column, value) { state.filters.push([column, value]); state.steps.push(`eq:${column}`); return this; },
    select(value) { state.selected = value; state.steps.push("select"); return this; },
    maybeSingle() { state.steps.push("maybeSingle"); return Promise.resolve(response); },
  };
  return { state, supabase: { from(table) { state.table = table; state.steps.push("from"); return query; } } };
}
const expectedFilters = [
  ["id", scope.policyId],
  ["workspace_id", scope.workspaceId],
  ["condominium_id", scope.condominiumId],
];

// Update: success, workspace + condominium scope, selected row confirmation.
{
  const { supabase, state } = mockClient({ data: { id: scope.policyId }, error: null });
  assert.equal(await updateInsurancePolicy({ supabase, ...scope, payload }), scope.policyId);
  assert.equal(state.table, "condominium_insurance_policies");
  assert.equal(state.operation, "update");
  assert.deepEqual(state.filters, expectedFilters);
  assert.deepEqual(state.payload, payload);
  assert.equal(state.selected, "id");
  assert.equal(state.steps.at(-1), "maybeSingle");
}
// Update: a zero-row RLS/stale-ID result is not treated as success.
{
  const { supabase } = mockClient({ data: null, error: null });
  await assert.rejects(updateInsurancePolicy({ supabase, ...scope, payload }), /Polizza non aggiornata/);
}
// Update: database errors are propagated unchanged.
{
  const dbError = { code: "42501", message: "permission denied" };
  const { supabase } = mockClient({ data: null, error: dbError });
  await assert.rejects(updateInsurancePolicy({ supabase, ...scope, payload }), (error) => error === dbError);
}
// Delete: success with the same tenant/condominium filters and selected-row confirmation.
{
  const { supabase, state } = mockClient({ data: { id: scope.policyId }, error: null });
  assert.equal(await deleteInsurancePolicy({ supabase, ...scope }), scope.policyId);
  assert.equal(state.table, "condominium_insurance_policies");
  assert.equal(state.operation, "delete");
  assert.deepEqual(state.filters, expectedFilters);
  assert.equal(state.selected, "id");
  assert.equal(state.steps.at(-1), "maybeSingle");
}
// Delete: zero affected rows must surface to the UI.
{
  const { supabase } = mockClient({ data: null, error: null });
  await assert.rejects(deleteInsurancePolicy({ supabase, ...scope }), /Polizza non eliminata/);
}
// Delete: database errors are propagated unchanged.
{
  const dbError = { code: "42501", message: "delete blocked by policy" };
  const { supabase } = mockClient({ data: null, error: dbError });
  await assert.rejects(deleteInsurancePolicy({ supabase, ...scope }), (error) => error === dbError);
}
// Missing scope is rejected before a query can be issued.
{
  const { supabase, state } = mockClient({ data: { id: scope.policyId }, error: null });
  await assert.rejects(deleteInsurancePolicy({ supabase, ...scope, workspaceId: "" }), /Contesto polizza non valido/);
  assert.equal(state.table, null);
}
// The runtime helper is used by both component mutations and wired into npm test.
{
  const component = await readFile("src/InsurancePoliciesSection.tsx", "utf8");
  assert.match(component, /insurancePolicyMutations\.mjs/);
  assert.match(component, /await updateInsurancePolicy\(/);
  assert.match(component, /await deleteInsurancePolicy\(/);
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.match(packageJson.scripts.test, /test-insurance-policy-mutations-runtime\.mjs/);
}
console.log("Insurance policy mutations runtime regression: PASS");
