import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const postgresAssertions = readFileSync(
  new URL('../scripts/function-acl-postgres-assertions.sql', import.meta.url),
  'utf8',
);

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

test('private fiscal carryover generator remains executable by authenticated', () => {
  const grants = grantsFor('private.generate_fiscal_year_carryovers(');
  assert.equal(grants.length, 1);
  assert.match(grants[0], /to\s+"authenticated",\s+"service_role"$/i);
});

test('invoker-backed private RPCs preserve the live authenticated grants', () => {
  const sharedRoleFunctions = [
    'private.archive_condominium(',
    'private.close_condominium_fiscal_year(',
    'private.close_fiscal_year_and_generate_carryovers(',
    'private.compensate_fiscal_carryover(',
    'private.complete_portal_registration(',
    'private.confirm_condominium_creation_intake(',
    'private.delete_condominium(',
    'private.generate_installments_from_allocations(',
    'private.generate_installments_from_allocations_schedule(',
    'private.list_archived_condominiums(',
    'private.register_condominium_installment_payment(',
    'private.restore_condominium(',
    'private.set_personal_security_code(',
    'private.verify_personal_security_code(',
  ];
  for (const signature of sharedRoleFunctions) {
    const grants = grantsFor(signature);
    assert.equal(grants.length, 1, signature);
    assert.match(grants[0], /to\s+"authenticated",\s+"service_role"$/i, signature);
  }

  const transferCloseGrants = grantsFor('private.close_condominium_member_transfer(');
  assert.equal(transferCloseGrants.length, 1);
  assert.match(transferCloseGrants[0], /to\s+"authenticated",\s+"service_role"$/i);
});

test('consumption allocation RPC rejects an expense from a different fiscal year', () => {
  const definitionStart = migration.indexOf('CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(');
  assert.ok(definitionStart >= 0, 'generate_consumption_allocations definition must be present in the parity migration');
  const delimiter = '$' + 'function' + '$';
  const bodyStart = migration.indexOf('AS ' + delimiter, definitionStart);
  const bodyEnd = migration.indexOf(delimiter + ';', bodyStart + 3 + delimiter.length);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'consumption allocation function body must be delimited');
  const body = migration.slice(bodyStart + 3 + delimiter.length, bodyEnd).toLowerCase();
  const guard = body.indexOf('if v_expense.fiscal_year_id is distinct from p_fiscal_year_id then');
  const deletion = body.indexOf('delete from public.condominium_expense_allocations');
  assert.ok(guard >= 0, 'RPC must compare the expense fiscal year with the requested fiscal year');
  assert.ok(guard < deletion, 'RPC must reject a mismatch before modifying allocations');
  assert.ok(body.includes('la spesa e i dati di consumo devono appartenere allo stesso esercizio contabile'));
});
test('PostgreSQL ACL runtime assertions contain six complete IF/THEN guards', () => {
  const occurrences = (needle) => postgresAssertions.split(needle).length - 1;
  assert.equal(occurrences("IF NOT "), 6);
  assert.equal(occurrences(" THEN"), 6);
  assert.equal(occurrences("RAISE EXCEPTION"), 6);
  assert.equal(occurrences("has_function_privilege('anon'"), 20);
  assert.equal(occurrences("has_function_privilege('authenticated'"), 20);
  assert.equal(occurrences("has_function_privilege('service_role'"), 20);
  assert.equal(occurrences("has_function_privilege('public'"), 0,
    "PUBLIC access is detected through inherited application-role privileges, not a pseudo-role lookup");
});
test('PostgreSQL ACL runtime assertions contain six complete IF/THEN guards', () => {
  const occurrences = (needle) => postgresAssertions.split(needle).length - 1;
  assert.equal(occurrences("IF NOT "), 6);
  assert.equal(occurrences(" THEN"), 6);
  assert.equal(occurrences("RAISE EXCEPTION"), 6);
  assert.equal(occurrences("has_function_privilege('anon'"), 20);
  assert.equal(occurrences("has_function_privilege('authenticated'"), 20);
  assert.equal(occurrences("has_function_privilege('service_role'"), 20);
  assert.equal(occurrences("has_function_privilege('public'"), 0,
    "PUBLIC access is detected through inherited application-role privileges, not a pseudo-role lookup");
});
.length);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'consumption allocation function body must be delimited');
  const body = migration.slice(bodyStart + 'AS $function
  const guard = body.indexOf('if v_expense.fiscal_year_id is distinct from p_fiscal_year_id then');
  const deletion = body.indexOf('delete from public.condominium_expense_allocations');
  assert.ok(guard >= 0, 'RPC must compare the expense fiscal year with the requested fiscal year');
  assert.ok(guard < deletion, 'RPC must reject a mismatch before modifying allocations');
  assert.ok(body.includes('la spesa e i dati di consumo devono appartenere allo stesso esercizio contabile'));
});

test('PostgreSQL ACL runtime assertions contain six complete IF/THEN guards', () => {
  const occurrences = (needle) => postgresAssertions.split(needle).length - 1;
  assert.equal(occurrences("IF NOT "), 6);
  assert.equal(occurrences(" THEN"), 6);
  assert.equal(occurrences("RAISE EXCEPTION"), 6);
  assert.equal(occurrences("has_function_privilege('anon'"), 20);
  assert.equal(occurrences("has_function_privilege('authenticated'"), 20);
  assert.equal(occurrences("has_function_privilege('service_role'"), 20);
  assert.equal(occurrences("has_function_privilege('public'"), 0,
    "PUBLIC access is detected through inherited application-role privileges, not a pseudo-role lookup");
});
.length, bodyEnd).toLowerCase();
  const guard = body.indexOf('if v_expense.fiscal_year_id is distinct from p_fiscal_year_id then');
  const deletion = body.indexOf('delete from public.condominium_expense_allocations');
  assert.ok(guard >= 0, 'RPC must compare the expense fiscal year with the requested fiscal year');
  assert.ok(guard < deletion, 'RPC must reject a mismatch before modifying allocations');
  assert.ok(body.includes('la spesa e i dati di consumo devono appartenere allo stesso esercizio contabile'));
});

test('PostgreSQL ACL runtime assertions contain six complete IF/THEN guards', () => {
  const occurrences = (needle) => postgresAssertions.split(needle).length - 1;
  assert.equal(occurrences("IF NOT "), 6);
  assert.equal(occurrences(" THEN"), 6);
  assert.equal(occurrences("RAISE EXCEPTION"), 6);
  assert.equal(occurrences("has_function_privilege('anon'"), 20);
  assert.equal(occurrences("has_function_privilege('authenticated'"), 20);
  assert.equal(occurrences("has_function_privilege('service_role'"), 20);
  assert.equal(occurrences("has_function_privilege('public'"), 0,
    "PUBLIC access is detected through inherited application-role privileges, not a pseudo-role lookup");
});
