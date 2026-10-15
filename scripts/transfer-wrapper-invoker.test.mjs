import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261015162156_use_invoker_for_transfer_wrapper.sql', import.meta.url),
  'utf8',
);

test('public transfer wrapper is invoker-secured and delegates to guarded private implementation', () => {
  assert.match(migration, /create or replace function public\.close_condominium_member_transfer\(p_transfer_id uuid\)/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path to ''/i);
  assert.match(migration, /return private\.close_condominium_member_transfer\(p_transfer_id\)/i);
  assert.match(migration, /grant usage on schema private to authenticated, service_role/i);
  assert.match(migration, /grant execute on function private\.close_condominium_member_transfer\(uuid\) to authenticated, service_role/i);
  assert.match(migration, /revoke all on function public\.close_condominium_member_transfer\(uuid\) from public, anon/i);
});
