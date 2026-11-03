-- Launch security hardening for trigger-only functions.
-- Keep the transfer-close public wrapper SECURITY DEFINER because it delegates
-- to a private SECURITY DEFINER function that enforces auth.uid() and workspace
-- management authorization before changing financial/member state.
alter function public.close_condominium_member_transfer(uuid) security definer;
alter function public.normalize_zero_ownership_owner() security invoker;
alter function public.preserve_closing_condominium_member_history()
  set search_path = pg_catalog, public;
revoke all on function public.normalize_zero_ownership_owner() from anon, authenticated;
