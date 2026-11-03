import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migrationPath = '../supabase/migrations/20261015162104_restore_fund_availability_view_acl.sql';
const migration = readFileSync(new URL(migrationPath, import.meta.url), 'utf8');

test('fund availability view ACL repair removes public/anon access and restores app roles', () => {
  assert.match(migration, /revoke all privileges on table public\.condominium_fund_availability from anon, public/i);
  assert.match(migration, /grant all privileges on table public\.condominium_fund_availability to authenticated, service_role/i);
  assert.match(migration, /begin;[\s\S]*revoke[\s\S]*grant[\s\S]*commit;/i);
});
