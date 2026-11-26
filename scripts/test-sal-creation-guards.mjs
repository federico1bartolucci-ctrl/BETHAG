import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const src = await readFile(new URL("../src/RegisterPage.tsx", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/rebuild/proposed-forward-migrations/20261123050000_atomic_work_progress_payment_registration.sql", import.meta.url), "utf8");
const start = src.indexOf("async function saveProgress(");
const end = src.indexOf("async function saveWorkExpense(", start);
assert.ok(start >= 0 && end > start, "SAL handler must exist");
const handler = src.slice(start, end);
assert.match(handler, /rpc\("create_condominium_work_progress_atomic"/, "SAL creation must use transactional RPC");
assert.doesNotMatch(handler, /\.from\("condominium_work_progress"\)\.insert\(/, "frontend must not directly insert SAL");

const fnStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.create_condominium_work_progress_atomic(");
assert.ok(fnStart >= 0, "atomic SAL creation RPC must exist");
const fn = migration.slice(fnStart);
assert.match(fn, /from public\.condominium_works[\s\S]*for update/, "parent work row must be locked to serialize SAL creation");
const triggerStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.validate_condominium_work_progress_accounting_links(");
const triggerEnd = migration.indexOf("REVOKE ALL ON FUNCTION public.validate_condominium_work_progress_accounting_links()", triggerStart);
assert.ok(triggerStart >= 0 && triggerEnd > triggerStart, "accounting-link trigger function must exist");
const triggerFn = migration.slice(triggerStart, triggerEnd);
assert.match(triggerFn, /from public\.condominium_works[\s\S]*for update/, "direct SAL inserts and updates must lock the parent work");
assert.match(triggerFn, /new\.workspace_id is distinct from w\.workspace_id[\s\S]*new\.condominium_id is distinct from w\.condominium_id/,
  "trigger must reject SAL rows outside the work workspace/condominium");
assert.match(triggerFn, /v_total_sal[\s\S]*approved_amount[\s\S]*raise exception/,
  "database trigger must enforce cumulative SAL cap even for direct table writes");
assert.match(migration, /REVOKE ALL ON FUNCTION public\.validate_condominium_work_progress_accounting_links\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
  "trigger-only helper must not expose direct EXECUTE");
assert.match(src, /async function registerProgressPayment[\s\S]*rpc\("register_condominium_work_progress_payment"/,
  "partial SAL payments must use the atomic payment RPC");
assert.match(src, /async function recordProgressPayment[\s\S]*rpc\("record_condominium_work_progress_payment"/,
  "full SAL payments must use the atomic payment RPC");
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS condominium_work_events_sal_payment_idempotency_uidx/,
  "payment event idempotency keys must be unique per workspace");
assert.match(migration, /p_idempotency_key text/,
  "both payment RPCs must require a request idempotency key");
assert.match(migration, /data->>'idempotencyKey'[\s\S]*return v_existing\.payment_entry_id/,
  "a retry with the same request key must return the existing ledger movement");
assert.match(migration, /Chiave idempotenza già utilizzata per una richiesta diversa/,
  "reusing a key for a different payment payload must fail closed");
assert.match(src, /idempotency_key:crypto\.randomUUID\(\)/,
  "partial-payment form must retain one key across retries");
assert.match(src, /p_idempotency_key:idempotencyKey/,
  "partial-payment RPC must receive the stable form key");
assert.match(src, /p_idempotency_key:"sal-full-payment:"\+p\.id/,
  "full-payment retries must use a stable per-SAL key");
assert.match(fn, /approved_amount[\s\S]*v_total_amount[\s\S]*raise exception/, "approved amount guard must be enforced server-side");
assert.match(fn, /p_status not in \('Presentato','Verificato','Approvato','Contestato'\)[\s\S]*Stato SAL non valido/, "paid or unsupported status must be rejected at database level");

const progressFormStart = src.indexOf('<form className="modal-card" onSubmit={saveProgress}');
const progressFormEnd = src.indexOf("</form>", progressFormStart);
assert.ok(progressFormStart >= 0 && progressFormEnd > progressFormStart, "SAL creation form must exist");
const progressFormMarkup = src.slice(progressFormStart, progressFormEnd);
assert.doesNotMatch(progressFormMarkup, /<option>Pagato<\/option>/, "SAL creation form must not expose the paid status");
assert.match(fn, /insert into public\.condominium_work_progress[\s\S]*update public\.condominium_works[\s\S]*get diagnostics v_updated=row_count[\s\S]*if v_updated<>1/, "SAL insert and progress synchronization must be inside one transactional function with affected-row guard");
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_condominium_work_progress_atomic[\s\S]*TO authenticated, service_role/, "RPC execution grants must be explicitly defined");
assert.match(handler, /Number\(progressForm\.paid_amount\|\|0\)>0[\s\S]*Registra pagamento/, "frontend must prevent an unlinked initial payment");
assert.doesNotMatch(progressFormMarkup, /label>Importo pagato<input[^>]*value=\{progressForm\.paid_amount\}/, "SAL form must not expose editable initial paid amount");
assert.match(progressFormMarkup, /Importo pagato[\s\S]*i pagamenti si registrano dopo la creazione del SAL/, "SAL UI must explain payment registration workflow");
assert.match(fn, /if v_paid>0 then[\s\S]*Registra pagamento[\s\S]*end if;/, "database must reject initial paid amounts without ledger registration");

console.log("PASS SAL creation atomicity: client RPC, parent lock, cumulative budget validation, insert+progress update and row-count guard.");
