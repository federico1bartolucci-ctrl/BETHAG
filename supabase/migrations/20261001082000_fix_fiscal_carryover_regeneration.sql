create or replace function private.generate_fiscal_year_carryovers(p_workspace_id uuid,p_condominium_id uuid,p_source_fiscal_year_id uuid,p_target_fiscal_year_id uuid)
returns integer language plpgsql security definer set search_path=''
as $function$
declare
  v_source public.condominium_fiscal_years%rowtype;
  v_target public.condominium_fiscal_years%rowtype;
  v_count integer := 0;
  v_closing numeric := 0;
begin
  if (select auth.uid()) is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
  select * into v_source from public.condominium_fiscal_years where id=p_source_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Esercizio di origine non trovato'; end if;
  select * into v_target from public.condominium_fiscal_years where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Esercizio di destinazione non trovato'; end if;
  if exists (select 1 from public.condominiums c where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null) then raise exception 'Non è possibile generare riporti per un condominio archiviato'; end if;
  if v_source.status<>'Chiuso' then raise exception 'L''esercizio di origine deve essere chiuso'; end if;
  if v_target.id=v_source.id then raise exception 'Gli esercizi devono essere diversi'; end if;
  if v_target.start_date<=v_source.end_date then raise exception 'L''esercizio di destinazione deve essere successivo a quello di origine'; end if;
  if v_target.status='Chiuso' then raise exception 'L''esercizio di destinazione è chiuso e non può ricevere il saldo iniziale'; end if;
  if exists (select 1 from public.condominium_fiscal_carryovers c where c.workspace_id=p_workspace_id and c.condominium_id=p_condominium_id and c.source_fiscal_year_id=p_source_fiscal_year_id and c.target_fiscal_year_id=p_target_fiscal_year_id and exists (select 1 from public.condominium_fiscal_carryover_compensations cc where cc.carryover_id=c.id)) then
    raise exception 'I riporti dell''esercizio indicato hanno già compensazioni e non possono essere rigenerati';
  end if;
  select round(coalesce(v_source.opening_balance,0)+coalesce(sum(case when e.direction='Entrata' then e.amount else 0 end),0)-coalesce(sum(case when e.direction='Uscita' then e.amount else 0 end),0),2)
    into v_closing
    from public.condominium_ledger_entries e
    where e.workspace_id=p_workspace_id and e.condominium_id=p_condominium_id and e.fiscal_year_id=p_source_fiscal_year_id;
  delete from public.condominium_fiscal_carryovers
   where workspace_id=p_workspace_id and condominium_id=p_condominium_id and source_fiscal_year_id=p_source_fiscal_year_id and target_fiscal_year_id=p_target_fiscal_year_id;
  update public.condominium_fiscal_years set opening_balance=v_closing
   where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
  insert into public.condominium_fiscal_carryovers(workspace_id,condominium_id,source_fiscal_year_id,target_fiscal_year_id,unit_id,member_id,balance,kind,status,notes)
  select p_workspace_id,p_condominium_id,p_source_fiscal_year_id,p_target_fiscal_year_id,q.unit_id,q.member_id,q.balance,case when q.balance>0 then 'Debito' else 'Credito' end,'Da riportare','Saldo individuale riportato dall''esercizio '||v_source.name
  from (select i.unit_id,i.member_id,round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2) balance
        from public.condominium_installments i
        left join (select installment_id,sum(amount) total_paid from public.condominium_payment_movements where workspace_id=p_workspace_id and condominium_id=p_condominium_id group by installment_id) pm on pm.installment_id=i.id
        where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.fiscal_year_id=p_source_fiscal_year_id
        group by i.unit_id,i.member_id
        having abs(round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2))>=0.01) q;
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$;