-- Public core mutation RPCs are authenticated entry points only.
revoke execute on function public.delete_condominium(uuid,bigint,text) from public,anon;
grant execute on function public.delete_condominium(uuid,bigint,text) to authenticated;
revoke execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.save_condominium(uuid,bigint,text,text,text,text,text,jsonb) to authenticated;
