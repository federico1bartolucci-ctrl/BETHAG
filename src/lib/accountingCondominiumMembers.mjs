export const ACCOUNTING_MEMBER_PAGE_SIZE = 1000;

export async function loadAccountingCondominiumMembers(client, workspaceId) {
  if (!client || typeof client.from !== "function") throw new Error("Client Supabase non disponibile.");
  if (typeof workspaceId !== "string" || !workspaceId.trim()) throw new Error("Workspace non disponibile.");
  const rows = [];
  const seenMemberIds = new Set();
  for (let offset = 0; ; offset += ACCOUNTING_MEMBER_PAGE_SIZE) {
    const { data, error } = await client
      .from("condominium_members")
      .select("id, condominium_id, unit_id, active, name, email, data, condominiums!inner(workspace_id)")
      .eq("condominiums.workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + ACCOUNTING_MEMBER_PAGE_SIZE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error("Accounting condominium member query returned an invalid page: expected an array.");
    }
    if (data.length > ACCOUNTING_MEMBER_PAGE_SIZE) {
      throw new Error("Accounting condominium member query returned an invalid page: page exceeds limit.");
    }
    for (const row of data) {
      const memberId = typeof row?.id === "string" ? row.id.trim() : "";
      if (!memberId || seenMemberIds.has(memberId)) {
        throw new Error("Accounting condominium member query returned an invalid page: missing or duplicate member ID.");
      }
      const workspace = row.condominiums?.workspace_id;
      if (typeof workspace !== "string" || workspace !== workspaceId) {
        throw new Error("Accounting condominium member query returned an invalid page: workspace relation mismatch.");
      }
      seenMemberIds.add(memberId);
    }
    rows.push(...data);
    if (data.length < ACCOUNTING_MEMBER_PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}
