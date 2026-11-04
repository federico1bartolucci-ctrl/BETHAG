-- Replay-only restoration of six public RPC implementations that predate the recorded ledger.
-- Migration 20260930235538 alters each public function into the private schema, but none of
-- the 247 recovered SQL payloads contains their original CREATE statements. Current
-- Production definitions are used as the earliest recoverable implementations; later
-- ledger migrations replace/reconcile them. This is synthetic test scaffolding only.
-- Never deploy to QA or Production.

CREATE OR REPLACE FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_archived_at timestamptz;
  v_archived_by uuid;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = coalesce(archived_at, now()),
      archived_by = case when archived_at is null then auth.uid() else archived_by end,
      archive_reason = case
        when nullif(trim(coalesce(p_reason,'')),'') is null then archive_reason
        else trim(p_reason)
      end,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
  returning archived_at, archived_by, archive_reason
  into v_archived_at, v_archived_by, v_reason;

  if not found then
    raise exception 'Condominio non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'archived',
      'Condominio archiviato',
      jsonb_build_object(
        'archived_at', v_archived_at,
        'archived_by', v_archived_by,
        'reason', v_reason
      )
    );
end;
$function$


CREATE OR REPLACE FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_year public.condominium_fiscal_years%rowtype;
begin
  if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id, 'contabilita') then raise exception 'Operazione non autorizzata'; end if;

  select * into v_year
  from public.condominium_fiscal_years
  where id=p_fiscal_year_id and workspace_id=p_workspace_id
  for update;

  if not found then raise exception 'Esercizio contabile non trovato'; end if;
  if v_year.status='Chiuso' then return v_year.id; end if;

  if exists (
    select 1 from public.condominiums c
    where c.id=v_year.condominium_id and c.workspace_id=v_year.workspace_id and c.archived_at is not null
  ) then raise exception 'Non è possibile chiudere un esercizio di un condominio archiviato'; end if;

  if exists (
    select 1 from public.condominium_ledger_entries l
    where l.workspace_id=v_year.workspace_id and l.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id
      and (l.entry_date<v_year.start_date or l.entry_date>v_year.end_date)
  ) then raise exception 'L''esercizio contiene movimenti contabili fuori periodo'; end if;

  if exists (
    select 1 from public.condominium_installments i
    where i.workspace_id=v_year.workspace_id and i.condominium_id=v_year.condominium_id
      and i.fiscal_year_id=v_year.id and i.due_date is not null
      and (i.due_date<v_year.start_date or i.due_date>v_year.end_date)
  ) then raise exception 'L''esercizio contiene rate con scadenza fuori periodo'; end if;

  if exists (
    select 1 from public.condominium_ledger_entries l
    where l.workspace_id=v_year.workspace_id and l.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id and l.direction='Uscita'
      and (
        (select coalesce(sum(i.amount),0) from public.condominium_installments i
         where i.workspace_id=l.workspace_id and i.condominium_id=l.condominium_id
           and i.ledger_entry_id=l.id and i.status<>'Accorpata') > l.amount+0.005
        or
        (select coalesce(sum(i.paid_amount),0) from public.condominium_installments i
         where i.workspace_id=l.workspace_id and i.condominium_id=l.condominium_id
           and i.ledger_entry_id=l.id and i.status<>'Accorpata')
        >
        (select coalesce(sum(pm.amount),0)
         from public.condominium_payment_movements pm
         join public.condominium_installments pi on pi.id=pm.installment_id
         where pi.ledger_entry_id=l.id and pm.workspace_id=l.workspace_id and pm.condominium_id=l.condominium_id)+0.005
      )
  ) then raise exception 'L''esercizio presenta rate o pagamenti non riconciliati'; end if;

  if exists (
    select 1
    from public.condominium_expense_allocations a
    join public.condominium_ledger_entries l on l.id=a.ledger_entry_id
    where a.workspace_id=v_year.workspace_id and a.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id
    group by a.ledger_entry_id,l.amount
    having abs(sum(a.amount)-l.amount)>0.005
  ) then raise exception 'L''esercizio presenta ripartizioni non riconciliate'; end if;

  perform set_config('bethag.allow_fiscal_year_status_update','on',true);

  update public.condominium_fiscal_years
  set status='Chiuso', updated_at=now()
  where id=v_year.id;

  return v_year.id;
end;
$function$


CREATE OR REPLACE FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_source public.condominium_fiscal_years%rowtype;
  v_target public.condominium_fiscal_years%rowtype;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_source
  from public.condominium_fiscal_years
  where id=p_source_fiscal_year_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then raise exception 'Esercizio contabile non trovato'; end if;

  perform public.close_condominium_fiscal_year(p_workspace_id,p_source_fiscal_year_id);

  select * into v_target
  from public.condominium_fiscal_years
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and start_date>v_source.end_date
  order by start_date
  limit 1
  for update;

  if v_target.id is not null then
    if exists (
      select 1 from public.condominiums c
      where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null
    ) then
      raise exception 'Non è possibile generare riporti per un condominio archiviato';
    end if;
    if v_target.status='Chiuso' then
      raise exception 'L''esercizio successivo è già chiuso e non può ricevere il saldo iniziale';
    end if;

    v_count := public.generate_fiscal_year_carryovers(
      p_workspace_id,p_condominium_id,v_source.id,v_target.id
    );
  end if;

  return v_count;
end;
$function$


CREATE OR REPLACE FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_workspace_id uuid;
 v_status text;
 v_validation_errors jsonb;
 v_condominium_workspace uuid;
 v_archived_at timestamptz;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;

 select workspace_id,status,validation_errors
 into v_workspace_id,v_status,v_validation_errors
 from public.condominium_creation_intakes
 where id=p_intake_id
 for update;

 if v_workspace_id is null then raise exception 'Importazione condominiale non trovata'; end if;
 if not private.can_manage_workspace_module(v_workspace_id,'condomini') then raise exception 'Autorizzazione gestione condomini richiesta'; end if;
 if v_status <> 'Da verificare' then raise exception 'L''importazione deve essere nello stato Da verificare'; end if;
 if coalesce(jsonb_array_length(v_validation_errors),0) > 0 then
   raise exception 'L''importazione contiene errori di validazione e non può essere confermata';
 end if;

 select workspace_id,archived_at
 into v_condominium_workspace,v_archived_at
 from public.condominiums
 where id=p_condominium_id
 for update;

 if v_condominium_workspace is null then raise exception 'Condominio non trovato'; end if;
 if v_condominium_workspace <> v_workspace_id then raise exception 'Il condominio appartiene a un workspace diverso'; end if;
 if v_archived_at is not null then raise exception 'Non è possibile confermare un condominio archiviato'; end if;

 update public.condominium_creation_intakes
 set status='Confermato',created_condominium_id=p_condominium_id,
     confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id;

 return p_condominium_id;
end;
$function$


CREATE OR REPLACE FUNCTION public.list_archived_condominiums(p_workspace_id uuid)
 RETURNS SETOF condominiums
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  return query
  select c.*
  from public.condominiums c
  where c.workspace_id = p_workspace_id
    and c.archived_at is not null
  order by c.archived_at desc, c.name asc;
end;
$function$


CREATE OR REPLACE FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
    and archived_at is not null
  returning name into v_name;

  if not found then
    raise exception 'Condominio archiviato non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'restored',
      'Condominio ripristinato dall''archivio',
      jsonb_build_object(
        'restored_by', auth.uid(),
        'restored_at', now(),
        'name', v_name
      )
    );
end;
$function$

