function validateOrderBy(orderBy) {
  if (typeof orderBy !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(orderBy)) {
    throw new Error("Colonna di ordinamento non valida.");
  }
}

function validateFilters(filters, workspaceColumn) {
  if (filters == null) return [];
  if (typeof filters !== "object" || Array.isArray(filters)) throw new Error("Filtri workspace non validi.");
  const entries = Object.entries(filters);
  for (const [column, value] of entries) {
    validateOrderBy(column);
    if (column === workspaceColumn) throw new Error("Filtro workspace duplicato.");
    if (value === null || !["string", "number", "boolean"].includes(typeof value) ||
        (typeof value === "number" && !Number.isFinite(value))) {
      throw new Error("Valore filtro workspace non valido.");
    }
  }
  return entries;
}

function encodeCursorValue(value) {
  if (typeof value !== "string") return String(value);
  if (/^\\d{4}-\\d{2}-\\d{2}(?:[Tt ][0-9:.+-]+(?:Z|z)?)?$/.test(value)) return value;
  return '"' + value.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\"') + '"';
}

function validateCursor(row, orderBy) {
  const id = row?.id;
  if ((typeof id !== "string" && typeof id !== "number") || !String(id).trim() || !/^[A-Za-z0-9_-]+$/.test(String(id))) {
    throw new Error("Cursor workspace non valido.");
  }
  const value = row[orderBy];
  if (value !== null && (typeof value === "undefined" ||
      !["string", "number", "boolean"].includes(typeof value) ||
      (typeof value === "number" && !Number.isFinite(value)))) {
    throw new Error("Valore cursor workspace non valido.");
  }
  return { value: value ?? null, id: String(id) };
}

export async function loadWorkspacePaginatedRows(client, table, workspaceId, {
  select = "*", orderBy = "created_at", pageSize = 1000, workspaceColumn = "workspace_id", filters = {},
} = {}) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Dimensione pagina non valida.");
  validateOrderBy(orderBy);
  const filterEntries = validateFilters(filters, workspaceColumn);
  const rows = [];
  let cursor = null;
  for (;;) {
    let query = client.from(table).select(select).eq(workspaceColumn, workspaceId);
    for (const [column, value] of filterEntries) query = query.eq(column, value);
    query = query.order(orderBy, { ascending: true, nullsFirst: false }).order("id", { ascending: true });
    if (cursor) {
      if (cursor.value === null) query = query.is(orderBy, null).gt("id", cursor.id);
      else {
        const encoded = encodeCursorValue(cursor.value);
        query = query.or(`${orderBy}.gt.${encoded},and(${orderBy}.eq.${encoded},id.gt.${cursor.id}),${orderBy}.is.null`);
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
