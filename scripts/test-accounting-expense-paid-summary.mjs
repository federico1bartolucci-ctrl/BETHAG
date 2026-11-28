import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateLedgerExpensePaid, getReportableAccountingInstallments } from "../src/lib/accountingExpensePaidSummary.js";

const ledger = [
  { id:"partial", direction:"Uscita", amount:1000, payment_status:"Parzialmente pagato" },
  { id:"paid", direction:"Uscita", amount:250, payment_status:"Pagato" },
  { id:"unpaid", direction:"Uscita", amount:75, payment_status:"Da pagare" },
  { id:"unlinked-partial", direction:"Uscita", amount:40, payment_status:"Parzialmente pagato" },
  { id:"income", direction:"Entrata", amount:500, payment_status:"Pagato" },
];
const installments = [
  { ledger_entry_id:"partial", amount:1000, paid_amount:400 },
  { ledger_entry_id:"paid", amount:250, paid_amount:250 },
];
assert.deepEqual(calculateLedgerExpensePaid(ledger, installments), {
  paidExpenses:650,
  unpaidExpenses:715,
});
assert.deepEqual(calculateLedgerExpensePaid(
  [{ id:"overpaid", direction:"Uscita", amount:100, payment_status:"Da pagare" }],
  [{ ledger_entry_id:"overpaid", paid_amount:120 }],
), { paidExpenses:100, unpaidExpenses:0 });
console.log("Rendiconto installment-aware partial-payment summary tests passed.");

const consolidatedLedger = [
  { id:"consolidated", direction:"Uscita", amount:100, payment_status:"Da pagare" },
];
const consolidatedInstallments = [
  { id:"superseded", ledger_entry_id:"consolidated", amount:100, paid_amount:100, status:"Accorpata" },
  { id:"active", ledger_entry_id:"consolidated", amount:100, paid_amount:25, status:"Da pagare" },
];
assert.deepEqual(
  getReportableAccountingInstallments(consolidatedInstallments),
  [consolidatedInstallments[1]],
  "Accorpata rows must be excluded from active accounting installments"
);
assert.deepEqual(
  calculateLedgerExpensePaid(consolidatedLedger, consolidatedInstallments),
  { paidExpenses:25, unpaidExpenses:75 },
  "a superseded consolidated installment must not make an expense appear paid"
);

const accountingPage = await readFile("src/AccountingPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(accountingPage, /getReportableAccountingInstallments\(/, "Rendiconto totals must use only reportable installments");
assert.ok(packageJson.scripts.test.includes("test-accounting-expense-paid-summary.mjs"), "expense summary regression must run via npm test");
assert.ok(packageJson.scripts.test.includes("test-accounting-rendiconto-unit-mixed-installments.mjs"), "unit balance regression must run via npm test");
