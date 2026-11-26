const CLOSABLE_WORK_STATUSES = new Set([
  "Da programmare",
  "Approvato",
  "In corso",
  "Sospeso",
]);

export function canCloseWork(status) {
  return typeof status === "string" && CLOSABLE_WORK_STATUSES.has(status);
}

function errorMessage(error) {
  return error?.message || String(error || "errore non specificato");
}

async function rollbackHistory(deleteHistory, eventId, cause) {
  let rollback;
  try {
    rollback = await deleteHistory(eventId);
  } catch (rollbackError) {
    throw new Error(
      `Chiusura non applicata: ${errorMessage(cause)}. Rollback dello storico fallito: ${errorMessage(rollbackError)}.`,
    );
  }

  if (rollback?.error || !rollback?.data?.id) {
    const rollbackError = rollback?.error || new Error("Nessuna riga restituita dal rollback.");
    throw new Error(
      `Chiusura non applicata: ${errorMessage(cause)}. Rollback dello storico non confermato: ${errorMessage(rollbackError)}.`,
    );
  }

  throw cause;
}

/**
 * Persist the closure event first, then perform a conditional work-state
 * transition. If the row is no longer closable or the update fails, remove
 * the event and require confirmation that the compensating delete succeeded.
 */
export async function closeWorkWithHistory({ insertHistory, updateWork, deleteHistory }) {
  if (
    typeof insertHistory !== "function" ||
    typeof updateWork !== "function" ||
    typeof deleteHistory !== "function"
  ) {
    throw new TypeError("Work closure requires history insert, conditional update and rollback functions.");
  }

  const inserted = await insertHistory();
  if (inserted?.error) throw inserted.error;
  const eventId = inserted?.data?.id;
  if (eventId === undefined || eventId === null || eventId === "") {
    throw new Error("WORK_CLOSURE_HISTORY_NOT_CONFIRMED");
  }

  let updated;
  try {
    updated = await updateWork();
  } catch (updateError) {
    await rollbackHistory(deleteHistory, eventId, updateError);
  }

  if (updated?.error) {
    await rollbackHistory(deleteHistory, eventId, updated.error);
  }
  if (!updated?.data?.id) {
    await rollbackHistory(
      deleteHistory,
      eventId,
      new Error("WORK_NOT_CLOSABLE_OR_NOT_FOUND"),
    );
  }

  return updated.data;
}
