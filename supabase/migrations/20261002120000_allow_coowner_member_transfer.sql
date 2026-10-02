-- Allow transfer of one co-owner's share without rejecting other current co-owners.
-- Preserve the existing production RPC authorization, row lock, accounting snapshot,
-- outgoing lifecycle and portal/workspace deactivation logic.
do $migration$
declare
  v_definition text;
  v_old_owner_guard text := $old$
  select count(*) into v_existing_count
  from public.condominium_members m
  where m.condominium_id=v_condominium
    and m.unit_id=p_unit_id
    and m.active
    and m.id<>p_outgoing_member_id
    and coalesce(m.data->>'current_owner','true')='true'
    and coalesce(m.data->>'position_status','Attivo') <> 'In chiusura'
    and trim(coalesce(m.data->>'role',''))='Proprietario';

  if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;
$old$;
  v_new_owner_sync text := $new$
  select coalesce(m.data,'{}'::jsonb),m.legacy_id
    into v_out_data,v_outgoing_legacy_id
  from public.condominium_members m
  where m.id=p_outgoing_member_id
  for update;
$new$;
  v_after_incoming text := $after$
  returning id into v_incoming_id;

  select m.legacy_id into v_incoming_legacy_id
  from public.condominium_members m
  where m.id=v_incoming_id;

  if v_outgoing_legacy_id is null or v_incoming_legacy_id is null then
    raise exception 'MEMBER_LEGACY_ID_MISSING';
  end if;

  -- Keep legacy ownerMemberIds synchronized while retaining all other co-owners.
  update public.condominium_units u
  set data=jsonb_set(
    coalesce(u.data,'{}'::jsonb),
    '{ownerMemberIds}',
    (
      select coalesce(jsonb_agg(e.value order by e.ordinality),'[]'::jsonb)
      from jsonb_array_elements(
        case when jsonb_typeof(u.data->'ownerMemberIds')='array'
          then u.data->'ownerMemberIds' else '[]'::jsonb end
      ) with ordinality as e(value,ordinality)
      where e.value <> to_jsonb(v_outgoing_legacy_id)
        and e.value <> to_jsonb(v_incoming_legacy_id)
    ) || jsonb_build_array(v_incoming_legacy_id),
    true
  ),
  updated_at=now()
  where u.id=p_unit_id;
$after$;
begin
  select pg_get_functiondef(
    'private.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)'::regprocedure
  ) into v_definition;

  if position('ACTIVE_INCOMING_OWNER_ALREADY_PRESENT' in v_definition)>0 then
    if length(v_definition)-length(replace(v_definition,v_old_owner_guard,'')) <> length(v_old_owner_guard) then
      raise exception 'Expected exactly one co-owner rejection guard; migration stopped';
    end if;
    v_definition := replace(v_definition,v_old_owner_guard,'');
  end if;

  if position('unit_owner_references_updated' in v_definition)>0 then
    raise notice 'Legacy owner references already synchronized';
  else
    if length(v_definition)-length(replace(v_definition,'  v_out_data jsonb;','')) <> length('  v_out_data jsonb;') then
      raise exception 'Expected outgoing data declaration not found uniquely';
    end if;
    v_definition := replace(v_definition,'  v_out_data jsonb;','  v_out_data jsonb;\n  v_outgoing_legacy_id bigint;\n  v_incoming_legacy_id bigint;');

    if length(v_definition)-length(replace(v_definition,
      '  select coalesce(m.data,''{}''::jsonb) into v_out_data\n  from public.condominium_members m where m.id=p_outgoing_member_id for update;',
      v_new_owner_sync)) <> length('  select coalesce(m.data,''{}''::jsonb) into v_out_data\n  from public.condominium_members m where m.id=p_outgoing_member_id for update;') then
      raise exception 'Expected outgoing member lock lookup not found uniquely';
    end if;
    v_definition := replace(v_definition,
      '  select coalesce(m.data,''{}''::jsonb) into v_out_data\n  from public.condominium_members m where m.id=p_outgoing_member_id for update;',
      v_new_owner_sync);

    if length(v_definition)-length(replace(v_definition,'  returning id into v_incoming_id;',$after)) <> length('  returning id into v_incoming_id;') then
      raise exception 'Expected incoming member insertion point not found uniquely';
    end if;
    v_definition := replace(v_definition,'  returning id into v_incoming_id;',$after);
  end if;

  execute v_definition;
end
$migration$;
