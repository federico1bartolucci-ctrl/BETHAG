-- Restore operational tables that exist in production but were missing from QA/replayed migration state.

create table if not exists public.condominium_legal_cases (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 title text not null, counterpart text not null default '', status text not null default 'Aperto',
 opened_date date, closed_date date, notes text not null default '', data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint condominium_legal_cases_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_legal_cases_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_legal_cases_dates_valid check (closed_date is null or opened_date is null or closed_date >= opened_date)
);
create index if not exists condominium_legal_cases_condominium_idx on public.condominium_legal_cases(condominium_id);
create index if not exists condominium_legal_cases_workspace_idx on public.condominium_legal_cases(workspace_id);
alter table public.condominium_legal_cases enable row level security;
drop policy if exists "Managers can delete condominium_legal_cases" on public.condominium_legal_cases;
drop policy if exists "Managers can insert condominium_legal_cases" on public.condominium_legal_cases;
drop policy if exists "Managers can read condominium_legal_cases" on public.condominium_legal_cases;
drop policy if exists "Managers can update condominium_legal_cases" on public.condominium_legal_cases;
create policy "Managers can delete condominium_legal_cases" on public.condominium_legal_cases for delete to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita'));
create policy "Managers can insert condominium_legal_cases" on public.condominium_legal_cases for insert to authenticated with check(private.can_manage_workspace_module(workspace_id,'contabilita'));
create policy "Managers can read condominium_legal_cases" on public.condominium_legal_cases for select to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita'));
create policy "Managers can update condominium_legal_cases" on public.condominium_legal_cases for update to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita')) with check(private.can_manage_workspace_module(workspace_id,'contabilita'));

create table if not exists public.condominium_payment_reversal_audit (
 id uuid primary key default gen_random_uuid(), original_payment_id uuid not null, workspace_id uuid not null,
 condominium_id uuid not null, installment_id uuid not null, amount numeric not null, payment_date date not null,
 method text not null default 'Bonifico', reference text not null default '', notes text not null default '',
 reversal_reason text not null, reversed_at timestamptz not null default now(), reversed_by uuid not null,
 constraint condominium_payment_reversal_audit_amount_check check(amount > 0),
 constraint condominium_payment_reversal_audit_original_payment_id_key unique(original_payment_id)
);
create table if not exists public.condominium_tax_obligations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 title text not null, category text not null default 'Fiscale', due_date date not null, amount numeric,
 status text not null default 'Da fare', notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint condominium_tax_obligations_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_tax_obligations_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_tax_obligations_nonnegative_amount check(amount is null or amount >= 0)
);
create index if not exists condominium_tax_obligations_condominium_idx on public.condominium_tax_obligations(condominium_id);
create index if not exists condominium_tax_obligations_workspace_idx on public.condominium_tax_obligations(workspace_id);
alter table public.condominium_tax_obligations enable row level security;
drop policy if exists "Managers can delete condominium_tax_obligations" on public.condominium_tax_obligations for delete to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita'));
drop policy if exists "Managers can insert condominium_tax_obligations" on public.condominium_tax_obligations for insert to authenticated with check(private.can_manage_workspace_module(workspace_id,'contabilita'));
drop policy if exists "Managers can read condominium_tax_obligations" on public.condominium_tax_obligations for select to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita'));
drop policy if exists "Managers can update condominium_tax_obligations" on public.condominium_tax_obligations;
create policy "Managers can update condominium_tax_obligations" on public.condominium_tax_obligations for update to authenticated using(private.can_manage_workspace_module(workspace_id,'contabilita')) with check(private.can_manage_workspace_module(workspace_id,'contabilita'));

create table if not exists public.condominium_suppliers (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 business_name text not null, contact_name text not null default '', fiscal_code text not null default '', vat_number text not null default '',
 email text not null default '', phone text not null default '', category text not null default '', contract_start date, contract_end date,
 notes text not null default '', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint condominium_suppliers_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_suppliers_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade
);
create index if not exists condominium_suppliers_condominium_fk_idx on public.condominium_suppliers(condominium_id);
create index if not exists condominium_suppliers_workspace_condo_idx on public.condominium_suppliers(workspace_id,condominium_id,category);
alter table public.condominium_suppliers enable row level security;
drop policy if exists condominium_suppliers_manager_all on public.condominium_suppliers;
create policy condominium_suppliers_manager_all on public.condominium_suppliers for all to authenticated using(private.can_manage_workspace_module(workspace_id,'fornitori')) with check(private.can_manage_workspace_module(workspace_id,'fornitori'));

create table if not exists public.condominium_register_items (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 item_type text not null default 'Sicurezza', category text not null default 'Generale', title text not null,
 location text not null default '', responsible text not null default '', expiry_date date, status text not null default 'Attivo',
 document_id uuid, notes text not null default '', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 supplier_id uuid, estimated_amount numeric not null default 0,
 constraint condominium_register_items_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_register_items_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_register_items_supplier_id_fkey foreign key(supplier_id) references public.condominium_suppliers(id) on delete set null
);
create index if not exists condominium_register_items_condominium_fk_idx on public.condominium_register_items(condominium_id);
create index if not exists condominium_register_items_supplier_idx on public.condominium_register_items(supplier_id);
create index if not exists condominium_register_items_workspace_condo_idx on public.condominium_register_items(workspace_id,condominium_id,item_type,expiry_date);
alter table public.condominium_register_items enable row level security;
drop policy if exists condominium_register_items_manager_all on public.condominium_register_items;
create policy condominium_register_items_manager_all on public.condominium_register_items for all to authenticated using(private.is_workspace_admin(workspace_id)) with check(private.is_workspace_admin(workspace_id));

create table if not exists public.condominium_unit_transformations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null,
 transformation_type text not null, status text not null default 'Bozza', effective_date date not null,
 cadastral_protocol text not null default '', cadastral_protocol_date date,
 accounting_resolution_status text not null default 'Da verificare', millesimal_review_status text not null default 'Da verificare',
 notes text not null default '', data jsonb not null default '{}'::jsonb, created_by uuid, confirmed_by uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), confirmed_at timestamptz,
 millesimal_snapshot jsonb not null default '{}'::jsonb, accounting_snapshot jsonb not null default '{}'::jsonb,
 source_unit_count integer not null default 0, destination_unit_count integer not null default 0,
 constraint condominium_unit_transformations_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete restrict,
 constraint condominium_unit_transformations_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete restrict,
 constraint condominium_unit_transformations_created_by_fkey foreign key(created_by) references auth.users(id),
 constraint condominium_unit_transformations_confirmed_by_fkey foreign key(confirmed_by) references auth.users(id),
 constraint condominium_unit_transformations_status_check check(status=any(array['Bozza','Confermata','Annullata'])),
 constraint condominium_unit_transformations_transformation_type_check check(transformation_type=any(array['Fusione','Frazionamento'])),
 constraint condominium_unit_transformations_accounting_resolution_status_check check(accounting_resolution_status=any(array['Da verificare','Non necessaria','Risolta'])),
 constraint condominium_unit_transformations_millesimal_review_status_check check(millesimal_review_status=any(array['Da verificare','Confermata invariata','Nuove tabelle','Da aggiornare'])),
 constraint condominium_unit_transformations_confirmed_integrity_chk check(status<>'Confermata' or (confirmed_by is not null and confirmed_at is not null and source_unit_count>0 and destination_unit_count>0 and ((transformation_type='Fusione' and source_unit_count>=2 and destination_unit_count=1) or (transformation_type='Frazionamento' and source_unit_count=1 and destination_unit_count>=2)))),
 constraint condominium_unit_transformations_confirmed_reviews_chk check(status<>'Confermata' or (accounting_resolution_status=any(array['Non necessaria','Risolta']) and millesimal_review_status=any(array['Confermata invariata','Nuove tabelle'])))
);
create index if not exists idx_unit_transformations_condo_date on public.condominium_unit_transformations(condominium_id,effective_date desc);
create index if not exists idx_unit_transformations_confirmed_by on public.condominium_unit_transformations(confirmed_by);
create index if not exists idx_unit_transformations_created_by on public.condominium_unit_transformations(created_by);
create index if not exists idx_unit_transformations_status on public.condominium_unit_transformations(status);
create index if not exists idx_unit_transformations_workspace on public.condominium_unit_transformations(workspace_id);
alter table public.condominium_unit_transformations enable row level security;
drop policy if exists "unit transformations manager access" on public.condominium_unit_transformations for all to authenticated using(private.can_manage_workspace_module(workspace_id,'condomini')) with check(private.can_manage_workspace_module(workspace_id,'condomini'));

create table if not exists public.condominium_unit_transformation_items (
 id uuid primary key default gen_random_uuid(), transformation_id uuid not null, unit_id uuid not null,
 direction text not null, sequence_no integer not null default 1, unit_snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 constraint condominium_unit_transformation_items_transformation_id_fkey foreign key(transformation_id) references public.condominium_unit_transformations(id) on delete cascade,
 constraint condominium_unit_transformation_items_unit_id_fkey foreign key(unit_id) references public.condominium_units(id) on delete restrict,
 constraint condominium_unit_transformation_items_direction_check check(direction=any(array['Fonte','Destinazione'])),
 constraint condominium_unit_transformation_items_sequence_no_check check(sequence_no>0),
 constraint condominium_unit_transformati_transformation_id_direction_s_key unique(transformation_id,direction,sequence_no),
 constraint condominium_unit_transformati_transformation_id_unit_id_dir_key unique(transformation_id,unit_id,direction)
);
create index if not exists idx_unit_transform_items_transformation on public.condominium_unit_transformation_items(transformation_id);
create index if not exists idx_unit_transform_items_unit on public.condominium_unit_transformation_items(unit_id);
alter table public.condominium_unit_transformation_items enable row level security;
drop policy if exists "unit transformation items manager access" on public.condominium_unit_transformation_items for all to authenticated using(exists(select 1 from public.condominium_unit_transformations t where t.id=condominium_unit_transformation_items.transformation_id and private.can_manage_workspace_module(t.workspace_id,'condomini'))) with check(exists(select 1 from public.condominium_unit_transformations t where t.id=condominium_unit_transformation_items.transformation_id and private.can_manage_workspace_module(t.workspace_id,'condomini')));

create table if not exists public.condominium_works (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null, title text not null,
 category text not null default 'Manutenzione', description text not null default '', status text not null default 'Da programmare', priority text not null default 'Media',
 supplier_id uuid, register_item_id uuid, start_date date, expected_end_date date, actual_end_date date,
 estimated_amount numeric not null default 0, approved_amount numeric not null default 0, actual_amount numeric not null default 0,
 notes text not null default '', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 fund_id uuid, progress_percent numeric not null default 0, paid_amount numeric not null default 0, remaining_amount numeric not null default 0, payment_status text not null default 'Nessun importo',
 constraint condominium_works_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_works_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_works_supplier_id_fkey foreign key(supplier_id) references public.condominium_suppliers(id) on delete set null,
 constraint condominium_works_register_item_id_fkey foreign key(register_item_id) references public.condominium_register_items(id) on delete set null,
 constraint condominium_works_fund_id_fkey foreign key(fund_id) references public.condominium_funds(id) on delete set null,
 constraint condominium_works_amounts_chk check(estimated_amount>=0 and approved_amount>=0 and actual_amount>=0),
 constraint condominium_works_paid_amount_check check(paid_amount>=0),
 constraint condominium_works_remaining_amount_check check(remaining_amount>=0),
 constraint condominium_works_progress_chk check(progress_percent between 0 and 100),
 constraint condominium_works_payment_status_check check(payment_status=any(array['Nessun importo','Da pagare','Parzialmente pagato','Pagato'])),
 constraint condominium_works_financial_consistency_chk check(estimated_amount>=0 and approved_amount>=0 and actual_amount>=0 and paid_amount>=0 and remaining_amount>=0 and paid_amount<=actual_amount+0.005 and abs(remaining_amount-greatest(actual_amount-paid_amount,0))<=0.005)
);
create index if not exists condominium_works_condominium_fk_idx on public.condominium_works(condominium_id);
create index if not exists condominium_works_fund_idx on public.condominium_works(fund_id);
create index if not exists condominium_works_register_item_fk_idx on public.condominium_works(register_item_id);
create index if not exists condominium_works_supplier_fk_idx on public.condominium_works(supplier_id);
create index if not exists condominium_works_workspace_condo_idx on public.condominium_works(workspace_id,condominium_id,status);
alter table public.condominium_works enable row level security;
drop policy if exists condominium_works_manager_all on public.condominium_works;
create policy condominium_works_manager_all on public.condominium_works for all to authenticated using(private.can_manage_workspace_module(workspace_id,'attivita')) with check(private.can_manage_workspace_module(workspace_id,'attivita'));

create table if not exists public.condominium_work_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null, work_id uuid not null,
 event_type text not null, event_date timestamptz not null default now(), title text not null default '', description text not null default '', amount numeric not null default 0,
 data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 constraint condominium_work_events_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_work_events_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_work_events_work_id_fkey foreign key(work_id) references public.condominium_works(id) on delete cascade
);
create index if not exists condominium_work_events_condominium_fk_idx on public.condominium_work_events(condominium_id);
create index if not exists condominium_work_events_work_idx on public.condominium_work_events(work_id,event_date);
create index if not exists condominium_work_events_workspace_fk_idx on public.condominium_work_events(workspace_id);
alter table public.condominium_work_events enable row level security;
drop policy if exists condominium_work_events_manager_all on public.condominium_work_events;
create policy condominium_work_events_manager_all on public.condominium_work_events for all to authenticated using(private.can_manage_workspace_module(workspace_id,'attivita')) with check(private.can_manage_workspace_module(workspace_id,'attivita'));

create table if not exists public.condominium_work_progress (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null, work_id uuid not null,
 progress_no integer not null, progress_date date not null, title text not null default '', status text not null default 'Presentato', percentage numeric not null default 0,
 amount numeric not null default 0, paid_amount numeric not null default 0, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 ledger_entry_id uuid, payment_entry_id uuid,
 constraint condominium_work_progress_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_work_progress_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_work_progress_work_id_fkey foreign key(work_id) references public.condominium_works(id) on delete cascade,
 constraint condominium_work_progress_ledger_entry_id_fkey foreign key(ledger_entry_id) references public.condominium_ledger_entries(id) on delete set null,
 constraint condominium_work_progress_payment_entry_id_fkey foreign key(payment_entry_id) references public.condominium_ledger_entries(id) on delete set null,
 constraint condominium_work_progress_work_id_progress_no_key unique(work_id,progress_no),
 constraint condominium_work_progress_amounts_chk check(amount>=0 and paid_amount>=0 and paid_amount<=amount),
 constraint condominium_work_progress_percentage_chk check(percentage between 0 and 100),
 constraint condominium_work_progress_financial_consistency_chk check(progress_no>0 and amount>=0 and paid_amount>=0 and paid_amount<=amount+0.005 and percentage between 0 and 100)
);
create index if not exists condominium_work_progress_condominium_fk_idx on public.condominium_work_progress(condominium_id);
create index if not exists condominium_work_progress_ledger_entry_idx on public.condominium_work_progress(ledger_entry_id) where ledger_entry_id is not null;
create index if not exists condominium_work_progress_ledger_idx on public.condominium_work_progress(ledger_entry_id,payment_entry_id);
create index if not exists condominium_work_progress_payment_entry_fk_idx on public.condominium_work_progress(payment_entry_id);
create index if not exists condominium_work_progress_payment_entry_idx on public.condominium_work_progress(payment_entry_id) where payment_entry_id is not null;
create index if not exists condominium_work_progress_work_idx on public.condominium_work_progress(work_id,progress_date);
create index if not exists condominium_work_progress_workspace_fk_idx on public.condominium_work_progress(workspace_id);
alter table public.condominium_work_progress enable row level security;
drop policy if exists condominium_work_progress_manager_all on public.condominium_work_progress;
create policy condominium_work_progress_manager_all on public.condominium_work_progress for all to authenticated using(private.can_manage_workspace_module(workspace_id,'attivita')) with check(private.can_manage_workspace_module(workspace_id,'attivita'));

create table if not exists public.condominium_work_documents (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, condominium_id uuid not null, work_id uuid not null,
 document_id bigint, title text not null default '', notes text not null default '', created_at timestamptz not null default now(),
 constraint condominium_work_documents_workspace_id_fkey foreign key(workspace_id) references public.workspaces(id) on delete cascade,
 constraint condominium_work_documents_condominium_id_fkey foreign key(condominium_id) references public.condominiums(id) on delete cascade,
 constraint condominium_work_documents_work_id_fkey foreign key(work_id) references public.condominium_works(id) on delete cascade,
 constraint condominium_work_documents_work_document_key unique(work_id,document_id)
);
create index if not exists condominium_work_documents_condominium_fk_idx on public.condominium_work_documents(condominium_id);
create index if not exists condominium_work_documents_work_idx on public.condominium_work_documents(work_id);
create index if not exists condominium_work_documents_workspace_document_idx on public.condominium_work_documents(workspace_id,document_id);
create index if not exists condominium_work_documents_workspace_fk_idx on public.condominium_work_documents(workspace_id);
alter table public.condominium_work_documents enable row level security;
drop policy if exists condominium_work_documents_manager_all on public.condominium_work_documents;
create policy condominium_work_documents_manager_all on public.condominium_work_documents for all to authenticated using(private.can_manage_workspace_module(workspace_id,'attivita')) with check(private.can_manage_workspace_module(workspace_id,'attivita'));

create table if not exists public.condominium_fund_availability (
 id uuid, workspace_id uuid, condominium_id uuid, name text, purpose text, target_amount numeric, allocated_amount numeric, used_amount numeric,
 available_amount numeric, target_remaining_amount numeric, active boolean, notes text, created_at timestamptz, updated_at timestamptz
);
