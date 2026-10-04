-- Remove inherited PUBLIC/anon execution from two legacy trigger routines.
-- The production catalog shows no active triggers bound to either routine.
-- Keep the explicit authenticated grant unchanged for compatibility; trigger
-- execution itself remains controlled by trigger binding and table privileges.
REVOKE EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_payment_delete() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_update() FROM PUBLIC;
