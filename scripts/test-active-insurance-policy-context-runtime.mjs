import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { updateInsurancePolicy, deleteInsurancePolicy } from "../src/lib/insurancePolicyMutations.mjs";

const TABLE = "condominium_insurance_policies";
const initial = {
  id: "policy-1",
  workspace_id: "workspace-1",
  condominium_id: "condominium-A",
  company_name: "Original insurer",
  policy_number: "A-100",
};

function mockClient(seed) {
  let record = structuredClone(seed);
  const calls = [];
  function execute(state) {
    calls.push({
      table: state.table,
      operation: state.operation,
      payload: state.payload,
      filters: state.filters.slice(),
      selected: state.selected,
    });
    if (state.table !== TABLE) return { data: null, error: new Error("Unexpected table") };
    if (!record || !state.filters.every(([column, value]) => record[column] === value)) {
      return { data: null, error: null };
    }
    const id = record.id;
    if (state.operation === "update") record = { ...record, ...state.payload };
    if (state.operation === "delete") record = null;
    return { data: state.selected ? { id } : record, error: null };
  }
  const client = {
    from(table) {
      const state = { table, operation: null, payload: null, filters: [], selected: null };
      const query = {
        update(payload) { state.operation = "update"; state.payload = payload; return query; },
        delete() { state.operation = "delete"; return query; },
        eq(column, value) { state.filters.push([column, value]); return query; },
        select(columns) { state.selected = columns; return query; },
        maybeSingle() { return Promise.resolve(execute(state)); },
        then(resolve, reject) { return Promise.resolve(execute(state)).then(resolve, reject); },
      };
      return query;
    },
  };
  return { client, calls, getRecord: () => record };
}

// Reproduce the active legacy component's unscoped condominium update:
// ID + workspace only allows a stale form from condominium A to reassign the policy to B.
{
  const legacy = mockClient(initial);
  await legacy.client.from(TABLE).update({ condominium_id: "condominium-B" })
    .eq("id", initial.id).eq("workspace_id", initial.workspace_id);
  assert.equal(legacy.getRecord().condominium_id, "condominium-B", "legacy mutation must reproduce cross-condominium reassignment");
}

// Corrected helper rejects the stale condominium context and preserves the original policy.
{
  const corrected = mockClient(initial);
  await assert.rejects(
    updateInsurancePolicy({
      supabase: corrected.client,
      policyId: initial.id,
      workspaceId: initial.workspace_id,
      condominiumId: "condominium-B",
      payload: { condominium_id: "condominium-B", company_name: "Moved insurer" },
    }),
    /Polizza non aggiornata/,
  );
  assert.equal(corrected.getRecord().condominium_id, "condominium-A");
  assert.equal(corrected.getRecord().company_name, "Original insurer");
}

// Update in the original condominium succeeds and still confirms the affected row.
{
  const corrected = mockClient(initial);
  const id = await updateInsurancePolicy({
    supabase: corrected.client,
    policyId: initial.id,
    workspaceId: initial.workspace_id,
    condominiumId: "condominium-A",
    payload: { company_name: "Updated insurer" },
  });
  assert.equal(id, initial.id);
  assert.equal(corrected.getRecord().company_name, "Updated insurer");
  assert.deepEqual(corrected.calls[0].filters, [
    ["id", initial.id],
    ["workspace_id", initial.workspace_id],
    ["condominium_id", "condominium-A"],
  ]);
}

// A stale delete context cannot remove a policy belonging to another condominium.
{
  const corrected = mockClient(initial);
  await assert.rejects(
    deleteInsurancePolicy({
      supabase: corrected.client,
      policyId: initial.id,
      workspaceId: initial.workspace_id,
      condominiumId: "condominium-B",
    }),
    /Polizza non eliminata/,
  );
  assert.equal(corrected.getRecord().id, initial.id);
  assert.deepEqual(corrected.calls[0].filters, [
    ["id", initial.id],
    ["workspace_id", initial.workspace_id],
    ["condominium_id", "condominium-B"],
  ]);
  await deleteInsurancePolicy({
    supabase: corrected.client,
    policyId: initial.id,
    workspaceId: initial.workspace_id,
    condominiumId: "condominium-A",
  });
  assert.equal(corrected.getRecord(), null);
}

// The helper is wired into the active (local) main.tsx component, not only the imported duplicate.
{
  const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
  const start = main.lastIndexOf("function InsurancePoliciesSection(");
  assert.ok(start >= 0, "active local InsurancePoliciesSection must exist");
  const section = main.slice(start, start + 12000);
  assert.match(main, /import \{ updateInsurancePolicy, deleteInsurancePolicy \} from ["']\.\/lib\/insurancePolicyMutations\.mjs["']/);
  assert.match(section, /await updateInsurancePolicy\(/, "active component must use scoped update helper");
  assert.match(section, /await deleteInsurancePolicy\(/, "active component must use scoped delete helper");
  assert.match(section, /condominiumId:\s*condominium\.id/, "both mutations must pass the current condominium scope");
  assert.doesNotMatch(section, /\.from\(["']condominium_insurance_policies["']\)\s*\.update\(/, "active component must not keep direct unscoped updates");
  assert.doesNotMatch(section, /\.from\(["']condominium_insurance_policies["']\)\s*\.delete\(/, "active component must not keep direct unscoped deletes");
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(packageJson.scripts.test, /test-active-insurance-policy-context-runtime\.mjs/, "runtime regression must be wired into npm test");
}

console.log("Active insurance policy condominium-scope runtime regression: PASS (legacy reassignment reproduced; stale update/delete rejected; scoped update/delete verified; active main component wiring checked).");
