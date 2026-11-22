export function resolveUniqueWorkspaceId(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Le associazioni al portale non sono valide.");
  }

  const workspaceIds = new Set();
  for (const row of rows) {
    const workspaceId = typeof row?.workspace_id === "string"
      ? row.workspace_id.trim()
      : "";
    if (!workspaceId) {
      throw new Error("Un'associazione al portale non contiene il workspace.");
    }
    workspaceIds.add(workspaceId);
    if (workspaceIds.size > 1) {
      throw new Error(
        "Questo account è associato a più workspace. Contatta l'amministratore per scegliere il workspace corretto."
      );
    }
  }

  return workspaceIds.size ? workspaceIds.values().next().value : null;
}
