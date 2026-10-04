-- Route the public carryover RPC through the hardened private implementation.
-- The private function enforces authentication, workspace permission, locking,
-- fiscal-year ordering, compensation safety, opening balance, and per-member balances.
create or replace function public.generate_fiscal_year_carryovers(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_source_fiscal_year_id uuid,
  p_target_fiscal_year_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  return private.generate_fiscal_year_carryovers(
    p_workspace_id,
    p_condominium_id,
    p_source_fiscal_year_id,
    p_target_fiscal_year_id
  );
end;
$function$;

revoke all on function public.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function private.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) to authenticated;
