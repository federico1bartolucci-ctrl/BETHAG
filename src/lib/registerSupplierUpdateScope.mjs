export async function updateRegisterSupplierWithinScope({ client, currentWorkspaceId, currentCondominiumId, originalWorkspaceId, originalCondominiumId, supplierId, payload }) {
  if (!client || !supplierId || !originalWorkspaceId || !originalCondominiumId) {
    throw new Error("Contesto del fornitore incompleto: aggiornamento interrotto.");
  }
  if (String(currentWorkspaceId) !== String(originalWorkspaceId)
    || String(currentCondominiumId) !== String(originalCondominiumId)) {
    throw new Error("Il workspace o il condominio è cambiato. Aggiornamento del fornitore interrotto.");
  }
  const { data, error } = await client
    .from("condominium_suppliers")
    .update(payload)
    .eq("id", supplierId)
    .eq("workspace_id", originalWorkspaceId)
    .eq("condominium_id", originalCondominiumId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Fornitore non trovato nel workspace e condominio originali: nessuna modifica eseguita.");
  return data;
}
