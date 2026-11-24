/**
 * Formats export-time read failures recorded in a BETHAG workspace backup.
 * Empty or malformed entries are ignored so legacy backups remain restorable.
 */
export function formatBackupReadErrors(errors) {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return "";
  return Object.entries(errors)
    .filter(([table, message]) => table.trim() && message != null && String(message).trim())
    .map(([table, message]) => `${table}: ${String(message).trim()}`)
    .join(" | ");
}

/**
 * Blocks legacy or incomplete workspace backups that contain communications
 * but cannot prove that the corresponding email-recipient delivery ledger was
 * exported. Restoring such a backup could recreate recipient UUIDs and change
 * the provider idempotency keys, making already-sent messages sendable again.
 *
 * This preflight is intentionally read-only and must run before any frontend
 * state, localStorage, or backend restore writes.
 */
export function getCommunicationRecipientLedgerRestoreBlockReason(backup) {
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const hasReadError = (errors, key) =>
    isRecord(errors) && errors[key] != null && String(errors[key]).trim().length > 0;

  if (!isRecord(backup)) return "";

  const backend = isRecord(backup.backend) ? backup.backend : {};
  const frontendState = isRecord(backup.frontendState) ? backup.frontendState : {};
  const backendCommunications = Array.isArray(backend.communications) ? backend.communications : null;
  const frontendCommunications = Array.isArray(frontendState.communications) ? frontendState.communications : [];
  const recipientRows = Array.isArray(backend.communication_recipients) ? backend.communication_recipients : null;

  const hasCommunicationData =
    (backendCommunications?.length ?? 0) > 0 ||
    frontendCommunications.length > 0 ||
    (recipientRows?.length ?? 0) > 0;

  if (!hasCommunicationData) return "";

  const errors = backup.backendReadErrors;
  if (
    !backendCommunications ||
    !recipientRows ||
    hasReadError(errors, "communications") ||
    hasReadError(errors, "communication_recipients")
  ) {
    return "Ripristino bloccato: il backup contiene comunicazioni ma non dimostra di includere il registro completo dei destinatari email. Un ripristino incompleto potrebbe rigenerare gli identificativi e reinviare comunicazioni già spedite. Nessun dato è stato modificato. Usa un backup che includa communication_recipients oppure riconcilia manualmente lo storico con il provider email prima di procedere.";
  }

  const communicationIds = new Set();
  for (const communication of backendCommunications) {
    if (!isRecord(communication) || typeof communication.id !== "string" || !communication.id.trim()) {
      return "Ripristino bloccato: il backup contiene comunicazioni con identificativi non verificabili. Nessun dato è stato modificato.";
    }
    communicationIds.add(communication.id);
  }

  for (const communication of frontendCommunications) {
    if (
      !isRecord(communication) ||
      typeof communication.id !== "string" ||
      !communication.id.trim() ||
      !communicationIds.has(communication.id)
    ) {
      return "Ripristino bloccato: lo snapshot locale contiene comunicazioni non presenti nello snapshot backend verificabile. Nessun dato è stato modificato.";
    }
  }

  const recipientCommunicationIds = new Set(
    recipientRows
      .filter((row) => isRecord(row) && typeof row.communication_id === "string" && row.communication_id.trim())
      .map((row) => row.communication_id)
  );

  const communicationWithMissingLedger = backendCommunications.some((communication) => {
    const status = typeof communication.email_status === "string" ? communication.email_status.trim() : "";
    const hasPreparedAt = communication.email_prepared_at != null && String(communication.email_prepared_at).trim().length > 0;
    const hasDeliveryHistoryOrAttempt = (status.length > 0 && status !== "no_recipients") || hasPreparedAt;
    return hasDeliveryHistoryOrAttempt && !recipientCommunicationIds.has(communication.id);
  });

  if (communicationWithMissingLedger) {
    return "Ripristino bloccato: almeno una comunicazione con stato email o preparazione registrata non ha destinatari nello storico del backup. Non è possibile dimostrare che un nuovo invio sia sicuro. Nessun dato è stato modificato; è necessaria una riconciliazione manuale con lo storico del provider email.";
  }

  return "";
}
