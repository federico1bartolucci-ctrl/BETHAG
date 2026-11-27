import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
assert.match(helper, /export function localISODate\(date = new Date\(\)\)/);
assert.match(helper, /export function localISODateAfterDays\(days: number, date = new Date\(\)\)/);
assert.match(helper, /nextDate\.setDate\(nextDate\.getDate\(\) \+ days\)/);

const register = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.match(register, /import \{ localISODate, localISODateAfterDays \} from "\.\/lib\/local-date"/);
assert.equal((register.match(/localISODate\(\)/g) ?? []).length, 10, "all Register date-only defaults and today's comparisons use the local calendar");
assert.equal((register.match(/localISODateAfterDays\(30\)/g) ?? []).length, 2, "both 30-day warning windows use calendar-day arithmetic");
assert.doesNotMatch(register, /toISOString\(\)/, "date-only register operations must not derive their day from UTC");

const paymentStart = register.indexOf("async function registerProgressPayment(");
const paymentEnd = register.indexOf("async function auditWork(", paymentStart);
assert.ok(paymentStart >= 0 && paymentEnd > paymentStart, "registerProgressPayment function boundaries");
assert.match(register.slice(paymentStart, paymentEnd), /paymentForm\.entry_date\|\|localISODate\(\)/, "SAL payment fallback uses local date");

const recordStart = register.indexOf("async function recordProgressPayment(");
const recordEnd = register.indexOf("async function saveProgress(", recordStart);
assert.ok(recordStart >= 0 && recordEnd > recordStart, "recordProgressPayment function boundaries");
assert.match(register.slice(recordStart, recordEnd), /p\.progress_date\|\|localISODate\(\)/, "recorded SAL payment uses local date");

const progressStart = register.indexOf("async function saveProgress(");
const progressEnd = register.indexOf("async function saveWorkExpense(", progressStart);
assert.ok(progressStart >= 0 && progressEnd > progressStart, "saveProgress function boundaries");
assert.match(register.slice(progressStart, progressEnd), /progressForm\.progress_date\|\|localISODate\(\)/, "new SAL fallback uses local date");

const closeStart = register.indexOf("async function closeWork(");
const closeEnd = register.indexOf("async function saveWork(", closeStart);
assert.ok(closeStart >= 0 && closeEnd > closeStart, "closeWork function boundaries");
assert.match(register.slice(closeStart, closeEnd), /actual_end_date:localISODate\(\)/, "work closure records the local calendar date");

assert.match(register, /setPaymentForm\(\{entry_date:localISODate\(\)/, "SAL payment form defaults to local date");
assert.match(register, /progress_date:localISODate\(\)/, "new SAL form defaults to local date");
assert.match(register, /setExpenseForm\(\{entry_date:localISODate\(\)/, "work-expense form defaults to local date");
assert.equal((register.match(/const today=localISODate\(\);/g) ?? []).length, 2, "both overdue/expiry comparisons use local today");

const executable = helper.replaceAll("export function", "function").replace("days: number", "days") + `
const lateNovember = new Date("2026-11-23T23:30:00.000Z");
const dstBoundary = new Date("2026-03-28T23:30:00.000Z");
console.log(JSON.stringify({
  novemberLocal: localISODate(lateNovember),
  novemberPlusThirtyCalendarDays: localISODateAfterDays(30, lateNovember),
  novemberOldUtcPlusThirty: new Date(lateNovember.getTime() + 30 * 86400000).toISOString().slice(0, 10),
  dstLocal: localISODate(dstBoundary),
  dstPlusSevenCalendarDays: localISODateAfterDays(7, dstBoundary),
  dstOldUtcPlusSeven: new Date(dstBoundary.getTime() + 7 * 86400000).toISOString().slice(0, 10),
}));
`;
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(JSON.parse(output), {
  novemberLocal: "2026-11-24",
  novemberPlusThirtyCalendarDays: "2026-12-24",
  novemberOldUtcPlusThirty: "2026-12-23",
  dstLocal: "2026-03-29",
  dstPlusSevenCalendarDays: "2026-04-05",
  dstOldUtcPlusSeven: "2026-04-04",
}, "Register dates must follow local calendar days around midnight and DST");

console.log("Register SAL and work local-date regression checks passed.");
