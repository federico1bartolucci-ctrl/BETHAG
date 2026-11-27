import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
assert.match(helper, /export function localISODate\(date = new Date\(\)\)/);

const register = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
assert.match(register, /import \{[^}]*localISODate[^}]*\} from "\.\/lib\/local-date"/);
const start = register.indexOf("async function saveWorkExpense(");
const end = register.indexOf("async function openWorkHistory(", start);
assert.ok(start >= 0 && end > start, "saveWorkExpense function boundaries");
const handler = register.slice(start, end);
assert.ok(handler.includes("expenseForm.entry_date||localISODate()"), "blank expense date must default to the local calendar date");
assert.ok(!handler.includes("toISOString()"), "expense default must not derive the calendar day from UTC");

const executable = helper.replaceAll("export function", "function").replace("days: number", "days") + `
console.log(JSON.stringify({
  lateNovemberLocal: localISODate(new Date("2026-11-23T23:30:00.000Z")),
  lateNovemberUtc: new Date("2026-11-23T23:30:00.000Z").toISOString().slice(0, 10),
  dstTransitionLocal: localISODate(new Date("2026-03-28T23:30:00.000Z")),
  dstTransitionUtc: new Date("2026-03-28T23:30:00.000Z").toISOString().slice(0, 10),
}));
`;
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(JSON.parse(output), {
  lateNovemberLocal: "2026-11-24",
  lateNovemberUtc: "2026-11-23",
  dstTransitionLocal: "2026-03-29",
  dstTransitionUtc: "2026-03-28",
}, "expense dates must follow the local calendar near midnight and across DST");

console.log("Register work-expense local date regression checks passed.");
