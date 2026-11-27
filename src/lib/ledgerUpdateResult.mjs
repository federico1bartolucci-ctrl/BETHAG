export function requireUpdatedLedgerEntry(result) {
  if (result?.error) throw result.error;
  if (!result?.data?.id) {
    throw new Error("Il movimento contabile non è stato aggiornato: record non trovato o accesso non consentito.");
  }
  return result.data.id;
}

export function ledgerEditMatchesCondominium(entry, condominiumId) {
  return Boolean(
    entry?.id &&
    typeof condominiumId === "string" &&
    condominiumId.trim() &&
    typeof entry.condominium_id === "string" &&
    entry.condominium_id === condominiumId,
  );
}
