alter table public.condominiums add constraint condominiums_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.documents add constraint documents_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.deadlines add constraint deadlines_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.assemblies add constraint assemblies_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.suppliers add constraint suppliers_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.activities add constraint activities_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.communications add constraint communications_workspace_legacy_unique unique (workspace_id, legacy_id);
alter table public.condominium_requests add constraint condominium_requests_workspace_legacy_unique unique (workspace_id, legacy_id);