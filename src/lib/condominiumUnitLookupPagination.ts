export async function loadCondominiumUnitsForLookup(client: any, condominiumId: string, columns = "id, unit_code, building_code, lifecycle_status", workspaceId?: string) {
  if (!condominiumId) return [];
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client
      .from("condominium_units")
      .select(columns)
      .eq("condominium_id", condominiumId);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
