import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/20261121160000_record_work_progress_payment_atomically.sql", "utf8");
const source = await readFile("src/RegisterPage.tsx", "utf8");

assert.match(migration, /FOR UPDATE/);
assert.match(migration, /SECURITY DEFINER/);
assert.match(migration, /can_manage_workspace_module\(v_progress\.workspace_id, 'contabilita'\)/);
assert.match(migration, /ledger_entry_id IS NOT NULL OR v_progress\.payment_entry_id IS NOT NULL/);
assert.match(migration, /INSERT INTO public\.condominium_ledger_entries[\s\S]*UPDATE public\.condominium_work_progress/);
assert.match(migration, /REVOKE EXECUTE[\s\S]*FROM PUBLIC, anon/);
assert.match(migration, /GRANT EXECUTE[\s\S]*TO authenticated/);
assert.match(source, /supabase\.rpc\("record_work_progress_payment"/);
assert.doesNotMatch(source, /async function recordProgressPayment[\s\S]*?\.from\("condominium_ledger_entries"\)\.insert/);
console.log("SAL atomic-payment regression guard: PASS");
