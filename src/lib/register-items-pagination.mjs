export async function fetchRegisterItems(client, workspaceId, pageSize = 1000) {
  if (!client || !workspaceId) return [];
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new RangeError("pageSize must be between 1 and 1000.");
  }
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("condominium_register_items")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}
