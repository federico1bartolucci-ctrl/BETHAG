import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyInsurancePoliciesLoadFailure, applyInsurancePoliciesLoadResponse, selectVisibleInsurancePolicies } from "../src/lib/insurancePolicyLoadGuard.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

// Reproduce the old asynchronous race: B resolves first, then A's stale response overwrites it.
let legacyVisible = [];
const legacyA = deferred();
const legacyB = deferred();
const legacyLoad = (promise) => promise.then((data) => { legacyVisible = data; });
const pendingLegacyA = legacyLoad(legacyA.promise);
const pendingLegacyB = legacyLoad(legacyB.promise);
legacyB.resolve([{ id: "policy-B", condominium_id: "B" }]);
await pendingLegacyB;
legacyA.resolve([{ id: "policy-A", condominium_id: "A" }]);
await pendingLegacyA;
assert.equal(legacyVisible[0].condominium_id, "A", "legacy stale-response race must reproduce");

// Guarded requests: B applies and late A is discarded.
let currentCondominiumId = "A";
let currentSequence = 1;
let visiblePolicies = [];
const setPolicies = (data) => { visiblePolicies = data; };
const guardedLoad = (promise, requestedCondominiumId, requestSequence) => promise.then((data) =>
  applyInsurancePoliciesLoadResponse({
    data,
    requestedCondominiumId,
    currentCondominiumId,
    requestSequence,
    currentRequestSequence: currentSequence,
    setPolicies,
  })
);
const requestA = deferred();
const pendingA = guardedLoad(requestA.promise, "A", 1);
currentCondominiumId = "B";
currentSequence = 2;
const requestB = deferred();
const pendingB = guardedLoad(requestB.promise, "B", 2);
requestB.resolve([{ id: "policy-B", condominium_id: "B" }]);
assert.equal(await pendingB, true);
requestA.resolve([{ id: "policy-A", condominium_id: "A" }]);
assert.equal(await pendingA, false);
assert.equal(visiblePolicies[0].condominium_id, "B", "late A response must not overwrite B");

assert.deepEqual(selectVisibleInsurancePolicies({
  policies: [{ id: "policy-A", condominium_id: "A" }],
  policiesCondominiumId: "A",
  condominiumId: "B",
}), [], "policies from the previous condominium must be hidden immediately on scope change");
assert.deepEqual(selectVisibleInsurancePolicies({
  policies: visiblePolicies,
  policiesCondominiumId: "B",
  condominiumId: "B",
}), visiblePolicies, "policies for the current condominium remain visible");

// A current load failure must clear the previous condominium's rows and surface
// an actionable error instead of rendering the misleading empty-state message.
let failurePolicies = [{ id: "policy-A", condominium_id: "A" }];
let failureScope = "A";
let failureMessage = null;
let failureMessageScope = null;
const appliedFailure = applyInsurancePoliciesLoadFailure({
  error: { message: "permission denied" },
  requestedCondominiumId: "B",
  currentCondominiumId: "B",
  requestSequence: 2,
  currentRequestSequence: 2,
  setPolicies: (value) => { failurePolicies = value; },
  setPoliciesCondominiumId: (value) => { failureScope = value; },
  setLoadError: (value) => { failureMessage = value; },
  setLoadErrorCondominiumId: (value) => { failureMessageScope = value; },
});
assert.equal(appliedFailure, true);
assert.deepEqual(failurePolicies, []);
assert.equal(failureScope, "B");
assert.equal(failureMessage, "permission denied");
assert.equal(failureMessageScope, "B");

// A stale failure from A must not clear B's current rows or overwrite B's error.
failurePolicies = [{ id: "policy-B", condominium_id: "B" }];
failureScope = "B";
failureMessage = null;
failureMessageScope = null;
const ignoredStaleFailure = applyInsurancePoliciesLoadFailure({
  error: new Error("old A request failed"),
  requestedCondominiumId: "A",
  currentCondominiumId: "B",
  requestSequence: 1,
  currentRequestSequence: 2,
  setPolicies: (value) => { failurePolicies = value; },
  setPoliciesCondominiumId: (value) => { failureScope = value; },
  setLoadError: (value) => { failureMessage = value; },
  setLoadErrorCondominiumId: (value) => { failureMessageScope = value; },
});
assert.equal(ignoredStaleFailure, false);
assert.deepEqual(failurePolicies, [{ id: "policy-B", condominium_id: "B" }]);
assert.equal(failureScope, "B");
assert.equal(failureMessage, null);
assert.equal(failureMessageScope, null);

// A prop change before the next effect invalidates a response even with unchanged sequence.
currentCondominiumId = "C";
assert.equal(applyInsurancePoliciesLoadResponse({
  data: [{ id: "policy-B", condominium_id: "B" }],
  requestedCondominiumId: "B",
  currentCondominiumId,
  requestSequence: 2,
  currentRequestSequence: 2,
  setPolicies,
}), false);
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

// Verify the guard is wired into the active local component and loading state.
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const start = main.lastIndexOf("function InsurancePoliciesSection(");
assert.ok(start >= 0, "active InsurancePoliciesSection must exist");
const section = main.slice(start, start + 10000);
assert.match(main, /applyInsurancePoliciesLoadFailure/);
assert.match(section, /const insurancePolicyLoadSequence = useRef\(0\)/);
assert.match(section, /currentCondominiumIdRef\.current = condominiumId/);
assert.match(section, /const requestSequence = \+\+insurancePolicyLoadSequence\.current/);
assert.match(section, /applyInsurancePoliciesLoadResponse\(/);
assert.match(section, /const \[policiesCondominiumId, setPoliciesCondominiumId\]/);
assert.match(section, /const \[loadError, setLoadError\]/);
assert.match(section, /const visiblePolicies = selectVisibleInsurancePolicies/);
assert.match(section, /const visibleLoadError = loadErrorCondominiumId === condominiumId/);
assert.match(section, /applyInsurancePoliciesLoadFailure\(/);
assert.match(section, /if \(condominiumError\) throw condominiumError/);
assert.match(section, /role="alert"/);
assert.match(section, /visiblePolicies\.map\(/);
assert.match(section, /currentCondominiumId:\s*currentCondominiumIdRef\.current/);
assert.match(section, /currentRequestSequence:\s*insurancePolicyLoadSequence\.current/);
assert.match(section, /if\s*\(requestSequence === insurancePolicyLoadSequence\.current\s*&&/);
assert.match(section, /return\s*\(\)\s*=>\s*\{\s*insurancePolicyLoadSequence\.current\s*\+=\s*1/s);
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(packageJson.scripts.test, /test-active-insurance-policy-load-race\.mjs/);
console.log("Insurance policy stale-load runtime regression: PASS (legacy race reproduced with deferred responses; stale/current response, prop change, malformed/empty data, and component wiring).");
