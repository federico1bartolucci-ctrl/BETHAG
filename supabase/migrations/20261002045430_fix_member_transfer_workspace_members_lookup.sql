do $migration$
declare
  v_def text;
  v_old text := 'where member_id=p_outgoing_member_id and role=''resident'';';
  v_new text := 'where workspace_id=v_workspace and condominium_id=v_condominium and legacy_id=(select m.legacy_id from public.condominium_members m where m.id=p_outgoing_member_id) and role=''resident'';';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='confirm_condominium_member_transfer'
    and pg_get_function_identity_arguments(p.oid)='p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb';
  if v_def is null then raise exception 'Transfer function signature not found'; end if;
  if length(v_def)-length(replace(v_def,v_old,'')) <> length(v_old) then
    raise exception 'Expected one invalid workspace_members predicate; migration stopped';
  end if;
  v_def := replace(v_def,v_old,v_new);
  execute v_def;
end
$migration$;
