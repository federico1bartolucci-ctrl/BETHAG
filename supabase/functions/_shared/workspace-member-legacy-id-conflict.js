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
