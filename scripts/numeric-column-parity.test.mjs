import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261015155159_reconcile_numeric_column_precision.sql', import.meta.url),
  'utf8',
);

test('numeric parity migration protects data and preserves dependent objects', () => {
  assert.match(migration, /Precision preflight failed/i);
  assert.match(migration, /abs\(%I\) >= power\(10/);
  assert.match(migration, /drop view public\.condominium_fund_availability/i);
  assert.match(migration, /drop trigger trg_sync_condominium_fund_usage on public\.condominium_ledger_entries/i);
  assert.match(migration, /create trigger trg_sync_condominium_fund_usage[\s\S]*update of fund_id, amount, direction/i);
  assert.match(migration, /create view public\.condominium_fund_availability\s+with \(security_invoker = true\)/i);
  assert.match(migration, /revoke all privileges on table public\.condominium_fund_availability from anon, public/i);
  assert.match(migration, /grant all privileges on table public\.condominium_fund_availability to authenticated, service_role/i);

  for (const expected of [
    'condominium_expense_allocations',
    'condominium_fiscal_carryovers',
    'condominium_fiscal_years',
    'condominium_funds',
    'condominium_ledger_entries',
    'condominium_tax_obligations',
  ]) {
    assert.ok(migration.includes(expected), `migration should cover ${expected}`);
  }
});
