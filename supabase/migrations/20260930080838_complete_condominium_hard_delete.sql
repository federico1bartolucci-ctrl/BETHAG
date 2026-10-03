-- BETHAG: cancellazione definitiva completa di un condominio.
-- La funzione viene mantenuta come unico punto autorizzato per l'operazione
-- distruttiva e rimuove anche i moduli aggiunti successivamente alla prima
-- versione del gestionale.
create or replace function public.delete_condominium(
  p_workspace_id uuid,
  p_legacy_id bigint,
  p_security_code text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $function$
declare
  v_condominium_id uuid;
  v_code_enabled boolean := false;
  v_code_ok boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Operazione non autorizzata';
  end if;

  select coalesce(s.personal_code_enabled, false)
    into v_code_enabled
  from public.user_security_settings s
  where s.user_id = auth.uid();

  if v_code_enabled then
    select public.verify_personal_security_code(p_security_code)
      into v_code_ok;
    if not v_code_ok then
      raise exception 'Codice personale non valido';
    end if;
  end if;

  select c.id
    into v_condominium_id
  from public.condominiums c
  where c.workspace_id = p_workspace_id
    and c.legacy_id = p_legacy_id
  for update;

  if v_condominium_id is null then
    raise exception 'Condominio non trovato';
  end if;

  -- Accessi e richieste del portale.
  delete from public.portal_registration_requests
   where workspace_id = p_workspace_id
     and (
       matched_member_id in (
         select cm.id from public.condominium_members cm
         where cm.condominium_id = v_condominium_id
       )
       or requested_user_id in (
         select cm.user_id from public.condominium_members cm
         where cm.condominium_id = v_condominium_id
           and cm.user_id is not null
       )
     );
  delete from public.portal_access
   where workspace_id = p_workspace_id
     and condominium_id = v_condominium_id;

  -- Moduli lavori: prima i figli, poi le opere.
  delete from public.condominium_work_documents
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_work_events
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_work_progress
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_works
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  -- Registro e fornitori.
  delete from public.condominium_register_items
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_suppliers
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.suppliers
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  -- Contabilità: figli prima delle scritture e dei periodi.
  delete from public.condominium_payment_movements
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_expense_allocations
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_installments
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_ledger_entries
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_budgets
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_fiscal_years
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_funds
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_tax_obligations
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_legal_cases
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  -- Millesimi: valori prima delle tabelle.
  delete from public.condominium_millesimal_values
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_millesimal_tables
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  -- Anagrafica e unità.
  delete from public.condominium_requests
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_members
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_units
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  -- Moduli operativi principali.
  delete from public.documents
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.deadlines
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.assemblies
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.communications
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.activities
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_insurance_policies
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;
  delete from public.condominium_audit_log
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  -- Eventuali riferimenti workspace-specifici al condominio.
  delete from public.workspace_members
   where workspace_id = p_workspace_id and condominium_id = v_condominium_id;

  delete from public.condominiums
   where id = v_condominium_id
     and workspace_id = p_workspace_id;
end;
$function$;

revoke all on function public.delete_condominium(uuid,bigint,text) from public, anon;
grant execute on function public.delete_condominium(uuid,bigint,text) to authenticated;
