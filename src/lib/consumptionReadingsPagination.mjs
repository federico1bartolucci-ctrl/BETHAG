const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGE_SIZE = 1000;

function isValidPeriodEnd(value) {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isStrictlyAfter(previous, next) {
  if (previous.period_end === null) {
    return next.period_end === null && next.id < previous.id;
  }
  if (next.period_end === null) return true;
  if (next.period_end < previous.period_end) return true;
  if (next.period_end > previous.period_end) return false;
  return next.id < previous.id;
}

export async function loadConsumptionReadings(client, workspaceId, pageSize = DEFAULT_PAGE_SIZE) {
  const scopedWorkspaceId = typeof workspaceId === "string" ? workspaceId.trim() : "";
  if (!client || typeof client.from !== "function") {
    throw new Error("Client Supabase non disponibile per il caricamento delle rilevazioni.");
  }
  if (!scopedWorkspaceId) {
    throw new Error("Workspace non disponibile per il caricamento delle rilevazioni.");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new Error("Dimensione pagina non valida per le rilevazioni di consumo.");
  }

  const rows = [];
  const seenIds = new Set();
  let cursor = null;
  let expectedTotal = null;
  let pageNumber = 0;

  while (true) {
    let query = client
      .from("condominium_consumption_readings")
      .select("*", { count: "exact" })
      .eq("workspace_id", scopedWorkspaceId)
      .order("period_end", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });

    if (cursor) {
      if (cursor.period_end === null) {
        query = query.is("period_end", null).lt("id", cursor.id);
      } else {
        query = query.or(
          `period_end.lt.${cursor.period_end},and(period_end.eq.${cursor.period_end},id.lt.${cursor.id}),period_end.is.null`
        );
      }
    }

    const { data, error, count } = await query.range(0, pageSize - 1);
    if (error) throw error;
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error("Conteggio esatto non disponibile: caricamento delle rilevazioni interrotto.");
    }
    if (expectedTotal === null) expectedTotal = count;

    const expectedRemaining = expectedTotal - rows.length;
    if (expectedRemaining < 0 || count !== expectedRemaining) {
      throw new Error("Le rilevazioni sono cambiate durante il caricamento. Aggiornare la pagina e riprovare.");
    }
    if (!Array.isArray(data)) {
      throw new Error("Risposta non valida durante il caricamento delle rilevazioni.");
    }
    if (data.length !== Math.min(pageSize, expectedRemaining)) {
      throw new Error("Risposta incompleta del server durante il caricamento delle rilevazioni.");
    }

    let previous = cursor;
    for (const row of data) {
      if (!row || typeof row !== "object" || typeof row.id !== "string" || !row.id.trim()) {
        throw new Error("Rilevazione priva di identificativo valido.");
      }
      if (row.workspace_id !== scopedWorkspaceId) {
        throw new Error("Rilevazione restituita fuori dal workspace richiesto.");
      }
      if (!isValidPeriodEnd(row.period_end)) {
        throw new Error("Data di fine periodo non valida in una rilevazione di consumo.");
      }
      if (seenIds.has(row.id)) {
        throw new Error("Rilevazione duplicata durante la paginazione.");
      }
      if (previous && !isStrictlyAfter(previous, row)) {
        throw new Error("Cursore non progressivo durante la paginazione delle rilevazioni.");
      }
      seenIds.add(row.id);
      rows.push(row);
      previous = row;
    }

    if (rows.length === expectedTotal) break;
    if (!data.length) {
      throw new Error("Paginazione interrotta prima di recuperare tutte le rilevazioni.");
    }

    const last = data[data.length - 1];
    const nextCursor = { period_end: last.period_end ?? null, id: last.id };
    if (cursor && nextCursor.period_end === cursor.period_end && nextCursor.id === cursor.id) {
      throw new Error("Cursore invariato durante la paginazione delle rilevazioni.");
    }
    cursor = nextCursor;
    pageNumber += 1;
    if (pageNumber > Math.ceil(expectedTotal / pageSize) + 1) {
      throw new Error("Limite di sicurezza della paginazione delle rilevazioni superato.");
    }
  }

  const { count: finalCount, error: finalCountError } = await client
    .from("condominium_consumption_readings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", scopedWorkspaceId);
  if (finalCountError) throw finalCountError;
  if (finalCount !== expectedTotal) {
    throw new Error("Il numero delle rilevazioni è cambiato durante il caricamento. Aggiornare la pagina e riprovare.");
  }

  return { data: rows, error: null };
}
