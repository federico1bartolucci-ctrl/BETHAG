const CONDOMINIUM_UNIT_PAGE_SIZE = 1000;

export async function loadCondominiumUnitRows(client, condominiumId, columns, workspaceId = null) {
  const rows = [];
  for (let offset = 0; ; offset += CONDOMINIUM_UNIT_PAGE_SIZE) {
    let query = client
      .from("condominium_units")
      .select(columns)
      .eq("condominium_id", condominiumId);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + CONDOMINIUM_UNIT_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < CONDOMINIUM_UNIT_PAGE_SIZE) break;
  }
  return rows;
}
