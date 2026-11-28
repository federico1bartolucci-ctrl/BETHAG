export class DocumentEditConflictError extends Error {
  constructor(message = "Il documento è stato modificato da un'altra sessione. Ricarica i dati prima di riprovare.") {
    super(message);
    this.name = "DocumentEditConflictError";
    this.code = "DOCUMENT_EDIT_CONFLICT";
  }
}

function sameStoragePath(currentRow, expectedPath) {
  const currentPath = currentRow.file_path ?? currentRow.data?.storagePath ?? null;
  return currentPath === (expectedPath ?? null);
}

function filterNullableColumn(query, column, value) {
  return value === null || value === undefined
    ? query.is(column, null)
    : query.eq(column, value);
}

// Compare-and-swap the complete mutable document snapshot observed by the editor.
// The Storage pointer remains the user-visible version token, while the SQL UPDATE
// also compares metadata and JSONB so concurrent metadata-only edits cannot overwrite
// one another when the file_path itself has not changed.
export async function updateDocumentRecordIfStorageVersionMatches(
  client,
  row,
  { expectedCondominiumId, expectedStoragePath }
) {
  if (!client || typeof client.from !== "function" || !row || typeof row !== "object") {
    throw new TypeError("Contesto di aggiornamento documento non valido.");
  }
  if (!row.workspace_id || !row.legacy_id || !expectedCondominiumId) {
    throw new TypeError("Identità documento incompleta per il controllo di concorrenza.");
  }

  const { data: current, error: readError } = await client
    .from("documents")
    .select("id,workspace_id,legacy_id,condominium_id,title,category,status,file_path,data")
    .eq("workspace_id", row.workspace_id)
    .eq("legacy_id", row.legacy_id)
    .eq("condominium_id", expectedCondominiumId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current || !sameStoragePath(current, expectedStoragePath)) {
    throw new DocumentEditConflictError();
  }

  let update = client
    .from("documents")
    .update(row)
    .eq("id", current.id)
    .eq("workspace_id", row.workspace_id)
    .eq("legacy_id", row.legacy_id)
    .eq("condominium_id", expectedCondominiumId);

  if (current.file_path === null || current.file_path === undefined) {
    update = update.is("file_path", null);
  } else {
    update = update.eq("file_path", current.file_path);
  }

  if (current.file_path === null || current.file_path === undefined) {
    const legacyStoragePath = current.data?.storagePath ?? null;
    if (legacyStoragePath === null) {
      update = update.is("data->>storagePath", null);
    } else {
      update = update.filter("data->>storagePath", "eq", legacyStoragePath);
    }
  }

  // A Storage-path-only compare-and-swap is insufficient for metadata-only edits:
  // two sessions can keep the same file_path and both update the row successfully.
  update = filterNullableColumn(update, "title", current.title);
  update = filterNullableColumn(update, "category", current.category);
  update = filterNullableColumn(update, "status", current.status);

  if (current.data === null || current.data === undefined) {
    update = update.is("data", null);
  } else {
    // PostgREST's raw filter accepts a JSON literal; JSONB equality compares the
    // complete document payload independent of object-key ordering.
    update = update.filter("data", "eq", JSON.stringify(current.data));
  }

  const { data, error } = await update
    .select("legacy_id,condominium_id,title,category,status,file_path,data")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new DocumentEditConflictError();
  return data;
}
