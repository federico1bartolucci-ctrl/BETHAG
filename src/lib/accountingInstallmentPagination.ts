export async function loadWorkspaceInstallments(client: any, workspaceId: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("condominium_installments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("due_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return { data: rows, error: null };
}
