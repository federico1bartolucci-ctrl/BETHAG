# Proposta DDL fondativo — non applicata

**Origine:** metadati read-only di Supabase Production, rilevati il 1 ottobre 2026. **Ambito:** 27 tabelle, 381 colonne, 198 vincoli originali (deduplicati per definizione identica in questa proposta), 153 indici.

Questa è una bozza derivata da `information_schema.columns`, `pg_constraint` e `pg_indexes`. Conserva tipi, nullabilità, default, definizioni dei vincoli e degli indici esposti dal database. Le 6 coppie di vincoli con definizione duplicata sono state ridotte a una sola copia per tabella/definizione: prima di una migrazione va deciso esplicitamente quale nome canonico mantenere.

**Limiti noti:** non include policy RLS, grants, trigger, funzioni, owner, commenti, sequence/identity e dipendenze non rappresentate da questi cataloghi. I riferimenti esterni sono qualificati come `public` in Production ma richiedono controllo contro il bootstrap disponibile. La bozza non va eseguita come migration nella sequenza attuale: le migrazioni successive contengono `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ADD CONSTRAINT` che possono sovrapporsi a questi oggetti. Occorre consolidare il bootstrap e riconciliare il ledger prima di provarla su un ambiente isolato.

## SQL generato

```sql
-- PROPOSTA NON APPLICATA: ricostruzione fondativa da metadati Production
-- Estratta il 2026-10-01. Richiede revisione dipendenze, RLS, grants e test prima dell'uso.
-- Non è una migration pronta: constraints con semantica duplicata sono deduplicate.

create table public.communication_recipients (
  id uuid not null default gen_random_uuid(),
  communication_id uuid not null,
  workspace_id uuid not null,
  condominium_id uuid,
  member_id uuid,
  user_id uuid,
  email text not null,
  name text not null,
  recipient_role text not null default 'resident'::text,
  status text not null default 'pending'::text,
  provider_message_id text,
  error_message text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  bounced_at timestamp with time zone,
  complained_at timestamp with time zone,
  event_type text,
  provider_event_id text,
  queued_at timestamp with time zone
);

create table public.condominium_accounting_settings (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  accounting_start_date date not null default make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 1, 1),
  accounting_end_date date not null default make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 12, 31),
  ordinary_installment_count integer not null default 12,
  ordinary_due_dates date[] not null default '{}'::date[],
  extraordinary_mode text not null default 'separata'::text,
  extraordinary_allow_multi_year boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_allocation_intakes (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  source text not null default 'Manuale'::text,
  status text not null default 'Bozza'::text,
  document_id uuid,
  ledger_entry_id uuid,
  allocation_table_id uuid,
  title text not null default ''::text,
  description text not null default ''::text,
  expense_amount numeric(14,2),
  extracted_data jsonb not null default '{}'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  notes text not null default ''::text,
  created_by uuid,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_allocation_rules (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  name text not null,
  expense_type text,
  category text,
  allocation_table_id uuid not null,
  priority integer not null default 100,
  active boolean not null default true,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_audit_log (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  description text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.condominium_budgets (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  fiscal_year_id uuid,
  category text not null default 'Generale'::text,
  description text not null default ''::text,
  amount numeric not null default 0,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_consumption_readings (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  fiscal_year_id uuid,
  unit_id uuid not null,
  service_type text not null default 'Riscaldamento'::text,
  period_start date,
  period_end date,
  meter_code text not null default ''::text,
  previous_reading numeric(14,4),
  current_reading numeric(14,4),
  consumption numeric(14,4),
  kwh numeric(14,4),
  allocation_value numeric(14,4),
  charge_amount numeric(14,2),
  source text not null default 'Manuale'::text,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_expense_allocations (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  ledger_entry_id uuid not null,
  unit_id uuid,
  member_id uuid,
  allocation_basis text not null default 'Millesimi'::text,
  millesimi numeric(12,4),
  amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  due_date date,
  status text not null default 'Da pagare'::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  allocation_table_id uuid
);

create table public.condominium_fiscal_carryover_compensations (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  carryover_id uuid not null,
  target_installment_id uuid,
  amount numeric not null,
  notes text not null default ''::text,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);

create table public.condominium_fiscal_carryovers (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  source_fiscal_year_id uuid not null,
  target_fiscal_year_id uuid not null,
  unit_id uuid,
  member_id uuid,
  balance numeric(14,2) not null,
  kind text not null,
  status text not null default 'Da riportare'::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_fiscal_years (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'Aperto'::text,
  opening_balance numeric(14,2) not null default 0,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_funds (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  name text not null,
  purpose text not null default ''::text,
  target_amount numeric(14,2) not null default 0,
  allocated_amount numeric(14,2) not null default 0,
  used_amount numeric(14,2) not null default 0,
  active boolean not null default true,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_installments (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  fiscal_year_id uuid,
  member_id uuid,
  unit_id uuid,
  title text not null,
  due_date date,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'Da pagare'::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  ledger_entry_id uuid
);

create table public.condominium_ledger_entries (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  fiscal_year_id uuid,
  entry_date date not null,
  direction text not null,
  category text not null,
  description text not null,
  amount numeric(14,2) not null,
  payment_status text not null default 'Registrato'::text,
  due_date date,
  supplier_id uuid,
  unit_id uuid,
  member_id uuid,
  document_id uuid,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  fund_id uuid,
  expense_type text not null default 'Ordinaria'::text,
  deliberation_date date,
  assembly_id uuid
);

create table public.condominium_legal_cases (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  title text not null,
  counterpart text not null default ''::text,
  status text not null default 'Aperto'::text,
  opened_date date,
  closed_date date,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_member_transfers (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  unit_id uuid not null,
  outgoing_member_id uuid not null,
  incoming_member_id uuid,
  transfer_date date not null,
  transfer_type text not null default 'Vendita'::text,
  status text not null default 'Confermato'::text,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone,
  closed_by uuid
);

create table public.condominium_millesimal_tables (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  name text not null,
  description text not null default ''::text,
  total_millesimi numeric not null default 1000,
  active boolean not null default true,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  basis_type text not null default 'Millesimi'::text,
  scope_mode text not null default 'all'::text,
  scope_unit_ids uuid[] not null default '{}'::uuid[],
  scope_building_codes text[] not null default '{}'::text[]
);

create table public.condominium_millesimal_values (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  table_id uuid not null,
  unit_id uuid not null,
  value numeric not null default 0,
  excluded boolean not null default false,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_payment_movements (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  installment_id uuid not null,
  payment_date date not null,
  amount numeric not null default 0,
  method text not null default 'Bonifico'::text,
  reference text not null default ''::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now()
);

create table public.condominium_payment_reversal_audit (
  id uuid not null default gen_random_uuid(),
  original_payment_id uuid not null,
  workspace_id uuid not null,
  condominium_id uuid not null,
  installment_id uuid not null,
  amount numeric not null,
  payment_date date not null,
  method text not null default 'Bonifico'::text,
  reference text not null default ''::text,
  notes text not null default ''::text,
  reversal_reason text not null,
  reversed_at timestamp with time zone not null default now(),
  reversed_by uuid not null
);

create table public.condominium_register_items (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  item_type text not null default 'Sicurezza'::text,
  category text not null default 'Generale'::text,
  title text not null,
  location text not null default ''::text,
  responsible text not null default ''::text,
  expiry_date date,
  status text not null default 'Attivo'::text,
  document_id uuid,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  supplier_id uuid,
  estimated_amount numeric not null default 0
);

create table public.condominium_suppliers (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  business_name text not null,
  contact_name text not null default ''::text,
  fiscal_code text not null default ''::text,
  vat_number text not null default ''::text,
  email text not null default ''::text,
  phone text not null default ''::text,
  category text not null default ''::text,
  contract_start date,
  contract_end date,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_tax_obligations (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  title text not null,
  category text not null default 'Fiscale'::text,
  due_date date not null,
  amount numeric(14,2),
  status text not null default 'Da fare'::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.condominium_work_documents (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  work_id uuid not null,
  document_id bigint,
  title text not null default ''::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now()
);

create table public.condominium_work_events (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  work_id uuid not null,
  event_type text not null,
  event_date timestamp with time zone not null default now(),
  title text not null default ''::text,
  description text not null default ''::text,
  amount numeric not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.condominium_work_progress (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  work_id uuid not null,
  progress_no integer not null,
  progress_date date not null,
  title text not null default ''::text,
  status text not null default 'Presentato'::text,
  percentage numeric not null default 0,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  ledger_entry_id uuid,
  payment_entry_id uuid
);

create table public.condominium_works (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  title text not null,
  category text not null default 'Manutenzione'::text,
  description text not null default ''::text,
  status text not null default 'Da programmare'::text,
  priority text not null default 'Media'::text,
  supplier_id uuid,
  register_item_id uuid,
  start_date date,
  expected_end_date date,
  actual_end_date date,
  estimated_amount numeric not null default 0,
  approved_amount numeric not null default 0,
  actual_amount numeric not null default 0,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  fund_id uuid,
  progress_percent numeric not null default 0,
  paid_amount numeric not null default 0,
  remaining_amount numeric not null default 0,
  payment_status text not null default 'Nessun importo'::text
);

-- Vincoli: aggiunti dopo la creazione delle tabelle per risolvere dipendenze incrociate.
alter table public.communication_recipients add constraint communication_recipients_communication_id_fkey FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE;
alter table public.communication_recipients add constraint communication_recipients_condominium_fk FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.communication_recipients add constraint communication_recipients_delivery_consistency_chk CHECK (((status <> ALL (ARRAY['sent'::text, 'delivered'::text])) OR provider_message_id IS NOT NULL) AND (status <> 'delivered'::text OR delivered_at IS NOT NULL) AND (status <> 'queued'::text OR queued_at IS NOT NULL));
alter table public.communication_recipients add constraint communication_recipients_email_chk CHECK (POSITION(('@'::text) IN (email)) > 1);
alter table public.communication_recipients add constraint communication_recipients_member_fk FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;
alter table public.communication_recipients add constraint communication_recipients_pkey PRIMARY KEY (id);
alter table public.communication_recipients add constraint communication_recipients_role_chk CHECK (recipient_role = ANY (ARRAY['resident'::text, 'council'::text, 'owner'::text, 'tenant'::text]));
alter table public.communication_recipients add constraint communication_recipients_status_check CHECK (status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]));
alter table public.communication_recipients add constraint communication_recipients_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.communication_recipients add constraint communication_recipients_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_accounting_settings add constraint condominium_accounting_setting_ordinary_installment_count_check CHECK (ordinary_installment_count >= 1 AND ordinary_installment_count <= 12);
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_check CHECK (accounting_start_date <= accounting_end_date);
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_extraordinary_mode_check CHECK (extraordinary_mode = ANY (ARRAY['integrata'::text, 'separata'::text]));
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_ordinary_due_dates_check CHECK (COALESCE(array_length(ordinary_due_dates, 1), 0) <= 12);
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_pkey PRIMARY KEY (id);
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_workspace_id_condominium_id_key UNIQUE (workspace_id, condominium_id);
alter table public.condominium_accounting_settings add constraint condominium_accounting_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_allocation_intakes add constraint allocation_intake_amount_ck CHECK (expense_amount IS NULL OR expense_amount >= 0::numeric);
alter table public.condominium_allocation_intakes add constraint allocation_intake_source_ck CHECK (source = ANY (ARRAY['Manuale'::text, 'AI'::text, 'Importazione'::text]));
alter table public.condominium_allocation_intakes add constraint allocation_intake_status_ck CHECK (status = ANY (ARRAY['Bozza'::text, 'Da verificare'::text, 'Confermato'::text, 'Annullato'::text]));
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_allocation_table_id_fkey FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE SET NULL;
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL;
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_pkey PRIMARY KEY (id);
alter table public.condominium_allocation_intakes add constraint condominium_allocation_intakes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_allocation_rules add constraint allocation_rules_priority_ck CHECK (priority >= 0);
alter table public.condominium_allocation_rules add constraint allocation_rules_scope_ck CHECK (NULLIF(TRIM(BOTH FROM COALESCE(expense_type, ''::text)), ''::text) IS NOT NULL OR NULLIF(TRIM(BOTH FROM COALESCE(category, ''::text)), ''::text) IS NOT NULL);
alter table public.condominium_allocation_rules add constraint condominium_allocation_rules_allocation_table_id_fkey FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE RESTRICT;
alter table public.condominium_allocation_rules add constraint condominium_allocation_rules_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_allocation_rules add constraint condominium_allocation_rules_pkey PRIMARY KEY (id);
alter table public.condominium_allocation_rules add constraint condominium_allocation_rules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_audit_log add constraint condominium_audit_log_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_audit_log add constraint condominium_audit_log_pkey PRIMARY KEY (id);
alter table public.condominium_audit_log add constraint condominium_audit_log_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_budgets add constraint condominium_budgets_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_budgets add constraint condominium_budgets_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;
alter table public.condominium_budgets add constraint condominium_budgets_pkey PRIMARY KEY (id);
alter table public.condominium_budgets add constraint condominium_budgets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_consumption_readings add constraint condominium_consumption_readings_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_consumption_readings add constraint condominium_consumption_readings_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;
alter table public.condominium_consumption_readings add constraint condominium_consumption_readings_pkey PRIMARY KEY (id);
alter table public.condominium_consumption_readings add constraint condominium_consumption_readings_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE CASCADE;
alter table public.condominium_consumption_readings add constraint condominium_consumption_readings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_consumption_readings add constraint consumption_nonnegative_ck CHECK (COALESCE(previous_reading, 0::numeric) >= 0::numeric AND COALESCE(current_reading, 0::numeric) >= 0::numeric AND COALESCE(consumption, 0::numeric) >= 0::numeric AND COALESCE(kwh, 0::numeric) >= 0::numeric AND COALESCE(allocation_value, 0::numeric) >= 0::numeric AND COALESCE(charge_amount, 0::numeric) >= 0::numeric);
alter table public.condominium_consumption_readings add constraint consumption_period_ck CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end);
alter table public.condominium_consumption_readings add constraint consumption_reading_ck CHECK (current_reading IS NULL OR previous_reading IS NULL OR current_reading >= previous_reading);
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_allocation_table_id_fkey FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE SET NULL;
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_amount_nonnegative_chk CHECK (amount >= 0::numeric);
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_amounts_valid CHECK (amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= amount);
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE CASCADE;
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_paid_amount_valid_chk CHECK (paid_amount >= 0::numeric AND paid_amount <= amount);
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_pkey PRIMARY KEY (id);
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_status_amount_consistent CHECK (status = 'Da pagare'::text AND paid_amount = 0::numeric OR status = 'Parzialmente pagato'::text AND paid_amount > 0::numeric AND paid_amount < amount OR status = 'Pagato'::text AND abs(paid_amount - amount) <= 0.005 OR status = 'Scaduto'::text AND paid_amount >= 0::numeric AND paid_amount < amount);
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;
alter table public.condominium_expense_allocations add constraint condominium_expense_allocations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_fiscal_carryover_compensations add constraint condominium_fiscal_carryover_compens_target_installment_id_fkey FOREIGN KEY (target_installment_id) REFERENCES condominium_installments(id) ON DELETE RESTRICT;
alter table public.condominium_fiscal_carryover_compensations add constraint condominium_fiscal_carryover_compensations_amount_positive CHECK (amount > 0::numeric);
alter table public.condominium_fiscal_carryover_compensations add constraint condominium_fiscal_carryover_compensations_carryover_id_fkey FOREIGN KEY (carryover_id) REFERENCES condominium_fiscal_carryovers(id) ON DELETE RESTRICT;
alter table public.condominium_fiscal_carryover_compensations add constraint condominium_fiscal_carryover_compensations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE RESTRICT;
alter table public.condominium_fiscal_carryover_compensations add constraint condominium_fiscal_carryover_compensations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.condominium_fiscal_carryover_compensations add constraint condominium_fiscal_carryover_compensations_pkey PRIMARY KEY (id);
alter table public.condominium_fiscal_carryovers add constraint condominium_fiscal_carryovers_kind_check CHECK (kind = ANY (ARRAY['Debito'::text, 'Credito'::text]));
alter table public.condominium_fiscal_carryovers add constraint condominium_fiscal_carryovers_pkey PRIMARY KEY (id);
alter table public.condominium_fiscal_carryovers add constraint condominium_fiscal_carryovers_status_check CHECK (status = ANY (ARRAY['Da riportare'::text, 'Parzialmente compensato'::text, 'Compensato'::text]));
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_balance_kind CHECK (kind = 'Debito'::text AND balance > 0::numeric OR kind = 'Credito'::text AND balance < 0::numeric);
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_balance_nonzero CHECK (abs(balance) >= 0.01);
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_condominium_fk FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_member_fk FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_source_year_fk FOREIGN KEY (source_fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE RESTRICT;
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_target_year_fk FOREIGN KEY (target_fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE RESTRICT;
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_unit_fk FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT;
alter table public.condominium_fiscal_carryovers add constraint fiscal_carryovers_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_check CHECK (end_date >= start_date);
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_no_overlap EXCLUDE USING gist (workspace_id WITH =, condominium_id WITH =, daterange(start_date, end_date, '[]'::text) WITH &&);
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_opening_balance_finite CHECK (opening_balance = opening_balance);
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_pkey PRIMARY KEY (id);
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_valid_dates CHECK (start_date <= end_date);
alter table public.condominium_fiscal_years add constraint condominium_fiscal_years_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_funds add constraint condominium_funds_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_funds add constraint condominium_funds_nonnegative_amounts CHECK (target_amount >= 0::numeric AND allocated_amount >= 0::numeric AND used_amount >= 0::numeric);
alter table public.condominium_funds add constraint condominium_funds_pkey PRIMARY KEY (id);
alter table public.condominium_funds add constraint condominium_funds_used_lte_allocated CHECK (used_amount <= allocated_amount);
alter table public.condominium_funds add constraint condominium_funds_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_installments add constraint condominium_installments_amount_positive_chk CHECK (amount > 0::numeric);
alter table public.condominium_installments add constraint condominium_installments_amounts_valid CHECK (amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= amount);
alter table public.condominium_installments add constraint condominium_installments_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_installments add constraint condominium_installments_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;
alter table public.condominium_installments add constraint condominium_installments_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE RESTRICT;
alter table public.condominium_installments add constraint condominium_installments_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;
alter table public.condominium_installments add constraint condominium_installments_paid_amount_valid_chk CHECK (paid_amount >= 0::numeric AND paid_amount <= amount);
alter table public.condominium_installments add constraint condominium_installments_pkey PRIMARY KEY (id);
alter table public.condominium_installments add constraint condominium_installments_status_amount_consistent CHECK (status = 'Da pagare'::text AND paid_amount = 0::numeric OR status = 'Parzialmente pagato'::text AND paid_amount > 0::numeric AND paid_amount < amount OR status = 'Pagato'::text AND abs(paid_amount - amount) <= 0.005 OR status = 'Scaduto'::text AND paid_amount >= 0::numeric AND paid_amount < amount OR status = 'Accorpata'::text AND paid_amount >= 0::numeric AND paid_amount <= amount);
alter table public.condominium_installments add constraint condominium_installments_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;
alter table public.condominium_installments add constraint condominium_installments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_amount_check CHECK (amount >= 0::numeric);
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_assembly_fk FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_direction_check CHECK (direction = ANY (ARRAY['Entrata'::text, 'Uscita'::text]));
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_expense_type_check CHECK (expense_type = ANY (ARRAY['Ordinaria'::text, 'Straordinaria'::text]));
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES condominium_funds(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_payment_status_check CHECK (payment_status = ANY (ARRAY['Registrato'::text, 'Da pagare'::text, 'Parzialmente pagato'::text, 'Pagato'::text, 'Scaduto'::text]));
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_pkey PRIMARY KEY (id);
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;
alter table public.condominium_ledger_entries add constraint condominium_ledger_entries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_legal_cases add constraint condominium_legal_cases_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_legal_cases add constraint condominium_legal_cases_dates_valid CHECK (closed_date IS NULL OR opened_date IS NULL OR closed_date >= opened_date);
alter table public.condominium_legal_cases add constraint condominium_legal_cases_pkey PRIMARY KEY (id);
alter table public.condominium_legal_cases add constraint condominium_legal_cases_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id);
alter table public.condominium_member_transfers add constraint condominium_member_transfers_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_incoming_member_id_fkey FOREIGN KEY (incoming_member_id) REFERENCES condominium_members(id) ON DELETE RESTRICT;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_outgoing_member_id_fkey FOREIGN KEY (outgoing_member_id) REFERENCES condominium_members(id) ON DELETE RESTRICT;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_pkey PRIMARY KEY (id);
alter table public.condominium_member_transfers add constraint condominium_member_transfers_status_check CHECK (status = ANY (ARRAY['Bozza'::text, 'Confermato'::text, 'Chiuso'::text, 'Annullato'::text]));
alter table public.condominium_member_transfers add constraint condominium_member_transfers_status_ck CHECK (status = ANY (ARRAY['Bozza'::text, 'Confermato'::text, 'Annullato'::text]));
alter table public.condominium_member_transfers add constraint condominium_member_transfers_type_ck CHECK (transfer_type = ANY (ARRAY['Vendita'::text, 'Acquisto'::text, 'Donazione'::text, 'Successione'::text, 'Altro'::text]));
alter table public.condominium_member_transfers add constraint condominium_member_transfers_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT;
alter table public.condominium_member_transfers add constraint condominium_member_transfers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_millesimal_tables add constraint condominium_millesimal_tables_basis_type_check CHECK (basis_type = ANY (ARRAY['Millesimi'::text, 'Quote personalizzate'::text, 'Consumo'::text, 'Misto'::text]));
alter table public.condominium_millesimal_tables add constraint condominium_millesimal_tables_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_millesimal_tables add constraint condominium_millesimal_tables_pkey PRIMARY KEY (id);
alter table public.condominium_millesimal_tables add constraint condominium_millesimal_tables_scope_mode_check CHECK (scope_mode = ANY (ARRAY['all'::text, 'units'::text, 'buildings'::text]));
alter table public.condominium_millesimal_tables add constraint condominium_millesimal_tables_total_positive CHECK (total_millesimi > 0::numeric);
alter table public.condominium_millesimal_tables add constraint condominium_millesimal_tables_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_pkey PRIMARY KEY (id);
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_table_id_fkey FOREIGN KEY (table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE CASCADE;
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_table_id_unit_id_key UNIQUE (table_id, unit_id);
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE CASCADE;
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_value_nonnegative CHECK (value >= 0::numeric);
alter table public.condominium_millesimal_values add constraint condominium_millesimal_values_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_payment_movements add constraint condominium_payment_movements_amount_valid CHECK (amount > 0::numeric);
alter table public.condominium_payment_movements add constraint condominium_payment_movements_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_payment_movements add constraint condominium_payment_movements_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES condominium_installments(id) ON DELETE CASCADE;
alter table public.condominium_payment_movements add constraint condominium_payment_movements_pkey PRIMARY KEY (id);
alter table public.condominium_payment_movements add constraint condominium_payment_movements_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_payment_reversal_audit add constraint condominium_payment_reversal_audit_amount_check CHECK (amount > 0::numeric);
alter table public.condominium_payment_reversal_audit add constraint condominium_payment_reversal_audit_original_payment_id_key UNIQUE (original_payment_id);
alter table public.condominium_payment_reversal_audit add constraint condominium_payment_reversal_audit_pkey PRIMARY KEY (id);
alter table public.condominium_register_items add constraint condominium_register_items_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_register_items add constraint condominium_register_items_pkey PRIMARY KEY (id);
alter table public.condominium_register_items add constraint condominium_register_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES condominium_suppliers(id) ON DELETE SET NULL;
alter table public.condominium_register_items add constraint condominium_register_items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_suppliers add constraint condominium_suppliers_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_suppliers add constraint condominium_suppliers_pkey PRIMARY KEY (id);
alter table public.condominium_suppliers add constraint condominium_suppliers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_tax_obligations add constraint condominium_tax_obligations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_tax_obligations add constraint condominium_tax_obligations_nonnegative_amount CHECK (amount IS NULL OR amount >= 0::numeric);
alter table public.condominium_tax_obligations add constraint condominium_tax_obligations_pkey PRIMARY KEY (id);
alter table public.condominium_tax_obligations add constraint condominium_tax_obligations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_work_documents add constraint condominium_work_documents_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_work_documents add constraint condominium_work_documents_pkey PRIMARY KEY (id);
alter table public.condominium_work_documents add constraint condominium_work_documents_work_id_fkey FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE;
alter table public.condominium_work_documents add constraint condominium_work_documents_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_work_events add constraint condominium_work_events_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_work_events add constraint condominium_work_events_pkey PRIMARY KEY (id);
alter table public.condominium_work_events add constraint condominium_work_events_work_id_fkey FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE;
alter table public.condominium_work_events add constraint condominium_work_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_work_progress add constraint condominium_work_progress_amounts_chk CHECK (amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= amount);
alter table public.condominium_work_progress add constraint condominium_work_progress_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_work_progress add constraint condominium_work_progress_financial_consistency_chk CHECK (progress_no > 0 AND amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= (amount + 0.005) AND percentage >= 0::numeric AND percentage <= 100::numeric);
alter table public.condominium_work_progress add constraint condominium_work_progress_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL;
alter table public.condominium_work_progress add constraint condominium_work_progress_payment_entry_id_fkey FOREIGN KEY (payment_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL;
alter table public.condominium_work_progress add constraint condominium_work_progress_percentage_chk CHECK (percentage >= 0::numeric AND percentage <= 100::numeric);
alter table public.condominium_work_progress add constraint condominium_work_progress_pkey PRIMARY KEY (id);
alter table public.condominium_work_progress add constraint condominium_work_progress_work_id_fkey FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE;
alter table public.condominium_work_progress add constraint condominium_work_progress_work_id_progress_no_key UNIQUE (work_id, progress_no);
alter table public.condominium_work_progress add constraint condominium_work_progress_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
alter table public.condominium_works add constraint condominium_works_amounts_chk CHECK (estimated_amount >= 0::numeric AND approved_amount >= 0::numeric AND actual_amount >= 0::numeric);
alter table public.condominium_works add constraint condominium_works_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;
alter table public.condominium_works add constraint condominium_works_financial_consistency_chk CHECK (estimated_amount >= 0::numeric AND approved_amount >= 0::numeric AND actual_amount >= 0::numeric AND paid_amount >= 0::numeric AND remaining_amount >= 0::numeric AND paid_amount <= (actual_amount + 0.005) AND abs(remaining_amount - GREATEST(actual_amount - paid_amount, 0::numeric)) <= 0.005);
alter table public.condominium_works add constraint condominium_works_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES condominium_funds(id) ON DELETE SET NULL;
alter table public.condominium_works add constraint condominium_works_paid_amount_check CHECK (paid_amount >= 0::numeric);
alter table public.condominium_works add constraint condominium_works_payment_status_check CHECK (payment_status = ANY (ARRAY['Nessun importo'::text, 'Da pagare'::text, 'Parzialmente pagato'::text, 'Pagato'::text]));
alter table public.condominium_works add constraint condominium_works_pkey PRIMARY KEY (id);
alter table public.condominium_works add constraint condominium_works_progress_chk CHECK (progress_percent >= 0::numeric AND progress_percent <= 100::numeric);
alter table public.condominium_works add constraint condominium_works_register_item_id_fkey FOREIGN KEY (register_item_id) REFERENCES condominium_register_items(id) ON DELETE SET NULL;
alter table public.condominium_works add constraint condominium_works_remaining_amount_check CHECK (remaining_amount >= 0::numeric);
alter table public.condominium_works add constraint condominium_works_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES condominium_suppliers(id) ON DELETE SET NULL;
alter table public.condominium_works add constraint condominium_works_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Indici: definitions copiate dai metadati Production.
CREATE UNIQUE INDEX communication_recipients_communication_email_uq ON public.communication_recipients USING btree (communication_id, lower(btrim(email)));
CREATE INDEX communication_recipients_condominium_id_idx ON public.communication_recipients USING btree (condominium_id);
CREATE INDEX communication_recipients_member_idx ON public.communication_recipients USING btree (member_id);
CREATE UNIQUE INDEX communication_recipients_pkey ON public.communication_recipients USING btree (id);
CREATE UNIQUE INDEX communication_recipients_provider_event_uq ON public.communication_recipients USING btree (provider_event_id) WHERE (provider_event_id IS NOT NULL);
CREATE INDEX communication_recipients_provider_message_idx ON public.communication_recipients USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);
CREATE INDEX communication_recipients_stale_queued_idx ON public.communication_recipients USING btree (status, queued_at) WHERE (status = 'queued'::text);
CREATE INDEX communication_recipients_status_idx ON public.communication_recipients USING btree (communication_id, status);
CREATE INDEX communication_recipients_user_id_idx ON public.communication_recipients USING btree (user_id);
CREATE INDEX communication_recipients_workspace_idx ON public.communication_recipients USING btree (workspace_id);
CREATE INDEX condominium_accounting_settings_condo_idx ON public.condominium_accounting_settings USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_accounting_settings_pkey ON public.condominium_accounting_settings USING btree (id);
CREATE UNIQUE INDEX condominium_accounting_settings_workspace_id_condominium_id_key ON public.condominium_accounting_settings USING btree (workspace_id, condominium_id);
CREATE INDEX condominium_allocation_intakes_allocation_table_id_idx ON public.condominium_allocation_intakes USING btree (allocation_table_id);
CREATE INDEX condominium_allocation_intakes_condominium_id_idx ON public.condominium_allocation_intakes USING btree (condominium_id);
CREATE INDEX condominium_allocation_intakes_confirmed_by_idx ON public.condominium_allocation_intakes USING btree (confirmed_by);
CREATE INDEX condominium_allocation_intakes_created_by_idx ON public.condominium_allocation_intakes USING btree (created_by);
CREATE INDEX condominium_allocation_intakes_document_id_idx ON public.condominium_allocation_intakes USING btree (document_id);
CREATE INDEX condominium_allocation_intakes_ledger_entry_id_idx ON public.condominium_allocation_intakes USING btree (ledger_entry_id);
CREATE INDEX condominium_allocation_intakes_lookup_idx ON public.condominium_allocation_intakes USING btree (workspace_id, condominium_id, status, created_at DESC);
CREATE UNIQUE INDEX condominium_allocation_intakes_pkey ON public.condominium_allocation_intakes USING btree (id);
CREATE INDEX condominium_allocation_rules_condominium_fk_idx ON public.condominium_allocation_rules USING btree (condominium_id);
CREATE INDEX condominium_allocation_rules_lookup_idx ON public.condominium_allocation_rules USING btree (workspace_id, condominium_id, active, priority, category, expense_type);
CREATE UNIQUE INDEX condominium_allocation_rules_pkey ON public.condominium_allocation_rules USING btree (id);
CREATE INDEX condominium_allocation_rules_table_fk_idx ON public.condominium_allocation_rules USING btree (allocation_table_id);
CREATE INDEX condominium_audit_log_condominium_fk_idx ON public.condominium_audit_log USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_audit_log_pkey ON public.condominium_audit_log USING btree (id);
CREATE INDEX condominium_audit_log_scope_idx ON public.condominium_audit_log USING btree (workspace_id, condominium_id, created_at DESC);
CREATE INDEX condominium_budgets_condominium_fk_idx ON public.condominium_budgets USING btree (condominium_id);
CREATE INDEX condominium_budgets_fiscal_year_fk_idx ON public.condominium_budgets USING btree (fiscal_year_id);
CREATE UNIQUE INDEX condominium_budgets_pkey ON public.condominium_budgets USING btree (id);
CREATE INDEX condominium_budgets_workspace_year_idx ON public.condominium_budgets USING btree (workspace_id, condominium_id, fiscal_year_id);
CREATE INDEX condominium_consumption_readings_condominium_fk_idx ON public.condominium_consumption_readings USING btree (condominium_id);
CREATE INDEX condominium_consumption_readings_fiscal_year_fk_idx ON public.condominium_consumption_readings USING btree (fiscal_year_id);
CREATE INDEX condominium_consumption_readings_lookup_idx ON public.condominium_consumption_readings USING btree (workspace_id, condominium_id, fiscal_year_id, service_type, unit_id);
CREATE UNIQUE INDEX condominium_consumption_readings_pkey ON public.condominium_consumption_readings USING btree (id);
CREATE UNIQUE INDEX condominium_consumption_readings_unique_idx ON public.condominium_consumption_readings USING btree (workspace_id, condominium_id, fiscal_year_id, unit_id, service_type, meter_code, period_start, period_end);
CREATE INDEX condominium_consumption_readings_unit_fk_idx ON public.condominium_consumption_readings USING btree (unit_id);
CREATE INDEX condominium_expense_allocations_condominium_idx ON public.condominium_expense_allocations USING btree (condominium_id);
CREATE INDEX condominium_expense_allocations_ledger_idx ON public.condominium_expense_allocations USING btree (ledger_entry_id);
CREATE INDEX condominium_expense_allocations_member_idx ON public.condominium_expense_allocations USING btree (member_id);
CREATE UNIQUE INDEX condominium_expense_allocations_pkey ON public.condominium_expense_allocations USING btree (id);
CREATE INDEX condominium_expense_allocations_table_idx ON public.condominium_expense_allocations USING btree (allocation_table_id);
CREATE INDEX condominium_expense_allocations_unit_idx ON public.condominium_expense_allocations USING btree (unit_id);
CREATE INDEX condominium_expense_allocations_workspace_idx ON public.condominium_expense_allocations USING btree (workspace_id);
CREATE INDEX condominium_expense_allocations_workspace_ledger_idx ON public.condominium_expense_allocations USING btree (workspace_id, condominium_id, ledger_entry_id);
CREATE INDEX condominium_fiscal_carryover_compensations_carryover_id_idx ON public.condominium_fiscal_carryover_compensations USING btree (carryover_id);
CREATE INDEX condominium_fiscal_carryover_compensations_condominium_id_idx ON public.condominium_fiscal_carryover_compensations USING btree (condominium_id);
CREATE INDEX condominium_fiscal_carryover_compensations_created_by_idx ON public.condominium_fiscal_carryover_compensations USING btree (created_by);
CREATE UNIQUE INDEX condominium_fiscal_carryover_compensations_pkey ON public.condominium_fiscal_carryover_compensations USING btree (id);
CREATE INDEX condominium_fiscal_carryover_compensations_target_installment_i ON public.condominium_fiscal_carryover_compensations USING btree (target_installment_id);
CREATE INDEX condominium_fiscal_carryovers_condominium_id_idx ON public.condominium_fiscal_carryovers USING btree (condominium_id);
CREATE INDEX condominium_fiscal_carryovers_member_id_idx ON public.condominium_fiscal_carryovers USING btree (member_id);
CREATE UNIQUE INDEX condominium_fiscal_carryovers_pkey ON public.condominium_fiscal_carryovers USING btree (id);
CREATE INDEX condominium_fiscal_carryovers_source_fiscal_year_id_idx ON public.condominium_fiscal_carryovers USING btree (source_fiscal_year_id);
CREATE INDEX condominium_fiscal_carryovers_target_fiscal_year_id_idx ON public.condominium_fiscal_carryovers USING btree (target_fiscal_year_id);
CREATE INDEX condominium_fiscal_carryovers_target_idx ON public.condominium_fiscal_carryovers USING btree (workspace_id, condominium_id, target_fiscal_year_id);
CREATE UNIQUE INDEX condominium_fiscal_carryovers_unique_period_position ON public.condominium_fiscal_carryovers USING btree (workspace_id, condominium_id, source_fiscal_year_id, target_fiscal_year_id, unit_id, COALESCE(member_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX condominium_fiscal_carryovers_unit_idx ON public.condominium_fiscal_carryovers USING btree (unit_id);
CREATE INDEX condominium_fiscal_years_condominium_idx ON public.condominium_fiscal_years USING btree (condominium_id);
CREATE INDEX condominium_fiscal_years_no_overlap ON public.condominium_fiscal_years USING gist (workspace_id, condominium_id, daterange(start_date, end_date, '[]'::text));
CREATE UNIQUE INDEX condominium_fiscal_years_pkey ON public.condominium_fiscal_years USING btree (id);
CREATE UNIQUE INDEX condominium_fiscal_years_unique ON public.condominium_fiscal_years USING btree (condominium_id, start_date, end_date);
CREATE INDEX condominium_fiscal_years_workspace_idx ON public.condominium_fiscal_years USING btree (workspace_id);
CREATE INDEX condominium_funds_condominium_idx ON public.condominium_funds USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_funds_pkey ON public.condominium_funds USING btree (id);
CREATE INDEX condominium_funds_workspace_idx ON public.condominium_funds USING btree (workspace_id);
CREATE INDEX condominium_installments_condominium_idx ON public.condominium_installments USING btree (condominium_id);
CREATE INDEX condominium_installments_due_date_idx ON public.condominium_installments USING btree (due_date);
CREATE INDEX condominium_installments_fiscal_year_fk_idx ON public.condominium_installments USING btree (fiscal_year_id);
CREATE INDEX condominium_installments_member_idx ON public.condominium_installments USING btree (member_id);
CREATE UNIQUE INDEX condominium_installments_pkey ON public.condominium_installments USING btree (id);
CREATE INDEX condominium_installments_unit_idx ON public.condominium_installments USING btree (unit_id);
CREATE INDEX condominium_installments_workspace_idx ON public.condominium_installments USING btree (workspace_id);
CREATE INDEX idx_condominium_installments_ledger_entry_id ON public.condominium_installments USING btree (ledger_entry_id);
CREATE INDEX condominium_ledger_entries_assembly_id_idx ON public.condominium_ledger_entries USING btree (assembly_id);
CREATE INDEX condominium_ledger_entries_condominium_idx ON public.condominium_ledger_entries USING btree (condominium_id);
CREATE INDEX condominium_ledger_entries_deliberation_date_idx ON public.condominium_ledger_entries USING btree (condominium_id, deliberation_date) WHERE (deliberation_date IS NOT NULL);
CREATE INDEX condominium_ledger_entries_document_idx ON public.condominium_ledger_entries USING btree (document_id);
CREATE INDEX condominium_ledger_entries_fiscal_year_idx ON public.condominium_ledger_entries USING btree (fiscal_year_id);
CREATE INDEX condominium_ledger_entries_fund_idx ON public.condominium_ledger_entries USING btree (fund_id);
CREATE INDEX condominium_ledger_entries_lookup ON public.condominium_ledger_entries USING btree (condominium_id, entry_date);
CREATE INDEX condominium_ledger_entries_member_idx ON public.condominium_ledger_entries USING btree (member_id);
CREATE UNIQUE INDEX condominium_ledger_entries_outgoing_document_key ON public.condominium_ledger_entries USING btree (document_id) WHERE ((direction = 'Uscita'::text) AND (document_id IS NOT NULL));
CREATE UNIQUE INDEX condominium_ledger_entries_pkey ON public.condominium_ledger_entries USING btree (id);
CREATE INDEX condominium_ledger_entries_supplier_idx ON public.condominium_ledger_entries USING btree (supplier_id);
CREATE INDEX condominium_ledger_entries_unit_idx ON public.condominium_ledger_entries USING btree (unit_id);
CREATE INDEX condominium_ledger_entries_workspace_idx ON public.condominium_ledger_entries USING btree (workspace_id);
CREATE INDEX condominium_legal_cases_condominium_idx ON public.condominium_legal_cases USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_legal_cases_pkey ON public.condominium_legal_cases USING btree (id);
CREATE INDEX condominium_legal_cases_workspace_idx ON public.condominium_legal_cases USING btree (workspace_id);
CREATE INDEX condominium_member_transfers_closed_by_idx ON public.condominium_member_transfers USING btree (closed_by);
CREATE INDEX condominium_member_transfers_condo_date_idx ON public.condominium_member_transfers USING btree (condominium_id, transfer_date DESC);
CREATE INDEX condominium_member_transfers_created_by_idx ON public.condominium_member_transfers USING btree (created_by);
CREATE INDEX condominium_member_transfers_incoming_member_id_idx ON public.condominium_member_transfers USING btree (incoming_member_id);
CREATE INDEX condominium_member_transfers_outgoing_member_id_idx ON public.condominium_member_transfers USING btree (outgoing_member_id);
CREATE UNIQUE INDEX condominium_member_transfers_pkey ON public.condominium_member_transfers USING btree (id);
CREATE INDEX condominium_member_transfers_unit_date_idx ON public.condominium_member_transfers USING btree (unit_id, transfer_date DESC);
CREATE INDEX condominium_member_transfers_workspace_id_idx ON public.condominium_member_transfers USING btree (workspace_id);
CREATE UNIQUE INDEX condominium_millesimal_tables_active_one_uidx ON public.condominium_millesimal_tables USING btree (condominium_id) WHERE active;
CREATE INDEX condominium_millesimal_tables_condominium_idx ON public.condominium_millesimal_tables USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_millesimal_tables_pkey ON public.condominium_millesimal_tables USING btree (id);
CREATE INDEX condominium_millesimal_tables_scope_mode_idx ON public.condominium_millesimal_tables USING btree (workspace_id, condominium_id, scope_mode);
CREATE UNIQUE INDEX condominium_millesimal_tables_workspace_condominium_name_uidx ON public.condominium_millesimal_tables USING btree (workspace_id, condominium_id, lower(btrim(name)));
CREATE INDEX condominium_millesimal_tables_workspace_idx ON public.condominium_millesimal_tables USING btree (workspace_id);
CREATE INDEX condominium_millesimal_values_condominium_fk_idx ON public.condominium_millesimal_values USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_millesimal_values_pkey ON public.condominium_millesimal_values USING btree (id);
CREATE UNIQUE INDEX condominium_millesimal_values_table_id_unit_id_key ON public.condominium_millesimal_values USING btree (table_id, unit_id);
CREATE INDEX condominium_millesimal_values_table_idx ON public.condominium_millesimal_values USING btree (table_id);
CREATE INDEX condominium_millesimal_values_unit_idx ON public.condominium_millesimal_values USING btree (unit_id);
CREATE INDEX condominium_millesimal_values_workspace_idx ON public.condominium_millesimal_values USING btree (workspace_id);
CREATE UNIQUE INDEX condominium_millesimal_values_workspace_table_unit_uidx ON public.condominium_millesimal_values USING btree (workspace_id, table_id, unit_id);
CREATE INDEX condominium_payment_movements_condominium_fk_idx ON public.condominium_payment_movements USING btree (condominium_id);
CREATE INDEX condominium_payment_movements_installment_idx ON public.condominium_payment_movements USING btree (installment_id);
CREATE UNIQUE INDEX condominium_payment_movements_pkey ON public.condominium_payment_movements USING btree (id);
CREATE INDEX condominium_payment_movements_workspace_idx ON public.condominium_payment_movements USING btree (workspace_id);
CREATE UNIQUE INDEX condominium_payment_reversal_audit_original_payment_id_key ON public.condominium_payment_reversal_audit USING btree (original_payment_id);
CREATE UNIQUE INDEX condominium_payment_reversal_audit_pkey ON public.condominium_payment_reversal_audit USING btree (id);
CREATE INDEX condominium_register_items_condominium_fk_idx ON public.condominium_register_items USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_register_items_pkey ON public.condominium_register_items USING btree (id);
CREATE INDEX condominium_register_items_supplier_idx ON public.condominium_register_items USING btree (supplier_id);
CREATE INDEX condominium_register_items_workspace_condo_idx ON public.condominium_register_items USING btree (workspace_id, condominium_id, item_type, expiry_date);
CREATE INDEX condominium_suppliers_condominium_fk_idx ON public.condominium_suppliers USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_suppliers_pkey ON public.condominium_suppliers USING btree (id);
CREATE INDEX condominium_suppliers_workspace_condo_idx ON public.condominium_suppliers USING btree (workspace_id, condominium_id, category);
CREATE INDEX condominium_tax_obligations_condominium_idx ON public.condominium_tax_obligations USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_tax_obligations_pkey ON public.condominium_tax_obligations USING btree (id);
CREATE INDEX condominium_tax_obligations_workspace_idx ON public.condominium_tax_obligations USING btree (workspace_id);
CREATE INDEX condominium_work_documents_condominium_fk_idx ON public.condominium_work_documents USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_work_documents_pkey ON public.condominium_work_documents USING btree (id);
CREATE UNIQUE INDEX condominium_work_documents_work_document_key ON public.condominium_work_documents USING btree (work_id, document_id);
CREATE INDEX condominium_work_documents_work_idx ON public.condominium_work_documents USING btree (work_id);
CREATE INDEX condominium_work_documents_workspace_document_idx ON public.condominium_work_documents USING btree (workspace_id, document_id);
CREATE INDEX condominium_work_documents_workspace_fk_idx ON public.condominium_work_documents USING btree (workspace_id);
CREATE INDEX condominium_work_events_condominium_fk_idx ON public.condominium_work_events USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_work_events_pkey ON public.condominium_work_events USING btree (id);
CREATE INDEX condominium_work_events_work_idx ON public.condominium_work_events USING btree (work_id, event_date);
CREATE INDEX condominium_work_events_workspace_fk_idx ON public.condominium_work_events USING btree (workspace_id);
CREATE INDEX condominium_work_progress_condominium_fk_idx ON public.condominium_work_progress USING btree (condominium_id);
CREATE INDEX condominium_work_progress_ledger_entry_idx ON public.condominium_work_progress USING btree (ledger_entry_id) WHERE (ledger_entry_id IS NOT NULL);
CREATE INDEX condominium_work_progress_ledger_idx ON public.condominium_work_progress USING btree (ledger_entry_id, payment_entry_id);
CREATE INDEX condominium_work_progress_payment_entry_fk_idx ON public.condominium_work_progress USING btree (payment_entry_id);
CREATE INDEX condominium_work_progress_payment_entry_idx ON public.condominium_work_progress USING btree (payment_entry_id) WHERE (payment_entry_id IS NOT NULL);
CREATE UNIQUE INDEX condominium_work_progress_pkey ON public.condominium_work_progress USING btree (id);
CREATE UNIQUE INDEX condominium_work_progress_work_id_progress_no_key ON public.condominium_work_progress USING btree (work_id, progress_no);
CREATE INDEX condominium_work_progress_work_idx ON public.condominium_work_progress USING btree (work_id, progress_date);
CREATE INDEX condominium_work_progress_workspace_fk_idx ON public.condominium_work_progress USING btree (workspace_id);
CREATE INDEX condominium_works_condominium_fk_idx ON public.condominium_works USING btree (condominium_id);
CREATE INDEX condominium_works_fund_idx ON public.condominium_works USING btree (fund_id);
CREATE UNIQUE INDEX condominium_works_pkey ON public.condominium_works USING btree (id);
CREATE INDEX condominium_works_register_item_fk_idx ON public.condominium_works USING btree (register_item_id);
CREATE INDEX condominium_works_supplier_fk_idx ON public.condominium_works USING btree (supplier_id);
CREATE INDEX condominium_works_workspace_condo_idx ON public.condominium_works USING btree (workspace_id, condominium_id, status);

```
