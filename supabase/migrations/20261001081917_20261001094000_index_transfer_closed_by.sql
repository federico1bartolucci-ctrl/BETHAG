-- BETHAG: index closed_by foreign key for transfer lifecycle
create index if not exists condominium_member_transfers_closed_by_idx
  on public.condominium_member_transfers(closed_by);
