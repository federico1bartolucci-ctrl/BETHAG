-- Performance-only RLS optimization: evaluate auth helpers once per query
-- instead of once per returned row. Authorization semantics are unchanged.

drop policy if exists "residents read own portal access" on public.portal_access;
create policy "residents read own portal access"
on public.portal_access for select to authenticated
using (
  active = true
  and (
    user_id = (select auth.uid())
    or (
      user_id is null
      and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  )
);

drop policy if exists "Authorized condominium managers can read units" on public.condominium_units;
create policy "Authorized condominium managers can read units"
on public.condominium_units for select to authenticated
using (
  private.can_access_workspace_module(condominium_units.workspace_id, 'condomini')
  or exists (
    select 1
    from public.portal_access pa
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.unit_id = condominium_units.id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = (select auth.uid()))
       or lower(cm.email) = lower(pa.email)
     )
    where pa.condominium_id = condominium_units.condominium_id
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  )
);
