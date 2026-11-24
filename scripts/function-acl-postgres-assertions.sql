DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'private.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'private.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
    RAISE EXCEPTION 'Unexpected ACL: private transfer closure checker';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.check_condominium_member_transfer_closure(uuid)', 'EXECUTE')
    RAISE EXCEPTION 'Unexpected ACL: public transfer closure checker';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.normalize_zero_ownership_owner()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.normalize_zero_ownership_owner()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.normalize_zero_ownership_owner()', 'EXECUTE')
    RAISE EXCEPTION 'Unexpected ACL: normalize_zero_ownership_owner';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.preserve_closing_condominium_member_history()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.preserve_closing_condominium_member_history()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.preserve_closing_condominium_member_history()', 'EXECUTE')
    RAISE EXCEPTION 'Unexpected ACL: preserve_closing_condominium_member_history';
  END IF;
END
$$;
