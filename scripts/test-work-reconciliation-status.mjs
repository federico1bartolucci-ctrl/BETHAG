import assert from "node:assert/strict";
import { getCondominiumWorkReconciliationStatus } from "../src/lib/workReconciliationStatus.mjs";

const base = {
  invoiceCount: 1,
  invoiceAmount: 10000,
  invoiceAccountingAmount: 10000,
  salAmount: 10000,
  salAccountingAmount: 10000,
  residualToInvoices: 0,
  progress: [{ progress_no: 1, amount: 10000 }],
};

assert.equal(getCondominiumWorkReconciliationStatus(base), "RICONCILIATO", "matching invoice, SAL and ledgers reconcile");
assert.equal(getCondominiumWorkReconciliationStatus({ ...base, salAccountingAmount: 7000 }), "DA VERIFICARE", "SAL accounting discrepancy is detected");
assert.equal(getCondominiumWorkReconciliationStatus({ ...base, salAccountingAmount: 0 }), "DA VERIFICARE", "missing SAL accounting entry is detected");
assert.equal(getCondominiumWorkReconciliationStatus({ ...base, progress: [], salAccountingAmount: 0, salAmount: 0 }), "RICONCILIATO", "no SAL rows does not require SAL ledger comparison");
assert.equal(getCondominiumWorkReconciliationStatus({ ...base, invoiceAccountingAmount: 9500 }), "DA VERIFICARE", "invoice accounting discrepancy is detected");
assert.equal(getCondominiumWorkReconciliationStatus({ ...base, residualToInvoices: 20 }), "DA VERIFICARE", "invoice-to-SAL residual is detected");

console.log("Work reconciliation status tests passed.");
