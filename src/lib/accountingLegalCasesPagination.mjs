const TABLE = "condominium_legal_cases";

export async function loadAccountingLegalCases(client, workspaceId, pageSize = 1000) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error("Dimensione pagina non valida.");

  const rows = [];
  let cursor = null;
  for (;;) {
    let query = client.from(TABLE).select("*").eq("workspace_id", workspaceId)
      .order("opened_date", { ascending: false, nullsFirst: false }).order("id", { ascending: true });
    if (cursor) {
      if (cursor.openedDate === null) query = query.is("opened_date", null).gt("id", cursor.id);
      else query = query.or(`opened_date.lt.${cursor.openedDate},and(opened_date.eq.${cursor.openedDate},id.gt.${cursor.id}),opened_date.is.null`);
    }
    const { data, error } = await query.range(0, pageSize - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    if (page.length === 0) return { data: rows, error: null };
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
    const last = page[page.length - 1];
    if (!last?.id || (last.opened_date !== null && typeof last.opened_date !== "string")) return { data: null, error: new Error("Cursor legal case non valido.") };
    cursor = { openedDate: last.opened_date ?? null, id: last.id };
  }
}
