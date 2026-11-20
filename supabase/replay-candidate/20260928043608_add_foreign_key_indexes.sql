
create index if not exists activities_condominium_id_idx on public.activities (condominium_id);
create index if not exists assemblies_condominium_id_idx on public.assemblies (condominium_id);
create index if not exists communications_condominium_id_idx on public.communications (condominium_id);
create index if not exists condominium_members_user_id_idx on public.condominium_members (user_id);
create index if not exists condominium_requests_condominium_id_idx on public.condominium_requests (condominium_id);
create index if not exists condominium_requests_member_id_idx on public.condominium_requests (member_id);
create index if not exists condominium_requests_requester_user_id_idx on public.condominium_requests (requester_user_id);
create index if not exists deadlines_condominium_id_idx on public.deadlines (condominium_id);
create index if not exists documents_condominium_id_idx on public.documents (condominium_id);
create index if not exists portal_access_user_id_idx on public.portal_access (user_id);
create index if not exists suppliers_condominium_id_idx on public.suppliers (condominium_id);
create index if not exists workspace_members_condominium_id_idx on public.workspace_members (condominium_id);
