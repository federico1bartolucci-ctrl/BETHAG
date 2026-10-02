-- Serialize ownership checks so concurrent transfer confirmations for one unit cannot both pass.
-- This migration updates the existing private RPC definition without changing its authorization or accounting logic.
do $migration$
declare
  v_def text;
  v_old text := E'from public.condominium_units u\n  where u.id=p_unit_id;';
  v_new text := E'from public.condominium_units u\n  where u.id=p_unit_id\n  for update;';
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.proname='confirm_condominium_member_transfer'
    and pg_get_function_identity_arguments(p.oid) =
      'p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb';

  if v_def is null then
    raise exception 'Transfer confirmation function signature not found';
  end if;

  if position(v_new in v_def) > 0 then
    raise notice 'Unit row lock already present; no change required';
    return;
  end if;

  if length(v_def) - length(replace(v_def, v_old, '')) <> length(v_old) then
    raise exception 'Expected exactly one unit lookup without row lock; migration stopped';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$migration$;
