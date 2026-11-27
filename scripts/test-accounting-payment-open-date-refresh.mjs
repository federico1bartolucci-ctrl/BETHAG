import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
const accounting = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");

assert.ok(accounting.includes('import { localISODate } from "./lib/local-date"'));
const openHandler = "setPaymentForm({...paymentForm,payment_date:localISODate(),amount:Math.max(0,Number(i.amount)-Number(i.paid_amount))})";
assert.ok(
  accounting.includes(openHandler),
  "opening a payment form must refresh payment_date instead of reusing a date captured before midnight",
);

const executable = helper.replaceAll("export function", "function").replace("days: number", "days") + `
console.log(JSON.stringify([
  localISODate(new Date("2026-11-24T23:30:00.000Z")),
  localISODate(new Date("2026-03-28T23:30:00.000Z")),
]));
`;
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(
  JSON.parse(output),
  ["2026-11-25", "2026-03-29"],
  "the refreshed payment date must follow the current local calendar across midnight and DST",
);

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-accounting-payment-open-date-refresh.mjs"));
console.log("Accounting payment open-date refresh regression checks passed.");
