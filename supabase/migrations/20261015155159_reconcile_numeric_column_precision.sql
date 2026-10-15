begin;

-- Reconcile QA numeric types with the already-established Production contract.
-- Guard against implicit rounding or overflow before changing any column.
do $preflight$
declare r record; bad_count bigint;
begin
  for r in
    select * from (values
      ('public','condominium_expense_allocations','amount',14,2),
      ('public','condominium_expense_allocations','paid_amount',14,2),
      ('public','condominium_expense_allocations','millesimi',12,4),
      ('public','condominium_fiscal_carryovers','balance',14,2),
      ('public','condominium_fiscal_years','opening_balance',14,2),
      ('public','condominium_funds','target_amount',14,2),
      ('public','condominium_funds','allocated_amount',14,2),
      ('public','condominium_funds','used_amount',14,2),
      ('public','condominium_ledger_entries','amount',14,2),
      ('public','condominium_tax_obligations','amount',14,2)
    ) as v(schema_name,table_name,column_name,precision_digits,scale_digits)
  loop
    execute format(
      'select count(*) from %I.%I where %I is not null and (abs(%I) >= power(10, %s) or %I <> round(%I, %s))',
      r.schema_name,r.table_name,r.column_name,r.column_name,
      r.precision_digits-r.scale_digits,r.column_name,r.column_name,r.scale_digits
    ) into bad_count;
    if bad_count > 0 then
      raise exception 'Precision preflight failed for %.%.%: % rows exceed target precision/scale',
        r.schema_name,r.table_name,r.column_name,bad_count;
    end if;
  end loop;
end
$preflight$;

-- Recreate dependent objects while preserving their behavior and access model.
drop view public.condominium_fund_availability;
drop trigger trg_sync_condominium_fund_usage on public.condominium_ledger_entries;

alter table public.condominium_expense_allocations
  alter column amount type numeric(14,2) using amount::numeric(14,2),
  alter column paid_amount type numeric(14,2) using paid_amount::numeric(14,2),
  alter column millesimi type numeric(12,4) using millesimi::numeric(12,4);
alter table public.condominium_fiscal_carryovers
  alter column balance type numeric(14,2) using balance::numeric(14,2);
alter table public.condominium_fiscal_years
  alter column opening_balance type numeric(14,2) using opening_balance::numeric(14,2);
alter table public.condominium_funds
  alter column target_amount type numeric(14,2) using target_amount::numeric(14,2),
  alter column allocated_amount type numeric(14,2) using allocated_amount::numeric(14,2),
  alter column used_amount type numeric(14,2) using used_amount::numeric(14,2);
alter table public.condominium_ledger_entries
  alter column amount type numeric(14,2) using amount::numeric(14,2);
alter table public.condominium_tax_obligations
  alter column amount type numeric(14,2) using amount::numeric(14,2);

create trigger trg_sync_condominium_fund_usage
after insert or delete or update of fund_id, amount, direction
on public.condominium_ledger_entries
for each row execute function public.sync_condominium_fund_usage();

create view public.condominium_fund_availability
with (security_invoker = true)
as
select id, workspace_id, condominium_id, name, purpose, target_amount,
       allocated_amount, used_amount,
       greatest(round(allocated_amount - used_amount, 2), 0::numeric) as available_amount,
       greatest(round(target_amount - allocated_amount, 2), 0::numeric) as target_remaining_amount,
       active, notes, created_at, updated_at
from public.condominium_funds f;

-- Default privileges on QA may add ancillary ACL bits to a newly created view.
-- Explicitly restore the production access model (no anon/PUBLIC privileges).
revoke all privileges on table public.condominium_fund_availability from anon, public;
grant all privileges on table public.condominium_fund_availability to authenticated, service_role;

commit;
