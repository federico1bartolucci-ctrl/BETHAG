const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_LEGACY_ID_BATCH_SIZE = 500;

function chunk(values, size) {
  const result = [];
  for (let offset = 0; offset < values.length; offset += size) result.push(values.slice(offset, offset + size));
  return result;
}

function normalizeLegacyIds(values) {
  if (!Array.isArray(values)) throw new Error("Elenco documenti non valido.");
  return Array.from(new Set(values.map((value) => {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      throw new Error("Riferimento documento non sicuro: eliminazione lavoro bloccata.");
    }
    const normalized = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
    if (!/^[0-9]+$/.test(normalized) || BigInt(normalized) <= 0n) {
      throw new Error("Riferimento documento non valido: eliminazione lavoro bloccata.");
    }
    return normalized;
  })));
}

export async function loadCondominiumWorkDeletionRows(client, table, workspaceId, workId, {
  legacyIds = null,
  select = "*",
  pageSize = DEFAULT_PAGE_SIZE,
  legacyIdBatchSize = DEFAULT_LEGACY_ID_BATCH_SIZE,
} = {}) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (![table, workspaceId, workId, select].every((value) => typeof value === "string" && value.trim())) throw new Error("Parametri di eliminazione lavoro non validi.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > DEFAULT_PAGE_SIZE) throw new Error("Dimensione pagina non valida.");
  if (!Number.isInteger(legacyIdBatchSize) || legacyIdBatchSize < 1 || legacyIdBatchSize > DEFAULT_PAGE_SIZE) throw new Error("Dimensione batch documenti non valida.");

  const batches = legacyIds === null
    ? [null]
    : chunk(normalizeLegacyIds(legacyIds), legacyIdBatchSize);
  if (legacyIds !== null && batches.length === 0) return [];

  const rows = [];
  const seenIds = new Set();
  for (const batch of batches) {
    let cursor = null;
    for (;;) {
      let query = client.from(table).select(select).eq("workspace_id", workspaceId);
      if (batch !== null) query = query.in("legacy_id", batch);
      else query = query.eq("work_id", workId);
      query = query.order("id", { ascending: true });
      if (cursor !== null) query = query.gt("id", cursor);
      const { data, error } = await query.range(0, pageSize - 1);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Pagina di eliminazione lavoro non valida.");
      const page = data;
      if (page.length > pageSize) throw new Error("Pagina di eliminazione lavoro oltre il limite.");
      for (const row of page) {
        if (row?.id === null || row?.id === undefined || !String(row.id).trim()) throw new Error("ID documento/lavoro mancante.");
        const rowId = String(row.id);
        if (!seenIds.has(rowId)) { seenIds.add(rowId); rows.push(row); }
      }
      if (page.length < pageSize) break;
      const lastId = page[page.length - 1]?.id;
      if (lastId === null || lastId === undefined || !String(lastId).trim()) throw new Error("Cursor eliminazione lavoro non valido.");
      const nextCursor = String(lastId);
      if (nextCursor === cursor) throw new Error("Cursor eliminazione lavoro non avanzato.");
      cursor = nextCursor;
    }
  }
  return rows;
}
