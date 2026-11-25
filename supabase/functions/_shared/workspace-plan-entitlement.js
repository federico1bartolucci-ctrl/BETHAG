const PLAN_LEVELS = Object.freeze({
  free: 0,
  plus: 1,
  professional: 2,
  portal: 3,
});

/**
 * Checks the server-owned workspace plan using the caller's authenticated
 * Supabase client. Client-side subscription/add-on state is never trusted.
 */
export async function checkWorkspacePlanEntitlement(client, workspaceId, requiredPlan) {
  const requiredLevel = Object.prototype.hasOwnProperty.call(PLAN_LEVELS, requiredPlan)
    ? PLAN_LEVELS[requiredPlan]
    : undefined;

  if (!client || typeof workspaceId !== "string" || !workspaceId.trim() || requiredLevel === undefined) {
    return {
      allowed: false,
      status: 503,
      code: "WORKSPACE_PLAN_LOOKUP_FAILED",
      requiredPlan,
    };
  }

  try {
    const { data, error } = await client
      .from("workspaces")
      .select("plan")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) {
      return {
        allowed: false,
        status: 503,
        code: "WORKSPACE_PLAN_LOOKUP_FAILED",
        requiredPlan,
      };
    }

    const currentPlan = typeof data?.plan === "string"
      ? data.plan.trim().toLowerCase()
      : "";
    const currentLevel = Object.prototype.hasOwnProperty.call(PLAN_LEVELS, currentPlan)
      ? PLAN_LEVELS[currentPlan]
      : -1;

    if (currentLevel < requiredLevel) {
      return {
        allowed: false,
        status: 403,
        code: "WORKSPACE_PLAN_REQUIRED",
        currentPlan: currentPlan || null,
        requiredPlan,
      };
    }

    return {
      allowed: true,
      status: 200,
      code: "WORKSPACE_PLAN_ALLOWED",
      currentPlan,
      requiredPlan,
    };
  } catch {
    return {
      allowed: false,
      status: 503,
      code: "WORKSPACE_PLAN_LOOKUP_FAILED",
      requiredPlan,
    };
  }
}
