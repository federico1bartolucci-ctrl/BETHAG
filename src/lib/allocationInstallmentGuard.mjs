export function hasGeneratedInstallmentAllocationMutation({
  linkedInstallmentCount,
  originalAmount,
  nextAmount,
  originalUnitId,
  nextUnitId,
  originalLedgerEntryId,
  nextLedgerEntryId,
}) {
  if (linkedInstallmentCount === null || linkedInstallmentCount === undefined) return true;
  const count = Number(linkedInstallmentCount);
  if (!Number.isSafeInteger(count) || count < 0) return true;
  if (count === 0) return false;

  return Number(nextAmount) !== Number(originalAmount)
    || nextUnitId !== originalUnitId
    || nextLedgerEntryId !== originalLedgerEntryId;
}
