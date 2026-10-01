-- BETHAG: atomic unit cadastral transformation confirmation
-- Deploy through Supabase migration after review.
-- Security model: private SECURITY DEFINER + explicit auth/workspace authorization.

create or replace function private.confirm_condominium_unit_transformation(
  p_transformation_id uuid,
  p_destination_units jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  t record;
  source_count integer;
  destination_count integer;
  d jsonb;
  new_unit uuid;
  seq integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select * into t
  from public.condominium_unit_transformations
  where id=p_transformation_id
  for update;

  if not found then raise exception 'Trasformazione non trovata'; end if;
  if not private.can_manage_workspace_module(t.workspace_id,'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;
  if t.status <> 'Bozza' then raise exception 'Trasformazione non modificabile'; end if;
  if t.accounting_resolution_status not in ('Non necessaria','Risolta') then
    raise exception 'Risoluzione contabile richiesta';
  end if;
  if t.millesimal_review_status not in ('Confermata invariata','Nuove tabelle') then
    raise exception 'Verifica millesimale richiesta';
  end if;

  select count(*) into source_count
  from public.condominium_unit_transformation_items
  where transformation_id=t.id and direction='Fonte';

  destination_count := jsonb_array_length(coalesce(p_destination_units,'[]'::jsonb));

  if t.transformation_type='Fusione' and (source_count < 2 or destination_count <> 1) then
    raise exception 'Una fusione richiede almeno due fonti e una destinazione';
  end if;

  if t.transformation_type='Frazionamento' and (source_count <> 1 or destination_count < 2) then
    raise exception 'Un frazionamento richiede una fonte e almeno due destinazioni';
  end if;

  if exists (
    select 1
    from public.condominium_unit_transformation_items i
    join public.condominium_units u on u.id=i.unit_id
    where i.transformation_id=t.id
      and i.direction='Fonte'
      and (u.workspace_id<>t.workspace_id or u.condominium_id<>t.condominium_id
           or u.lifecycle_status<>'Attiva')
  ) then
    raise exception 'Una fonte non è più attiva o non appartiene al condominio';
  end if;

  if exists (
    select 1 from public.condominium_installments i
    where i.condominium_id=t.condominium_id
      and i.unit_id in (
        select unit_id from public.condominium_unit_transformation_items
        where transformation_id=t.id and direction='Fonte'
      )
      and greatest(i.amount-i.paid_amount,0)>0.005
  ) then raise exception 'Esistono rate aperte sulle unità fonte'; end if;

  if exists (
    select 1 from public.condominium_expense_allocations a
    where a.condominium_id=t.condominium_id
      and a.unit_id in (
        select unit_id from public.condominium_unit_transformation_items
        where transformation_id=t.id and direction='Fonte'
      )
      and greatest(a.amount-a.paid_amount,0)>0.005
  ) then raise exception 'Esistono ripartizioni aperte sulle unità fonte'; end if;

  for d in select value from jsonb_array_elements(p_destination_units) loop
    seq := seq+1;

    if nullif(trim(d->>'unit_code'),'') is null then
      raise exception 'Codice destinazione obbligatorio';
    end if;

    if exists (
      select 1 from public.condominium_units u
      where u.workspace_id=t.workspace_id
        and u.condominium_id=t.condominium_id
        and u.lifecycle_status='Attiva'
        and lower(trim(u.unit_code))=lower(trim(d->>'unit_code'))
    ) then
      raise exception 'Codice unità già utilizzato: %',d->>'unit_code';
    end if;

    insert into public.condominium_units(
      workspace_id,condominium_id,unit_code,building_code,data,
      lifecycle_status,lifecycle_effective_date
    )
    values(
      t.workspace_id,t.condominium_id,trim(d->>'unit_code'),
      coalesce(d->>'building_code',''),
      coalesce(d->'data','{}'::jsonb),
      'Attiva',t.effective_date
    )
    returning id into new_unit;

    insert into public.condominium_unit_transformation_items(
      transformation_id,unit_id,direction,sequence_no,unit_snapshot
    )
    values(
      t.id,new_unit,'Destinazione',seq,
      jsonb_build_object(
        'id',new_unit,
        'unit_code',trim(d->>'unit_code'),
        'building_code',coalesce(d->>'building_code',''),
        'data',coalesce(d->'data','{}'::jsonb)
      )
    );
  end loop;

  update public.condominium_units
  set lifecycle_status='Storica',
      lifecycle_effective_date=t.effective_date,
      superseded_at=now(),
      updated_at=now()
  where id in (
    select unit_id
    from public.condominium_unit_transformation_items
    where transformation_id=t.id and direction='Fonte'
  );

  update public.condominium_unit_transformations
  set status='Confermata',
      confirmed_by=(select auth.uid()),
      confirmed_at=now(),
      source_unit_count=source_count,
      destination_unit_count=destination_count,
      updated_at=now()
  where id=t.id;

  return t.id;
end;
$$;

revoke execute on function private.confirm_condominium_unit_transformation(uuid,jsonb) from public,anon;
grant execute on function private.confirm_condominium_unit_transformation(uuid,jsonb) to authenticated;

create or replace function public.confirm_condominium_unit_transformation(
  p_transformation_id uuid,
  p_destination_units jsonb
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.confirm_condominium_unit_transformation($1,$2)
$$;

revoke execute on function public.confirm_condominium_unit_transformation(uuid,jsonb) from public,anon;
grant execute on function public.confirm_condominium_unit_transformation(uuid,jsonb) to authenticated;
