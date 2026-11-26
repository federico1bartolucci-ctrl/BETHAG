export function getSalPaymentIdempotencyKey({
  storage,
  workspaceId,
  progressId,
  entryDate,
  amount,
  notes,
  currentKey = "",
  createKey = () => crypto.randomUUID(),
}) {
  const storageKey = `bethag:sal-payment:${workspaceId}:${progressId}`;
  try {
    const current = JSON.parse(storage.getItem(storageKey) || "null");
    if (
      current &&
      current.entryDate === entryDate &&
      Number(current.amount) === Number(amount) &&
      current.notes === notes &&
      typeof current.key === "string"
    ) {
      return current.key;
    }
    const key = createKey();
    storage.setItem(storageKey, JSON.stringify({
      key,
      entryDate,
      amount: Number(amount),
      notes,
    }));
    return key;
  } catch {
    return currentKey || createKey();
  }
}

export function clearSalPaymentIdempotencyKey(storage, workspaceId, progressId) {
  try {
    storage.removeItem(`bethag:sal-payment:${workspaceId}:${progressId}`);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}
