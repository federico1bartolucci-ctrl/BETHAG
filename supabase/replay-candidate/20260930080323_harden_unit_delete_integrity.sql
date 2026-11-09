create or replace function public.prevent_unsafe_condominium_unit_delete()
returns trigger language plpgsql set search_path=public as $$
declare v_members integer; v_children integer; v_alloc integer; v_inst integer;
begin
  select count(*) into v_members from public.condominium_members where condominium_id=old.condominium_id and unit_id=old.id;
  if v_members>0 then raise exception 'L''unità è associata a uno o più condòmini e non può essere eliminata. Rimuovi prima le associazioni.'; end if;
  select count(*) into v_children from public.condominium_units where condominium_id=old.condominium_id and id<>old.id and nullif(trim(coalesce(data->>'incorporatedInUnitId','')), '')=old.id::text;
  if v_children>0 then raise exception 'L''unità è collegata come unità principale di una o più pertinenze e non può essere eliminata. Rimuovi prima i collegamenti.'; end if;
  select count(*) into v_alloc from public.condominium_expense_allocations where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  select count(*) into v_inst from public.condominium_installments where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  if v_alloc>0 or v_inst>0 then raise exception 'L''unità ha movimenti contabili o rate collegate e non può essere eliminata.'; end if;
  return old;
end; $$;
drop trigger if exists trg_prevent_unsafe_condominium_unit_delete on public.condominium_units;
create trigger trg_prevent_unsafe_condominium_unit_delete before delete on public.condominium_units for each row execute function public.prevent_unsafe_condominium_unit_delete();
revoke execute on function public.prevent_unsafe_condominium_unit_delete() from public, anon, authenticated;