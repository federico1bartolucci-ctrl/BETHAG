export async function loadAccountingLedgerRows(client: any, workspaceId: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("condominium_ledger_entries").select("*").eq("workspace_id", workspaceId).order("entry_date", { ascending: false }).order("id", { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}
