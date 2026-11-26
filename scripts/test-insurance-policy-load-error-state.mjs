import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyInsurancePoliciesLoadFailure,
  selectVisibleInsurancePolicies,
} from "../src/lib/insurancePolicyLoadState.mjs";

// Old rows must disappear immediately when the component's condominium prop changes,
// even before the new effect has completed its cleanup and load.
const oldRows = [{ id: "policy-A", condominium_id: "A" }];
assert.deepEqual(selectVisibleInsurancePolicies({
  policies: oldRows,
  policiesCondominiumId: "A",
  condominiumId: "B",
}), [], "previous condominium rows must never be rendered in the new context");
const currentRows = [{ id: "policy-B", condominium_id: "B" }];
assert.deepEqual(selectVisibleInsurancePolicies({
  policies: currentRows,
  policiesCondominiumId: "B",
  condominiumId: "B",
}), currentRows);

// A current request failure clears prior rows and displays an actionable error
// associated with the requested condominium.
let policies = oldRows;
let policiesScope = "A";
let error = null;
let errorScope = null;
const applied = applyInsurancePoliciesLoadFailure({
  error: { message: "permission denied" },
  isCurrent: () => true,
  requestedCondominiumId: "B",
  setPolicies: (value) => { policies = value; },
  setPoliciesCondominiumId: (value) => { policiesScope = value; },
  setLoadError: (value) => { error = value; },
  setLoadErrorCondominiumId: (value) => { errorScope = value; },
});
assert.equal(applied, true);
assert.deepEqual(policies, []);
assert.equal(policiesScope, "B");
assert.equal(error, "permission denied");
assert.equal(errorScope, "B");

// A stale failure cannot clear the newer condominium's rows or replace its error.
policies = currentRows;
policiesScope = "B";
error = null;
errorScope = null;
const stale = applyInsurancePoliciesLoadFailure({
  error: new Error("old A request failed"),
  isCurrent: () => false,
  requestedCondominiumId: "A",
  setPolicies: (value) => { policies = value; },
  setPoliciesCondominiumId: (value) => { policiesScope = value; },
  setLoadError: (value) => { error = value; },
  setLoadErrorCondominiumId: (value) => { errorScope = value; },
});
assert.equal(stale, false);
assert.deepEqual(policies, currentRows);
assert.equal(policiesScope, "B");
assert.equal(error, null);
assert.equal(errorScope, null);

// Empty or malformed errors receive a useful fallback.
let fallback = null;
applyInsurancePoliciesLoadFailure({
  error: {},
  isCurrent: () => true,
  requestedCondominiumId: "C",
  setPolicies: () => {},
  setPoliciesCondominiumId: () => {},
  setLoadError: (value) => { fallback = value; },
  setLoadErrorCondominiumId: () => {},
});
assert.equal(fallback, "Impossibile caricare le polizze assicurative. Riprova.");

// The active inline and standalone components both scope visible rows and surface failures.
const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const activeStart = main.lastIndexOf("function InsurancePoliciesSection(");
assert.ok(activeStart >= 0, "active inline InsurancePoliciesSection exists");
const active = main.slice(activeStart, activeStart + 18000);
assert.match(main, /import \{ applyInsurancePoliciesLoadFailure, selectVisibleInsurancePolicies \} from ["']\.\/lib\/insurancePolicyLoadState\.mjs["']/);
assert.match(active, /const \[policiesCondominiumId, setPoliciesCondominiumId\]/);
assert.match(active, /const \[loadError, setLoadError\]/);
assert.match(active, /const visiblePolicies = selectVisibleInsurancePolicies/);
assert.match(active, /applyInsurancePoliciesLoadFailure\(/);
assert.match(active, /role="alert"/);
assert.match(active, /visiblePolicies\.map\(/);

const standalone = await readFile(new URL("../src/InsurancePoliciesSection.tsx", import.meta.url), "utf8");
assert.match(standalone, /selectVisibleInsurancePolicies/);
assert.match(standalone, /policiesCondominiumId/);
assert.match(standalone, /applyInsurancePoliciesLoadFailure\(/);
assert.match(standalone, /visiblePolicies\.map\(/);
assert.match(standalone, /error &&/);

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.match(packageJson.scripts.test, /test-insurance-policy-load-error-state\.mjs/);
console.log("Insurance policy load-error and stale-scope regression: PASS");
