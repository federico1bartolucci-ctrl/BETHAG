create or replace function private.sync_portal_after_member_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
 v_old_workspace uuid;
 v_new_workspace uuid;
begin
 select c.workspace_id into v_old_workspace
 from public.condominiums c
 where c.id=old.condominium_id;

 select c.workspace_id into v_new_workspace
 from public.condominiums c
 where c.id=coalesce(new.condominium_id,old.condominium_id);

 if tg_op='DELETE' then
   update public.portal_access
   set active=false, updated_at=now()
   where member_id=old.id;

   update public.workspace_members wm
   set active=false
   where wm.workspace_id=v_old_workspace
     and wm.user_id=old.user_id
     and wm.role='resident'
     and wm.condominium_id=old.condominium_id;
   return old;
 end if;

 if new.active=false
    or new.user_id is null
    or coalesce(new.data->>'position_status','') in ('In chiusura','Archiviato')
    or (coalesce(new.data->>'role','')='Proprietario'
        and coalesce(new.data->>'current_owner','true')='false') then
   update public.portal_access
   set active=false, user_id=coalesce(new.user_id,user_id), updated_at=now()
   where member_id=new.id;

   update public.workspace_members wm
   set active=false
   where wm.workspace_id=v_old_workspace
     and wm.user_id=old.user_id
     and wm.role='resident'
     and wm.condominium_id=old.condominium_id;

   if new.user_id is distinct from old.user_id then
     update public.workspace_members wm
     set active=false
     where wm.workspace_id=v_new_workspace
       and wm.user_id=new.user_id
       and wm.role='resident'
       and wm.condominium_id=new.condominium_id;
   end if;
 else
   if old.user_id is distinct from new.user_id
      or old.condominium_id is distinct from new.condominium_id
      or v_old_workspace is distinct from v_new_workspace then
     update public.workspace_members wm
     set active=false
     where wm.workspace_id=v_old_workspace
       and wm.user_id=old.user_id
       and wm.role='resident'
       and wm.condominium_id=old.condominium_id;
   end if;

   update public.portal_access p
   set user_id=new.user_id,
       name=new.name,
       email=coalesce(new.email,p.email),
       apartment=coalesce(new.data->>'apartment',p.apartment),
       data=coalesce(new.data,'{}'::jsonb),
       updated_at=now()
   where p.member_id=new.id
     and p.active=true;

   update public.workspace_members wm
   set user_id=new.user_id,
       active=true
   where wm.workspace_id=v_new_workspace
     and wm.role='resident'
     and wm.condominium_id=new.condominium_id
     and wm.user_id=old.user_id;
 end if;

 return new;
end;
$function$;

revoke execute on function private.sync_portal_after_member_change() from anon, public;
