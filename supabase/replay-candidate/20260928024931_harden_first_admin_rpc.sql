create or replace function private.claim_first_workspace_admin(p_workspace_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select w.id
    into target_workspace
  from public.workspaces w
  where (p_workspace_id is null or w.id = p_workspace_id)
  order by w.created_at
  limit 1;

  if target_workspace is null then
    raise exception 'Workspace BETHAG non trovato';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_workspace::text, 0));

  if exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
  ) then
    raise exception 'Il workspace è già stato inizializzato';
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    active,
    permissions
  )
  values (
    target_workspace,
    auth.uid(),
    'admin',
    true,
    '{}'::jsonb
  );

  update public.profiles
  set role = 'admin',
      active = true,
      updated_at = now()
  where id = auth.uid();

  return target_workspace;
end;
$$;

revoke execute on function private.claim_first_workspace_admin(uuid) from public;
revoke execute on function private.claim_first_workspace_admin(uuid) from anon;
revoke execute on function private.claim_first_workspace_admin(uuid) from authenticated;

create or replace function public.claim_first_workspace_admin(p_workspace_id uuid default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.claim_first_workspace_admin(p_workspace_id);
$$;

revoke execute on function public.claim_first_workspace_admin(uuid) from public;
revoke execute on function public.claim_first_workspace_admin(uuid) from anon;
grant execute on function public.claim_first_workspace_admin(uuid) to authenticated;