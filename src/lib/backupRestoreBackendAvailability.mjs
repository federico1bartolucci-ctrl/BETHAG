function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Prevents a workspace restore from silently skipping backend rows when the
 * backup's backend section or any restorable table payload is malformed.
 *
 * The caller must run this read-only decision before confirmation, React state
 * changes, localStorage writes, or backend restore writes.
 */
export function getBackupRestoreBackendAvailability(backup, supabaseAvailable, restorableTables) {
  const tableNames = Array.isArray(restorableTables)
    ? [...new Set(restorableTables.filter((table) => typeof table === "string" && table.trim()))]
    : [];

  if (!isRecord(backup) || !Object.hasOwn(backup, "backend") || !isRecord(backup.backend)) {
    return {
      blockReason:
        "Ripristino bloccato: la sezione backend del backup è assente o non valida. Nessun dato React, localStorage o backend è stato modificato. Seleziona un backup BETHAG integro.",
      localOnlyNotice: "",
      tables: [],
    };
  }

  const backend = backup.backend;
  const populatedTables = tableNames.filter((table) =>
    Array.isArray(backend[table]) && backend[table].length > 0
  );
  const malformedTableNames = tableNames.filter((table) =>
    Object.hasOwn(backend, table) && !Array.isArray(backend[table])
  );
  const malformedRowTables = tableNames.filter((table) =>
    Array.isArray(backend[table]) && backend[table].some((row) => !isRecord(row))
  );
  const malformedTables = [...new Set([...malformedTableNames, ...malformedRowTables])];

  if (malformedTables.length) {
    return {
      blockReason:
        "Ripristino bloccato: il backup contiene payload backend non validi nelle tabelle " +
        malformedTables.join(", ") +
        ". Nessun dato React, localStorage o backend è stato modificato. Correggi o rigenera il backup prima di riprovare.",
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
