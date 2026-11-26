/**
 * Ask PostgreSQL to evaluate the last-active-admin invariant in one SQL
 * statement snapshot. The service-role-only RPC avoids offset-pagination
 * drift when memberships are replaced while a multi-page read is in flight.
 *
 * The workspace_members trigger remains authoritative if membership changes
 * after this precheck and before auth.admin.deleteUser().
 */
export async function hasLastActiveWorkspaceAdmin(supabaseAdmin, userId) {
  if (!supabaseAdmin || typeof supabaseAdmin.rpc !== "function") {
    throw new TypeError("Admin Supabase RPC client is required for the last-admin check.");
  }
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new TypeError("A valid user ID is required for the last-admin check.");
  }

  const { data, error } = await supabaseAdmin.rpc(
    "has_last_active_workspace_admin",
    { p_user_id: userId },
  );

  if (error) throw error;
  if (typeof data !== "boolean") {
    throw new Error("Last-admin precheck did not return a definitive boolean result.");
  }

  return data;
}
