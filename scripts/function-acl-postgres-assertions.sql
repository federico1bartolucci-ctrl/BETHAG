DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'private.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.check_condominium_member_transfer_closure(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected ACL: private transfer closure checker';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.check_condominium_member_transfer_closure(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected ACL: public transfer closure checker';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.normalize_zero_ownership_owner()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.normalize_zero_ownership_owner()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.normalize_zero_ownership_owner()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected ACL: normalize_zero_ownership_owner';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.preserve_closing_condominium_member_history()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.preserve_closing_condominium_member_history()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.preserve_closing_condominium_member_history()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected ACL: preserve_closing_condominium_member_history';
  END IF;
  IF NOT has_function_privilege('authenticated', 'private.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.generate_fiscal_year_carryovers(uuid,uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected ACL: private generate_fiscal_year_carryovers must be callable by authenticated and service_role only';
  END IF;
END
$;

SET ROLE authenticated;
SELECT private.generate_fiscal_year_carryovers(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);
RESET ROLE;
