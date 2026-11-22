export async function loadWorkspaceMillesimalValues(client, workspaceId) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("condominium_millesimal_values")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("table_id", { ascending: true })
      .order("unit_id", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return { data: rows, error: null };
}
