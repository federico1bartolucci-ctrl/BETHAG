export const ADMIN_MEMBERSHIP_PAGE_SIZE = 1000;

export async function loadActiveAdminMemberships(client, userId, pageSize = ADMIN_MEMBERSHIP_PAGE_SIZE) {
  const activeUserId = typeof userId === "string" ? userId.trim() : "";
  if (!activeUserId) return { data: [], error: null };
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > ADMIN_MEMBERSHIP_PAGE_SIZE) {
    return { data: null, error: new Error(`Invalid admin-membership page size: ${pageSize}`) };
  }

  const rows = [];
  let cursor = null;
  for (;;) {
    let query = client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", activeUserId)
      .eq("role", "admin")
      .eq("active", true)
      .order("workspace_id", { ascending: true })
      .limit(pageSize);
    if (cursor !== null) query = query.gt("workspace_id", cursor);

    const { data, error } = await query;
    if (error) return { data: null, error };
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) break;

    const nextCursor = String(page[page.length - 1]?.workspace_id ?? "").trim();
    if (!nextCursor || (cursor !== null && nextCursor <= cursor)) {
      return { data: null, error: new Error("Admin membership pagination cursor did not advance.") };
    }
    cursor = nextCursor;
  }

  return { data: rows, error: null };
}
