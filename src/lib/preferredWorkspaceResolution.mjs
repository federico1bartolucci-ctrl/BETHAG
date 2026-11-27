export function resolveActiveWorkspaceId(preferredWorkspaceId, preferredMembership, fallbackMembership) {
  const hasPreferredWorkspace = preferredWorkspaceId !== undefined && preferredWorkspaceId !== null;

  if (hasPreferredWorkspace) {
    const requestedWorkspaceId = typeof preferredWorkspaceId === "string"
      ? preferredWorkspaceId.trim()
      : "";
    if (!requestedWorkspaceId) return null;

    const matchedWorkspaceId = typeof preferredMembership?.workspace_id === "string"
      ? preferredMembership.workspace_id.trim()
      : "";
    return matchedWorkspaceId === requestedWorkspaceId ? requestedWorkspaceId : null;
  }

  const fallbackWorkspaceId = typeof fallbackMembership?.workspace_id === "string"
    ? fallbackMembership.workspace_id.trim()
    : "";
  return fallbackWorkspaceId || null;
}
