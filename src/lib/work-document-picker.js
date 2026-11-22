function joinedCondominium(row) {
  const relation = row?.condominiums;
  return Array.isArray(relation) ? relation[0] ?? null : relation && typeof relation === "object" ? relation : null;
}

export function mapWorkDocumentPickerRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      id: Number(row?.legacy_id),
      name: String(row?.title ?? "").trim() || "Documento senza titolo",
      condominiumId: Number(joinedCondominium(row)?.legacy_id),
      category: String(row?.category ?? "").trim() || "Documenti",
      date: String(row?.created_at ?? "").slice(0, 10),
      size: row?.file_size_bytes == null ? "" : String(row.file_size_bytes),
      notes: typeof row?.data?.notes === "string" ? row.data.notes : "",
    }))
    .filter((document) =>
      Number.isSafeInteger(document.id) && document.id > 0 &&
      Number.isSafeInteger(document.condominiumId) && document.condominiumId > 0
    );
}

export async function fetchWorkDocumentPickerRows(client, workspaceId, pageSize = 1000) {
  if (!client || !workspaceId) return [];
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new RangeError("pageSize must be between 1 and 1000.");
  }
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from("documents")
      .select("legacy_id,title,category,created_at,file_size_bytes,data,condominiums!inner(legacy_id)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return mapWorkDocumentPickerRows(rows);
}
