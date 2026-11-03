
alter table public.condominiums add column if not exists legacy_id bigint;
alter table public.condominium_members add column if not exists legacy_id bigint;
alter table public.documents add column if not exists legacy_id bigint;
alter table public.deadlines add column if not exists legacy_id bigint;
alter table public.assemblies add column if not exists legacy_id bigint;
alter table public.suppliers add column if not exists legacy_id bigint;
alter table public.activities add column if not exists legacy_id bigint;
alter table public.communications add column if not exists legacy_id bigint;
alter table public.condominium_requests add column if not exists legacy_id bigint;

create unique index if not exists uq_condominiums_workspace_legacy on public.condominiums(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_members_condominium_legacy on public.condominium_members(condominium_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_documents_workspace_legacy on public.documents(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_deadlines_workspace_legacy on public.deadlines(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_assemblies_workspace_legacy on public.assemblies(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_suppliers_workspace_legacy on public.suppliers(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_activities_workspace_legacy on public.activities(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_communications_workspace_legacy on public.communications(workspace_id, legacy_id) where legacy_id is not null;
create unique index if not exists uq_requests_workspace_legacy on public.condominium_requests(workspace_id, legacy_id) where legacy_id is not null;
