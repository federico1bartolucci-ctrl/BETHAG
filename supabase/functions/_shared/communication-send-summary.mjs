/**
 * @param {unknown} count
 * @param {unknown} error
 */
export function resolveRecipientCount(count, error = null) {
  const valid = !error && typeof count === "number" && Number.isSafeInteger(count) && count >= 0;
  return { ok: valid, count: valid ? count : null };
}

/**
 * @param {{ sent?: number, failed?: number, statusPersistenceFailures?: number, remainingCount?: unknown, remainingCountError?: unknown }} options
 */
export function summarizeCommunicationSendStatus({
  sent = 0,
  failed = 0,
  statusPersistenceFailures = 0,
  remainingCount,
  remainingCountError = null,
} = {}) {
  const countersValid = [sent, failed, statusPersistenceFailures].every(
    (value) => Number.isSafeInteger(value) && value >= 0,
  );
  const remainingCountValid = typeof remainingCount === "number" && Number.isSafeInteger(remainingCount) && remainingCount >= 0;
  const remainingCountReliable = !remainingCountError && remainingCountValid;

  if (!countersValid || !remainingCountReliable) {
    return {
      status: "Errore",
      remaining: null,
      remainingCountQueryFailed: !remainingCountReliable,
    };
  }

  const status = failed === 0 && statusPersistenceFailures === 0 && remainingCount === 0
    ? "Inviata"
    : sent > 0
      ? "Parzialmente inviata"
      : "Errore";

  return { status, remaining: remainingCount, remainingCountQueryFailed: false };
}
