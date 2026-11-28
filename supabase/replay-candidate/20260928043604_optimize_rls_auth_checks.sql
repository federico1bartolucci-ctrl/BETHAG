
alter policy "authorized users read condominium members"
on public.condominium_members
using (
  (select private.can_access_workspace_module(
    (select c.workspace_id from public.condominiums c where c.id = condominium_members.condominium_id),
    'condomini'
  ))
  or user_id = (select auth.uid())
);

alter policy "authorized users read requests"
on public.condominium_requests
using (
  (select private.can_access_workspace_module(workspace_id, 'condomini'))
  or requester_user_id = (select auth.uid())
);

alter policy "residents create own requests"
on public.condominium_requests
with check (
  requester_user_id = (select auth.uid())
  and (select private.can_access_condominium(condominium_id))
);

alter policy "users can read own profile"
on public.profiles
using (id = (select auth.uid()));

alter policy "users can update own profile"
on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy "members can read memberships"
on public.workspace_members
using (
  user_id = (select auth.uid())
  or (select private.is_workspace_admin(workspace_id))
);
