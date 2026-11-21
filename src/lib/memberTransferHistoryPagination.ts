export async function loadMemberTransferHistory(client: any, workspaceId: string, condominiumId: string) {
  if (!workspaceId || !condominiumId) return [];
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("condominium_member_transfers")
      .select("id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data")
      .eq("workspace_id", workspaceId)
      .eq("condominium_id", condominiumId)
      .order("transfer_date", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
