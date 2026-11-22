import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("supabase/functions/bethag-resend-webhook/index.ts", "utf8");
assert.match(source, /let signatureVerified = false/);
assert.match(source, /signatureVerified = true/);
assert.match(source, /status:signatureVerified \? 500 : 401/);
assert.match(source, /signatureVerified \? "Errore interno durante la registrazione dell’evento\." : "Evento non autorizzato\."/);
console.log("Resend webhook failure-status regression guard: PASS");
