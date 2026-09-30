-- Prevent resident-created requests from attributing the request to another
-- active condominium member. Managers retain their existing management path.

drop policy if exists "residents create own requests" on public.condominium_requests;

create policy "residents create own requests"
on public.condominium_requests
for insert
to authenticated
with check (
  private.can_manage_workspace_module(workspace_id, 'condomini')
  or (
    requester_user_id = (select auth.uid())
    and private.can_access_condominium(condominium_id)
    and (
      member_id is null
      or exists (
        select 1
        from public.condominium_members cm
        where cm.id = condominium_requests.member_id
          and cm.condominium_id = condominium_requests.condominium_id
          and cm.active = true
          and (
            cm.user_id = (select auth.uid())
            or lower(cm.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
          )
      )
    )
  )
);