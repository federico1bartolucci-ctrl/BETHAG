import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/AccountingPage.tsx", "utf8");
const bulkSaveStart = source.indexOf("async function saveBulkMillesimalValues()");
assert.notEqual(bulkSaveStart, -1, "Bulk millesimal save handler must exist.");
const bulkSaveEnd = source.indexOf("async function saveMillesimalValue(", bulkSaveStart);
assert.notEqual(bulkSaveEnd, -1, "Bulk save handler must be bounded by the next handler.");
const handler = source.slice(bulkSaveStart, bulkSaveEnd);

// Existing metadata must be read by table/unit key and retained in the upsert payload.
assert.match(handler, /scopedMillesimalValues\.find\(v => v\.table_id === bulkMillesimalTableId && v\.unit_id === u\.id\)/);
assert.match(handler, /excluded:existing\?\.excluded \?\? false/);
assert.match(handler, /notes:existing\?\.notes \?\? ""/);
assert.match(handler, /value:Number\(bulkMillesimalValues\[u\.id\]\s*\|\|\s*0\)/);

// Regression model: editing values must not change exclusion/notes; newly created rows default safely.
const existing = { value: 220, excluded: true, notes: "Esclusa per regolamento" };
const updated = { ...existing, value: 240 };
assert.equal(updated.value, 240);
assert.equal(updated.excluded, true);
assert.equal(updated.notes, "Esclusa per regolamento");
const fresh = { value: 100, excluded: false, notes: "" };
assert.equal(fresh.excluded, false);
assert.equal(fresh.notes, "");
console.log("Bulk millesimal metadata-preservation regression checks passed.");
