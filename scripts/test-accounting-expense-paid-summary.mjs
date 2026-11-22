import assert from "node:assert/strict";
import { calculateLedgerExpensePaid } from "../src/lib/accountingExpensePaidSummary.ts";

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
