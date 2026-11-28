-- Normalize the remaining policy definitions to production semantics.

drop policy if exists "recipients read own communication delivery" on public.communication_recipients;
create policy "recipients read own communication delivery" on public.communication_recipients as permissive for select to authenticated using ((user_id = ( SELECT auth.uid() AS uid)));

drop policy if exists "authorized managers manage insurance policies" on public.condominium_insurance_policies;
create policy "authorized managers manage insurance policies" on public.condominium_insurance_policies as permissive for all to authenticated using (( SELECT private.can_manage_workspace_module(condominium_insurance_policies.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) with check (( SELECT private.can_manage_workspace_module(condominium_insurance_policies.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

drop policy if exists "authorized users read condominium members" on public.condominium_members;
create policy "authorized users read condominium members" on public.condominium_members as permissive for select to authenticated using ((( SELECT private.can_access_workspace_module(( SELECT c.workspace_id
           FROM condominiums c
          WHERE (c.id = condominium_members.condominium_id)), 'condomini'::text) AS can_access_workspace_module) OR ((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND (c.archived_at IS NULL))))) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))) AND (active = true) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND (c.archived_at IS NULL)))))));

drop policy if exists "authorized users read requests" on public.condominium_requests;
create policy "authorized users read requests" on public.condominium_requests as permissive for select to authenticated using ((( SELECT private.can_access_workspace_module(condominium_requests.workspace_id, 'condomini'::text) AS can_access_workspace_module) OR (requester_user_id = ( SELECT auth.uid() AS uid))));

drop policy if exists "residents create own requests" on public.condominium_requests;
create policy "residents create own requests" on public.condominium_requests as permissive for insert to authenticated with check ((private.can_manage_workspace_module(workspace_id, 'condomini'::text) OR ((requester_user_id = ( SELECT auth.uid() AS uid)) AND private.can_access_condominium(condominium_id) AND ((member_id IS NULL) OR (EXISTS ( SELECT 1
   FROM condominium_members cm
  WHERE ((cm.id = condominium_requests.member_id) AND (cm.condominium_id = condominium_requests.condominium_id) AND (cm.active = true) AND ((cm.user_id = ( SELECT auth.uid() AS uid)) OR (lower(cm.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))))))))));

drop policy if exists "unit transformation items manager access" on public.condominium_unit_transformation_items;
create policy "unit transformation items manager access" on public.condominium_unit_transformation_items as permissive for all to authenticated using ((EXISTS ( SELECT 1
   FROM condominium_unit_transformations t
  WHERE ((t.id = condominium_unit_transformation_items.transformation_id) AND ( SELECT private.can_manage_workspace_module(t.workspace_id, 'condomini'::text) AS can_manage_workspace_module))))) with check ((EXISTS ( SELECT 1
   FROM condominium_unit_transformations t
  WHERE ((t.id = condominium_unit_transformation_items.transformation_id) AND ( SELECT private.can_manage_workspace_module(t.workspace_id, 'condomini'::text) AS can_manage_workspace_module)))));

drop policy if exists "unit transformations manager access" on public.condominium_unit_transformations;
create policy "unit transformations manager access" on public.condominium_unit_transformations as permissive for all to authenticated using (( SELECT private.can_manage_workspace_module(condominium_unit_transformations.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) with check (( SELECT private.can_manage_workspace_module(condominium_unit_transformations.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

drop policy if exists "Authorized condominium managers can delete units" on public.condominium_units;
create policy "Authorized condominium managers can delete units" on public.condominium_units as permissive for delete to authenticated using (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

drop policy if exists "Authorized condominium managers can insert units" on public.condominium_units;
create policy "Authorized condominium managers can insert units" on public.condominium_units as permissive for insert to authenticated with check (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

drop policy if exists "Authorized condominium managers can read units" on public.condominium_units;
create policy "Authorized condominium managers can read units" on public.condominium_units as permissive for select to authenticated using ((( SELECT private.can_access_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_access_workspace_module) OR ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_units.condominium_id) AND (c.archived_at IS NULL)))) AND (EXISTS ( SELECT 1
   FROM (portal_access pa
     JOIN condominium_members cm ON (((cm.condominium_id = pa.condominium_id) AND (cm.unit_id = condominium_units.id) AND (cm.active = true) AND (((pa.user_id IS NOT NULL) AND (cm.user_id = ( SELECT auth.uid() AS uid))) OR (lower(cm.email) = lower(pa.email))))))
  WHERE ((pa.condominium_id = condominium_units.condominium_id) AND (pa.active = true) AND (pa.role = ANY (ARRAY['resident'::text, 'council'::text])) AND ((pa.user_id = ( SELECT auth.uid() AS uid)) OR (lower(pa.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))))))));

drop policy if exists "Authorized condominium managers can update units" on public.condominium_units;
create policy "Authorized condominium managers can update units" on public.condominium_units as permissive for update to authenticated using (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) with check (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

drop policy if exists "residents read own portal access" on public.portal_access;
create policy "residents read own portal access" on public.portal_access as permissive for select to authenticated using (((active = true) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = portal_access.condominium_id) AND (c.archived_at IS NULL)))) AND ((user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))))));

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles as permissive for select to authenticated using ((id = ( SELECT auth.uid() AS uid)));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles as permissive for update to authenticated using ((id = ( SELECT auth.uid() AS uid))) with check ((id = ( SELECT auth.uid() AS uid)));

drop policy if exists "members can read memberships" on public.workspace_members;
create policy "members can read memberships" on public.workspace_members as permissive for select to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_workspace_admin(workspace_members.workspace_id) AS is_workspace_admin)));
