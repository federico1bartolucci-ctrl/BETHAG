
revoke execute on function public.confirm_condominium_creation_intake(uuid, uuid) from public;
revoke execute on function public.confirm_condominium_creation_intake(uuid, uuid) from anon;
revoke execute on function public.save_condominium(uuid, bigint, text, text, text, text, text, jsonb) from public;
revoke execute on function public.save_condominium(uuid, bigint, text, text, text, text, text, jsonb) from anon;
