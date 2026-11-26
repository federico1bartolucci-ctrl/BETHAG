export const LAST_ACTIVE_WORKSPACE_ADMIN_MESSAGE =
  "Non puoi eliminare il profilo perché sei l'unico amministratore attivo di un workspace. Prima nomina un altro amministratore o trasferisci la gestione.";

export function createDeleteAccountFailureResponse(
  error,
  { lastActiveWorkspaceAdmin = false } = {},
) {
  const message = typeof error?.message === "string" ? error.message : "";

  if (
    lastActiveWorkspaceAdmin ||
    message.includes("LAST_ACTIVE_WORKSPACE_ADMIN")
  ) {
    return Response.json(
      { error: LAST_ACTIVE_WORKSPACE_ADMIN_MESSAGE },
      { status: 409 },
    );
  }

  return Response.json(
    {
      error: message.trim() || "Impossibile eliminare il profilo.",
    },
    { status: 500 },
  );
}
