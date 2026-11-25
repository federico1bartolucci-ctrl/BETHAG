import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyWorkspacePlanSnapshot } from "../src/lib/workspace-plan-snapshot.js";

let subscription = { plan: "portal", addons: ["documenti"] };
const setSubscription = (update) => {
  subscription = typeof update === "function" ? update(subscription) : update;
};

let oldRequestCurrent = true;
let resolveOldPlan;
const oldWorkspaceRequest = applyWorkspacePlanSnapshot({
  loadPlan: () => new Promise((resolve) => { resolveOldPlan = resolve; }),
  isCurrent: () => oldRequestCurrent,
  setSubscription,
});

const currentWorkspaceResult = await applyWorkspacePlanSnapshot({
  loadPlan: async () => "free",
  isCurrent: () => true,
  setSubscription,
});
assert.deepEqual(currentWorkspaceResult, { applied: true, plan: "free" });
assert.equal(subscription.plan, "free");
assert.deepEqual(subscription.addons, ["documenti"]);

oldRequestCurrent = false;
resolveOldPlan("portal");
const staleWorkspaceResult = await oldWorkspaceRequest;
assert.deepEqual(staleWorkspaceResult, { applied: false, reason: "stale-after-read" });
assert.equal(subscription.plan, "free", "a late Portal response from the previous workspace must not overwrite the current Free plan");

let serverPlan = "free";
const withServerPlanState = await applyWorkspacePlanSnapshot({
  loadPlan: async () => "professional",
  isCurrent: () => true,
  setServerWorkspacePlan: (plan) => { serverPlan = plan; },
  setSubscription,
});
assert.deepEqual(withServerPlanState, { applied: true, plan: "professional" });
assert.equal(serverPlan, "professional");
assert.equal(subscription.plan, "professional");

let staleLoaderCalled = false;
const alreadyStale = await applyWorkspacePlanSnapshot({
  loadPlan: async () => {
    staleLoaderCalled = true;
    return "portal";
  },
  isCurrent: () => false,
  setSubscription,
});
assert.deepEqual(alreadyStale, { applied: false, reason: "stale-before-read" });
assert.equal(staleLoaderCalled, false);

const invalidPlan = await applyWorkspacePlanSnapshot({
  loadPlan: async () => "enterprise",
  isCurrent: () => true,
  setSubscription,
});
assert.deepEqual(invalidPlan, { applied: false, reason: "invalid-plan" });
assert.equal(subscription.plan, "professional");

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(mainSource, /applyWorkspacePlanSnapshot/);
assert.match(mainSource, /isCurrent:\s*\(\)\s*=>\s*!cancelled/);
assert.ok(
  (mainSource.match(/applyWorkspacePlanSnapshot\(/g) ?? []).length >= 3,
  "initial plan lookup, authenticated hydration and navigation refresh must all use the guarded helper",
);
assert.doesNotMatch(
  mainSource,
  /setSubscription\(\(current\) => \(\{ \.\.\.current, plan: persistedPlan as PlanId \}\)\)/,
  "workspace refresh paths must not update the cached plan outside the cancellation-aware helper",
);

console.log("PASS workspace-plan refresh runtime regression: a late response from a previous workspace cannot overwrite the current server-owned plan.");
console.log("PASS stale requests are ignored before and after the asynchronous plan lookup.");
console.log("PASS invalid server plan values do not replace the current entitlement snapshot.");
