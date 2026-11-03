import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261015160109_harden_member_transfer_wrapper_search_path.sql', import.meta.url),
  'utf8',
);

test('member transfer wrapper pins an empty search_path and calls the private implementation explicitly', () => {
  assert.match(migration, /create or replace function public\.close_condominium_member_transfer\(p_transfer_id uuid\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path to ''/i);
  assert.match(migration, /return private\.close_condominium_member_transfer\(p_transfer_id\)/i);
});
