export const WORKSPACE_MEMBER_LEGACY_ID_UNIQUE_INDEX =
  "workspace_members_workspace_legacy_unique";

export function isWorkspaceMemberLegacyIdConflict(error) {
  if (String(error?.code || "") !== "23505") return false;
  const diagnostic = [
    error?.message,
    error?.details,
    error?.hint,
  ].filter(Boolean).join(" ");
  return diagnostic.includes(WORKSPACE_MEMBER_LEGACY_ID_UNIQUE_INDEX);
}

/**
 * Remove an Auth invitation or a profile created for a request that lost the
 * existing workspace legacy-identity unique-index race. Existing users and
 * profiles are never deleted.
 */
export async function cleanupCollaboratorInviteLegacyConflict(
  adminClient,
  targetUserId,
  { invited, profileCreated },
) {
  try {
    if (invited) {
      const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
      return { failed: Boolean(error), action: "delete_auth_user" };
    }
    if (profileCreated) {
      const { error } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", targetUserId);
      return { failed: Boolean(error), action: "delete_created_profile" };
    }
    return { failed: false, action: "none" };
  } catch {
    return {
      failed: true,
      action: invited ? "delete_auth_user" : profileCreated ? "delete_created_profile" : "none",
    };
  }
}
