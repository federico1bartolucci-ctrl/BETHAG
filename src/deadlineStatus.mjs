export function getDeadlineEffectiveStatus(deadline, todayISO) {
  return deadline.status !== "Completata" && deadline.dueDate && deadline.dueDate < todayISO
    ? "Scaduta"
    : deadline.status;
}
