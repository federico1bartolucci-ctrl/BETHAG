-- Reconcile remaining production column/default/FK/check parity.
alter table public.condominium_accounting_settings
  alter column accounting_start_date set default make_date(extract(year from current_date)::integer,1,1);
alter table public.condominium_accounting_settings
  alter column accounting_end_date set default make_date(extract(year from current_date)::integer,12,31);

alter table public.condominium_creation_intakes
  add column if not exists created_condominium_id uuid;
alter table public.condominium_creation_intakes
  add constraint condominium_creation_intakes_created_condominium_id_fkey
  foreign key (created_condominium_id) references public.condominiums(id) on delete set null;

alter table public.documents
  add column if not exists file_size_bytes bigint;
alter table public.documents
  add constraint documents_file_size_nonnegative_chk
  check (file_size_bytes is null or file_size_bytes >= 0);
