import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requireInsurancePolicyUpdateResult } from "../src/lib/insurancePolicyUpdate.mjs";

const source = readFileSync(new URL("../src/InsurancePoliciesSection.tsx", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../src/lib/insurancePolicyUpdate.mjs", import.meta.url), "utf8");
const save = source.slice(source.indexOf("const save = async"), source.indexOf("const remove = async"));

assert.match(save, /await requireInsurancePolicyUpdateResult\(/);
assert.match(save, /\.update\(payload\)[\s\S]*\.eq\("id", editing\.id\)[\s\S]*\.eq\("workspace_id", workspaceId\)[\s\S]*\.eq\("condominium_id", dbCondominiumId\)/);
assert.match(helperSource, /\.select\("id"\)\.maybeSingle\(\)/);
assert.ok(save.indexOf("await requireInsurancePolicyUpdateResult") < save.indexOf("closeForm()"), "Form must remain open when the update affects no row");
assert.match(save, /\.insert\(payload\)/, "Insert path must remain available");
assert.match(save, /if \(saveError\) throw saveError/);

const fakeQuery = (result) => ({
  select(columns) {
    assert.equal(columns, "id");
    return { maybeSingle: async () => result };
  },
});

const updated = await requireInsurancePolicyUpdateResult(fakeQuery({ data: { id: "policy-1" }, error: null }));
assert.deepEqual(updated, { id: "policy-1" });

await assert.rejects(
  () => requireInsurancePolicyUpdateResult(fakeQuery({ data: null, error: null })),
  /La polizza non è stata aggiornata/
);

const databaseError = new Error("permission denied");
await assert.rejects(
  () => requireInsurancePolicyUpdateResult(fakeQuery({ data: null, error: databaseError })),
  (error) => error === databaseError
);

console.log("Insurance policy zero-row update regression checks passed.");
