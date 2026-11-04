-- Replay-only chronology bridge.
-- Production's recovered migration 20260928154553 creates public.condominium_units.
-- The pre-ledger expense allocation relation already exists before that point, so its
-- unit_id foreign key must be restored only after the unit relation is created.
-- This reproduces the live Production catalog relationship without changing any
-- of the 247 recovered historical migration payloads.
alter table public.condominium_expense_allocations
  add constraint condominium_expense_allocations_unit_id_fkey
  foreign key (unit_id) references public.condominium_units(id) on delete set null;
