export type PortalRegistrationRequestWorkspaceState<T = unknown> = {
  workspaceId: string;
  requests: T[];
  error: string | null;
};

export type PortalRegistrationRequestWorkspaceView<T = unknown> = {
  requests: T[];
  error: string | null;
};

/**
 * Never expose a request snapshot or error produced for another workspace.
 * This also hides the previous workspace immediately during a workspace switch,
 * before React runs the effect that starts the next request.
 */
export function getPortalRegistrationRequestWorkspaceView<T>(
  state: PortalRegistrationRequestWorkspaceState<T> | null | undefined,
  workspaceId: string | null | undefined,
): PortalRegistrationRequestWorkspaceView<T> {
  if (!workspaceId || !state || state.workspaceId !== workspaceId) {
    return { requests: [], error: null };
  }

  return {
    requests: Array.isArray(state.requests) ? state.requests : [],
    error: typeof state.error === "string" && state.error.trim() ? state.error : null,
  };
}
