export function getReportableAccountingInstallments(installments) {
  return (Array.isArray(installments) ? installments : [])
    .filter((installment) => installment?.status !== "Accorpata");
}

export function calculateLedgerExpensePaid(ledgerEntries, installments) {
  const reportableInstallments = getReportableAccountingInstallments(installments);
  const outgoing = ledgerEntries.filter((entry) => entry.direction === "Uscita");
  const paidExpenses = outgoing.reduce((total, entry) => {
    const linkedInstallments = reportableInstallments.filter((installment) => installment.ledger_entry_id === entry.id);
    const paid = linkedInstallments.length > 0
      ? linkedInstallments.reduce((sum, installment) => sum + Number(installment.paid_amount || 0), 0)
      : entry.payment_status === "Pagato" ? Number(entry.amount || 0) : 0;
    return total + Math.min(Math.max(paid, 0), Math.max(Number(entry.amount || 0), 0));
  }, 0);
  const expenses = outgoing.reduce((total, entry) => total + Number(entry.amount || 0), 0);
  return { paidExpenses, unpaidExpenses: Math.max(0, expenses - paidExpenses) };
}
