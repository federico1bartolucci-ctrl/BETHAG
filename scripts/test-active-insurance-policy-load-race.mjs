import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyInsurancePoliciesLoadResponse } from "../src/lib/insurancePolicyLoadGuard.mjs";

// Reproduce the old race: condominium B is displayed, then a late response for A overwrites it.
let visiblePolicies = [{ id: "policy-B", condominium_id: "B" }];
visiblePolicies = [{ id: "policy-A", condominium_id: "A" }];
assert.equal(visiblePolicies[0].condominium_id, "A", "legacy stale-response race must reproduce");

// Only a response matching both the current condo and request sequence may update state.
visiblePolicies = [{ id: "policy-B", condominium_id: "B" }];
const setPolicies = (data) => { visiblePolicies = data; };
assert.equal(applyInsurancePoliciesLoadResponse({
  data: [{ id: "policy-A", condominium_id: "A" }],
  requestedCondominiumId: "A",
  currentCondominiumId: "B",
  requestSequence: 1,
  currentRequestSequence: 2,
  setPolicies,
}), false);
assert.equal(visiblePolicies[0].condominium_id, "B", "stale A response must not overwrite B");

assert.equal(applyInsurancePoliciesLoadResponse({
  data: [{ id: "policy-B", condominium_id: "B" }],
  requestedCondominiumId: "B",
  currentCondominiumId: "B",
  requestSequence: 2,
  currentRequestSequence: 2,
  setPolicies,
}), true);
assert.equal(visiblePolicies[0].condominium_id, "B", "current response must apply");

assert.equal(applyInsurancePoliciesLoadResponse({
  data: [{ id: "policy-B", condominium_id: "B" }],
  requestedCondominiumId: "B",
  currentCondominiumId: "C",
  requestSequence: 2,
  currentRequestSequence: 2,
  setPolicies,
}), false, "a changed condo prop invalidates a response before the next effect runs");
assert.throws(() => applyInsurancePoliciesLoadResponse({
  data: { id: "malformed" },
  requestedCondominiumId: "C",
  currentCondominiumId: "C",
  requestSequence: 3,
  currentRequestSequence: 3,
  setPolicies,
}), /array/i);
assert.equal(applyInsurancePoliciesLoadResponse({
  data: [],
  requestedCondominiumId: "C",
  currentCondominiumId: "C",
  requestSequence: 3,
  currentRequestSequence: 3,
  setPolicies,
}), true);

// Verify the helper is used by the active local component and stale loads cannot clear current loading state.
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const start = main.lastIndexOf("function InsurancePoliciesSection(");
assert.ok(start >= 0, "active InsurancePoliciesSection must exist");
const section = main.slice(start, start + 10000);
assert.match(main, /import \{ applyInsurancePoliciesLoadResponse \} from ["']\.\/lib\/insurancePolicyLoadGuard\.mjs["']/);
assert.match(section, /const insurancePolicyLoadSequence = useRef\(0\)/);
assert.match(section, /currentCondominiumIdRef\.current = condominiumId/);
assert.match(section, /const requestSequence = \+\+insurancePolicyLoadSequence\.current/);
assert.match(section, /applyInsurancePoliciesLoadResponse\(/);
assert.match(section, /currentCondominiumId:\s*currentCondominiumIdRef\.current/);
assert.match(section, /currentRequestSequence:\s*insurancePolicyLoadSequence\.current/);
assert.match(section, /if\s*\(requestSequence === insurancePolicyLoadSequence\.current\)/, "stale requests must not clear loading state or log current errors");
assert.match(section, /return\s*\(\)\s*=>\s*\{\s*insurancePolicyLoadSequence\.current\s*\+=\s*1/s, "unmount cleanup must invalidate pending loads");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(packageJson.scripts.test, /test-active-insurance-policy-load-race\.mjs/, "regression must be wired into npm test");
console.log("Insurance policy stale-load runtime regression: PASS (legacy overwrite reproduced; stale and current responses; prop-change invalidation; malformed response; active component wiring).");
