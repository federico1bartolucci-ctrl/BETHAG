create or replace function public.clean_deleted_member_owner_references()
returns trigger language plpgsql set search_path=public as $$
declare v_workspace uuid:=old.workspace_id;
begin
  update public.condominium_units u
  set data=jsonb_set(coalesce(u.data,'{}'::jsonb),'{ownerMemberIds}',coalesce((
    select jsonb_agg(elem order by ord)
    from jsonb_array_elements(coalesce(u.data->'ownerMemberIds','[]'::jsonb)) with ordinality as e(elem,ord)
    where elem #>> '{}' <> old.legacy_id::text
  ),'[]'::jsonb),true), updated_at=now()
  where u.workspace_id=v_workspace and u.condominium_id=old.condominium_id
    and jsonb_typeof(u.data->'ownerMemberIds')='array'
    and exists (
      select 1 from jsonb_array_elements(coalesce(u.data->'ownerMemberIds','[]'::jsonb)) e(elem)
      where elem #>> '{}' = old.legacy_id::text
    );
  return old;
end; $$;
drop trigger if exists trg_clean_deleted_member_owner_references on public.condominium_members;
create trigger trg_clean_deleted_member_owner_references after delete on public.condominium_members for each row execute function public.clean_deleted_member_owner_references();
revoke execute on function public.clean_deleted_member_owner_references() from public, anon, authenticated;