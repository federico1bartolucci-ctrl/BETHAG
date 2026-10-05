-- Reconcile remaining accounting constraints, required btree_gist support and RLS parity.
create extension if not exists btree_gist;

alter table public.communications
  add constraint communications_email_status_check check (
    email_status is null or email_status = any(array['prepared','no_recipients','In elaborazione','Inviata','Parzialmente inviata','Errore','Consegnata']::text[])
  );

alter table public.condominium_budgets
  add constraint condominium_budgets_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint condominium_budgets_fiscal_year_id_fkey foreign key (fiscal_year_id) references public.condominium_fiscal_years(id) on delete set null,
  add constraint condominium_budgets_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_fiscal_carryovers
  add constraint condominium_fiscal_carryovers_kind_check check (kind=any(array['Debito','Credito']::text[])),
  add constraint condominium_fiscal_carryovers_status_check check (status=any(array['Da riportare','Parzialmente compensato','Compensato']::text[])),
  add constraint fiscal_carryovers_balance_kind check ((kind='Debito' and balance>0) or (kind='Credito' and balance<0)),
  add constraint fiscal_carryovers_balance_nonzero check (abs(balance)>=0.01),
  add constraint fiscal_carryovers_condominium_fk foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint fiscal_carryovers_member_fk foreign key (member_id) references public.condominium_members(id) on delete set null,
  add constraint fiscal_carryovers_source_year_fk foreign key (source_fiscal_year_id) references public.condominium_fiscal_years(id) on delete restrict,
  add constraint fiscal_carryovers_target_year_fk foreign key (target_fiscal_year_id) references public.condominium_fiscal_years(id) on delete restrict,
  add constraint fiscal_carryovers_unit_fk foreign key (unit_id) references public.condominium_units(id) on delete restrict,
  add constraint fiscal_carryovers_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_fiscal_years
  add constraint condominium_fiscal_years_check check (end_date>=start_date),
  add constraint condominium_fiscal_years_no_overlap exclude using gist (workspace_id with =, condominium_id with =, daterange(start_date,end_date,'[]') with &&),
  add constraint condominium_fiscal_years_opening_balance_finite check (opening_balance=opening_balance),
  add constraint condominium_fiscal_years_valid_dates check (start_date<=end_date),
  add constraint condominium_fiscal_years_valid_range check (start_date<=end_date),
  add constraint condominium_fiscal_years_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_funds
  add constraint condominium_funds_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint condominium_funds_nonnegative_amounts check (target_amount>=0 and allocated_amount>=0 and used_amount>=0),
  add constraint condominium_funds_used_lte_allocated check (used_amount<=allocated_amount),
  add constraint condominium_funds_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_installments
  add constraint condominium_installments_amounts_valid check (amount>=0 and paid_amount>=0 and paid_amount<=amount),
  add constraint condominium_installments_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint condominium_installments_fiscal_year_id_fkey foreign key (fiscal_year_id) references public.condominium_fiscal_years(id) on delete set null,
  add constraint condominium_installments_ledger_entry_id_fkey foreign key (ledger_entry_id) references public.condominium_ledger_entries(id) on delete restrict,
  add constraint condominium_installments_member_id_fkey foreign key (member_id) references public.condominium_members(id) on delete set null,
  add constraint condominium_installments_status_amount_consistent check ((status='Da pagare' and paid_amount=0) or (status='Parzialmente pagato' and paid_amount>0 and paid_amount<amount) or (status='Pagato' and abs(paid_amount-amount)<=0.005) or (status='Scaduto' and paid_amount>=0 and paid_amount<amount) or (status='Accorpata' and paid_amount>=0 and paid_amount<=amount)),
  add constraint condominium_installments_unit_id_fkey foreign key (unit_id) references public.condominium_units(id) on delete set null,
  add constraint condominium_installments_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_ledger_entries
  add constraint condominium_ledger_entries_amount_check check (amount>=0),
  add constraint condominium_ledger_entries_assembly_fk foreign key (assembly_id) references public.assemblies(id) on delete set null,
  add constraint condominium_ledger_entries_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint condominium_ledger_entries_direction_check check (direction=any(array['Entrata','Uscita']::text[])),
  add constraint condominium_ledger_entries_document_id_fkey foreign key (document_id) references public.documents(id) on delete set null,
  add constraint condominium_ledger_entries_fiscal_year_id_fkey foreign key (fiscal_year_id) references public.condominium_fiscal_years(id) on delete set null,
  add constraint condominium_ledger_entries_fund_id_fkey foreign key (fund_id) references public.condominium_funds(id) on delete set null,
  add constraint condominium_ledger_entries_member_id_fkey foreign key (member_id) references public.condominium_members(id) on delete set null,
  add constraint condominium_ledger_entries_payment_status_check check (payment_status=any(array['Registrato','Da pagare','Parzialmente pagato','Pagato','Scaduto']::text[])),
  add constraint condominium_ledger_entries_supplier_id_fkey foreign key (supplier_id) references public.suppliers(id) on delete set null,
  add constraint condominium_ledger_entries_unit_id_fkey foreign key (unit_id) references public.condominium_units(id) on delete set null,
  add constraint condominium_ledger_entries_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_payment_movements
  add constraint condominium_payment_movements_amount_valid check (amount>0),
  add constraint condominium_payment_movements_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint condominium_payment_movements_installment_id_fkey foreign key (installment_id) references public.condominium_installments(id) on delete cascade,
  add constraint condominium_payment_movements_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_expense_allocations
  add constraint condominium_expense_allocations_allocation_table_id_fkey foreign key (allocation_table_id) references public.condominium_millesimal_tables(id) on delete set null,
  add constraint condominium_expense_allocations_amounts_valid check (amount>=0 and paid_amount>=0 and paid_amount<=amount),
  add constraint condominium_expense_allocations_condominium_id_fkey foreign key (condominium_id) references public.condominiums(id) on delete cascade,
  add constraint condominium_expense_allocations_ledger_entry_id_fkey foreign key (ledger_entry_id) references public.condominium_ledger_entries(id) on delete cascade,
  add constraint condominium_expense_allocations_member_id_fkey foreign key (member_id) references public.condominium_members(id) on delete set null,
  add constraint condominium_expense_allocations_status_amount_consistent check ((status='Da pagare' and paid_amount=0) or (status='Parzialmente pagato' and paid_amount>0 and paid_amount<amount) or (status='Pagato' and abs(paid_amount-amount)<=0.005) or (status='Scaduto' and paid_amount>=0 and paid_amount<amount)),
  add constraint condominium_expense_allocations_unit_id_fkey foreign key (unit_id) references public.condominium_units(id) on delete set null,
  add constraint condominium_expense_allocations_workspace_id_fkey foreign key (workspace_id) references public.workspaces(id) on delete cascade;

alter table public.condominium_requests
  add constraint condominium_requests_status_check check (status=any(array['Nuova','In lavorazione','In attesa','Risolta','Chiusa','Annullata']::text[])),
  add constraint condominium_requests_title_not_blank_chk check (length(btrim(title))>0);

alter table public.condominium_work_progress drop constraint if exists condominium_work_progress_financial_consistency_chk;
alter table public.condominium_work_progress add constraint condominium_work_progress_financial_consistency_chk check ((progress_no>0 and amount>=0 and paid_amount>=0 and paid_amount<=(amount+0.005) and (percentage>=0 and percentage<=100)));

alter table public.condominium_fund_availability disable row level security;
drop policy if exists "condominium_fund_availability_manager_all" on public.condominium_fund_availability;
drop policy if exists "managers manage fiscal carryovers" on public.condominium_fiscal_carryovers;