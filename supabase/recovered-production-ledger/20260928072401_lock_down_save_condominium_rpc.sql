revoke execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) from public;
revoke execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) from anon;
grant execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) to authenticated;