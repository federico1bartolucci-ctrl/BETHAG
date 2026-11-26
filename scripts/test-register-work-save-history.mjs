import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { recordWorkHistoryAfterSave } from "../src/lib/workHistoryAfterSave.mjs";

let successfulWrites = 0;
assert.equal(
  await recordWorkHistoryAfterSave(async () => { successfulWrites += 1; }),
  false,
  "a successful history write must not produce a warning",
);
assert.equal(successfulWrites, 1);

let failedWrites = 0;
assert.equal(
  await recordWorkHistoryAfterSave(async () => {
    failedWrites += 1;
    throw new Error("simulated RLS/network failure");
  }),
  true,
  "a failed history write must be reported as a post-save warning",
);
assert.equal(failedWrites, 1, "the failed history write is attempted exactly once");

assert.throws(() => recordWorkHistoryAfterSave(null), /must be a function/);

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveWork(");
const end = source.indexOf("\n async function createWorkActivity", start);
assert.ok(start >= 0 && end > start, "saveWork function boundaries");
const saveWork = source.slice(start, end);
const persist = saveWork.indexOf('supabase.from("condominium_works")');
const history = saveWork.indexOf("recordWorkHistoryAfterSave(");
const closeForm = saveWork.indexOf("setShowWorkForm(false)");
const audit = saveWork.indexOf("await auditWork(");
assert.ok(persist >= 0 && history > persist, "history must be written only after work persistence");
assert.ok(closeForm > history && audit > closeForm, "form must close before the later audit write can fail");
assert.ok(saveWork.includes("if(persisted)"), "post-persistence failures must not be reported as a failed work save");
assert.ok(saveWork.includes("Non ripetere il salvataggio"), "the user must be warned not to retry a work that was already persisted");
assert.ok(saveWork.includes("cronologia non è stata registrata"), "a failed history write must be surfaced as a partial-success warning");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-register-work-save-history.mjs"));

console.log("PASS: Register work-save history failure does not leave a persisted new work behind an open retryable form.");
