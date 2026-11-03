-- Reconcile remaining production column/default/FK/check parity.
alter table public.condominium_accounting_settings
  alter column accounting_start_date set default make_date(extract(year from current_date)::integer,1,1);
alter table public.condominium_accounting_settings
  alter column accounting_end_date set default make_date(extract(year from current_date)::integer,12,31);

alter table public.condominium_creation_intakes
  add column if not exists created_condominium_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='condominium_creation_intakes_created_condominium_id_fkey'
      AND conrelid='public.condominium_creation_intakes'::regclass
  ) THEN
    ALTER TABLE public.condominium_creation_intakes
      ADD CONSTRAINT condominium_creation_intakes_created_condominium_id_fkey
      FOREIGN KEY (created_condominium_id) REFERENCES public.condominiums(id) ON DELETE SET NULL;
  END IF;
END $$;

alter table public.documents
  add column if not exists file_size_bytes bigint;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='documents_file_size_nonnegative_chk'
      AND conrelid='public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_file_size_nonnegative_chk
      CHECK (file_size_bytes is null or file_size_bytes >= 0);
  END IF;
END $$;