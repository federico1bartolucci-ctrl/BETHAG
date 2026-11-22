export async function loadWorkspaceSuppliers(client, workspaceId, pageSize = 1000) {
  if (!client || typeof workspaceId !== "string" || !workspaceId.trim()) {
    return { data: null, error: new Error("Workspace supplier hydration requires a client and workspace ID.") };
  }
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("Supplier hydration page size must be a positive safe integer.");
  }

  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("suppliers")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    const batch = data ?? [];
    if (!Array.isArray(batch)) {
      return { data: null, error: new Error("Supplier hydration returned a non-array page.") };
    }
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return { data: rows, error: null };
}
