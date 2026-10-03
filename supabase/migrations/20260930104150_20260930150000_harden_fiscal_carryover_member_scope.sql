-- Keep fiscal carryovers at unit level when installment history involves multiple members.
create or replace function public.generate_fiscal_year_carryovers(
  p_workspace_id uuid,p_condominium_id uuid,p_source_fiscal_year_id uuid,p_target_fiscal_year_id uuid
) returns integer language plpgsql set search_path=public as $function$
declare v_source public.condominium_fiscal_years%rowtype; v_target public.condominium_fiscal_years%rowtype; v_count integer:=0;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
 select * into v_source from public.condominium_fiscal_years where id=p_source_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
 if not found then raise exception 'Esercizio di origine non trovato'; end if;
 select * into v_target from public.condominium_fiscal_years where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;
 if not found then raise exception 'Esercizio di destinazione non trovato'; end if;
 if v_source.status<>'Chiuso' then raise exception 'L''esercizio di origine deve essere chiuso'; end if;
 if v_target.id=v_source.id then raise exception 'Gli esercizi devono essere diversi'; end if;
 if v_target.start_date<=v_source.end_date then raise exception 'L''esercizio di destinazione deve essere successivo a quello di origine'; end if;
 delete from public.condominium_fiscal_carryovers where workspace_id=p_workspace_id and condominium_id=p_condominium_id and source_fiscal_year_id=p_source_fiscal_year_id and target_fiscal_year_id=p_target_fiscal_year_id;
 insert into public.condominium_fiscal_carryovers(workspace_id,condominium_id,source_fiscal_year_id,target_fiscal_year_id,unit_id,member_id,balance,kind,status,notes)
 select p_workspace_id,p_condominium_id,p_source_fiscal_year_id,p_target_fiscal_year_id,q.unit_id,q.member_id,q.balance,
        case when q.balance>0 then 'Debito' else 'Credito' end,'Da riportare',
        'Saldo individuale riportato dall''esercizio '||v_source.name
 from (
   select i.unit_id,
          case when count(distinct i.member_id) filter (where i.member_id is not null)=1
               then max(i.member_id) filter (where i.member_id is not null) else null end as member_id,
          round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2) as balance
   from public.condominium_installments i
   left join (
     select i2.id as installment_id,coalesce(pm.total_paid,0) as total_paid
     from public.condominium_installments i2
     left join (
       select installment_id,sum(amount) as total_paid
       from public.condominium_payment_movements
       where workspace_id=p_workspace_id and condominium_id=p_condominium_id group by installment_id
     ) pm on pm.installment_id=i2.id
     where i2.workspace_id=p_workspace_id and i2.condominium_id=p_condominium_id and i2.fiscal_year_id=p_source_fiscal_year_id
   ) pm on pm.installment_id=i.id
   where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.fiscal_year_id=p_source_fiscal_year_id
   group by i.unit_id
   having abs(round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2))>=0.01
 ) q;
 get diagnostics v_count=row_count; return v_count;
end; $function$;