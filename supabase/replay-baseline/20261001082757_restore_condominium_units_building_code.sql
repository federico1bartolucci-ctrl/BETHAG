-- Replay-only prerequisite recovered from the live Production catalog.
-- Production public.condominium_units.building_code is text NOT NULL DEFAULT ''.
-- The first recovered historical use is 20261001082758_unit_transformation_preview.
-- Keep this bridge outside supabase/migrations; never deploy it to Production or QA.
alter table public.condominium_units
  add column if not exists building_code text not null default '';
