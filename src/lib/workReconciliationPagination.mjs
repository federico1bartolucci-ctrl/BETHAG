const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_LEGACY_ID_BATCH_SIZE = 500;

function chunk(values, size) {
  const batches = [];
  for (let offset = 0; offset < values.length; offset += size) batches.push(values.slice(offset, offset + size));
  return batches;
}

export async function loadCondominiumWorkReconciliationRows(
  client,
  table,
  workspaceId,
  {
    condominiumId = null,
    workId = null,
    direction = null,
    legacyIds = null,
    select = "*",
    pageSize = DEFAULT_PAGE_SIZE,
    legacyIdBatchSize = DEFAULT_LEGACY_ID_BATCH_SIZE,
  } = {},
) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof table !== "string" || !table.trim()) throw new Error("Tabella di riconciliazione non valida.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (typeof select !== "string" || !select.trim()) throw new Error("Colonne di riconciliazione non valide.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > DEFAULT_PAGE_SIZE) throw new Error("Dimensione pagina non valida.");
  if (!Number.isInteger(legacyIdBatchSize) || legacyIdBatchSize < 1 || legacyIdBatchSize > DEFAULT_PAGE_SIZE) throw new Error("Dimensione batch documenti non valida.");

  const legacyIdBatches = legacyIds === null
    ? [null]
    : Array.isArray(legacyIds)
      ? chunk(Array.from(new Map(legacyIds.map((value) => [String(value), value])).values()), legacyIdBatchSize)
      : (() => { throw new Error("Elenco documenti non valido."); })();
  if (legacyIds !== null && legacyIdBatches.length === 0) return [];

  const rows = [];
  const seenIds = new Set();
  for (const batch of legacyIdBatches) {
    let cursor = null;
    for (;;) {
      let query = client.from(table).select(select).eq("workspace_id", workspaceId);
      if (condominiumId !== null && condominiumId !== undefined) query = query.eq("condominium_id", condominiumId);
      if (workId !== null && workId !== undefined) query = query.eq("work_id", workId);
      if (direction !== null && direction !== undefined) query = query.eq("direction", direction);
      if (batch !== null) query = query.in("legacy_id", batch);
      query = query.order("id", { ascending: true });
      if (cursor !== null) query = query.gt("id", cursor);

      const { data, error } = await query.range(0, pageSize - 1);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Pagina di riconciliazione non valida: atteso un array.");
      const page = data;
      if (page.length > pageSize) throw new Error("Pagina di riconciliazione oltre il limite.");
      for (const row of page) {
        if (row?.id === null || row?.id === undefined || !String(row.id).trim()) throw new Error("ID di riconciliazione mancante.");
        const id = String(row.id);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          rows.push(row);
        }
      }
      if (page.length < pageSize) break;
      const lastId = page[page.length - 1]?.id;
      if (lastId === null || lastId === undefined || !String(lastId).trim()) throw new Error("Cursor di riconciliazione non valido.");
      const nextCursor = String(lastId);
      if (nextCursor === cursor) throw new Error("Cursor di riconciliazione non avanzato.");
      cursor = nextCursor;
    }
  }
  return rows;
}
