import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const helper = await readFile(new URL("../src/lib/local-date.ts", import.meta.url), "utf8");
const accounting = await readFile(new URL("../src/AccountingPage.tsx", import.meta.url), "utf8");

assert.ok(accounting.includes("function createEmptyCaseForm(date = new Date())"));
assert.ok(accounting.includes("useState(createEmptyCaseForm())"), "case form state must start from a fresh empty form");

const saveStart = accounting.indexOf("async function saveCase(");
const saveEnd = accounting.indexOf("\n  function calculateAutomaticPreview()", saveStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart, "saveCase handler must exist");
const saveHandler = accounting.slice(saveStart, saveEnd);
assert.ok(
  saveHandler.includes("setEditingCase(null);\n      setCaseForm(createEmptyCaseForm());\n      setShowCaseForm(false);"),
  "successful save must clear the form before it is reused",
);

assert.ok(
  accounting.includes('onClick={() => { setEditingCase(null); setCaseForm(createEmptyCaseForm()); setShowCaseForm(true); }}>+ Nuova pratica'),
  "opening a new legal case must not reuse values from a previous edit or cancelled draft",
);
assert.ok(
  accounting.includes('onClick={() => { setShowCaseForm(false); setEditingCase(null); setCaseForm(createEmptyCaseForm()); }}>Annulla'),
  "cancelling the case form must clear its draft state",
);
assert.ok(
  accounting.includes("setCaseForm({ title: item.title, counterpart: item.counterpart, status: item.status, opened_date: item.opened_date || \"\", closed_date: item.closed_date || \"\", notes: item.notes })"),
  "editing an existing case must still populate that selected case",
);

const factoryStart = accounting.indexOf("function createEmptyCaseForm(date = new Date())");
const factoryBodyStart = accounting.indexOf("{", factoryStart);
const factoryBodyEnd = accounting.indexOf("\n}", factoryBodyStart);
assert.ok(factoryStart >= 0 && factoryBodyStart > factoryStart && factoryBodyEnd > factoryBodyStart, "case form factory body must be extractable");
const factoryBody = accounting.slice(factoryBodyStart + 1, factoryBodyEnd);
assert.ok(factoryBody.includes("opened_date: localISODate(date)"), "new cases must use the current local calendar date");

const executable = helper.replaceAll("export function", "function").replace("days: number", "days") + `
function createEmptyCaseForm(date = new Date()) {${factoryBody}
}
console.log(JSON.stringify(createEmptyCaseForm(new Date("2026-11-24T23:30:00.000Z"))));
`;
const output = execFileSync(process.execPath, ["-e", executable], {
  env: { ...process.env, TZ: "Europe/Rome" },
  encoding: "utf8",
}).trim();
assert.deepEqual(
  JSON.parse(output),
  { title: "", counterpart: "", status: "Aperto", opened_date: "2026-11-25", closed_date: "", notes: "" },
  "a new legal case must start blank and use the current local calendar date",
);

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-accounting-legal-case-form-reset.mjs"));
console.log("Accounting legal case form reset regression checks passed.");
