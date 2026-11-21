import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireInsurancePolicyMutationResult } from "../src/lib/insurancePolicyUpdate.mjs";

const source = readFileSync(new URL("../src/InsurancePoliciesSection.tsx", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../src/lib/insurancePolicyUpdate.mjs", import.meta.url), "utf8");
const saveStart = source.indexOf("const save = async");
const removeStart = source.indexOf("const remove = async", saveStart);
const summaryStart = source.indexOf("const summary = useMemo", removeStart);
const save = source.slice(saveStart, removeStart);
const remove = source.slice(removeStart, summaryStart);

assert.match(save, /await requireInsurancePolicyMutationResult\(/);
assert.match(save, /\.update\(payload\)[\s\S]*\.eq\("id", editing\.id\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", dbCondominiumId\)/);
assert.match(save, /"aggiornata"/);
assert.match(helperSource, /\.select\("id"\)\.maybeSingle\(\)/);
assert.ok(save.indexOf("await requireInsurancePolicyMutationResult") < save.indexOf("closeForm()"), "Edit form must remain open when update affects no row");
assert.match(save, /\.insert\(payload\)/, "Insert path must remain available");
assert.match(save, /if \(saveError\) throw saveError/);

assert.match(remove, /await requireInsurancePolicyMutationResult\(/);
assert.match(remove, /\.delete\(\)[\s\S]*\.eq\("id", policy\.id\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", dbCondominiumId\)/);
assert.match(remove, /"cancellata"/);
assert.ok(remove.indexOf("await requireInsurancePolicyMutationResult") < remove.indexOf("await load()"), "Deletion must be verified before reloading");

const fakeQuery = (result) => ({
  select(columns) {
    assert.equal(columns, "id");
    return { maybeSingle: async () => result };
  },
});

const updated = await requireInsurancePolicyMutationResult(fakeQuery({ data: { id: "policy-1" }, error: null }), "aggiornata");
assert.deepEqual(updated, { id: "policy-1" });
await assert.rejects(
  () => requireInsurancePolicyMutationResult(fakeQuery({ data: null, error: null }), "aggiornata"),
  /La polizza non è stata aggiornata/
);
const updateError = new Error("permission denied");
await assert.rejects(
  () => requireInsurancePolicyMutationResult(fakeQuery({ data: null, error: updateError }), "aggiornata"),
  (error) => error === updateError
);

const deleted = await requireInsurancePolicyMutationResult(fakeQuery({ data: { id: "policy-2" }, error: null }), "cancellata");
assert.deepEqual(deleted, { id: "policy-2" });
await assert.rejects(
  () => requireInsurancePolicyMutationResult(fakeQuery({ data: null, error: null }), "cancellata"),
  /La polizza non è stata cancellata/
);
const deleteError = new Error("foreign key constraint");
await assert.rejects(
  () => requireInsurancePolicyMutationResult(fakeQuery({ data: null, error: deleteError }), "cancellata"),
  (error) => error === deleteError
);

console.log("Insurance policy zero-row mutation regression checks passed.");
