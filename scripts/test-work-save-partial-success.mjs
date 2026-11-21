import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source=await readFile("src/RegisterPage.tsx","utf8");
const audit=source.slice(source.indexOf("async function auditWork("),source.indexOf("async function createDeadlineActivity"));
const save=source.slice(source.indexOf("async function saveWork(e:"),source.indexOf("async function createWorkActivity"));
assert.match(audit,/const \{error\}=await supabase\.from\("condominium_audit_log"\)[\s\S]*return error/,"audit helper must surface persistence failures");
assert.match(save,/setEditingWork\(null\);setShowWorkForm\(false\);/,"close form after primary work save");
assert.match(save,/historyWarning[\s\S]*await load\(\)[\s\S]*Intervento salvato correttamente, ma la registrazione dello storico\/audit è incompleta/,"partial success must be surfaced without inviting duplicate save");
console.log("Work save partial-success regression checks passed.");
