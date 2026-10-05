DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='condominiums_archived_by_fkey'
      AND conrelid='public.condominiums'::regclass
  ) THEN
    ALTER TABLE public.condominiums
      ADD CONSTRAINT condominiums_archived_by_fkey
      FOREIGN KEY (archived_by) REFERENCES public.profiles(id);
  END IF;
END $$;