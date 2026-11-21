export async function loadPaginatedWorkspaceRows(
  client: any,
  workspaceId: string,
  table: string,
  orderBy: string | null = null
): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client.from(table).select("*").eq("workspace_id", workspaceId);
    if (orderBy) query = query.order(orderBy, { ascending: true });
    if (orderBy !== "id") query = query.order("id", { ascending: true });
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}
