function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const BACKSLASH = String.fromCharCode(92);

function isWorkspaceStoragePath(path, workspaceId) {
  if (typeof path !== "string" || !path.startsWith(workspaceId + "/")) return false;
  const relativePath = path.slice(workspaceId.length + 1);
  if (!relativePath || relativePath.includes(BACKSLASH)) return false;
  const segments = relativePath.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function hasSafeSourceDocuments(value, workspaceId) {
  const documents = value == null ? [] : value;
  if (!Array.isArray(documents)) return false;

  return documents.every((document) => {
    // Older backups may contain filenames only; they are metadata, not Storage paths.
    if (typeof document === "string") {
      return document.trim().length > 0 && !document.includes("/") && !document.includes(BACKSLASH);
    }
    if (!isRecord(document)) return false;
    if (Object.hasOwn(document, "stored") && typeof document.stored !== "boolean") return false;

    const path = document.storagePath;
    if (document.stored === true && !isWorkspaceStoragePath(path, workspaceId)) return false;
    if (path != null && path !== "" && !isWorkspaceStoragePath(path, workspaceId)) return false;
    return true;
  });
}

export function prepareCreationIntakesForBackupRestore(rows, workspaceId, existingRows, restoredCondominiumIds) {
  const targetWorkspaceId = String(workspaceId ?? "").trim();
  if (!targetWorkspaceId) throw new Error("Workspace di ripristino non valido.");

  const allowedCondominiumIds = new Set(
    (restoredCondominiumIds instanceof Set
      ? [...restoredCondominiumIds]
      : Array.isArray(restoredCondominiumIds)
        ? restoredCondominiumIds
        : [])
      .filter((id) => typeof id === "string" && id.length > 0)
  );
  const existingById = new Map(
    (Array.isArray(existingRows) ? existingRows : [])
      .filter((row) => isRecord(row) && row.id != null)
      .map((row) => [String(row.id), row])
  );

  const updateRows = [];
  const insertRows = [];
  const seenIds = new Set();
  let skipped = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isRecord(row)) {
      skipped += 1;
      continue;
    }

    if (row.workspace_id != null && String(row.workspace_id) !== targetWorkspaceId) {
      skipped += 1;
      continue;
    }

    const condominiumId = row.created_condominium_id == null
      ? null
      : String(row.created_condominium_id);
    if (condominiumId === "" || (condominiumId && !allowedCondominiumIds.has(condominiumId))) {
      skipped += 1;
      continue;
    }

    if (!hasSafeSourceDocuments(row.source_documents, targetWorkspaceId)) {
      skipped += 1;
      continue;
    }

    const id = row.id == null ? "" : String(row.id);
    if (row.id != null && (typeof row.id !== "string" || !id)) {
      skipped += 1;
      continue;
    }
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

    const normalized = {
      ...row,
      workspace_id: targetWorkspaceId,
      source_documents: row.source_documents ?? [],
      // Auth users are not part of workspace backups: retain destination attribution on updates.
      created_by: existing ? (existing.created_by ?? null) : null,
      confirmed_by: existing ? (existing.confirmed_by ?? null) : null,
    };
    if (!id) delete normalized.id;

    if (existing) updateRows.push(normalized);
    else insertRows.push(normalized);
  }

  return { updateRows, insertRows, skipped };
}
