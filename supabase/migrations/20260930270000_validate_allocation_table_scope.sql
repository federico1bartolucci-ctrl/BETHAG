-- BETHAG: enforce the selected millesimal table scope and values at confirmation time.
create or replace function public.confirm_allocation_intake(
  p_workspace_id uuid,
  p_intake_id uuid
) returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_intake public.condominium_allocation_intakes%rowtype;
  v_row jsonb;
  v_count integer:=0;
  v_unit_id uuid;
  v_amount numeric;
  v_millesimi numeric;
  v_total numeric:=0;
  v_total_millesimi numeric:=0;
  v_expense_amount numeric;
  v_table_total numeric;
  v_table_scope text;
  v_expected_millesimi numeric;
  v_building_code text;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_intake
  from public.condominium_allocation_intakes
  where id=p_intake_id and workspace_id=p_workspace_id
  for update;

  if not found then raise exception 'Acquisizione riparto non trovata'; end if;
  if v_intake.status='Confermato' then
    return (select count(*) from public.condominium_expense_allocations where workspace_id=p_workspace_id and ledger_entry_id=v_intake.ledger_entry_id);
  end if;
  if v_intake.status='Annullato' then raise exception 'L''acquisizione è stata annullata'; end if;
  if v_intake.ledger_entry_id is null then raise exception 'Collegare prima una spesa contabile'; end if;
  if coalesce(jsonb_array_length(v_intake.rows),0)=0 then raise exception 'Nessuna quota da confermare'; end if;

  select amount into v_expense_amount
  from public.condominium_ledger_entries
  where id=v_intake.ledger_entry_id
    and workspace_id=p_workspace_id
    and condominium_id=v_intake.condominium_id
    and direction='Uscita';

  if v_expense_amount is null then raise exception 'La spesa collegata non è valida'; end if;
  if v_intake.expense_amount is not null and abs(v_intake.expense_amount-v_expense_amount)>0.005 then
    raise exception 'L''importo dell''acquisizione non coincide con la spesa contabile';
  end if;

  if v_intake.allocation_table_id is not null then
    select total_millesimi,scope_mode
      into v_table_total,v_table_scope
    from public.condominium_millesimal_tables
    where id=v_intake.allocation_table_id
      and workspace_id=p_workspace_id
      and condominium_id=v_intake.condominium_id
      and active=true;

    if not found then raise exception 'La tabella millesimale selezionata non è valida'; end if;
  end if;

  for v_row in select value from jsonb_array_elements(v_intake.rows) loop
    v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
    v_amount:=round(coalesce((v_row->>'amount')::numeric,0),2);
    v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);

    if v_unit_id is null or v_amount<=0 or v_millesimi<0 then
      raise exception 'Riga di riparto non valida';
    end if;

    if not exists(
      select 1 from public.condominium_units
      where id=v_unit_id
        and workspace_id=p_workspace_id
        and condominium_id=v_intake.condominium_id
    ) then
      raise exception 'L''unità indicata non appartiene al condominio';
    end if;

    if v_intake.allocation_table_id is not null then
      if v_table_scope='units' and not exists(
        select 1
        from public.condominium_millesimal_tables t
        where t.id=v_intake.allocation_table_id
          and v_unit_id=any(t.scope_unit_ids)
      ) then
        raise exception 'L''unità % non rientra nell''ambito della tabella millesimale selezionata',v_unit_id;
      end if;

      if v_table_scope='buildings' then
        select lower(trim(coalesce(data->>'building_code',data->>'civic_code',data->>'fabbricato','')))
          into v_building_code
        from public.condominium_units
        where id=v_unit_id;
        if not exists(
          select 1
          from public.condominium_millesimal_tables t
          where t.id=v_intake.allocation_table_id
            and lower(trim(code))=v_building_code
            for share
        ) then
          raise exception 'L''unità % non rientra nell''ambito per fabbricato/civico della tabella selezionata',v_unit_id;
        end if;
      end if;

      select value into v_expected_millesimi
      from public.condominium_millesimal_values
      where workspace_id=p_workspace_id
        and condominium_id=v_intake.condominium_id
        and table_id=v_intake.allocation_table_id
        and unit_id=v_unit_id
      limit 1;

      if v_expected_millesimi is not null and abs(v_expected_millesimi-v_millesimi)>0.005 then
        raise exception 'I millesimi dell''unità % non coincidono con la tabella selezionata',v_unit_id;
      end if;
    end if;

    v_total:=v_total+v_amount;
    v_total_millesimi:=v_total_millesimi+v_millesimi;
    v_count:=v_count+1;
  end loop;

  if abs(v_total-v_expense_amount)>0.005 then
    raise exception 'La somma delle quote (%s) non coincide con la spesa (%s)',round(v_total,2),round(v_expense_amount,2);
  end if;

  if v_intake.allocation_table_id is not null and v_table_total is not null
     and abs(v_total_millesimi-v_table_total)>0.01 then
    raise exception 'I millesimi del riparto (%s) non coincidono con il totale della tabella (%s)',round(v_total_millesimi,3),round(v_table_total,3);
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=v_intake.condominium_id
    and ledger_entry_id=v_intake.ledger_entry_id;

  for v_row in select value from jsonb_array_elements(v_intake.rows) loop
    v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
    v_amount:=round((v_row->>'amount')::numeric,2);
    v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);

    insert into public.condominium_expense_allocations(
      workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,
      allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
    ) values(
      p_workspace_id,v_intake.condominium_id,v_intake.ledger_entry_id,v_intake.allocation_table_id,
      v_unit_id,null,
      case when v_intake.source='AI' then 'AI - confermato' else 'Manuale - confermato' end,
      v_millesimi,v_amount,0,
      (select due_date from public.condominium_ledger_entries where id=v_intake.ledger_entry_id),
      'Da pagare',coalesce(v_intake.notes,'')
    );
  end loop;

  update public.condominium_allocation_intakes
  set status='Confermato',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
  where id=p_intake_id and workspace_id=p_workspace_id;

  return v_count;
end;
$$;

grant execute on function public.confirm_allocation_intake(uuid,uuid) to authenticated;
