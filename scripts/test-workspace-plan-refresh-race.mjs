import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyWorkspacePlanSnapshot } from "../src/lib/workspace-plan-snapshot.js";

let serverPlan = "portal";
let subscription = { plan: "portal", addons: ["documenti"] };
const setServerWorkspacePlan = (plan) => { serverPlan = plan; };
const setSubscription = (update) => {
  subscription = typeof update === "function" ? update(subscription) : update;
};

let oldRequestCurrent = true;
let resolveOldPlan;
const oldWorkspaceRequest = applyWorkspacePlanSnapshot({
  loadPlan: () => new Promise((resolve) => { resolveOldPlan = resolve; }),
  isCurrent: () => oldRequestCurrent,
  setServerWorkspacePlan,
  setSubscription,
});

const currentWorkspaceResult = await applyWorkspacePlanSnapshot({
  loadPlan: async () => "free",
  isCurrent: () => true,
  setServerWorkspacePlan,
  setSubscription,
});
assert.deepEqual(currentWorkspaceResult, { applied: true, plan: "free" });
assert.equal(serverPlan, "free");
assert.equal(subscription.plan, "free");
assert.deepEqual(subscription.addons, ["documenti"]);

oldRequestCurrent = false;
resolveOldPlan("portal");
const staleWorkspaceResult = await oldWorkspaceRequest;
assert.deepEqual(staleWorkspaceResult, { applied: false, reason: "stale-after-read" });
assert.equal(serverPlan, "free", "a late Portal response from the previous workspace must not overwrite the current Free plan");
assert.equal(subscription.plan, "free", "a late response must not rewrite the cached subscription plan");

let staleLoaderCalled = false;
const alreadyStale = await applyWorkspacePlanSnapshot({
  loadPlan: async () => {
    staleLoaderCalled = true;
    return "professional";
  },
  isCurrent: () => false,
  setServerWorkspacePlan,
  setSubscription,
});
assert.deepEqual(alreadyStale, { applied: false, reason: "stale-before-read" });
assert.equal(staleLoaderCalled, false);

const invalidPlan = await applyWorkspacePlanSnapshot({
  loadPlan: async () => "enterprise",
  isCurrent: () => true,
  setServerWorkspacePlan,
  setSubscription,
});
assert.deepEqual(invalidPlan, { applied: false, reason: "invalid-plan" });
assert.equal(serverPlan, "free");

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(mainSource, /applyWorkspacePlanSnapshot/);
assert.match(mainSource, /isCurrent:\s*\(\)\s*=>\s*!cancelled/);
assert.ok(
  (mainSource.match(/applyWorkspacePlanSnapshot\(/g) ?? []).length >= 3,
  "initial plan lookup, authenticated hydration and workspace refresh must all use the guarded helper",
);
assert.doesNotMatch(
  mainSource,
  /setServerWorkspacePlan\(persistedPlan as PlanId\)/,
  "workspace refresh paths must not write the plan before checking request freshness",
);

console.log("PASS workspace-plan refresh runtime regression: a late response from a previous workspace cannot overwrite the current server-owned plan.");
console.log("PASS stale requests are ignored before and after the asynchronous plan lookup.");
console.log("PASS invalid server plan values do not replace the current entitlement snapshot.");
