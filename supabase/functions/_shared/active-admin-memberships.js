export const ACTIVE_ADMIN_MEMBERSHIP_PAGE_SIZE = 500;

/**
 * Read every active administrator membership for one Auth user.
 *
 * This check runs inside the delete-account Edge Function with the service-role
 * client so RLS cannot silently hide memberships. Exact counts and stable
 * ordering make PostgREST row caps safe; any incomplete or changing snapshot
 * fails closed rather than allowing account deletion to proceed.
 */
export async function listActiveAdminMemberships(supabaseAdmin, userId) {
  if (!supabaseAdmin || typeof supabaseAdmin.from !== "function") {
    throw new TypeError("Admin Supabase client is required to inspect workspace memberships.");
  }
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new TypeError("A valid user ID is required to inspect workspace memberships.");
  }

  const memberships = [];
  const seenWorkspaceIds = new Set();
  let expectedCount;
  let offset = 0;

  while (expectedCount === undefined || offset < expectedCount) {
    const { data, error, count } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id", { count: "exact" })
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("active", true)
      .order("workspace_id", { ascending: true })
      .range(offset, offset + ACTIVE_ADMIN_MEMBERSHIP_PAGE_SIZE - 1);

    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error("Workspace administrator membership query returned an invalid page.");
    }
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Workspace administrator membership query did not return an exact count.");
    }

    if (expectedCount === undefined) {
      expectedCount = count;
    } else if (count !== expectedCount) {
      throw new Error("Workspace administrator memberships changed during pagination; refusing account deletion.");
    }

    if (data.length > ACTIVE_ADMIN_MEMBERSHIP_PAGE_SIZE) {
      throw new Error("Workspace administrator membership page exceeded the requested range.");
    }
    if (data.length === 0 && offset < expectedCount) {
      throw new Error("Workspace administrator membership pagination ended before the exact count was reached.");
    }

    for (const row of data) {
      const workspaceId = row?.workspace_id;
      if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
        throw new Error("Workspace administrator membership page contains an invalid workspace ID.");
      }
      if (seenWorkspaceIds.has(workspaceId)) {
        throw new Error("Workspace administrator membership pagination returned a duplicate workspace.");
      }
      seenWorkspaceIds.add(workspaceId);
      memberships.push({ workspace_id: workspaceId });
    }

    offset += data.length;
    if (offset > expectedCount) {
      throw new Error("Workspace administrator membership pagination exceeded the exact count.");
    }
    if (offset === expectedCount) break;
  }

  return memberships;
}
