import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261011120000_reconcile_function_body_and_acl_parity.sql', import.meta.url),
  'utf8',
);

const statements = migration
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);

function grantsFor(signature) {
  return statements.filter((statement) =>
    /^grant\s+execute\s+on\s+function\s+/i.test(statement)
    && statement.toLowerCase().includes(signature.toLowerCase()),
  );
}

test('transfer closure checker is executable only by authenticated and service_role', () => {
  const privateGrants = grantsFor('private.check_condominium_member_transfer_closure(');
  const publicGrants = grantsFor('public.check_condominium_member_transfer_closure(');

  assert.equal(privateGrants.length, 1);
  assert.match(privateGrants[0], /to\s+"authenticated",\s+"service_role"$/i);
  assert.equal(publicGrants.length, 2);
  assert.ok(publicGrants.every((grant) =>
    /to\s+"authenticated"$/i.test(grant) || /to\s+"service_role"$/i.test(grant),
  ));
  assert.ok(publicGrants.every((grant) => !/\bto\s+public\b/i.test(grant)));
});

test('trigger functions do not receive direct PUBLIC execute grants', () => {
  for (const signature of [
    'public.normalize_zero_ownership_owner()',
    'public.preserve_closing_condominium_member_history()',
  ]) {
    const grants = grantsFor(signature);
    assert.equal(grants.length, 1, signature);
    assert.match(grants[0], /to\s+"service_role"$/i, signature);
    assert.doesNotMatch(grants[0], /\bto\s+public\b/i, signature);
  }
});

test('the ACL parity migration contains no execute grant to PUBLIC', () => {
  const publicExecuteGrants = statements.filter((statement) =>
    /^grant\s+execute\s+on\s+function\s+/i.test(statement)
    && /\bto\s+public\b/i.test(statement),
  );
  assert.deepEqual(publicExecuteGrants, []);
});
