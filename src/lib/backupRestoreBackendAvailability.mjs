function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Prevents a workspace restore from claiming success when the backup backend
 * section is malformed, when a restorable table payload is not an array, or
 * when Supabase is unavailable for a backup that contains backend rows.
 *
 * The caller must run this read-only decision before confirmation, React state
 * changes, localStorage writes, or backend restore writes.
 */
export function getBackupRestoreBackendAvailability(backup, supabaseAvailable, restorableTables) {
  if (!isRecord(backup) || !isRecord(backup.backend)) {
    return {
      blockReason:
        "Ripristino bloccato: la sezione backend del backup è assente o non valida. Nessun dato React, localStorage o backend è stato modificato. Seleziona un backup BETHAG integro e ripeti il ripristino.",
      localOnlyNotice: "",
      tables: ["backend"],
    };
  }

  const backend = backup.backend;
  const tableNames = Array.isArray(restorableTables)
    ? [...new Set(restorableTables.filter((table) => typeof table === "string" && table.trim()))]
    : [];

  const populatedTables = tableNames.filter((table) =>
    Array.isArray(backend[table]) && backend[table].length > 0
  );
  const malformedTables = tableNames.filter((table) =>
    Object.hasOwn(backend, table) && !Array.isArray(backend[table])
  );

  // A malformed payload is unsafe regardless of Supabase availability. With
  // Supabase configured the restore loop would otherwise normalize it to []
  // and silently skip the table before committing the frontend snapshot.
  if (malformedTables.length) {
    return {
      blockReason:
        "Ripristino bloccato: il backup contiene payload non validi per le tabelle backend (" +
        malformedTables.join(", ") +
        "). Nessun dato React, localStorage o backend è stato modificato. Rigenera o correggi il backup prima di procedere.",
      localOnlyNotice: "",
      tables: malformedTables,
    };
  }

  if (supabaseAvailable) {
    return { blockReason: "", localOnlyNotice: "", tables: populatedTables };
  }

  if (populatedTables.length) {
    return {
      blockReason:
        "Ripristino bloccato: Supabase non è configurato, ma il backup contiene record backend da ripristinare (" +
        populatedTables.join(", ") +
        "). Nessun dato React, localStorage o backend è stato modificato. Configura o riattiva Supabase e ripeti il ripristino.",
      localOnlyNotice: "",
      tables: populatedTables,
    };
  }

  return {
    blockReason: "",
    localOnlyNotice:
      "Supabase non è configurato: è stato ripristinato soltanto lo stato locale. Nel backup non erano presenti record backend ripristinabili; le tabelle di autorizzazione/workflow restano escluse dal ripristino.",
    tables: [],
  };
}
