import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("supabase/functions/delete-account/index.ts", "utf8");
assert.match(source, /if \(verifyError\)[\s\S]*?status: 500|Response\.json\(\{ error: "Errore durante la verifica del codice di sicurezza\." \}, \{ status: 500 \}\)/, "RPC verification failures return server error");
assert.match(source, /if \(valid !== true\)[\s\S]*?status: 403|Response\.json\(\{ error: "Codice personale di sicurezza non valido\." \}, \{ status: 403 \}\)/, "incorrect security codes return forbidden");
console.log("Delete-account security code RPC error checks passed.");
