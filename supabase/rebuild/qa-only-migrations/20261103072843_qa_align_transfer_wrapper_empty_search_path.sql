-- QA-only forward correction. Production already has the empty search_path setting.
-- Keep outside supabase/migrations so it cannot be applied to Production by normal CLI deploy.
ALTER FUNCTION public.close_condominium_member_transfer(uuid) SET search_path = '';
