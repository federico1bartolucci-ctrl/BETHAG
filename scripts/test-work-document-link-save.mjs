import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/RegisterPage.tsx", "utf8");
const start = source.indexOf("async function saveWorkDocuments");
const end = source.indexOf("async function registerProgressPayment", start);
assert.notEqual(start, -1, "Work document save handler must exist.");
assert.notEqual(end, -1, "Work document save handler must remain delimited.");
const handler = source.slice(start, end);

assert.match(handler, /\.from\("condominium_work_documents"\)\.select\("id,document_id"\)/, "Existing links must be loaded before reconciliation.");
assert.match(handler, /if\(loadError\)throw loadError/, "Failed link lookup must stop saving.");
assert.match(handler, /const added=\[\.\.\.selectedIds\]\.filter\(id=>!existingIds\.has\(id\)\)/, "Only newly selected links should be inserted.");
assert.match(handler, /const removed=existingRows\.filter\(\(row:any\)=>!selectedIds\.has\(Number\(row\.document_id\)\)\)/, "Only deselected links should be removed.");
assert.match(handler, /if\(added\.length\)[\s\S]*\.insert\(rows\)[\s\S]*if\(insertError\)throw insertError[\s\S]*if\(removed\.length\)[\s\S]*\.delete\(\)\.in\("id",removed\)/, "New links must be inserted before deletion and insert errors must be surfaced.");
assert.match(handler, /if\(deleteError\)throw deleteError/, "Delete errors must be surfaced.");
assert.doesNotMatch(handler, /\.delete\(\)\.eq\("work_id",documentWork\.id\)[\s\S]*\.insert\(rows\)/, "Save must not use delete-all then recreate.");
console.log("Work document link reconciliation regression guard: PASS");
