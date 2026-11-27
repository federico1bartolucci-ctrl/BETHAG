export async function updateRegisterItemWithinScope({
  client,
  currentWorkspaceId,
  currentCondominiumId,
  currentSelectedCondominium,
  originalWorkspaceId,
  originalCondominiumId,
  originalSelectedCondominium,
  itemId,
  payload,
}) {
  if (!client || !itemId || !originalWorkspaceId || !originalCondominiumId) {
    throw new Error("Contesto originale della voce incompleto: aggiornamento interrotto.");
  }

  // Check the selected legacy condominium as well as the resolved DB ID.
  // The DB ID can still refer to the previous selection while its async
  // resolver is pending after a condominium switch.
  if (String(currentWorkspaceId) !== String(originalWorkspaceId)
    || String(currentCondominiumId) !== String(originalCondominiumId)
    || currentSelectedCondominium !== originalSelectedCondominium) {
    throw new Error("Il workspace o il condominio selezionato è cambiato. Aggiornamento della voce del registro interrotto.");
  }

  if (String(payload?.workspace_id) !== String(originalWorkspaceId)
    || String(payload?.condominium_id) !== String(originalCondominiumId)) {
    throw new Error("Payload fuori ambito: aggiornamento della voce del registro interrotto.");
  }

  const { data, error } = await client
    .from("condominium_register_items")
    .update(payload)
    .eq("id", itemId)
    .eq("workspace_id", originalWorkspaceId)
    .eq("condominium_id", originalCondominiumId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id || String(data.id) !== String(itemId)) {
    throw new Error("Voce del registro non trovata nel workspace e condominio originali: nessuna modifica eseguita.");
  }
  return data;
}
