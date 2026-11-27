const REGISTER_DELETE_TABLES = new Set([
  "condominium_register_items",
  "condominium_works",
  "condominium_suppliers",
]);

export async function deleteRegisterRecordSafely({
  table,
  id,
  workspaceId,
  condominiumId,
  deleteWork,
  deleteScopedRecord,
}) {
  if (!REGISTER_DELETE_TABLES.has(table)) {
    throw new Error("Tabella del Registro non autorizzata.");
  }
  if (!id || !workspaceId || !condominiumId) {
    throw new Error("Contesto del Registro incompleto: eliminazione interrotta.");
  }

  // Work deletion has domain invariants (SAL, ledger entries and invoices).
  // It must go through the backend guard rather than a direct table DELETE.
  if (table === "condominium_works") {
    if (typeof deleteWork !== "function") {
      throw new Error("Controllo di eliminazione del lavoro non disponibile.");
    }
    await deleteWork(workspaceId, id);
    return { deleted: true, strategy: "guarded-work-delete" };
  }

  if (typeof deleteScopedRecord !== "function") {
    throw new Error("Eliminazione scoped del record non disponibile.");
  }

  const { data, error } = await deleteScopedRecord({
    table,
    id,
    workspaceId,
    condominiumId,
  });
  if (error) throw error;
  if (!data?.id || String(data.id) !== String(id)) {
    throw new Error("Record non trovato nel condominio selezionato o già eliminato.");
  }

  return { deleted: true, strategy: "scoped-row-delete", id: data.id };
}
