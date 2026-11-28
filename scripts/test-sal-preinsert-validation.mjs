import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/RegisterPage.tsx", "utf8");
const start = source.indexOf("async function saveProgress(");
assert.notEqual(start, -1, "saveProgress exists");
const end = source.indexOf(" async function saveWorkExpense(", start);
assert.notEqual(end, -1, "saveProgress boundary exists");
const fn = source.slice(start, end);
const insertAt = fn.indexOf("insertWorkProgressRecord(");
assert.notEqual(insertAt, -1, "SAL insert helper call exists");
assert.ok(fn.indexOf("cumulativeAmount") >= 0, "cumulative SAL budget validation must exist");
assert.ok(fn.indexOf("cumulativeAmount") < insertAt, "budget validation must precede insert");
assert.ok(fn.indexOf("paidAmount>amount+0.005") < insertAt, "paid amount validation must precede insert");
assert.doesNotMatch(fn, /progress_percent\s*:/, "client must not overwrite trigger-owned progress percentage");
assert.doesNotMatch(fn, /from\(["']condominium_works["']\)\.update/, "SAL creation must not issue a second parent-work update");

const helper = await readFile("src/lib/insertWorkProgressRecord.mjs", "utf8");
assert.match(helper, /from\(["']condominium_work_progress["']\)\s*\.insert\(payload\)/, "helper must insert the SAL row");
assert.match(helper, /if\s*\(error\)\s*throw error/, "SAL insert errors must propagate");

console.log("PASS: SAL pre-insert validation remains before the trigger-owned insert; no stale parent percentage write remains.");
