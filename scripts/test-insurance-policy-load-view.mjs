import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyInsurancePoliciesLoadFailure,
  selectVisibleInsurancePolicies,
} from "../src/lib/insurancePolicyLoadView.mjs";

const oldRows = [{ id: "policy-A", condominium_id: "A" }];
assert.deepEqual(
  selectVisibleInsurancePolicies({ policies: oldRows, policiesCondominiumId: "A", condominiumId: "B" }),
  [],
  "previous-condominium policies must be hidden immediately when context changes",
);
assert.deepEqual(
  selectVisibleInsurancePolicies({ policies: oldRows, policiesCondominiumId: "A", condominiumId: "A" }),
  oldRows,
  "policies remain visible for their own condominium",
);

let policies = oldRows;
let policyScope = "A";
let errorMessage = null;
let errorScope = null;
const currentFailureApplied = applyInsurancePoliciesLoadFailure({
  error: { message: "permission denied" },
  requestedCondominiumId: "B",
  currentCondominiumId: "B",
  isCurrent: () => true,
  setPolicies: (value) => { policies = value; },
  setPoliciesCondominiumId: (value) => { policyScope = value; },
  setLoadError: (value) => { errorMessage = value; },
  setLoadErrorCondominiumId: (value) => { errorScope = value; },
});
assert.equal(currentFailureApplied, true);
assert.deepEqual(policies, []);
assert.equal(policyScope, "B");
assert.equal(errorMessage, "permission denied");
assert.equal(errorScope, "B");

policies = [{ id: "policy-B", condominium_id: "B" }];
policyScope = "B";
errorMessage = null;
errorScope = null;
const staleFailureApplied = applyInsurancePoliciesLoadFailure({
  error: new Error("old A request failed"),
  requestedCondominiumId: "A",
  currentCondominiumId: "B",
  isCurrent: () => false,
  setPolicies: (value) => { policies = value; },
  setPoliciesCondominiumId: (value) => { policyScope = value; },
  setLoadError: (value) => { errorMessage = value; },
  setLoadErrorCondominiumId: (value) => { errorScope = value; },
});
assert.equal(staleFailureApplied, false);
assert.deepEqual(policies, [{ id: "policy-B", condominium_id: "B" }]);
assert.equal(policyScope, "B");
assert.equal(errorMessage, null);
assert.equal(errorScope, null);

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const start = source.indexOf("function InsurancePoliciesSection(");
const end = source.indexOf("const resetForm", start);
assert.ok(start >= 0 && end > start);
const component = source.slice(start, end);
assert.match(component, /selectVisibleInsurancePolicies/);
assert.match(component, /applyInsurancePoliciesLoadFailure/);
assert.match(component, /setPoliciesCondominiumId\(requestedCondominiumId\)/);
assert.match(component, /role="alert"/);
assert.match(component, /visiblePolicies\.map\(/);
assert.match(component, /if \(condominiumError\) throw condominiumError/);
console.log("Insurance policy load view/error regression passed.");
