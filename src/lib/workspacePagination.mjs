function validateOrderBy(orderBy) {
  if (typeof orderBy !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(orderBy)) {
    throw new Error("Colonna di ordinamento non valida.");
  }
}

function validateCursor(row, orderBy) {
  const id = row?.id;
  if ((typeof id !== "string" && typeof id !== "number") || !String(id).trim() || !/^[A-Za-z0-9_-]+$/.test(String(id))) {
    throw new Error("Cursor workspace non valido.");
  }
  const value = row[orderBy];
  if (value !== null && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-]+(?:Z|z)?)?$/.test(value))) {
    throw new Error("Valore cursor workspace non valido.");
  }
  return { value: value ?? null, id: String(id) };
}

export async function loadWorkspacePaginatedRows(client, table, workspaceId, { select = "*", orderBy = "created_at", pageSize = 1000 } = {}) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Dimensione pagina non valida.");
  validateOrderBy(orderBy);

  const rows = [];
  let cursor = null;
  for (;;) {
    let query = client
      .from(table)
      .select(select)
      .eq("workspace_id", workspaceId)
      .order(orderBy, { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
    if (cursor) {
      if (cursor.value === null) {
        query = query.is(orderBy, null).gt("id", cursor.id);
      } else {
        query = query.or(`${orderBy}.gt.${cursor.value},and(${orderBy}.eq.${cursor.value},id.gt.${cursor.id}),${orderBy}.is.null`);
      }
    }
    const { data, error } = await query.range(0, pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
    cursor = validateCursor(page[page.length - 1], orderBy);
  }
}
