import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveWorkDocuments()");
const end = source.indexOf("async function registerProgressPayment", start);
assert.ok(start >= 0 && end > start, "saveWorkDocuments handler must exist");
const handler = source.slice(start, end);
assert.match(handler, /const \\{error:deleteError\\}\\s*=\\s*await supabase\\.from\\("condominium_work_documents"\\)\\.delete/);
assert.ok(handler.indexOf("if(deleteError)throw deleteError") < handler.indexOf("linkedDocumentIds.map"), "delete errors must stop replacement insert");
console.log("Work document link deletion regression guard: PASS");
