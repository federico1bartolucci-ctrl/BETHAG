-- Atomic SAL payment registration and cumulative partial-payment validation.
-- Proposed forward migration; deliberately outside the frozen canonical migration chain.
CREATE OR REPLACE FUNCTION public.validate_condominium_work_progress_accounting_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w record;l record;p record;v_linked_paid numeric;
begin
  select workspace_id,condominium_id,supplier_id into w
  from public.condominium_works where id=new.work_id;
  if not found then raise exception 'Lavoro collegato al SAL non trovato'; end if;
  if new.ledger_entry_id is not null then
    select workspace_id,condominium_id,direction,supplier_id into l
    from public.condominium_ledger_entries where id=new.ledger_entry_id;
    if not found or l.workspace_id<>w.workspace_id or l.condominium_id<>w.condominium_id then
      raise exception 'Movimento contabile non coerente con il lavoro';
    end if;
    if l.direction<>'Uscita' then raise exception 'Il movimento contabile della spesa deve essere un''Uscita'; end if;
    if w.supplier_id is not null and l.supplier_id is not null and w.supplier_id<>l.supplier_id then
      raise exception 'Il fornitore del movimento contabile non coincide con quello del lavoro';
    end if;
  end if;
  if new.payment_entry_id is not null then
    if new.ledger_entry_id is not null and new.payment_entry_id=new.ledger_entry_id then
      raise exception 'Il movimento di pagamento deve essere distinto dal movimento della spesa';
    end if;
    select workspace_id,condominium_id,direction,supplier_id,amount,data into p
    from public.condominium_ledger_entries where id=new.payment_entry_id;
    if not found or p.workspace_id<>w.workspace_id or p.condominium_id<>w.condominium_id then
      raise exception 'Movimento di pagamento non coerente con il lavoro';
    end if;
    if p.direction<>'Uscita' then raise exception 'Il movimento di pagamento deve essere un''Uscita'; end if;
    if w.supplier_id is not null and p.supplier_id is not null and w.supplier_id<>p.supplier_id then
      raise exception 'Il fornitore del pagamento non coincide con quello del lavoro';
    end if;
    if p.data->>'source'='SAL pagamento' then
      if p.data->>'progress_id' is distinct from new.id::text then
        raise exception 'Il movimento di pagamento non appartiene al SAL indicato';
      end if;
      select pg_catalog.round(coalesce(sum(amount),0)::numeric,2) into v_linked_paid
      from public.condominium_ledger_entries
      where workspace_id=w.workspace_id and condominium_id=w.condominium_id
        and direction='Uscita' and data->>'source'='SAL pagamento'
        and data->>'progress_id'=new.id::text;
      if abs(pg_catalog.round(coalesce(new.paid_amount,0)::numeric,2)-v_linked_paid)>0.005 then
        raise exception 'Il pagato del SAL non coincide con la somma dei movimenti collegati';
      end if;
    else
      if coalesce(new.paid_amount,0)>coalesce(p.amount,0)+0.005 then
        raise exception 'Il pagato del SAL supera l''importo del movimento di pagamento collegato';
      end if;
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.register_condominium_work_progress_payment(
  p_workspace_id uuid,p_condominium_id uuid,p_work_id uuid,p_progress_id uuid,
  p_entry_date date,p_amount numeric,p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_work record;v_progress record;v_fiscal_year_id uuid;v_total_sal numeric;
  v_amount numeric;v_new_paid numeric;v_payment_entry_id uuid;v_updated integer;
BEGIN
  if p_workspace_id is null or p_condominium_id is null or p_work_id is null or p_progress_id is null then
    raise exception 'Workspace, condominio, lavoro e SAL sono obbligatori';
  end if;
  if p_entry_date is null then raise exception 'La data del pagamento è obbligatoria'; end if;
  if p_amount is null then raise exception 'L''importo del pagamento è obbligatorio'; end if;
  v_amount:=pg_catalog.round(p_amount,2);
  if p_amount<>v_amount then raise exception 'L''importo del pagamento deve essere espresso in centesimi'; end if;
  if v_amount<=0 then raise exception 'Indica un importo di pagamento valido'; end if;
  select id,title,supplier_id,approved_amount into v_work
  from public.condominium_works
  where id=p_work_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id
  for update;
  if not found then raise exception 'Intervento non trovato nel workspace/condominio indicato'; end if;
  select id,progress_no,amount,paid_amount,ledger_entry_id,payment_entry_id into v_progress
  from public.condominium_work_progress
  where id=p_progress_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id
  for update;
  if not found then raise exception 'SAL non trovato per l''intervento indicato'; end if;
  if v_progress.ledger_entry_id is not null then raise exception 'SAL già contabilizzato; non è possibile aggiungere pagamenti parziali'; end if;
  select pg_catalog.round(coalesce(sum(amount),0)::numeric,2) into v_total_sal
  from public.condominium_work_progress
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id;
  if v_work.approved_amount>0 and v_total_sal>v_work.approved_amount+0.005 then
    raise exception 'I SAL cumulati superano l''importo approvato del lavoro';
  end if;
  select id into v_fiscal_year_id
  from public.condominium_fiscal_years
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id
    and p_entry_date between start_date and end_date and status<>'Chiuso'
  order by start_date desc limit 1 for update;
  if not found then raise exception 'Non esiste un esercizio aperto per la data del pagamento'; end if;
  v_new_paid:=pg_catalog.round(coalesce(v_progress.paid_amount,0)+v_amount,2);
  if v_new_paid>v_progress.amount+0.005 then raise exception 'Il pagamento supera l''importo residuo del SAL'; end if;
  insert into public.condominium_ledger_entries(
    workspace_id,condominium_id,fiscal_year_id,entry_date,direction,category,description,
    amount,payment_status,due_date,supplier_id,notes,data
  )
  values(
    p_workspace_id,p_condominium_id,v_fiscal_year_id,p_entry_date,'Uscita','Pagamento SAL',
    'Pagamento '||v_work.title||' · SAL '||v_progress.progress_no,
    v_amount,'Pagato',p_entry_date,v_work.supplier_id,coalesce(p_notes,''),
    pg_catalog.jsonb_build_object('work_id',p_work_id,'progress_id',p_progress_id,'source','SAL pagamento')
  )
  returning id into v_payment_entry_id;
  update public.condominium_work_progress
  set paid_amount=v_new_paid,payment_entry_id=v_payment_entry_id
  where id=p_progress_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id;
  get diagnostics v_updated=row_count;
  if v_updated<>1 then raise exception 'SAL non aggiornato; pagamento annullato'; end if;
  return v_payment_entry_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_condominium_work_progress_payment(
  p_workspace_id uuid,p_condominium_id uuid,p_work_id uuid,p_progress_id uuid,
  p_entry_date date,p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_work record;v_progress record;v_fiscal_year_id uuid;v_total_sal numeric;
  v_amount numeric;v_payment_entry_id uuid;v_updated integer;
BEGIN
  if p_workspace_id is null or p_condominium_id is null or p_work_id is null or p_progress_id is null then
    raise exception 'Workspace, condominio, lavoro e SAL sono obbligatori';
  end if;
  if p_entry_date is null then raise exception 'La data del pagamento è obbligatoria'; end if;
  select id,title,supplier_id,approved_amount into v_work
  from public.condominium_works
  where id=p_work_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id
  for update;
  if not found then raise exception 'Intervento non trovato nel workspace/condominio indicato'; end if;
  select id,progress_no,amount,paid_amount,ledger_entry_id,payment_entry_id into v_progress
  from public.condominium_work_progress
  where id=p_progress_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id
  for update;
  if not found then raise exception 'SAL non trovato per l''intervento indicato'; end if;
  if v_progress.ledger_entry_id is not null then raise exception 'Questo SAL è già contabilizzato'; end if;
  if v_progress.payment_entry_id is not null then raise exception 'SAL con pagamenti parziali: usare il flusso di pagamento parziale'; end if;
  v_amount:=pg_catalog.round(coalesce(v_progress.paid_amount,0),2);
  if v_amount<=0 then raise exception 'Il SAL non contiene un importo pagato'; end if;
  if v_amount>v_progress.amount+0.005 then raise exception 'Il pagato del SAL supera l''importo del SAL'; end if;
  select pg_catalog.round(coalesce(sum(amount),0)::numeric,2) into v_total_sal
  from public.condominium_work_progress
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id;
  if v_work.approved_amount>0 and v_total_sal>v_work.approved_amount+0.005 then
    raise exception 'I SAL cumulati superano l''importo approvato del lavoro';
  end if;
  select id into v_fiscal_year_id
  from public.condominium_fiscal_years
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id
    and p_entry_date between start_date and end_date and status<>'Chiuso'
  order by start_date desc limit 1 for update;
  if not found then raise exception 'Non esiste un esercizio aperto per la data del pagamento'; end if;
  insert into public.condominium_ledger_entries(
    workspace_id,condominium_id,fiscal_year_id,entry_date,direction,category,description,
    amount,payment_status,due_date,supplier_id,notes,data
  )
  values(
    p_workspace_id,p_condominium_id,v_fiscal_year_id,p_entry_date,'Uscita','SAL',
    v_work.title||' · SAL '||v_progress.progress_no,
    v_amount,'Pagato',p_entry_date,v_work.supplier_id,
    'Pagamento collegato al SAL '||v_progress.progress_no||case when coalesce(p_notes,'')<>'' then ': '||p_notes else '' end,
    pg_catalog.jsonb_build_object('work_id',p_work_id,'work_progress_id',p_progress_id,'source','SAL')
  )
  returning id into v_payment_entry_id;
  update public.condominium_work_progress
  set ledger_entry_id=v_payment_entry_id,status='Pagato'
  where id=p_progress_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id;
  get diagnostics v_updated=row_count;
  if v_updated<>1 then raise exception 'SAL non aggiornato; pagamento annullato'; end if;
  return v_payment_entry_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_condominium_work_progress_payment(uuid,uuid,uuid,uuid,date,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_condominium_work_progress_payment(uuid,uuid,uuid,uuid,date,numeric,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_condominium_work_progress_payment(uuid,uuid,uuid,uuid,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_condominium_work_progress_payment(uuid,uuid,uuid,uuid,date,text) TO authenticated, service_role;

-- Atomically create a SAL and synchronize the work progress percentage.
-- Locks the parent work so concurrent SAL creation cannot exceed approved totals.
CREATE OR REPLACE FUNCTION public.create_condominium_work_progress_atomic(
  p_workspace_id uuid, p_condominium_id uuid, p_work_id uuid,
  p_progress_no integer, p_progress_date date, p_title text, p_status text,
  p_percentage numeric, p_amount numeric, p_paid_amount numeric, p_notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_work record; v_total_amount numeric; v_total_percentage numeric;
  v_progress_id uuid; v_updated integer;
  v_amount numeric; v_paid numeric; v_percentage numeric;
BEGIN
  if p_workspace_id is null or p_condominium_id is null or p_work_id is null then
    raise exception 'Workspace, condominio e intervento sono obbligatori';
  end if;
  if p_progress_no is null or p_progress_no<1 then raise exception 'Numero SAL non valido'; end if;
  if p_progress_date is null then raise exception 'Data SAL obbligatoria'; end if;
  if p_status not in ('Presentato','Verificato','Approvato','Contestato') then
    raise exception 'Stato SAL non valido: il pagamento deve essere registrato dalla procedura contabile';
  end if;
  v_amount:=pg_catalog.round(coalesce(p_amount,0)::numeric,2);
  v_paid:=pg_catalog.round(coalesce(p_paid_amount,0)::numeric,2);
  v_percentage:=pg_catalog.least(100,pg_catalog.greatest(0,coalesce(p_percentage,0)));
  if coalesce(p_amount,0)<>v_amount or coalesce(p_paid_amount,0)<>v_paid then
    raise exception 'Gli importi devono essere espressi in centesimi';
  end if;
  if v_amount<0 or v_paid<0 or v_paid>v_amount+0.005 then
    raise exception 'Importi SAL non validi';
  end if;
  if v_paid>0 then
    raise exception 'Il pagamento iniziale deve essere registrato dalla funzione Registra pagamento dopo la creazione del SAL';
  end if;
  select id,approved_amount into v_work
  from public.condominium_works
  where id=p_work_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id
  for update;
  if not found then raise exception 'Intervento non trovato nel workspace/condominio indicato'; end if;
  if exists(select 1 from public.condominium_work_progress
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      and work_id=p_work_id and progress_no=p_progress_no) then
    raise exception 'Esiste già un SAL con questo numero per l''intervento';
  end if;
  select pg_catalog.round(coalesce(sum(amount),0)::numeric,2),
         pg_catalog.least(100,pg_catalog.round(coalesce(sum(percentage),0)::numeric,2))
    into v_total_amount,v_total_percentage
  from public.condominium_work_progress
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id and work_id=p_work_id;
  v_total_amount:=v_total_amount+v_amount;
  if v_work.approved_amount>0 and v_total_amount>v_work.approved_amount+0.005 then
    raise exception 'Il totale dei SAL supera l''importo approvato del lavoro';
  end if;
  v_total_percentage:=pg_catalog.least(100,v_total_percentage+v_percentage);
  insert into public.condominium_work_progress(
    workspace_id,condominium_id,work_id,progress_no,progress_date,title,status,
    percentage,amount,paid_amount,notes
  ) values (
    p_workspace_id,p_condominium_id,p_work_id,p_progress_no,p_progress_date,
    coalesce(nullif(pg_catalog.btrim(p_title),''),'SAL '||p_progress_no),
    p_status,v_percentage,v_amount,v_paid,coalesce(p_notes,'')
  ) returning id into v_progress_id;
  update public.condominium_works
  set progress_percent=v_total_percentage
  where id=p_work_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
  get diagnostics v_updated=row_count;
  if v_updated<>1 then raise exception 'Intervento non aggiornato; creazione SAL annullata'; end if;
  return v_progress_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_condominium_work_progress_atomic(uuid,uuid,uuid,integer,date,text,text,numeric,numeric,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_condominium_work_progress_atomic(uuid,uuid,uuid,integer,date,text,text,numeric,numeric,numeric,text) TO authenticated, service_role;
