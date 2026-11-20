-- Remove obsolete QA-only overload; production exposes only the unified signature.
drop function if exists public.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric);
