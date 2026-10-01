-- A transformation cannot be confirmed while accounting or millesimal review is pending.
alter table public.condominium_unit_transformations
  add constraint condominium_unit_transformations_confirmed_reviews_chk
  check (
    status <> 'Confermata'
    or (
      accounting_resolution_status in ('Non necessaria', 'Risolta')
      and millesimal_review_status in ('Confermata invariata', 'Nuove tabelle')
    )
  ) not valid;

alter table public.condominium_unit_transformations
  validate constraint condominium_unit_transformations_confirmed_reviews_chk;
