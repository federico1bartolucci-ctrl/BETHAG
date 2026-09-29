-- Internal trigger helpers: they are not RPC endpoints and must not be callable by API roles.
revoke execute on function public.ensure_table_millesimal_values() from public, anon, authenticated;
revoke execute on function public.ensure_unit_millesimal_values() from public, anon, authenticated;
