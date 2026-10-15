-- Read-only contract check for the numeric columns reconciled in QA.
-- Run independently in Production and QA; expected result: zero rows.
with expected(table_name, column_name, expected_type) as (
  values
    ('condominium_expense_allocations','amount','numeric(14,2)'),
    ('condominium_expense_allocations','paid_amount','numeric(14,2)'),
    ('condominium_expense_allocations','millesimi','numeric(12,4)'),
    ('condominium_fiscal_carryovers','balance','numeric(14,2)'),
    ('condominium_fiscal_years','opening_balance','numeric(14,2)'),
    ('condominium_funds','target_amount','numeric(14,2)'),
    ('condominium_funds','allocated_amount','numeric(14,2)'),
    ('condominium_funds','used_amount','numeric(14,2)'),
    ('condominium_ledger_entries','amount','numeric(14,2)'),
    ('condominium_tax_obligations','amount','numeric(14,2)'),
    ('condominium_fund_availability','target_amount','numeric(14,2)'),
    ('condominium_fund_availability','allocated_amount','numeric(14,2)'),
    ('condominium_fund_availability','used_amount','numeric(14,2)')
)
select e.table_name, e.column_name, e.expected_type,
       coalesce(format_type(a.atttypid, a.atttypmod), '<missing>') as actual_type
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name
left join pg_attribute a on a.attrelid = c.oid
                        and a.attname = e.column_name
                        and a.attnum > 0
                        and not a.attisdropped
where a.attname is null
   or format_type(a.atttypid, a.atttypmod) <> e.expected_type
order by e.table_name, e.column_name;
