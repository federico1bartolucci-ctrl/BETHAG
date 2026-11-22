export async function loadWorkspacePaginatedRows(client, table, workspaceId, { select = "*", orderBy = "created_at", pageSize = 1000 } = {}) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Dimensione pagina non valida.");

  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .eq("workspace_id", workspaceId)
      .order(orderBy, { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}
