-- Espone al client solo il bootstrap autenticato del primo amministratore.
-- La logica effettiva resta nella funzione privata SECURITY DEFINER.

create or replace function public.claim_first_workspace_admin(p_workspace_id uuid default null)
returns uuid
language sql
security definer
set search_path to ''
as $function$
  select private.claim_first_workspace_admin(p_workspace_id);
$function$;

revoke all on function public.claim_first_workspace_admin(uuid) from public;
grant execute on function public.claim_first_workspace_admin(uuid) to authenticated;
