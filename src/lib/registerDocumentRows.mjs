function formatDocumentSize(value) {
  if (value == null || value === "") return "";
  const bytes = Number(value);
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "";
  return bytes + " B";
}

/**
 * Convert raw PostgREST documents rows into the Register picker model.
 * The work-document relation stores documents.legacy_id (bigint), not the
 * documents.id UUID. The selected condominium is resolved to its UUID.
 */
export function mapRegisterDocumentRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Register documents must be an array of PostgREST rows.");
  }

  const mapped = [];
  const seenLegacyIds = new Set();

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError("Register documents contain a malformed PostgREST row.");
    }

    const id = Number(row.legacy_id);
    const condominiumId =
      typeof row.condominium_id === "string" ? row.condominium_id.trim() : "";

    // Rows without a usable legacy ID cannot be represented by
    // condominium_work_documents.document_id (bigint). Global documents
    // without a condominium are not selectable in this condominium picker.
    if (!Number.isSafeInteger(id) || id <= 0 || !condominiumId) continue;

    if (seenLegacyIds.has(id)) {
      throw new Error("Register documents contain a duplicate workspace legacy ID: " + id);
    }
    seenLegacyIds.add(id);

    const title = typeof row.title === "string" ? row.title.trim() : "";
    const category = typeof row.category === "string" ? row.category.trim() : "";
    const notes =
      row.data && typeof row.data === "object" && typeof row.data.notes === "string"
        ? row.data.notes
        : "";

    mapped.push({
      id,
      name: title || ("Documento " + id),
      condominiumId,
      category,
      date: typeof row.created_at === "string" ? row.created_at : "",
      size: formatDocumentSize(row.file_size_bytes),
      notes,
    });
  }

  return mapped;
}
