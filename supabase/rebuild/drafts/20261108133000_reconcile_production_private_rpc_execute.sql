-- Reconcile authenticated EXECUTE for private implementations reached through
-- existing public SECURITY INVOKER RPC wrappers.
--
-- Scope is intentionally narrow: only functions whose QA and Production
-- implementation fingerprints were verified identical on 2026-11-08.
-- Functions with code drift or unresolved authorization paths are excluded.
--
-- This migration is forward-only and fails closed if any signature, function
-- security mode, implementation fingerprint, wrapper mode, or wrapper grant
-- differs from the reviewed state.

DO $migration$
DECLARE
  item record;
  private_oid oid;
  wrapper_oid oid;
  private_proc record;
  wrapper_proc record;
BEGIN
  IF NOT has_schema_privilege('authenticated', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'Expected authenticated USAGE on schema private is missing';
  END IF;

  FOR item IN
    SELECT *
    FROM (VALUES
      ('admin_approve_portal_registration', 'uuid, uuid', '97fe47c5c67a17bf101dfbecb08b988d|87a015497a99e034fe0386b78c72b506'),\n      ('archive_condominium', 'uuid, uuid, text', '9f093be6082d6dff2105b5d55fe5c248|14f5c993fb0f5fb69a3d1ae327402bce'),\n      ('check_condominium_member_transfer_closure', 'uuid', '4404f20fa64462d3f5cac62f33bc20a3'),
      ('claim_first_workspace_admin', 'uuid', '4453430b65ad07c5ae0282750cfe37ed'),
      ('close_condominium_fiscal_year', 'uuid, uuid', '30354a41f2d548d8da14f5d43afee8cd'),
      ('close_fiscal_year_and_generate_carryovers', 'uuid, uuid, uuid', '8a1b4c8f95089942b6be28b76a18b18a'),
      ('compensate_fiscal_carryover', 'uuid, uuid, uuid, numeric, uuid, text', 'f1d48dc255b73d13e0a141d7f8580768'),
      ('complete_portal_registration', 'text, text, text', '2acfbbd9f90a7519b482e08b819971e4|cf72df4fe37ff6697e8db69b1f3b323a'),\n      ('confirm_condominium_creation_intake', 'uuid, uuid', 'fae8f201e3407996a927b792704281f9'),
      ('delete_condominium', 'uuid, bigint, text', 'a52c3d35223db7e844e3cf665736b4ab'),
      ('generate_fiscal_year_carryovers', 'uuid, uuid, uuid, uuid', '27f0431424c5ba275ea96c5c77c2534f'),
      ('generate_installments_from_allocations', 'uuid, uuid, uuid, text, date, uuid', '25e590cb013eed2827730c5a4cdde26c'),
      ('generate_installments_from_allocations_schedule', 'uuid, uuid, uuid, text, date[], uuid, numeric[], boolean', '39fcf2e30cd41c04e0fffa359ee767ef'),
      ('list_archived_condominiums', 'uuid', '8fa21ddf88f2985a65ff692e12c9ad37'),
      ('register_condominium_installment_payment', 'uuid, uuid, uuid, date, numeric, text, text, text', 'f0325d31497e5b6d6f277e79654f0a86'),
      ('restore_condominium', 'uuid, uuid', '4d1a610a4e64e2746aa00cacb16309b4|8a4e693c16021a772706792906341a0a'),\n      ('reverse_condominium_installment_payment', 'uuid, uuid, uuid, text', 'a26c6b0dda0b063fe955104fe69f75f9'),
      ('set_personal_security_code', 'text, boolean', '91c28fcbbce2ccdf5fe873dde7b04ac3'),
      ('verify_personal_security_code', 'text', '2e3fd736ec58e7d4782e973d693d517e')
    ) AS reviewed(function_name, argument_types, accepted_md5)
  LOOP
    private_oid := to_regprocedure(format('private.%I(%s)', item.function_name, item.argument_types));
    wrapper_oid := to_regprocedure(format('public.%I(%s)', item.function_name, item.argument_types));

    IF private_oid IS NULL OR wrapper_oid IS NULL THEN
      RAISE EXCEPTION 'Required private implementation or public wrapper is missing: %(%)',
        item.function_name, item.argument_types;
    END IF;

    SELECT p.prosecdef, md5(p.prosrc) AS body_md5, p.prosrc AS body_source
      INTO private_proc
    FROM pg_proc p
    WHERE p.oid = private_oid;

    SELECT p.prosecdef, p.prosrc
      INTO wrapper_proc
    FROM pg_proc p
    WHERE p.oid = wrapper_oid;

    IF private_proc.prosecdef IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Private implementation is not SECURITY DEFINER: %', item.function_name;
    END IF;

    IF private_proc.body_md5 IS DISTINCT FROM item.expected_md5 THEN
      RAISE EXCEPTION 'Reviewed implementation fingerprint mismatch for %: expected %, found %',
        item.function_name, item.expected_md5, private_proc.body_md5;
    END IF;

    IF item.function_name = 'generate_installments_from_allocations' THEN\n      IF position('public.generate_installments_from_allocations_schedule' IN lower(private_proc.body_source)) = 0 THEN\n        RAISE EXCEPTION 'Installment helper no longer delegates to the guarded schedule implementation';\n      END IF;\n    ELSIF position('auth.uid' IN lower(private_proc.body_source)) = 0\n       AND position('can_manage_workspace_module' IN lower(private_proc.body_source)) = 0 THEN\n      RAISE EXCEPTION 'No reviewed authentication/workspace authorization guard found in %', item.function_name;\n    END IF;\n\n    IF wrapper_proc.prosecdef IS DISTINCT FROM false
       OR position(('private.' || item.function_name) IN lower(wrapper_proc.prosrc)) = 0 THEN
      RAISE EXCEPTION 'Public wrapper is not the reviewed SECURITY INVOKER delegate: %',
        item.function_name;
    END IF;

    IF NOT has_function_privilege('authenticated', wrapper_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Authenticated cannot execute the public wrapper: %', item.function_name;
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', private_oid::regprocedure);
  END LOOP;
END
$migration$;

-- Post-condition: every reviewed private implementation is executable by
-- authenticated; no PUBLIC or anon grant is introduced by this migration.
DO $verify$
DECLARE
  item record;
  target_oid oid;
BEGIN
  FOR item IN
    SELECT *
    FROM (VALUES
      ('admin_approve_portal_registration', 'uuid, uuid'),\n      ('archive_condominium', 'uuid, uuid, text'),\n      ('check_condominium_member_transfer_closure', 'uuid'),
      ('claim_first_workspace_admin', 'uuid'),
      ('close_condominium_fiscal_year', 'uuid, uuid'),
      ('close_fiscal_year_and_generate_carryovers', 'uuid, uuid, uuid'),
      ('compensate_fiscal_carryover', 'uuid, uuid, uuid, numeric, uuid, text'),
      ('complete_portal_registration', 'text, text, text'),\n      ('confirm_condominium_creation_intake', 'uuid, uuid'),
      ('delete_condominium', 'uuid, bigint, text'),
      ('generate_fiscal_year_carryovers', 'uuid, uuid, uuid, uuid'),
      ('generate_installments_from_allocations', 'uuid, uuid, uuid, text, date, uuid'),
      ('generate_installments_from_allocations_schedule', 'uuid, uuid, uuid, text, date[], uuid, numeric[], boolean'),
      ('list_archived_condominiums', 'uuid'),
      ('register_condominium_installment_payment', 'uuid, uuid, uuid, date, numeric, text, text, text'),
      ('restore_condominium', 'uuid, uuid'),\n      ('reverse_condominium_installment_payment', 'uuid, uuid, uuid, text'),
      ('set_personal_security_code', 'text, boolean'),
      ('verify_personal_security_code', 'text')
    ) AS reviewed(function_name, argument_types)
  LOOP
    target_oid := to_regprocedure(format('private.%I(%s)', item.function_name, item.argument_types));
    IF target_oid IS NULL
       OR NOT has_function_privilege('authenticated', target_oid, 'EXECUTE')
       OR has_function_privilege('anon', target_oid, 'EXECUTE')
       OR EXISTS (\n         SELECT 1\n         FROM pg_proc p,\n              LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl\n         WHERE p.oid = target_oid\n           AND acl.grantee = 0\n           AND acl.privilege_type = 'EXECUTE'\n       ) THEN
      RAISE EXCEPTION 'Post-condition failed for private.%(%)',
        item.function_name, item.argument_types;
    END IF;
  END LOOP;
END
$verify$;
