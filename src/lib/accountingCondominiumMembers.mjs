export async function loadAccountingCondominiumMembers(client, workspaceId) {
  if (!client || typeof client.from !== "function") {
    throw new Error("Client Supabase non disponibile.");
  }
  if (typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new Error("Workspace non disponibile.");
  }

  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("condominium_members")
      .select("id, condominium_id, unit_id, active, name, email, data, condominiums!inner(workspace_id)")
      .eq("condominiums.workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return { data: rows, error: null };
}
