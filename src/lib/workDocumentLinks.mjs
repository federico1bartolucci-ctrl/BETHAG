function normalizeIds(values, label) {
  if (!Array.isArray(values)) throw new Error(label + " must be an array.");
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error(label + " contains an invalid document ID.");
    }
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export function mapWorkDocumentLinkIds(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("Risposta dei collegamenti documentali non valida.");
  }
  return normalizeIds(rows.map((row) => row?.document_id), "Current links");
}


export function planWorkDocumentLinkChanges(currentIds, desiredIds) {
  const current = normalizeIds(currentIds, "Current links");
  const desired = normalizeIds(desiredIds, "Desired links");
  const currentSet = new Set(current);
  const desiredSet = new Set(desired);
  return {
    toInsert: desired.filter((id) => !currentSet.has(id)),
    toDelete: current.filter((id) => !desiredSet.has(id)),
  };
}

/**
 * Add missing links before removing obsolete ones.
 * If insertion fails, no existing link is deleted. If deletion fails after
 * insertion, the extra links remain visible and a retry re-reads current IDs,
 * so it does not insert duplicates before retrying the deletion.
 */
export async function reconcileWorkDocumentLinks({
  loadCurrentIds,
  desiredIds,
  insertLinks,
  deleteLinks,
}) {
  if (typeof loadCurrentIds !== "function" || typeof insertLinks !== "function" || typeof deleteLinks !== "function") {
    throw new Error("Work-document link reconciliation requires load, insert and delete operations.");
  }
  const currentIds = await loadCurrentIds();
  const { toInsert, toDelete } = planWorkDocumentLinkChanges(currentIds, desiredIds);
  if (toInsert.length) await insertLinks(toInsert);
  if (toDelete.length) await deleteLinks(toDelete);
  return { inserted: toInsert, deleted: toDelete };
}
