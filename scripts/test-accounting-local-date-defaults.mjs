import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
assert.ok(helper.includes("export function localISODate(date = new Date())"));
assert.ok(helper.includes("getFullYear()"));
assert.ok(helper.includes("getMonth()"));
assert.ok(helper.includes("getDate()"));

const accounting = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
assert.ok(accounting.includes('import { localISODate } from "./lib/local-date"'));
assert.equal(
  accounting.split("payment_date:localISODate()").length - 1,
  2,
  "both initial and reset payment dates must use the local calendar",
);
assert.ok(accounting.includes("function createEmptyCaseForm(date = new Date())"), "new legal cases must use a fresh form factory");
assert.ok(accounting.includes("useState(createEmptyCaseForm())"), "initial legal case state must use the factory");
assert.ok(accounting.includes("opened_date: localISODate(date)"), "new legal cases must default to the local calendar date");
assert.ok(!accounting.includes("new Date().toISOString().slice(0,10)"));
assert.ok(!accounting.includes("new Date().toISOString().slice(0, 10)"));

assert.ok(!accounting.includes("const emptyLedger:"), "the ledger template must not capture a date at module initialization");
assert.ok(accounting.includes("useState(createEmptyLedger())"), "initial ledger state must use a fresh template");
assert.ok(accounting.includes("setLedgerForm(createEmptyLedger());"), "saving a ledger entry must reset to a fresh template");
assert.ok(accounting.includes("...createEmptyLedger(),"), "opening a new ledger form must compute a fresh date");
const factoryStart = accounting.indexOf("function createEmptyLedger(date = new Date())");
const factoryBodyStart = accounting.indexOf("{", factoryStart);
const factoryBodyEnd = accounting.indexOf("\n}", factoryBodyStart);
assert.ok(factoryStart >= 0 && factoryBodyStart > factoryStart && factoryBodyEnd > factoryBodyStart, "fresh ledger template factory must exist");
const factoryBody = accounting.slice(factoryBodyStart + 1, factoryBodyEnd);
assert.ok(factoryBody.includes("entry_date: localISODate(date)"), "each ledger template must derive its date at invocation time");
assert.equal(accounting.split("createEmptyLedger()").length - 1, 3, "all ledger template call sites must invoke the factory");

const executable = helper
  .replaceAll("export function", "function")
  .replace("days: number", "days") + `
function createEmptyLedger(date = new Date()) {${factoryBody}
}
console.log(JSON.stringify({
  paymentDefault: localISODate(new Date("2026-11-24T23:30:00.000Z")),
  legalCaseDefault: localISODate(new Date("2026-03-28T23:30:00.000Z")),
  ledgerFirstOpen: createEmptyLedger(new Date("2026-11-24T23:30:00.000Z")).entry_date,
  ledgerReopen: createEmptyLedger(new Date("2026-11-25T23:30:00.000Z")).entry_date,
}));
`;
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(
  JSON.parse(output),
  {
    paymentDefault: "2026-11-25",
    legalCaseDefault: "2026-03-29",
    ledgerFirstOpen: "2026-11-25",
    ledgerReopen: "2026-11-26",
  },
  "Accounting defaults and each new ledger template must follow the current local calendar",
);

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(
  packageJson.scripts.test.includes("test-accounting-local-date-defaults.mjs"),
  "the regression must be part of npm test",
);

console.log("Accounting local-date defaults regression checks passed.");
