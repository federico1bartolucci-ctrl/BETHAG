
begin;

create schema if not exists private;

-- Move externally callable SECURITY DEFINER implementations out of the exposed API schema.
alter function public.admin_approve_portal_registration(uuid, uuid) set schema private;
alter function public.archive_condominium(uuid, uuid, text) set schema private;
alter function public.close_condominium_fiscal_year(uuid, uuid) set schema private;
alter function public.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) set schema private;
alter function public.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) set schema private;
alter function public.complete_portal_registration(text, text, text) set schema private;
alter function public.confirm_condominium_creation_intake(uuid, uuid) set schema private;
alter function public.delete_condominium(uuid, bigint, text) set schema private;
alter function public.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) set schema private;
alter function public.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) set schema private;
alter function public.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) set schema private;
alter function public.list_archived_condominiums(uuid) set schema private;
alter function public.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) set schema private;
alter function public.restore_condominium(uuid, uuid) set schema private;
alter function public.save_condominium(uuid, bigint, text, text, text, text, text, jsonb) set schema private;
alter function public.set_personal_security_code(text, boolean) set schema private;
alter function public.verify_personal_security_code(text) set schema private;

-- The first-admin entry point was already a thin wrapper around private.claim_first_workspace_admin;
-- make the exposed wrapper INVOKER instead of DEFiner.
drop function public.claim_first_workspace_admin(uuid);
create function public.claim_first_workspace_admin(p_workspace_id uuid default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.claim_first_workspace_admin(p_workspace_id);
$$;

-- Revoke direct access to moved implementations; the API only exposes the wrappers below.
revoke all on all functions in schema private from public;
revoke all on all functions in schema private from anon;
grant usage on schema private to authenticated;

-- Restore only the execution privileges needed by the public API wrappers on the private implementations.
grant execute on function private.admin_approve_portal_registration(uuid, uuid) to authenticated;
grant execute on function private.archive_condominium(uuid, uuid, text) to authenticated;
grant execute on function private.close_condominium_fiscal_year(uuid, uuid) to authenticated;
grant execute on function private.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) to authenticated;
grant execute on function private.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) to authenticated;
grant execute on function private.complete_portal_registration(text, text, text) to authenticated;
grant execute on function private.confirm_condominium_creation_intake(uuid, uuid) to authenticated;
grant execute on function private.delete_condominium(uuid, bigint, text) to authenticated;
grant execute on function private.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function private.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) to authenticated;
grant execute on function private.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) to authenticated;
grant execute on function private.list_archived_condominiums(uuid) to authenticated;
grant execute on function private.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) to authenticated;
grant execute on function private.restore_condominium(uuid, uuid) to authenticated;
grant execute on function private.save_condominium(uuid, bigint, text, text, text, text, text, jsonb) to authenticated;
grant execute on function private.set_personal_security_code(text, boolean) to authenticated;
grant execute on function private.verify_personal_security_code(text) to authenticated;

-- Public INVOKER wrappers: authentication/authorization remains enforced by the private implementation.
create function public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$ begin return private.admin_approve_portal_registration($1,$2); end $$;

create function public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text default null)
returns void language plpgsql security invoker set search_path=''
as $$ begin perform private.archive_condominium($1,$2,$3); end $$;

create function public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
returns uuid language plpgsql security invoker set search_path=''
as $$ begin return private.close_condominium_fiscal_year($1,$2); end $$;

create function public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
returns integer language plpgsql security invoker set search_path=''
as $$ begin return private.close_fiscal_year_and_generate_carryovers($1,$2,$3); end $$;

create function public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid default null, p_notes text default '')
returns numeric language plpgsql security invoker set search_path=''
as $$ begin return private.compensate_fiscal_carryover($1,$2,$3,$4,$5,$6); end $$;

create function public.complete_portal_registration(p_full_name text, p_fiscal_code text default null, p_condominium_name text default null)
returns jsonb language plpgsql security invoker set search_path=''
as $$ begin return private.complete_portal_registration($1,$2,$3); end $$;

create function public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$ begin return private.confirm_condominium_creation_intake($1,$2); end $$;

create function public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text)
returns void language plpgsql security invoker set search_path=''
as $$ begin perform private.delete_condominium($1,$2,$3); end $$;

create function public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
returns integer language plpgsql security invoker set search_path=''
as $$ begin return private.generate_fiscal_year_carryovers($1,$2,$3,$4); end $$;

create function public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid)
returns integer language plpgsql security invoker set search_path=''
as $$ begin return private.generate_installments_from_allocations($1,$2,$3,$4,$5,$6); end $$;

create function public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[] default null, p_unify_by_member boolean default false)
returns integer language plpgsql security invoker set search_path=''
as $$ begin return private.generate_installments_from_allocations_schedule($1,$2,$3,$4,$5,$6,$7,$8); end $$;

create function public.list_archived_condominiums(p_workspace_id uuid)
returns setof public.condominiums language plpgsql security invoker set search_path=''
as $$ begin return query select * from private.list_archived_condominiums($1); end $$;

create function public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text default 'Bonifico', p_reference text default '', p_notes text default '')
returns numeric language plpgsql security invoker set search_path=''
as $$ begin return private.register_condominium_installment_payment($1,$2,$3,$4,$5,$6,$7,$8); end $$;

create function public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
returns void language plpgsql security invoker set search_path=''
as $$ begin perform private.restore_condominium($1,$2); end $$;

create function public.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb)
returns uuid language plpgsql security invoker set search_path=''
as $$ begin return private.save_condominium($1,$2,$3,$4,$5,$6,$7,$8); end $$;

create function public.set_personal_security_code(p_code text, p_enabled boolean)
returns void language plpgsql security invoker set search_path=''
as $$ begin perform private.set_personal_security_code($1,$2); end $$;

create function public.verify_personal_security_code(p_code text)
returns boolean language plpgsql security invoker set search_path=''
as $$ begin return private.verify_personal_security_code($1); end $$;

-- Explicit Data API access to the public wrappers only.
grant execute on function public.admin_approve_portal_registration(uuid, uuid) to authenticated;
grant execute on function public.archive_condominium(uuid, uuid, text) to authenticated;
grant execute on function public.claim_first_workspace_admin(uuid) to authenticated;
grant execute on function public.close_condominium_fiscal_year(uuid, uuid) to authenticated;
grant execute on function public.close_fiscal_year_and_generate_carryovers(uuid, uuid, uuid) to authenticated;
grant execute on function public.compensate_fiscal_carryover(uuid, uuid, uuid, numeric, uuid, text) to authenticated;
grant execute on function public.complete_portal_registration(text, text, text) to authenticated;
grant execute on function public.confirm_condominium_creation_intake(uuid, uuid) to authenticated;
grant execute on function public.delete_condominium(uuid, bigint, text) to authenticated;
grant execute on function public.generate_fiscal_year_carryovers(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.generate_installments_from_allocations(uuid, uuid, uuid, text, date, uuid) to authenticated;
grant execute on function public.generate_installments_from_allocations_schedule(uuid, uuid, uuid, text, date[], uuid, numeric[], boolean) to authenticated;
grant execute on function public.list_archived_condominiums(uuid) to authenticated;
grant execute on function public.register_condominium_installment_payment(uuid, uuid, uuid, date, numeric, text, text, text) to authenticated;
grant execute on function public.restore_condominium(uuid, uuid) to authenticated;
grant execute on function public.save_condominium(uuid, bigint, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.set_personal_security_code(text, boolean) to authenticated;
grant execute on function public.verify_personal_security_code(text) to authenticated;

commit;
