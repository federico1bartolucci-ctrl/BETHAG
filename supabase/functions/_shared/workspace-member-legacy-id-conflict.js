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
 * Compensate a collaborator invitation that has not reached a linked
 * workspace_members row. A newly invited Auth user is removed (which also
 * cascades its newly created profile); an existing Auth user is never deleted.
 * A profile created for an existing Auth user is removed only when it was
 * created by this request. Once the membership is linked, no destructive
 * compensation is attempted.
 */
export async function cleanupUnlinkedCollaboratorInvite(
  adminClient,
  targetUserId,
  { invited, profileCreated, workspaceMemberLinked = false },
) {
  if (workspaceMemberLinked) return { failed: false, action: "none" };

  if (!targetUserId) {
    if (invited) return { failed: true, action: "delete_auth_user_unavailable" };
    if (profileCreated) return { failed: true, action: "delete_created_profile_unavailable" };
    return { failed: false, action: "none" };
  }

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

/**
 * Backward-compatible name used by the existing unique-legacy-ID regression.
 */
export async function cleanupCollaboratorInviteLegacyConflict(
  adminClient,
  targetUserId,
  state,
) {
  return cleanupUnlinkedCollaboratorInvite(adminClient, targetUserId, state);
}
