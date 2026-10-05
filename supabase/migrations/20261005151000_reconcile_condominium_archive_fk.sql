-- Reconcile the archive audit foreign key with production.
alter table public.condominiums
  add constraint condominiums_archived_by_fkey
  foreign key (archived_by) references public.profiles(id);
