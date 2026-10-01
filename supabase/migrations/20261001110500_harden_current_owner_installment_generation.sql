-- Harden installment generation against outgoing members still in closure
-- and pin SECURITY DEFINER search_path.

create or replace function private.generate_installments_from_allocations_schedule(
  p_workspace_id uuid,
  p_condominium_id uuid,
  p_ledger_entry_id uuid,
  p_title text,
  p_due_dates date[],
  p_fiscal_year_id uuid default null,
  p_percentages numeric[] default null,
  p_unify_by_member boolean default false
)
returns integer
language plpgsql
security definer
set search_path=''
as $function$
declare
  a record;
  m record;
  i int;
  n int;
  part numeric;
  group_sum numeric;
  prior numeric;
  created_count integer := 0;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_workspace_id::text||':'||p_condominium_id::text||':'||p_ledger_entry_id::text,
      0
    )
  );

  if exists(select 1 from public.condominiums c where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null) then raise exception 'Il condominio è archiviato e non può essere modificato'; end if;
  if trim(coalesce(p_title,''))='' then raise exception 'Il titolo delle rate è obbligatorio'; end if;
  n:=coalesce(array_length(p_due_dates,1),0);
  if p_fiscal_year_id is not null and not exists(select 1 from public.condominium_fiscal_years fy where fy.id=p_fiscal_year_id and fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id) then raise exception 'Esercizio contabile selezionato non valido'; end if;
  if exists(select 1 from unnest(p_due_dates) d where (select count(*) from public.condominium_fiscal_years fy where fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id and d between fy.start_date and fy.end_date)<>1) then raise exception 'Ogni scadenza deve ricadere in un solo esercizio contabile valido'; end if;
  if p_fiscal_year_id is not null and exists(select 1 from public.condominium_fiscal_years fy where fy.id=p_fiscal_year_id and fy.status='Chiuso') then raise exception 'Esercizio contabile di riferimento della spesa chiuso'; end if;
  if exists(select 1 from unnest(p_due_dates) d join public.condominium_fiscal_years fy on fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id and d between fy.start_date and fy.end_date where fy.status='Chiuso') then raise exception 'Una o più scadenze ricadono in un esercizio contabile chiuso'; end if;
  if n<1 or n>12 then raise exception 'Indicare da 1 a 12 scadenze'; end if;
  for i in 1..n loop
    if p_due_dates[i] is null or (i>1 and p_due_dates[i]<=p_due_dates[i-1]) then raise exception 'Le scadenze devono essere valide, cronologiche e non duplicate'; end if;
  end loop;
  if p_percentages is not null and (array_length(p_percentages,1)<>n or abs((select sum(x) from unnest(p_percentages) x)-100)>0.001 or exists(select 1 from unnest(p_percentages) x where x<=0)) then raise exception 'Percentuali rate non valide'; end if;
  if not exists(select 1 from public.condominium_ledger_entries where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and direction='Uscita' and amount>0) then raise exception 'Spesa non valida'; end if;
  if exists(select 1 from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id) then raise exception 'La spesa ha già rate collegate'; end if;
  if not exists(select 1 from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id and amount>0) then raise exception 'La spesa non ha ripartizioni'; end if;

  if p_unify_by_member then
    if exists(
      select 1
      from public.condominium_expense_allocations ea
      where ea.workspace_id=p_workspace_id
        and ea.condominium_id=p_condominium_id
        and ea.ledger_entry_id=p_ledger_entry_id
        and (
          select count(*)
          from public.condominium_members cm
          where cm.condominium_id=p_condominium_id
            and cm.unit_id=ea.unit_id
            and cm.active
            and trim(coalesce(cm.data->>'role',''))='Proprietario'
            and coalesce(cm.data->>'position_status','')<>'In chiusura'
        )<>1
    ) then
      raise exception 'Unificazione non consentita: ogni unità deve avere un unico proprietario corrente';
    end if;

    if exists(
      select 1
      from public.condominium_expense_allocations ea
      join public.condominium_members cm
        on cm.condominium_id=p_condominium_id
       and cm.unit_id=ea.unit_id
       and cm.active
       and trim(coalesce(cm.data->>'role',''))='Proprietario'
       and coalesce(cm.data->>'position_status','')<>'In chiusura'
      where ea.workspace_id=p_workspace_id
        and ea.condominium_id=p_condominium_id
        and ea.ledger_entry_id=p_ledger_entry_id
        and nullif(trim(cm.user_id::text),'') is null
        and nullif(lower(trim(coalesce(cm.email,''))),'') is null
    ) then
      raise exception 'Unificazione non consentita: almeno un proprietario corrente non dispone di un identificativo stabile';
    end if;
  end if;

  for i in 1..n loop
    if p_unify_by_member then
      for m in
        select
          (array_agg(cm.id order by cm.id))[1] member_id,
          case when cm.user_id is not null then 'u:'||cm.user_id::text else 'e:'||lower(trim(cm.email)) end owner_key
        from public.condominium_members cm
        where cm.condominium_id=p_condominium_id
          and cm.active
          and trim(coalesce(cm.data->>'role',''))='Proprietario'
          and coalesce(cm.data->>'position_status','')<>'In chiusura'
          and exists(
            select 1
            from public.condominium_expense_allocations a2
            where a2.workspace_id=p_workspace_id
              and a2.condominium_id=p_condominium_id
              and a2.ledger_entry_id=p_ledger_entry_id
              and a2.unit_id=cm.unit_id
          )
        group by case when cm.user_id is not null then 'u:'||cm.user_id::text else 'e:'||lower(trim(cm.email)) end
        order by (array_agg(cm.id order by cm.id))[1]
      loop
        group_sum:=0;

        for a in
          select ea.*
          from public.condominium_expense_allocations ea
          join public.condominium_members cm2
            on cm2.condominium_id=p_condominium_id
           and cm2.unit_id=ea.unit_id
           and cm2.active
           and trim(coalesce(cm2.data->>'role',''))='Proprietario'
           and coalesce(cm2.data->>'position_status','')<>'In chiusura'
          where ea.workspace_id=p_workspace_id
            and ea.condominium_id=p_condominium_id
            and ea.ledger_entry_id=p_ledger_entry_id
            and case when cm2.user_id is not null then 'u:'||cm2.user_id::text else 'e:'||lower(trim(cm2.email)) end=m.owner_key
          order by ea.id
        loop
          if i=n then
            if p_percentages is null then
              part:=round(a.amount-round(a.amount/n,2)*(n-1),2);
            else
              prior:=coalesce((select sum(round(a.amount*x/100,2)) from unnest(p_percentages[1:n-1]) x),0);
              part:=round(a.amount-prior,2);
            end if;
          else
            if p_percentages is null then part:=round(a.amount/n,2);
            else part:=round(a.amount*p_percentages[i]/100,2);
            end if;
          end if;
          group_sum:=group_sum+part;
        end loop;

        if group_sum>0 then
          insert into public.condominium_installments(
            workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes
          )
          select
            p_workspace_id,p_condominium_id,y.id,p_ledger_entry_id,m.member_id,null,
            trim(p_title)||' - rata '||i||'/'||n,round(group_sum,2),0,'Da pagare',
            p_due_dates[i],'Rata unificata per proprietario'
          from public.condominium_fiscal_years y
          where y.workspace_id=p_workspace_id
            and y.condominium_id=p_condominium_id
            and p_due_dates[i] between y.start_date and y.end_date
          order by y.start_date
          limit 1;

          created_count:=created_count+1;
        end if;
      end loop;
    else
      for a in
        select *
        from public.condominium_expense_allocations
        where workspace_id=p_workspace_id
          and condominium_id=p_condominium_id
          and ledger_entry_id=p_ledger_entry_id
          and amount>0
        order by id
      loop
        if i=n then
          if p_percentages is null then
            part:=round(a.amount-round(a.amount/n,2)*(n-1),2);
          else
            prior:=coalesce((select sum(round(a.amount*x/100,2)) from unnest(p_percentages[1:n-1]) x),0);
            part:=round(a.amount-prior,2);
          end if;
        else
          if p_percentages is null then part:=round(a.amount/n,2);
          else part:=round(a.amount*p_percentages[i]/100,2);
          end if;
        end if;

        insert into public.condominium_installments(
          workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes
        )
        select
          p_workspace_id,p_condominium_id,y.id,p_ledger_entry_id,a.member_id,a.unit_id,
          trim(p_title)||' - rata '||i||'/'||n,part,0,'Da pagare',
          p_due_dates[i],coalesce(a.notes,'')
        from public.condominium_fiscal_years y
        where y.workspace_id=p_workspace_id
          and y.condominium_id=p_condominium_id
          and p_due_dates[i] between y.start_date and y.end_date
        order by y.start_date
        limit 1;

        created_count:=created_count+1;
      end loop;
    end if;
  end loop;

  return created_count;
end;
$function$;

revoke execute on function private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) from public;
revoke execute on function private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) from anon;
grant execute on function private.generate_installments_from_allocations_schedule(uuid,uuid,uuid,text,date[],uuid,numeric[],boolean) to authenticated;
