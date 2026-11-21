export async function updateWorkProgressPercentOrReport(client, workspaceId, workId, percentage) {
  const { data, error } = await client
    .from("condominium_works")
    .update({ progress_percent: percentage })
    .eq("id", workId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error) return error;
  if (!data?.id) return new Error("Intervento non trovato o non aggiornabile.");
  return null;
}
