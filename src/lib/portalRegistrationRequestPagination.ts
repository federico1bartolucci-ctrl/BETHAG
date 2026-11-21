export async function loadPortalRegistrationRequests(client: any, workspaceId: string) {
  if (!workspaceId) return [];
  const statusFilter = ["pending", "email_mismatch"];
  const [assigned, unassigned] = await Promise.all([
    loadPages(() => client
      .from("portal_registration_requests")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("status", statusFilter)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })),
    // RLS returns only unassigned requests whose condominium name matches
    // a condominium managed by this workspace. These requests need manual
    // resolution when identical names exist across different workspaces.
    loadPages(() => client
      .from("portal_registration_requests")
      .select("*")
      .is("workspace_id", null)
      .in("status", statusFilter)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })),
  ]);
  return [...assigned, ...unassigned]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

async function loadPages(queryFactory: () => any) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await queryFactory().range(offset, offset + 999);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
