function validateOrderBy(orderBy) {
  if (typeof orderBy !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(orderBy)) {
    throw new Error("Colonna di ordinamento non valida.");
  }
}

function validateCursor(row) {
  const id = row?.id;
  if ((typeof id !== "string" && typeof id !== "number") ||
      !String(id).trim() ||
      (typeof id === "string" && !/^[A-Za-z0-9_-]+$/.test(id)) ||
      (typeof id === "number" && !Number.isSafeInteger(id))) {
    throw new Error("Cursor workspace non valido.");
  }
  return id;
}

function compareIds(left, right) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  const leftText = String(left);
  const rightText = String(right);
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

function compareOrderValues(left, right) {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;

  const leftText = String(left);
  const rightText = String(right);
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

function ensureSelectedColumns(select, requiredColumns) {
  if (typeof select !== "string" || !select.trim()) {
    throw new Error("Proiezione workspace non valida.");
  }

  const tokens = select.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.includes("*")) return { querySelect: select, addedColumns: [] };

  const addedColumns = [];
  for (const column of requiredColumns) {
    const alreadySelected = tokens.some((token) => token === column);
    if (!alreadySelected) {
      tokens.push(column);
      addedColumns.push(column);
    }
  }

  return { querySelect: tokens.join(", "), addedColumns };
}

export async function loadWorkspacePaginatedRows(
  client,
  table,
  workspaceId,
  { select = "*", orderBy = "created_at", pageSize = 1000, workspaceColumn = "workspace_id" } = {}
) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Dimensione pagina non valida.");
  validateOrderBy(orderBy);

  // Business dates such as entry_date, due_date and start_date are editable.
  // Using one as the pagination cursor can move an unread row behind the
  // cursor (omission) or move a read row ahead of it (duplicate). Page by the
  // immutable primary key, then apply the requested presentation order locally.
  const projection = ensureSelectedColumns(select, ["id", orderBy]);
  const rows = [];
  const seenIds = new Set();
  let cursor = null;

  for (;;) {
    let query = client
      .from(table)
      .select(projection.querySelect)
      .eq(workspaceColumn, workspaceId)
      .order("id", { ascending: true });

    if (cursor !== null) query = query.gt("id", cursor);

    const { data, error } = await query.range(0, pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Pagina workspace non valida.");
    const page = data;

    for (const row of page) {
      const id = validateCursor(row);
      const key = typeof id + ":" + String(id);
      if (seenIds.has(key)) throw new Error("La paginazione workspace ha restituito un ID duplicato.");
      seenIds.add(key);
      rows.push(row);
    }

    if (page.length < pageSize) break;

    const nextCursor = validateCursor(page[page.length - 1]);
    if (cursor !== null && compareIds(nextCursor, cursor) <= 0) {
      throw new Error("Il cursore workspace non avanza.");
    }
    cursor = nextCursor;
  }

  rows.sort((left, right) =>
    compareOrderValues(left?.[orderBy], right?.[orderBy]) ||
    compareIds(left?.id, right?.id)
  );

  const data = projection.addedColumns.length
    ? rows.map((row) => {
        const result = { ...row };
        for (const column of projection.addedColumns) delete result[column];
        return result;
      })
    : rows;

  return { data, error: null };
}
