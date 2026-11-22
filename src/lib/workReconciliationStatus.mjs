export function getCondominiumWorkReconciliationStatus(result) {
  const invoiceAccountingAmount = Number(result.invoiceAccountingAmount ?? result.accountingAmount ?? 0);
  const invoiceAmount = Number(result.invoiceAmount ?? 0);
  const salAmount = Number(result.salAmount ?? 0);
  const salAccountingAmount = Number(result.salAccountingAmount ?? 0);
  const hasProgress = Array.isArray(result.progress) && result.progress.length > 0;
  const invoicesMatchSal = Math.abs(Number(result.residualToInvoices ?? invoiceAmount - salAmount)) < 0.01;
  const invoiceAccountingMatches = Number(result.invoiceCount ?? 0) === 0 || Math.abs(invoiceAccountingAmount - invoiceAmount) < 0.01;
  const salAccountingMatches = !hasProgress || Math.abs(salAccountingAmount - salAmount) < 0.01;
  return invoicesMatchSal && invoiceAccountingMatches && salAccountingMatches
    ? "RICONCILIATO"
    : "DA VERIFICARE";
}
