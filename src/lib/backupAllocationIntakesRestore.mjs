export function prepareAllocationIntakesForBackupRestore(rows, workspaceId, existingRows, restoredCondominiumIds, relatedRows = {}) {
  const targetWorkspaceId = String(workspaceId ?? "");
  if (!targetWorkspaceId) throw new Error("Workspace di ripristino non valido.");

  const allowedCondominiumIds = new Set(
    (restoredCondominiumIds instanceof Set ? [...restoredCondominiumIds] : Array.isArray(restoredCondominiumIds) ? restoredCondominiumIds : [])
      .filter((id) => typeof id === "string" && id.length > 0)
  );
  const existingById = new Map(
    (Array.isArray(existingRows) ? existingRows : [])
      .filter((row) => row && typeof row === "object" && row.id != null)
      .map((row) => [String(row.id), row])
  );
  const byId = (values) => new Map(
    (Array.isArray(values) ? values : [])
      .filter((row) => row && typeof row === "object" && !Array.isArray(row) && row.id != null)
      .map((row) => [String(row.id), row])
  );
  const related = {
    documents: byId(relatedRows.documents),
    ledgerEntries: byId(relatedRows.ledgerEntries),
    allocationTables: byId(relatedRows.allocationTables),
    units: byId(relatedRows.units),
  };
  const hasOwnedReference = (id, collection, condominiumId, allowWorkspaceDocument = false) => {
    if (id == null) return true;
    const normalizedId = String(id);
    if (!normalizedId) return false;
    const record = collection.get(normalizedId);
    if (!record || String(record.workspace_id ?? "") !== targetWorkspaceId) return false;
    if (allowWorkspaceDocument && record.condominium_id == null) return true;
    return String(record.condominium_id ?? "") === condominiumId;
  };
  const hasValidRelatedReferences = (row, condominiumId) => {
    if (!hasOwnedReference(row.document_id, related.documents, condominiumId, true)) return false;
    if (!hasOwnedReference(row.ledger_entry_id, related.ledgerEntries, condominiumId)) return false;
    if (!hasOwnedReference(row.allocation_table_id, related.allocationTables, condominiumId)) return false;
    if (row.rows != null && !Array.isArray(row.rows)) return false;
    for (const item of Array.isArray(row.rows) ? row.rows : []) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      if (item.unit_id != null && !hasOwnedReference(item.unit_id, related.units, condominiumId)) return false;
    }
    return true;
  };

  const updateRows = [];
  const insertRows = [];
  const seenIds = new Set();
  let skipped = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      skipped += 1;
      continue;
    }

    const condominiumId = String(row.condominium_id ?? "");
    if (!allowedCondominiumIds.has(condominiumId) || !hasValidRelatedReferences(row, condominiumId)) {
      skipped += 1;
      continue;
    }

    const id = row.id == null ? "" : String(row.id);
    if (id && seenIds.has(id)) {
      skipped += 1;
      continue;
    }
    if (id) seenIds.add(id);

    const existing = id ? existingById.get(id) : undefined;
    if (existing && String(existing.workspace_id ?? "") !== targetWorkspaceId) {
      skipped += 1;
      continue;
    }
    if (existing && String(existing.condominium_id ?? "") !== condominiumId) {
      skipped += 1;
      continue;
    }

    const normalized = {
      ...row,
      workspace_id: targetWorkspaceId,
      // Auth user IDs are not part of a workspace backup. Preserve the
      // destination's valid attribution on updates and clear foreign IDs on inserts.
      created_by: existing ? (existing.created_by ?? null) : null,
      confirmed_by: existing ? (existing.confirmed_by ?? null) : null,
    };
    if (!id) delete normalized.id;

    if (existing) updateRows.push(normalized);
    else insertRows.push(normalized);
  }

  return { updateRows, insertRows, skipped };
}
