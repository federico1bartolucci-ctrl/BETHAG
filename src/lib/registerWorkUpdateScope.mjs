export async function updateRegisterWorkWithinScope({
  client,
  currentWorkspaceId,
  currentCondominiumId,
  currentSelectedCondominium,
  originalWorkspaceId,
  originalCondominiumId,
  originalSelectedCondominium,
  workId,
  payload,
}) {
  if (!client || !workId || !originalWorkspaceId || !originalCondominiumId) {
    throw new Error("Contesto originale del lavoro incompleto: aggiornamento interrotto.");
  }

  // Check the selected legacy condominium as well as the resolved database ID.
  // The resolved ID can still refer to the previous selection while its async
  // resolver is pending after a condominium switch.
  if (String(currentWorkspaceId) !== String(originalWorkspaceId)
    || String(currentCondominiumId) !== String(originalCondominiumId)
    || currentSelectedCondominium !== originalSelectedCondominium) {
    throw new Error("Il workspace o il condominio selezionato è cambiato. Aggiornamento del lavoro interrotto.");
  }

  if (String(payload?.workspace_id) !== String(originalWorkspaceId)
    || String(payload?.condominium_id) !== String(originalCondominiumId)) {
    throw new Error("Payload fuori ambito: aggiornamento del lavoro interrotto.");
  }

  const { data, error } = await client
    .from("condominium_works")
    .update(payload)
    .eq("id", workId)
    .eq("workspace_id", originalWorkspaceId)
    .eq("condominium_id", originalCondominiumId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data?.id || String(data.id) !== String(workId)) {
    throw new Error("Lavoro non trovato nel workspace e condominio originali: nessuna modifica eseguita.");
  }
  return data;
}
