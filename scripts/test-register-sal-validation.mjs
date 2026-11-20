import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const start = source.indexOf("async function saveProgress(e:React.FormEvent)");
const end = source.indexOf("async function saveWorkExpense", start);
assert.ok(start >= 0 && end > start, "saveProgress handler must exist");
const handler = source.slice(start, end);
const validation = handler.indexOf("cumulativeAmount>approved+0.005");
const insert = handler.indexOf(".from(\"condominium_work_progress\").insert(");
assert.ok(validation >= 0 && insert > validation, "approved-total validation must run before SAL insert");
assert.ok(handler.indexOf("paidAmount>amount+0.005") < insert, "paid amount cannot exceed SAL amount before insert");
assert.ok(handler.indexOf("cumulativePercentage>100.005") < insert, "cumulative percentage must be checked before insert");
assert.match(handler, /if\(workError\)throw workError/, "work progress update errors must be surfaced");
assert.match(handler, /setError\(e\?\.message\|\|/, "validation errors must be displayed to the user");
console.log("SAL validation regression checks passed.");
