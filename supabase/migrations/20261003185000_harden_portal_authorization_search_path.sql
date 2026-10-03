-- Harden the search_path of the two portal helpers whose complete definitions
-- are available in the versioned source. Preserve signatures and authorization logic.
do $migration$
declare
  v_def text;
begin
  if to_regprocedure('private.can_access_workspace_module(uuid,text)') is null
     or to_regprocedure('private.can_access_resident_condominium_module(uuid,text)') is null then
    raise exception 'Required portal authorization helper is missing';
  end if;

  v_def := pg_get_functiondef('private.can_access_workspace_module(uuid,text)'::regprocedure);
  if position('wm.workspace_id = target_workspace' in v_def)=0
     or position('wm.user_id = (select auth.uid())' in v_def)=0
     or position('wm.role = ''collaborator''' in v_def)=0 then
    raise exception 'Workspace authorization helper differs from the reviewed definition';
  end if;

  v_def := pg_get_functiondef('private.can_access_resident_condominium_module(uuid,text)'::regprocedure);
  if position('pa.condominium_id = target_condominium' in v_def)=0
     or position('pa.user_id = (select auth.uid())' in v_def)=0
     or position('auth.jwt() ->> ''email''' in v_def)=0
     or position('pa.role in (''resident'',''council'')' in v_def)=0 then
    raise exception 'Resident authorization helper differs from the reviewed definition';
  end if;
end
$migration$;

create or replace function private.can_access_workspace_module(target_workspace uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$;

create or replace function private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = target_condominium
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$;
