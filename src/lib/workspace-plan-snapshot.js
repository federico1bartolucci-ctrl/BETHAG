const VALID_WORKSPACE_PLANS = new Set(["free", "plus", "professional", "portal"]);

/**
 * Applies a server-owned workspace plan only if the request still belongs to
 * the active effect. The currentness check must happen after the async read:
 * an older workspace response must never overwrite a newer workspace plan.
 */
export async function applyWorkspacePlanSnapshot({
  loadPlan,
  isCurrent,
  setServerWorkspacePlan,
  setSubscription,
}) {
  if (typeof loadPlan !== "function" || typeof isCurrent !== "function") {
    throw new TypeError("Workspace plan loader and currentness guard are required.");
  }

  if (!isCurrent()) return { applied: false, reason: "stale-before-read" };

  const rawPlan = await loadPlan();

  if (!isCurrent()) return { applied: false, reason: "stale-after-read" };

  const plan = typeof rawPlan === "string" ? rawPlan.trim().toLowerCase() : "";
  if (!VALID_WORKSPACE_PLANS.has(plan)) {
    return { applied: false, reason: "invalid-plan" };
  }

  setServerWorkspacePlan(plan);
  setSubscription((current) => current?.plan === plan ? current : { ...current, plan });

  return { applied: true, plan };
}
