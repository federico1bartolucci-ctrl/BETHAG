import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../src/RegisterPage.tsx",import.meta.url),"utf8");
const start=source.indexOf("async function saveWorkDocuments");const end=source.indexOf("async function registerProgressPayment",start);
assert.ok(start>=0&&end>start,"register saveWorkDocuments must exist");const fn=source.slice(start,end);
assert.ok(fn.includes("error:deleteError"),"delete error must be captured");assert.ok(fn.includes("if(deleteError)throw deleteError;"),"delete failure must stop replacement");
console.log("Register work document delete-error regression checks passed.");
