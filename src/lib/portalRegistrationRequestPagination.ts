export async function loadPortalRegistrationRequests(client: any, workspaceId: string) {
  if (!workspaceId) return [];
  const statusFilter = ["pending", "email_mismatch"];
  const [assigned, unassigned] = await Promise.all([
    loadPages(() => client
      .from("portal_registration_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("status", statusFilter)),
    // RLS returns only unassigned requests whose condominium name matches
    // a condominium managed by this workspace. These requests need manual
    // resolution when identical names exist across different workspaces.
    loadPages(() => client
      .from("portal_registration_requests")
      .select("*")
      .is("workspace_id", null)
      .in("status", statusFilter)),
  ]);
  return [...assigned, ...unassigned]
    .sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || "")) ||
      compareIds(a.id, b.id)
    );
}

function compareIds(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function validateCursor(row: any) {
  const id = row?.id;
  if ((typeof id !== "string" && typeof id !== "number") ||
      !String(id).trim() ||
      (typeof id === "string" && !/^[A-Za-z0-9_-]+$/.test(id)) ||
      (typeof id === "number" && !Number.isSafeInteger(id))) {
    throw new Error("Cursore richieste portale non valido.");
  }
  return id;
}

async function loadPages(queryFactory: () => any) {
  const rows: any[] = [];
  const seenIds = new Set<string>();
  let cursor: string | number | null = null;

  for (;;) {
    let query = queryFactory().order("id", { ascending: true });
    if (cursor !== null) query = query.gt("id", cursor);

    const { data, error } = await query.range(0, 999);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Pagina richieste portale non valida.");

    const page = data;
    for (const row of page) {
      const id = validateCursor(row);
      const key = typeof id + ":" + String(id);
      if (seenIds.has(key)) throw new Error("La paginazione delle richieste portale ha restituito un ID duplicato.");
      seenIds.add(key);
      rows.push(row);
    }

    if (page.length < 1000) break;

    const nextCursor = validateCursor(page[page.length - 1]);
    if (cursor !== null && compareIds(nextCursor, cursor) <= 0) {
      throw new Error("Il cursore delle richieste portale non avanza.");
    }
    cursor = nextCursor;
  }

  return rows;
}
