export function isSalPaymentLedgered(progress) {
  return Boolean(progress?.ledger_entry_id || progress?.payment_entry_id);
}
