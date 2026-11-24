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

function functionDefinition(name) {
  const marker = 'CREATE OR REPLACE FUNCTION ' + name + '(';
  const definitionStart = migration.indexOf(marker);
  assert.ok(definitionStart >= 0, name + ' definition must be present in the parity migration');
  const delimiter = '$' + 'function' + '$';
  const bodyStart = migration.indexOf('AS ' + delimiter, definitionStart);
  const bodyEnd = migration.indexOf(delimiter + ';', bodyStart + 3 + delimiter.length);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, name + ' body must be delimited');
  return {
    header: migration.slice(definitionStart, bodyStart),
    body: migration.slice(bodyStart + 3 + delimiter.length, bodyEnd).toLowerCase(),
  };
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

test('portal approval RPC preserves workspace, identity, and account-link safeguards', () => {
  const definition = functionDefinition('private.admin_approve_portal_registration');
  const body = definition.body;
  const approvalGrants = grantsFor('private.admin_approve_portal_registration(');
  assert.equal(approvalGrants.length, 1);
  assert.match(approvalGrants[0], /to\s+"authenticated"$/i);
  assert.match(definition.header, /SECURITY DEFINER/i);
  assert.match(definition.header, /SET search_path TO ''/i);
  const memberLock = body.indexOf('from public.condominium_members');
  const lock = body.indexOf('for update', memberLock);
  const requestRead = body.indexOf('select * into v_request');
  const workspaceAuthorization = body.indexOf("can_manage_workspace_module(v_workspace,'portale')");
  assert.ok(memberLock >= 0 && lock > memberLock && lock < requestRead,
    'selected member must be locked before the registration request');
  assert.ok(workspaceAuthorization >= 0 && workspaceAuthorization < requestRead,
    'workspace authorization must precede reading request state');
  for (const safeguard of [
    'v_request.workspace_id<>v_workspace',
    'v_email_confirmed_at is null',
    'account_email_not_verified_or_mismatch',
    'portal_member_already_linked',
    'mismatch_request_must_use_original_matched_member',
    'portal_request_condominium_ambiguous_within_workspace',
    "role=case when existing_member.role in ('admin','collaborator')",
  ]) {
    assert.ok(body.includes(safeguard), 'missing portal approval safeguard: ' + safeguard);
  }
});

test('self-registration RPC fails closed on ambiguous condominium and preserves staff roles', () => {
  const definition = functionDefinition('private.complete_portal_registration');
  const body = definition.body;
  assert.match(definition.header, /SECURITY DEFINER/i);
  assert.match(definition.header, /SET search_path TO ''/i);
  for (const safeguard of [
    'portal_condominium_ambiguous_within_workspace',
    'portal_member_condominium_mismatch',
    'having count(*)=1',
    'portal_condominium_name_required',
    'portal_condominium_not_found',
    "role=case when existing_member.role in ('admin','collaborator')",
  ]) {
    assert.ok(body.includes(safeguard), 'missing self-registration safeguard: ' + safeguard);
  }
});

test('consumption allocation RPC rejects an expense from a different fiscal year', () => {
  const definition = functionDefinition('public.generate_consumption_allocations');
  const body = definition.body;
  assert.doesNotMatch(definition.header, /SECURITY DEFINER/i);
  assert.match(definition.header, /SET search_path TO 'public'/i);
  const guard = body.indexOf('if v_expense.fiscal_year_id is distinct from p_fiscal_year_id then');
  const deletion = body.indexOf('delete from public.condominium_expense_allocations');
  assert.ok(guard >= 0, 'RPC must compare the expense fiscal year with the requested fiscal year');
  assert.ok(guard < deletion, 'RPC must reject a mismatch before modifying allocations');
  assert.ok(body.includes('la spesa e i dati di consumo devono appartenere allo stesso esercizio contabile'));
});

test('PostgreSQL ACL runtime assertions contain six complete IF/THEN guards', () => {
  const occurrences = (needle) => postgresAssertions.split(needle).length - 1;
  assert.equal(occurrences('IF NOT '), 7);
  assert.equal(occurrences(' THEN'), 7);
  assert.equal(occurrences('RAISE EXCEPTION'), 7);
  assert.equal(occurrences("has_function_privilege('anon'"), 21);
  assert.equal(occurrences("has_function_privilege('authenticated'"), 21);
  assert.equal(occurrences("has_function_privilege('service_role'"), 21);
  assert.equal(occurrences("has_function_privilege('public'"), 0,
    'PUBLIC access is detected through inherited application-role privileges, not a pseudo-role lookup');
});
