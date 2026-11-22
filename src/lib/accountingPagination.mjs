export async function loadWorkspacePaginatedRows(client, table, workspaceId, options = {}) {
  const { select = "*", orderBy = [], pageSize = 1000 } = options;
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Dimensione pagina non valida.");
  const orders = orderBy.length ? orderBy.slice() : [{ column: "id", ascending: true }];
  if (!orders.some(({ column }) => column === "id")) orders.push({ column: "id", ascending: true });
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from(table).select(select).eq("workspace_id", workspaceId);
    for (const order of orders) {
      const config = { ascending: order.ascending !== false };
      if (typeof order.nullsFirst === "boolean") config.nullsFirst = order.nullsFirst;
      query = query.order(order.column, config);
    }
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}
