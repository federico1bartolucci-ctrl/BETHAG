export async function loadWorkspaceRowsForState(client: any, workspaceId: string, table: string, columns = "*", orderBy = "created_at", filters: Array<[string, any]> = []) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client.from(table).select(columns).eq("workspace_id", workspaceId);
    for (const [column, value] of filters) query = query.eq(column, value);
    const { data, error } = await query
      .order(orderBy, { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return { data: rows, error: null };
}
