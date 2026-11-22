import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isSalPaymentLedgered } from "../src/lib/salPaymentLedgerGuard.mjs";

const manuallyRecorded = { ledger_entry_id: "ledger-aggregate", payment_entry_id: null };
const modalRecorded = { ledger_entry_id: null, payment_entry_id: "ledger-modal", paid_amount: 120 };
const unrecorded = { ledger_entry_id: null, payment_entry_id: null, paid_amount: 120 };

assert.equal(isSalPaymentLedgered(manuallyRecorded), true);
assert.equal(isSalPaymentLedgered(modalRecorded), true, "Modal-created ledger entry must block aggregate re-registration");
assert.equal(isSalPaymentLedgered(unrecorded), false);

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.match(source, /import \{ isSalPaymentLedgered \} from "\.\/lib\/salPaymentLedgerGuard\.mjs"/);
const start = source.indexOf("async function recordProgressPayment");
const end = source.indexOf("async function saveProgress", start);
assert.ok(start >= 0 && end > start, "recordProgressPayment handler must exist");
assert.match(source.slice(start, end), /isSalPaymentLedgered\(p\)/, "Handler must guard both ledger link fields");
assert.match(source, /onClick=\{\(\)=>\{if\(isSalPaymentLedgered\(p\)\)/, "UI button must also guard both ledger link fields");
assert.match(source, /\{isSalPaymentLedgered\(p\)\?"Contabilizzato":"Registra pagamento"\}/, "UI label must reflect either ledger link");
console.log("Cross-path SAL ledger duplicate regression checks: PASS");
