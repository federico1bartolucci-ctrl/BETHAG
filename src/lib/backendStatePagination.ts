export async function loadWorkspaceRowsForState(client: any, workspaceId: string, table: string, columns = "*", orderBy = "created_at") {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .eq("workspace_id", workspaceId)
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
