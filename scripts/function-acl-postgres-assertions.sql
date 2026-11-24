DO $acl$
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
  IF NOT has_function_privilege('authenticated', 'private.archive_condominium(uuid,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.archive_condominium(uuid,uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.archive_condominium(uuid,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.close_condominium_fiscal_year(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.close_condominium_fiscal_year(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.close_condominium_fiscal_year(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.close_fiscal_year_and_generate_carryovers(uuid,uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.compensate_fiscal_carryover(uuid,uuid,uuid,numeric,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.complete_portal_registration(text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.complete_portal_registration(text,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.complete_portal_registration(text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.confirm_condominium_creation_intake(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.confirm_condominium_creation_intake(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.confirm_condominium_creation_intake(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.delete_condominium(uuid,bigint,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.delete_condominium(uuid,bigint,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.delete_condominium(uuid,bigint,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.generate_installments_from_allocations(uuid,uuid,uuid,text,date,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.list_archived_condominiums(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.list_archived_condominiums(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.list_archived_condominiums(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.register_condominium_installment_payment(uuid,uuid,uuid,date,numeric,text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.restore_condominium(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.restore_condominium(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.restore_condominium(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.set_personal_security_code(text,boolean)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.set_personal_security_code(text,boolean)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.set_personal_security_code(text,boolean)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.verify_personal_security_code(text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.verify_personal_security_code(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.verify_personal_security_code(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.close_condominium_member_transfer(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected ACL: invoker-backed private RPCs must retain authenticated execution';
  END IF;
END
$acl$;

SET ROLE authenticated;
SELECT public.generate_fiscal_year_carryovers(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);
SELECT public.close_condominium_member_transfer('00000000-0000-0000-0000-000000000005');
RESET ROLE;
