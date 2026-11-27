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

// Compare-and-swap the document's Storage pointer against the version observed by the editor.
// Legacy rows without file_path use the JSONB storagePath value as the concurrency token.
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
    .select("id,workspace_id,legacy_id,condominium_id,file_path,data")
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

  const { data, error } = await update
    .select("legacy_id,condominium_id,title,category,status,file_path,data")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new DocumentEditConflictError();
  return data;
}
