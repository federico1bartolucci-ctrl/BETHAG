import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
assert.match(helper, /getFullYear\(\)/);
assert.match(helper, /getMonth\(\)/);
assert.match(helper, /getDate\(\)/);
const executable = helper.replaceAll("export function", "function").replace("days: number", "days")
  + String.fromCharCode(10)
  + 'console.log(localISODate(new Date("2026-11-21T23:30:00.000Z")));';
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.equal(output, "2026-11-22", "Local date must not fall back to the UTC calendar date");
const accounting = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");
assert.match(accounting, /entry_date:\s*localISODate\(\)/);
console.log("Local ledger date regression passed.");
