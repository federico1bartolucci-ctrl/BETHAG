begin;

-- Restore the small set of launch-critical objects found in Production but
-- absent from QA. This migration is idempotent and does not rewrite user data.

create or replace function private.get_my_workspace_access()
returns table(workspace_id uuid, role text, permissions jsonb)
language sql
stable
security definer
set search_path = ''
as $function$
  select wm.workspace_id, wm.role, coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$function$;

revoke all on function private.get_my_workspace_access() from public, anon;
grant execute on function private.get_my_workspace_access() to authenticated;

create or replace function public.get_my_workspace_access()
returns table(workspace_id uuid, role text, permissions jsonb)
language sql
stable
set search_path = ''
as $function$
  select wm.workspace_id, wm.role, coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$function$;

revoke all on function public.get_my_workspace_access() from public, anon;
grant execute on function public.get_my_workspace_access() to authenticated, service_role;

create or replace function private.check_condominium_member_transfer_closure(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_workspace uuid;
  v_outgoing_ids uuid[];
  v_status text;
  v_scope text;
  v_open_installments numeric := 0;
  v_open_allocations numeric := 0;
  v_open_member_carryovers numeric := 0;
  v_open_unit_carryovers numeric := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select t.workspace_id, t.status, coalesce(t.data->>'transfer_scope','whole_property'),
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
              else array[t.outgoing_member_id] end
    into v_workspace, v_status, v_scope, v_outgoing_ids
  from public.condominium_member_transfers t
  where t.id = p_transfer_id;

  if v_workspace is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
  if not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_status <> 'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;

  if v_scope = 'ownership_share' then
    return jsonb_build_object('transfer_id',p_transfer_id,'status',v_status,'transfer_scope',v_scope,
      'open_installments',0,'open_allocations',0,'open_member_carryovers',0,'open_unit_carryovers',0,'open_total',0);
  end if;

  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments
  from public.condominium_installments i
  where i.member_id = any(v_outgoing_ids) and coalesce(i.amount-i.paid_amount,0) > 0.005;

  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations
  from public.condominium_expense_allocations a
  where a.member_id = any(v_outgoing_ids) and coalesce(a.amount-a.paid_amount,0) > 0.005;

  select coalesce(sum(abs(c.balance)),0) into v_open_member_carryovers
  from public.condominium_fiscal_carryovers c
  where c.member_id = any(v_outgoing_ids) and abs(coalesce(c.balance,0)) > 0.005;

  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers
  from public.condominium_fiscal_carryovers c
  join public.condominium_member_transfers t on t.id = p_transfer_id
  where c.workspace_id = t.workspace_id and c.condominium_id = t.condominium_id
    and c.unit_id = t.unit_id and c.member_id is null and abs(coalesce(c.balance,0)) > 0.005;

  return jsonb_build_object('transfer_id',p_transfer_id,'status',v_status,'transfer_scope',v_scope,
    'outgoing_member_ids',to_jsonb(v_outgoing_ids),
    'open_installments',round(v_open_installments,2),'open_allocations',round(v_open_allocations,2),
    'open_member_carryovers',round(v_open_member_carryovers,2),'open_unit_carryovers',round(v_open_unit_carryovers,2),
    'open_total',round(v_open_installments+v_open_allocations+v_open_member_carryovers+v_open_unit_carryovers,2));
end;
$function$;

revoke all on function private.check_condominium_member_transfer_closure(uuid) from public, anon;
grant execute on function private.check_condominium_member_transfer_closure(uuid) to authenticated, service_role;

create or replace function public.check_condominium_member_transfer_closure(p_transfer_id uuid)
returns jsonb
language plpgsql
set search_path = 'public'
as $function$
begin
  return private.check_condominium_member_transfer_closure(p_transfer_id);
end;
$function$;

revoke all on function public.check_condominium_member_transfer_closure(uuid) from public, anon;
grant execute on function public.check_condominium_member_transfer_closure(uuid) to authenticated, service_role;

create or replace function public.normalize_zero_ownership_owner()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_share numeric;
begin
  v_share := nullif(trim(coalesce(new.data->>'ownership_share','')), '')::numeric;
  if v_share is not null and v_share <= 0 then
    new.data := coalesce(new.data,'{}'::jsonb)
      || jsonb_build_object('ownership_share',0,'current_owner',false,'position_status','In chiusura');
  end if;
  return new;
end;
$function$;

revoke all on function public.normalize_zero_ownership_owner() from public, anon, authenticated;
drop trigger if exists trg_normalize_zero_ownership_owner on public.condominium_members;
create trigger trg_normalize_zero_ownership_owner
before insert or update of data on public.condominium_members
for each row execute function public.normalize_zero_ownership_owner();

create or replace function public.preserve_closing_condominium_member_history()
returns trigger
language plpgsql
set search_path = 'pg_catalog', 'public'
as $function$
begin
  if lower(trim(coalesce(new.data->>'position_status', ''))) = 'in chiusura' then
    new.active := true;
    new.data := coalesce(new.data, '{}'::jsonb) || jsonb_build_object('current_owner', false);
  end if;
  return new;
end;
$function$;

revoke all on function public.preserve_closing_condominium_member_history() from public, anon, authenticated;
drop trigger if exists trg_preserve_closing_condominium_member_history on public.condominium_members;
create trigger trg_preserve_closing_condominium_member_history
before insert or update of active, data on public.condominium_members
for each row execute function public.preserve_closing_condominium_member_history();

drop policy if exists "managers manage fiscal carryovers" on public.condominium_fiscal_carryovers;
create policy "managers manage fiscal carryovers"
on public.condominium_fiscal_carryovers
as permissive for all to authenticated
using (private.can_manage_workspace_module(workspace_id, 'contabilita'::text))
with check (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

commit;
