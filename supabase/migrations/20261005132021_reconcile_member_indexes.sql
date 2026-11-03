-- Reconcile production indexes for condominium member lookups.
-- Forward-only: production remains untouched until the migration is deployed.
create index if not exists condominium_members_unit_idx
  on public.condominium_members (unit_id);

create index if not exists condominium_members_user_id_idx
  on public.condominium_members (user_id);
