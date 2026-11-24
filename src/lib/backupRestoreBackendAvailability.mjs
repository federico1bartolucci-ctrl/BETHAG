function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Prevents a workspace restore from claiming success when Supabase is not
 * configured but the backup contains backend rows that the restore loop would
 * otherwise silently skip.
 *
 * The caller must run this read-only decision before confirmation, React state
 * changes, localStorage writes, or backend restore writes.
 */
export function getBackupRestoreBackendAvailability(backup, supabaseAvailable, restorableTables) {
  const backend = isRecord(backup?.backend) ? backup.backend : {};
  const tableNames = Array.isArray(restorableTables)
    ? [...new Set(restorableTables.filter((table) => typeof table === "string" && table.trim()))]
    : [];

  const populatedTables = tableNames.filter((table) =>
    Array.isArray(backend[table]) && backend[table].length > 0
  );
  const malformedTables = tableNames.filter((table) =>
    Object.hasOwn(backend, table) && !Array.isArray(backend[table])
  );

  if (supabaseAvailable) {
    return { blockReason: "", localOnlyNotice: "", tables: populatedTables };
  }

  if (populatedTables.length || malformedTables.length) {
    const affectedTables = [...new Set([...populatedTables, ...malformedTables])];
    return {
      blockReason:
        "Ripristino bloccato: Supabase non è configurato, ma il backup contiene record backend da ripristinare (" +
        affectedTables.join(", ") +
        "). Nessun dato React, localStorage o backend è stato modificato. Configura o riattiva Supabase e ripeti il ripristino.",
      localOnlyNotice: "",
      tables: affectedTables,
    };
  }

  return {
    blockReason: "",
    localOnlyNotice:
      "Supabase non è configurato: è stato ripristinato soltanto lo stato locale. Nel backup non erano presenti record backend ripristinabili; le tabelle di autorizzazione/workflow restano escluse dal ripristino.",
    tables: [],
  };
}
