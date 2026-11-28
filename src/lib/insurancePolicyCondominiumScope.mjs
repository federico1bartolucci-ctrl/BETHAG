export async function resolveInsurancePolicyCondominium({ client, workspaceId, legacyCondominiumId }) {
  if (!client || typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new Error("Workspace del condominio obbligatorio: risoluzione polizza interrotta.");
  }
  const legacyId = Number(legacyCondominiumId);
  if (!Number.isSafeInteger(legacyId) || legacyId < 1) {
    throw new Error("ID legacy del condominio non valido: risoluzione polizza interrotta.");
  }

  const { data, error } = await client
    .from("condominiums")
    .select("id, workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("legacy_id", legacyId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id || String(data.workspace_id) !== workspaceId) {
    throw new Error("Condominio non trovato nel workspace selezionato.");
  }
  return data;
}
