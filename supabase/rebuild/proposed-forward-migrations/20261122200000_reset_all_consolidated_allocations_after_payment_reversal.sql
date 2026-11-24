-- Proposed forward migration for consolidated installment payment reversals.
-- Intentionally isolated from the frozen deployable migration chain until release review.
CREATE OR REPLACE FUNCTION public.sync_condominium_installment_from_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_installment_id uuid;
  v_workspace_id uuid;
  v_condominium_id uuid;
  v_amount numeric;
  v_paid numeric;
  v_status text;
  v_due_date date;
  v_unit_id uuid;
  v_member_id uuid;
  v_owner_user_id uuid;
  v_owner_email text;
  v_remaining numeric;
  v_allocation public.condominium_expense_allocations%rowtype;
  v_target numeric;
begin
  v_installment_id := coalesce(new.installment_id, old.installment_id);
  v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  v_condominium_id := coalesce(new.condominium_id, old.condominium_id);

  select amount, due_date, unit_id, member_id
    into v_amount, v_due_date, v_unit_id, v_member_id
  from public.condominium_installments
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id
  for update;

  if not found then
    return coalesce(new, old);
  end if;

  select round(coalesce(sum(amount),0)::numeric,2)
    into v_paid
  from public.condominium_payment_movements
  where installment_id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  if v_paid > v_amount + 0.005 then
    raise exception 'I pagamenti della rata superano l''importo della rata.';
  end if;

  if v_paid >= v_amount - 0.005 then
    v_paid := round(v_amount::numeric,2);
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif v_due_date < current_date then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  perform set_config('bethag.allow_installment_paid_update','on',true);

  update public.condominium_installments
  set paid_amount=v_paid,status=v_status
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  /*
    Dopo INSERT/UPDATE/DELETE di un movimento, riallinea anche le
    ripartizioni interessate. Questo è indispensabile soprattutto per
    lo storno: la rata può tornare parzialmente/non pagata e le
    ripartizioni devono riflettere lo stesso saldo.
  */
  perform set_config('bethag.allow_allocation_paid_update','on',true);

  if v_unit_id is null and v_member_id is not null then
    select cm.user_id, nullif(lower(trim(cm.email)),'')
      into v_owner_user_id, v_owner_email
    from public.condominium_members cm
    where cm.id=v_member_id
      and cm.condominium_id=v_condominium_id
      and cm.active
      and trim(coalesce(cm.data->>'role',''))='Proprietario';

    if found then
      v_remaining := v_paid;

      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=v_workspace_id
          and a.condominium_id=v_condominium_id
          and a.ledger_entry_id=(
            select i.ledger_entry_id
            from public.condominium_installments i
            where i.id=v_installment_id
          )
          and exists (
            select 1
            from public.condominium_members cm
            where cm.condominium_id=v_condominium_id
              and cm.unit_id=a.unit_id
              and cm.active
              and trim(coalesce(cm.data->>'role',''))='Proprietario'
              and (
                (v_owner_user_id is not null and cm.user_id=v_owner_user_id)
                or
                (v_owner_user_id is null
                 and nullif(lower(trim(cm.email)),'') is not null
                 and nullif(lower(trim(cm.email)),'')=v_owner_email)
              )
          )
        order by a.id
        for update
      loop
        v_target := least(
          round(coalesce(v_allocation.amount,0),2),
          greatest(round(v_remaining,2),0)
        );

        update public.condominium_expense_allocations
        set paid_amount=v_target,
            status=case
              when v_target>=amount-0.005 then 'Pagato'
              when v_target>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;

        v_remaining := round(v_remaining-v_target,2);
      end loop;
      if v_remaining>0.005 then
        raise exception 'Storno: saldo rata non riconciliato con le ripartizioni del proprietario';
      end if;
    else
      raise exception 'Proprietario della rata unificata non valido';
    end if;
  else
    update public.condominium_expense_allocations a
    set paid_amount=v_paid,
        status=case
          when v_paid>=a.amount-0.005 then 'Pagato'
          when v_paid>0 then 'Parzialmente pagato'
          else 'Da pagare'
        end
    where a.workspace_id=v_workspace_id
      and a.condominium_id=v_condominium_id
      and a.unit_id=v_unit_id
      and (
        (v_member_id is not null and a.member_id=v_member_id)
        or
        (v_member_id is null and a.member_id is null)
      )
      and a.ledger_entry_id=(
        select i.ledger_entry_id
        from public.condominium_installments i
        where i.id=v_installment_id
      );
  end if;

  return coalesce(new, old);
end;
$function$;
