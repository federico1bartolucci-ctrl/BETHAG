-- BETHAG production schema reconstruction snapshot
-- Source: read-only PostgreSQL catalog introspection on production.
-- Schema-only; contains no user data. Snapshot, NOT a replay-safe migration.
-- Do not apply to production or replay before reviewing migration history.

create table public.activities (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  title text not null,
  status text,
  activity_date timestamp with time zone,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  constraint activities_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint activities_pkey PRIMARY KEY (id),
  constraint activities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint activities_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

create table public.assemblies (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  title text not null,
  assembly_date timestamp with time zone,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  constraint assemblies_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint assemblies_pkey PRIMARY KEY (id),
  constraint assemblies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint assemblies_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

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
  queued_at timestamp with time zone,
  constraint communication_recipients_communication_id_fkey FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE,
  constraint communication_recipients_condominium_fk FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint communication_recipients_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint communication_recipients_delivery_consistency_chk CHECK ((((status <> ALL (ARRAY['sent'::text, 'delivered'::text])) OR (provider_message_id IS NOT NULL)) AND ((status <> 'delivered'::text) OR (delivered_at IS NOT NULL)) AND ((status <> 'queued'::text) OR (queued_at IS NOT NULL)))),
  constraint communication_recipients_email_chk CHECK ((POSITION(('@'::text) IN (email)) > 1)),
  constraint communication_recipients_member_fk FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint communication_recipients_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint communication_recipients_pkey PRIMARY KEY (id),
  constraint communication_recipients_role_chk CHECK ((recipient_role = ANY (ARRAY['resident'::text, 'council'::text, 'owner'::text, 'tenant'::text]))),
  constraint communication_recipients_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]))),
  constraint communication_recipients_status_chk CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]))),
  constraint communication_recipients_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  constraint communication_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  constraint communication_recipients_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint communication_recipients_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.communications (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  title text not null,
  body text,
  published boolean not null default false,
  email_status text,
  email_prepared_at timestamp with time zone,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  constraint communications_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint communications_email_status_check CHECK (((email_status IS NULL) OR (email_status = ANY (ARRAY['prepared'::text, 'no_recipients'::text, 'In elaborazione'::text, 'Inviata'::text, 'Parzialmente inviata'::text, 'Errore'::text, 'Consegnata'::text])))),
  constraint communications_pkey PRIMARY KEY (id),
  constraint communications_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint communications_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_accounting_setting_ordinary_installment_count_check CHECK (((ordinary_installment_count >= 1) AND (ordinary_installment_count <= 12))),
  constraint condominium_accounting_settings_check CHECK ((accounting_start_date <= accounting_end_date)),
  constraint condominium_accounting_settings_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_accounting_settings_extraordinary_mode_check CHECK ((extraordinary_mode = ANY (ARRAY['integrata'::text, 'separata'::text]))),
  constraint condominium_accounting_settings_ordinary_due_dates_check CHECK ((COALESCE(array_length(ordinary_due_dates, 1), 0) <= 12)),
  constraint condominium_accounting_settings_pkey PRIMARY KEY (id),
  constraint condominium_accounting_settings_workspace_id_condominium_id_key UNIQUE (workspace_id, condominium_id),
  constraint condominium_accounting_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint allocation_intake_amount_ck CHECK (((expense_amount IS NULL) OR (expense_amount >= (0)::numeric))),
  constraint allocation_intake_source_ck CHECK ((source = ANY (ARRAY['Manuale'::text, 'AI'::text, 'Importazione'::text]))),
  constraint allocation_intake_status_ck CHECK ((status = ANY (ARRAY['Bozza'::text, 'Da verificare'::text, 'Confermato'::text, 'Annullato'::text]))),
  constraint condominium_allocation_intakes_allocation_table_id_fkey FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE SET NULL,
  constraint condominium_allocation_intakes_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_allocation_intakes_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint condominium_allocation_intakes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint condominium_allocation_intakes_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  constraint condominium_allocation_intakes_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL,
  constraint condominium_allocation_intakes_pkey PRIMARY KEY (id),
  constraint condominium_allocation_intakes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint allocation_rules_priority_ck CHECK ((priority >= 0)),
  constraint allocation_rules_scope_ck CHECK (((NULLIF(TRIM(BOTH FROM COALESCE(expense_type, ''::text)), ''::text) IS NOT NULL) OR (NULLIF(TRIM(BOTH FROM COALESCE(category, ''::text)), ''::text) IS NOT NULL))),
  constraint condominium_allocation_rules_allocation_table_id_fkey FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE RESTRICT,
  constraint condominium_allocation_rules_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_allocation_rules_pkey PRIMARY KEY (id),
  constraint condominium_allocation_rules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  created_at timestamp with time zone not null default now(),
  constraint condominium_audit_log_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_audit_log_pkey PRIMARY KEY (id),
  constraint condominium_audit_log_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_budgets_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_budgets_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL,
  constraint condominium_budgets_pkey PRIMARY KEY (id),
  constraint condominium_budgets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_consumption_readings_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_consumption_readings_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL,
  constraint condominium_consumption_readings_pkey PRIMARY KEY (id),
  constraint condominium_consumption_readings_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE CASCADE,
  constraint condominium_consumption_readings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint consumption_nonnegative_ck CHECK (((COALESCE(previous_reading, (0)::numeric) >= (0)::numeric) AND (COALESCE(current_reading, (0)::numeric) >= (0)::numeric) AND (COALESCE(consumption, (0)::numeric) >= (0)::numeric) AND (COALESCE(kwh, (0)::numeric) >= (0)::numeric) AND (COALESCE(allocation_value, (0)::numeric) >= (0)::numeric) AND (COALESCE(charge_amount, (0)::numeric) >= (0)::numeric))),
  constraint consumption_period_ck CHECK (((period_start IS NULL) OR (period_end IS NULL) OR (period_start <= period_end))),
  constraint consumption_reading_ck CHECK (((current_reading IS NULL) OR (previous_reading IS NULL) OR (current_reading >= previous_reading)))
);

create table public.condominium_creation_intakes (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  status text not null default 'Bozza'::text,
  source text not null default 'AI'::text,
  source_documents jsonb not null default '[]'::jsonb,
  extracted_data jsonb not null default '{}'::jsonb,
  structure jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  notes text not null default ''::text,
  created_by uuid,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_condominium_id uuid,
  constraint condominium_creation_intakes_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id),
  constraint condominium_creation_intakes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  constraint condominium_creation_intakes_created_condominium_id_fkey FOREIGN KEY (created_condominium_id) REFERENCES condominiums(id) ON DELETE SET NULL,
  constraint condominium_creation_intakes_extracted_object CHECK ((jsonb_typeof(extracted_data) = 'object'::text)),
  constraint condominium_creation_intakes_pkey PRIMARY KEY (id),
  constraint condominium_creation_intakes_source_check CHECK ((source = ANY (ARRAY['AI'::text, 'Importazione'::text, 'Manuale'::text]))),
  constraint condominium_creation_intakes_source_documents_array CHECK ((jsonb_typeof(source_documents) = 'array'::text)),
  constraint condominium_creation_intakes_status_check CHECK ((status = ANY (ARRAY['Bozza'::text, 'Da verificare'::text, 'Confermato'::text, 'Annullato'::text]))),
  constraint condominium_creation_intakes_structure_object CHECK ((jsonb_typeof(structure) = 'object'::text)),
  constraint condominium_creation_intakes_validation_array CHECK ((jsonb_typeof(validation_errors) = 'array'::text)),
  constraint condominium_creation_intakes_warnings_array CHECK ((jsonb_typeof(warnings) = 'array'::text)),
  constraint condominium_creation_intakes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  allocation_table_id uuid,
  constraint condominium_expense_allocations_allocation_table_id_fkey FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE SET NULL,
  constraint condominium_expense_allocations_amount_nonnegative_chk CHECK ((amount >= (0)::numeric)),
  constraint condominium_expense_allocations_amounts_valid CHECK (((amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (paid_amount <= amount))),
  constraint condominium_expense_allocations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_expense_allocations_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE CASCADE,
  constraint condominium_expense_allocations_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint condominium_expense_allocations_paid_amount_valid_chk CHECK (((paid_amount >= (0)::numeric) AND (paid_amount <= amount))),
  constraint condominium_expense_allocations_pkey PRIMARY KEY (id),
  constraint condominium_expense_allocations_status_amount_consistent CHECK ((((status = 'Da pagare'::text) AND (paid_amount = (0)::numeric)) OR ((status = 'Parzialmente pagato'::text) AND (paid_amount > (0)::numeric) AND (paid_amount < amount)) OR ((status = 'Pagato'::text) AND (abs((paid_amount - amount)) <= 0.005)) OR ((status = 'Scaduto'::text) AND (paid_amount >= (0)::numeric) AND (paid_amount < amount)))),
  constraint condominium_expense_allocations_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL,
  constraint condominium_expense_allocations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  created_at timestamp with time zone not null default now(),
  constraint condominium_fiscal_carryover_compens_target_installment_id_fkey FOREIGN KEY (target_installment_id) REFERENCES condominium_installments(id) ON DELETE RESTRICT,
  constraint condominium_fiscal_carryover_compensations_amount_positive CHECK ((amount > (0)::numeric)),
  constraint condominium_fiscal_carryover_compensations_carryover_id_fkey FOREIGN KEY (carryover_id) REFERENCES condominium_fiscal_carryovers(id) ON DELETE RESTRICT,
  constraint condominium_fiscal_carryover_compensations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE RESTRICT,
  constraint condominium_fiscal_carryover_compensations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  constraint condominium_fiscal_carryover_compensations_pkey PRIMARY KEY (id)
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_fiscal_carryovers_kind_check CHECK ((kind = ANY (ARRAY['Debito'::text, 'Credito'::text]))),
  constraint condominium_fiscal_carryovers_pkey PRIMARY KEY (id),
  constraint condominium_fiscal_carryovers_status_check CHECK ((status = ANY (ARRAY['Da riportare'::text, 'Parzialmente compensato'::text, 'Compensato'::text]))),
  constraint fiscal_carryovers_balance_kind CHECK ((((kind = 'Debito'::text) AND (balance > (0)::numeric)) OR ((kind = 'Credito'::text) AND (balance < (0)::numeric)))),
  constraint fiscal_carryovers_balance_nonzero CHECK ((abs(balance) >= 0.01)),
  constraint fiscal_carryovers_condominium_fk FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint fiscal_carryovers_member_fk FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint fiscal_carryovers_source_year_fk FOREIGN KEY (source_fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE RESTRICT,
  constraint fiscal_carryovers_target_year_fk FOREIGN KEY (target_fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE RESTRICT,
  constraint fiscal_carryovers_unit_fk FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT,
  constraint fiscal_carryovers_workspace_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_fiscal_years_check CHECK ((end_date >= start_date)),
  constraint condominium_fiscal_years_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_fiscal_years_no_overlap EXCLUDE USING gist (workspace_id WITH =, condominium_id WITH =, daterange(start_date, end_date, '[]'::text) WITH &&),
  constraint condominium_fiscal_years_opening_balance_finite CHECK ((opening_balance = opening_balance)),
  constraint condominium_fiscal_years_pkey PRIMARY KEY (id),
  constraint condominium_fiscal_years_valid_dates CHECK ((start_date <= end_date)),
  constraint condominium_fiscal_years_valid_range CHECK ((start_date <= end_date)),
  constraint condominium_fiscal_years_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_funds_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_funds_nonnegative_amounts CHECK (((target_amount >= (0)::numeric) AND (allocated_amount >= (0)::numeric) AND (used_amount >= (0)::numeric))),
  constraint condominium_funds_pkey PRIMARY KEY (id),
  constraint condominium_funds_used_lte_allocated CHECK ((used_amount <= allocated_amount)),
  constraint condominium_funds_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  ledger_entry_id uuid,
  constraint condominium_installments_amount_positive_chk CHECK ((amount > (0)::numeric)),
  constraint condominium_installments_amounts_valid CHECK (((amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (paid_amount <= amount))),
  constraint condominium_installments_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_installments_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL,
  constraint condominium_installments_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE RESTRICT,
  constraint condominium_installments_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint condominium_installments_paid_amount_valid_chk CHECK (((paid_amount >= (0)::numeric) AND (paid_amount <= amount))),
  constraint condominium_installments_pkey PRIMARY KEY (id),
  constraint condominium_installments_status_amount_consistent CHECK ((((status = 'Da pagare'::text) AND (paid_amount = (0)::numeric)) OR ((status = 'Parzialmente pagato'::text) AND (paid_amount > (0)::numeric) AND (paid_amount < amount)) OR ((status = 'Pagato'::text) AND (abs((paid_amount - amount)) <= 0.005)) OR ((status = 'Scaduto'::text) AND (paid_amount >= (0)::numeric) AND (paid_amount < amount)) OR ((status = 'Accorpata'::text) AND (paid_amount >= (0)::numeric) AND (paid_amount <= amount)))),
  constraint condominium_installments_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL,
  constraint condominium_installments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.condominium_insurance_policies (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  company_name text not null default ''::text,
  policy_number text not null default ''::text,
  policy_type text not null default 'Globale fabbricati'::text,
  coverage text not null default ''::text,
  start_date date,
  end_date date,
  premium numeric(12,2) not null default 0,
  deductible numeric(12,2) not null default 0,
  contact_name text not null default ''::text,
  contact_email text not null default ''::text,
  contact_phone text not null default ''::text,
  notes text not null default ''::text,
  document_id bigint,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint condominium_insurance_policies_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_insurance_policies_dates_valid CHECK (((start_date IS NULL) OR (end_date IS NULL) OR (end_date >= start_date))),
  constraint condominium_insurance_policies_deductible_nonnegative CHECK (((deductible IS NULL) OR (deductible >= (0)::numeric))),
  constraint condominium_insurance_policies_pkey PRIMARY KEY (id),
  constraint condominium_insurance_policies_premium_nonnegative CHECK (((premium IS NULL) OR (premium >= (0)::numeric))),
  constraint condominium_insurance_policies_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  assembly_id uuid,
  constraint condominium_ledger_entries_amount_check CHECK ((amount >= (0)::numeric)),
  constraint condominium_ledger_entries_assembly_fk FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_ledger_entries_direction_check CHECK ((direction = ANY (ARRAY['Entrata'::text, 'Uscita'::text]))),
  constraint condominium_ledger_entries_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_expense_type_check CHECK ((expense_type = ANY (ARRAY['Ordinaria'::text, 'Straordinaria'::text]))),
  constraint condominium_ledger_entries_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES condominium_funds(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_payment_status_check CHECK ((payment_status = ANY (ARRAY['Registrato'::text, 'Da pagare'::text, 'Parzialmente pagato'::text, 'Pagato'::text, 'Scaduto'::text]))),
  constraint condominium_ledger_entries_pkey PRIMARY KEY (id),
  constraint condominium_ledger_entries_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL,
  constraint condominium_ledger_entries_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_legal_cases_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_legal_cases_dates_valid CHECK (((closed_date IS NULL) OR (opened_date IS NULL) OR (closed_date >= opened_date))),
  constraint condominium_legal_cases_pkey PRIMARY KEY (id),
  constraint condominium_legal_cases_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  closed_by uuid,
  constraint condominium_member_transfers_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id),
  constraint condominium_member_transfers_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_member_transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint condominium_member_transfers_incoming_member_id_fkey FOREIGN KEY (incoming_member_id) REFERENCES condominium_members(id) ON DELETE RESTRICT,
  constraint condominium_member_transfers_outgoing_member_id_fkey FOREIGN KEY (outgoing_member_id) REFERENCES condominium_members(id) ON DELETE RESTRICT,
  constraint condominium_member_transfers_pkey PRIMARY KEY (id),
  constraint condominium_member_transfers_status_check CHECK ((status = ANY (ARRAY['Bozza'::text, 'Confermato'::text, 'Chiuso'::text, 'Annullato'::text]))),
  constraint condominium_member_transfers_status_ck CHECK ((status = ANY (ARRAY['Bozza'::text, 'Confermato'::text, 'Annullato'::text]))),
  constraint condominium_member_transfers_type_ck CHECK ((transfer_type = ANY (ARRAY['Vendita'::text, 'Acquisto'::text, 'Donazione'::text, 'Successione'::text, 'Altro'::text]))),
  constraint condominium_member_transfers_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT,
  constraint condominium_member_transfers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.condominium_members (
  id uuid not null default gen_random_uuid(),
  condominium_id uuid not null,
  user_id uuid,
  name text not null,
  email text,
  role text not null default 'resident'::text,
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  unit_id uuid,
  constraint condominium_members_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_members_condominium_legacy_unique UNIQUE (condominium_id, legacy_id),
  constraint condominium_members_pkey PRIMARY KEY (id),
  constraint condominium_members_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL,
  constraint condominium_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
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
  scope_building_codes text[] not null default '{}'::text[],
  constraint condominium_millesimal_tables_basis_type_check CHECK ((basis_type = ANY (ARRAY['Millesimi'::text, 'Quote personalizzate'::text, 'Consumo'::text, 'Misto'::text]))),
  constraint condominium_millesimal_tables_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_millesimal_tables_pkey PRIMARY KEY (id),
  constraint condominium_millesimal_tables_scope_mode_check CHECK ((scope_mode = ANY (ARRAY['all'::text, 'units'::text, 'buildings'::text]))),
  constraint condominium_millesimal_tables_total_positive CHECK ((total_millesimi > (0)::numeric)),
  constraint condominium_millesimal_tables_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_millesimal_values_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_millesimal_values_pkey PRIMARY KEY (id),
  constraint condominium_millesimal_values_table_id_fkey FOREIGN KEY (table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE CASCADE,
  constraint condominium_millesimal_values_table_id_unit_id_key UNIQUE (table_id, unit_id),
  constraint condominium_millesimal_values_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE CASCADE,
  constraint condominium_millesimal_values_value_nonnegative CHECK ((value >= (0)::numeric)),
  constraint condominium_millesimal_values_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  created_at timestamp with time zone not null default now(),
  constraint condominium_payment_movements_amount_valid CHECK ((amount > (0)::numeric)),
  constraint condominium_payment_movements_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_payment_movements_installment_id_fkey FOREIGN KEY (installment_id) REFERENCES condominium_installments(id) ON DELETE CASCADE,
  constraint condominium_payment_movements_pkey PRIMARY KEY (id),
  constraint condominium_payment_movements_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  reversed_by uuid not null,
  constraint condominium_payment_reversal_audit_amount_check CHECK ((amount > (0)::numeric)),
  constraint condominium_payment_reversal_audit_original_payment_id_key UNIQUE (original_payment_id),
  constraint condominium_payment_reversal_audit_pkey PRIMARY KEY (id)
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
  estimated_amount numeric not null default 0,
  constraint condominium_register_items_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_register_items_pkey PRIMARY KEY (id),
  constraint condominium_register_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES condominium_suppliers(id) ON DELETE SET NULL,
  constraint condominium_register_items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.condominium_requests (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  member_id uuid,
  requester_user_id uuid,
  title text not null,
  description text,
  status text not null default 'Nuova'::text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  constraint condominium_requests_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_requests_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint condominium_requests_pkey PRIMARY KEY (id),
  constraint condominium_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  constraint condominium_requests_status_check CHECK ((status = ANY (ARRAY['Nuova'::text, 'In lavorazione'::text, 'In attesa'::text, 'Risolta'::text, 'Chiusa'::text, 'Annullata'::text]))),
  constraint condominium_requests_title_not_blank_chk CHECK ((length(btrim(title)) > 0)),
  constraint condominium_requests_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint condominium_requests_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_suppliers_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_suppliers_pkey PRIMARY KEY (id),
  constraint condominium_suppliers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  updated_at timestamp with time zone not null default now(),
  constraint condominium_tax_obligations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_tax_obligations_nonnegative_amount CHECK (((amount IS NULL) OR (amount >= (0)::numeric))),
  constraint condominium_tax_obligations_pkey PRIMARY KEY (id),
  constraint condominium_tax_obligations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.condominium_unit_transformation_items (
  id uuid not null default gen_random_uuid(),
  transformation_id uuid not null,
  unit_id uuid not null,
  direction text not null,
  sequence_no integer not null default 1,
  unit_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint condominium_unit_transformati_transformation_id_direction_s_key UNIQUE (transformation_id, direction, sequence_no),
  constraint condominium_unit_transformati_transformation_id_unit_id_dir_key UNIQUE (transformation_id, unit_id, direction),
  constraint condominium_unit_transformation_items_direction_check CHECK ((direction = ANY (ARRAY['Fonte'::text, 'Destinazione'::text]))),
  constraint condominium_unit_transformation_items_pkey PRIMARY KEY (id),
  constraint condominium_unit_transformation_items_sequence_no_check CHECK ((sequence_no > 0)),
  constraint condominium_unit_transformation_items_transformation_id_fkey FOREIGN KEY (transformation_id) REFERENCES condominium_unit_transformations(id) ON DELETE CASCADE,
  constraint condominium_unit_transformation_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT
);

create table public.condominium_unit_transformations (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  transformation_type text not null,
  status text not null default 'Bozza'::text,
  effective_date date not null,
  cadastral_protocol text not null default ''::text,
  cadastral_protocol_date date,
  accounting_resolution_status text not null default 'Da verificare'::text,
  millesimal_review_status text not null default 'Da verificare'::text,
  notes text not null default ''::text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid,
  confirmed_by uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  confirmed_at timestamp with time zone,
  millesimal_snapshot jsonb not null default '{}'::jsonb,
  accounting_snapshot jsonb not null default '{}'::jsonb,
  source_unit_count integer not null default 0,
  destination_unit_count integer not null default 0,
  constraint condominium_unit_transformat_accounting_resolution_status_check CHECK ((accounting_resolution_status = ANY (ARRAY['Da verificare'::text, 'Non necessaria'::text, 'Risolta'::text]))),
  constraint condominium_unit_transformations_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE RESTRICT,
  constraint condominium_unit_transformations_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id),
  constraint condominium_unit_transformations_confirmed_integrity_chk CHECK (((status <> 'Confermata'::text) OR ((confirmed_by IS NOT NULL) AND (confirmed_at IS NOT NULL) AND (source_unit_count > 0) AND (destination_unit_count > 0) AND (((transformation_type = 'Fusione'::text) AND (source_unit_count >= 2) AND (destination_unit_count = 1)) OR ((transformation_type = 'Frazionamento'::text) AND (source_unit_count = 1) AND (destination_unit_count >= 2)))))),
  constraint condominium_unit_transformations_confirmed_reviews_chk CHECK (((status <> 'Confermata'::text) OR ((accounting_resolution_status = ANY (ARRAY['Non necessaria'::text, 'Risolta'::text])) AND (millesimal_review_status = ANY (ARRAY['Confermata invariata'::text, 'Nuove tabelle'::text]))))),
  constraint condominium_unit_transformations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  constraint condominium_unit_transformations_millesimal_review_status_check CHECK ((millesimal_review_status = ANY (ARRAY['Da verificare'::text, 'Confermata invariata'::text, 'Nuove tabelle'::text, 'Da aggiornare'::text]))),
  constraint condominium_unit_transformations_pkey PRIMARY KEY (id),
  constraint condominium_unit_transformations_status_check CHECK ((status = ANY (ARRAY['Bozza'::text, 'Confermata'::text, 'Annullata'::text]))),
  constraint condominium_unit_transformations_transformation_type_check CHECK ((transformation_type = ANY (ARRAY['Fusione'::text, 'Frazionamento'::text]))),
  constraint condominium_unit_transformations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
);

create table public.condominium_units (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  legacy_id bigint,
  unit_code text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  building_code text not null default ''::text,
  lifecycle_status text not null default 'Attiva'::text,
  lifecycle_effective_date date,
  superseded_at timestamp with time zone,
  constraint condominium_units_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_units_lifecycle_status_check CHECK ((lifecycle_status = ANY (ARRAY['Attiva'::text, 'Storica'::text, 'Soppressa'::text]))),
  constraint condominium_units_pkey PRIMARY KEY (id),
  constraint condominium_units_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint trg_validate_unit_owner_member_refs TRIGGER DEFERRABLE INITIALLY DEFERRED
);

create table public.condominium_work_documents (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  work_id uuid not null,
  document_id bigint,
  title text not null default ''::text,
  notes text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  constraint condominium_work_documents_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_work_documents_pkey PRIMARY KEY (id),
  constraint condominium_work_documents_work_id_fkey FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE,
  constraint condominium_work_documents_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  created_at timestamp with time zone not null default now(),
  constraint condominium_work_events_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_work_events_pkey PRIMARY KEY (id),
  constraint condominium_work_events_work_id_fkey FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE,
  constraint condominium_work_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  payment_entry_id uuid,
  constraint condominium_work_progress_amounts_chk CHECK (((amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (paid_amount <= amount))),
  constraint condominium_work_progress_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_work_progress_financial_consistency_chk CHECK (((progress_no > 0) AND (amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (paid_amount <= (amount + 0.005)) AND (percentage >= (0)::numeric) AND (percentage <= (100)::numeric))),
  constraint condominium_work_progress_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL,
  constraint condominium_work_progress_payment_entry_id_fkey FOREIGN KEY (payment_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL,
  constraint condominium_work_progress_percentage_chk CHECK (((percentage >= (0)::numeric) AND (percentage <= (100)::numeric))),
  constraint condominium_work_progress_pkey PRIMARY KEY (id),
  constraint condominium_work_progress_work_id_fkey FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE,
  constraint condominium_work_progress_work_id_progress_no_key UNIQUE (work_id, progress_no),
  constraint condominium_work_progress_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
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
  payment_status text not null default 'Nessun importo'::text,
  constraint condominium_works_amounts_chk CHECK (((estimated_amount >= (0)::numeric) AND (approved_amount >= (0)::numeric) AND (actual_amount >= (0)::numeric))),
  constraint condominium_works_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint condominium_works_financial_consistency_chk CHECK (((estimated_amount >= (0)::numeric) AND (approved_amount >= (0)::numeric) AND (actual_amount >= (0)::numeric) AND (paid_amount >= (0)::numeric) AND (remaining_amount >= (0)::numeric) AND (paid_amount <= (actual_amount + 0.005)) AND (abs((remaining_amount - GREATEST((actual_amount - paid_amount), (0)::numeric))) <= 0.005))),
  constraint condominium_works_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES condominium_funds(id) ON DELETE SET NULL,
  constraint condominium_works_paid_amount_check CHECK ((paid_amount >= (0)::numeric)),
  constraint condominium_works_payment_status_check CHECK ((payment_status = ANY (ARRAY['Nessun importo'::text, 'Da pagare'::text, 'Parzialmente pagato'::text, 'Pagato'::text]))),
  constraint condominium_works_pkey PRIMARY KEY (id),
  constraint condominium_works_progress_chk CHECK (((progress_percent >= (0)::numeric) AND (progress_percent <= (100)::numeric))),
  constraint condominium_works_register_item_id_fkey FOREIGN KEY (register_item_id) REFERENCES condominium_register_items(id) ON DELETE SET NULL,
  constraint condominium_works_remaining_amount_check CHECK ((remaining_amount >= (0)::numeric)),
  constraint condominium_works_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES condominium_suppliers(id) ON DELETE SET NULL,
  constraint condominium_works_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.condominiums (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  address text,
  city text,
  postal_code text,
  province text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  archived_at timestamp with time zone,
  archived_by uuid,
  archive_reason text,
  constraint condominiums_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES profiles(id),
  constraint condominiums_pkey PRIMARY KEY (id),
  constraint condominiums_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint condominiums_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

create table public.deadlines (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  title text not null,
  due_date date,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  constraint deadlines_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint deadlines_pkey PRIMARY KEY (id),
  constraint deadlines_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint deadlines_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

create table public.documents (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  title text not null,
  category text,
  status text,
  file_path text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  file_size_bytes bigint,
  constraint documents_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint documents_file_size_nonnegative_chk CHECK (((file_size_bytes IS NULL) OR (file_size_bytes >= 0))),
  constraint documents_pkey PRIMARY KEY (id),
  constraint documents_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint documents_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

create table public.portal_access (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid not null,
  legacy_id bigint,
  name text not null,
  email text not null,
  role text not null default 'resident'::text,
  apartment text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  user_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  member_id uuid,
  constraint portal_access_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint portal_access_member_id_fkey FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint portal_access_pkey PRIMARY KEY (id),
  constraint portal_access_role_check CHECK ((role = ANY (ARRAY['resident'::text, 'council'::text]))),
  constraint portal_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  constraint portal_access_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint portal_access_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

create table public.portal_registration_requests (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid,
  requested_user_id uuid,
  matched_member_id uuid,
  email text not null,
  full_name text not null,
  fiscal_code text,
  condominium_name text,
  status text not null default 'pending'::text,
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  constraint portal_registration_requests_matched_member_id_fkey FOREIGN KEY (matched_member_id) REFERENCES condominium_members(id) ON DELETE SET NULL,
  constraint portal_registration_requests_pkey PRIMARY KEY (id),
  constraint portal_registration_requests_requested_user_id_fkey FOREIGN KEY (requested_user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  constraint portal_registration_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL,
  constraint portal_registration_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'email_mismatch'::text, 'approved'::text, 'rejected'::text]))),
  constraint portal_registration_requests_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.profiles (
  id uuid not null,
  full_name text,
  email text,
  role text not null default 'resident'::text,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint profiles_pkey PRIMARY KEY (id),
  constraint profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'collaborator'::text, 'resident'::text, 'council'::text])))
);

create table public.suppliers (
  id uuid not null default gen_random_uuid(),
  workspace_id uuid not null,
  condominium_id uuid,
  name text not null,
  category text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  legacy_id bigint,
  constraint suppliers_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint suppliers_pkey PRIMARY KEY (id),
  constraint suppliers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  constraint suppliers_workspace_legacy_unique UNIQUE (workspace_id, legacy_id)
);

create table public.user_security_settings (
  user_id uuid not null,
  personal_code_hash text,
  personal_code_enabled boolean not null default false,
  updated_at timestamp with time zone not null default now(),
  constraint user_security_settings_pkey PRIMARY KEY (user_id),
  constraint user_security_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

create table public.workspace_members (
  workspace_id uuid not null,
  user_id uuid not null,
  role text not null,
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  condominium_id uuid,
  legacy_id bigint,
  constraint workspace_members_condominium_id_fkey FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE,
  constraint workspace_members_pkey PRIMARY KEY (workspace_id, user_id),
  constraint workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'collaborator'::text, 'resident'::text, 'council'::text]))),
  constraint workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  constraint workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

create table public.workspaces (
  id uuid not null default gen_random_uuid(),
  name text not null,
  plan text not null default 'free'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint workspaces_pkey PRIMARY KEY (id)
);

alter table public.activities enable row level security;
alter table public.assemblies enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.communications enable row level security;
alter table public.condominium_accounting_settings enable row level security;
alter table public.condominium_allocation_intakes enable row level security;
alter table public.condominium_allocation_rules enable row level security;
alter table public.condominium_audit_log enable row level security;
alter table public.condominium_budgets enable row level security;
alter table public.condominium_consumption_readings enable row level security;
alter table public.condominium_creation_intakes enable row level security;
alter table public.condominium_expense_allocations enable row level security;
alter table public.condominium_fiscal_carryover_compensations enable row level security;
alter table public.condominium_fiscal_carryovers enable row level security;
alter table public.condominium_fiscal_years enable row level security;
alter table public.condominium_funds enable row level security;
alter table public.condominium_installments enable row level security;
alter table public.condominium_insurance_policies enable row level security;
alter table public.condominium_ledger_entries enable row level security;
alter table public.condominium_legal_cases enable row level security;
alter table public.condominium_member_transfers enable row level security;
alter table public.condominium_members enable row level security;
alter table public.condominium_millesimal_tables enable row level security;
alter table public.condominium_millesimal_values enable row level security;
alter table public.condominium_payment_movements enable row level security;
alter table public.condominium_payment_reversal_audit enable row level security;
alter table public.condominium_register_items enable row level security;
alter table public.condominium_requests enable row level security;
alter table public.condominium_suppliers enable row level security;
alter table public.condominium_tax_obligations enable row level security;
alter table public.condominium_unit_transformation_items enable row level security;
alter table public.condominium_unit_transformations enable row level security;
alter table public.condominium_units enable row level security;
alter table public.condominium_work_documents enable row level security;
alter table public.condominium_work_events enable row level security;
alter table public.condominium_work_progress enable row level security;
alter table public.condominium_works enable row level security;
alter table public.condominiums enable row level security;
alter table public.deadlines enable row level security;
alter table public.documents enable row level security;
alter table public.portal_access enable row level security;
alter table public.portal_registration_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.user_security_settings enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspaces enable row level security;

CREATE INDEX activities_condominium_id_idx ON public.activities USING btree (condominium_id);
CREATE INDEX idx_activities_workspace ON public.activities USING btree (workspace_id);
CREATE UNIQUE INDEX uq_activities_workspace_legacy ON public.activities USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX assemblies_condominium_id_idx ON public.assemblies USING btree (condominium_id);
CREATE INDEX idx_assemblies_workspace ON public.assemblies USING btree (workspace_id);
CREATE UNIQUE INDEX uq_assemblies_workspace_legacy ON public.assemblies USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE UNIQUE INDEX communication_recipients_communication_email_uq ON public.communication_recipients USING btree (communication_id, lower(btrim(email)));
CREATE INDEX communication_recipients_condominium_id_idx ON public.communication_recipients USING btree (condominium_id);
CREATE INDEX communication_recipients_member_idx ON public.communication_recipients USING btree (member_id);
CREATE UNIQUE INDEX communication_recipients_provider_event_uq ON public.communication_recipients USING btree (provider_event_id) WHERE (provider_event_id IS NOT NULL);
CREATE INDEX communication_recipients_provider_message_idx ON public.communication_recipients USING btree (provider_message_id) WHERE (provider_message_id IS NOT NULL);
CREATE INDEX communication_recipients_stale_queued_idx ON public.communication_recipients USING btree (status, queued_at) WHERE (status = 'queued'::text);
CREATE INDEX communication_recipients_status_idx ON public.communication_recipients USING btree (communication_id, status);
CREATE INDEX communication_recipients_user_id_idx ON public.communication_recipients USING btree (user_id);
CREATE INDEX communication_recipients_workspace_idx ON public.communication_recipients USING btree (workspace_id);
CREATE INDEX communications_condominium_id_idx ON public.communications USING btree (condominium_id);
CREATE INDEX idx_communications_workspace ON public.communications USING btree (workspace_id);
CREATE UNIQUE INDEX uq_communications_workspace_legacy ON public.communications USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX condominium_accounting_settings_condo_idx ON public.condominium_accounting_settings USING btree (condominium_id);
CREATE INDEX condominium_allocation_intakes_allocation_table_id_idx ON public.condominium_allocation_intakes USING btree (allocation_table_id);
CREATE INDEX condominium_allocation_intakes_condominium_id_idx ON public.condominium_allocation_intakes USING btree (condominium_id);
CREATE INDEX condominium_allocation_intakes_confirmed_by_idx ON public.condominium_allocation_intakes USING btree (confirmed_by);
CREATE INDEX condominium_allocation_intakes_created_by_idx ON public.condominium_allocation_intakes USING btree (created_by);
CREATE INDEX condominium_allocation_intakes_document_id_idx ON public.condominium_allocation_intakes USING btree (document_id);
CREATE INDEX condominium_allocation_intakes_ledger_entry_id_idx ON public.condominium_allocation_intakes USING btree (ledger_entry_id);
CREATE INDEX condominium_allocation_intakes_lookup_idx ON public.condominium_allocation_intakes USING btree (workspace_id, condominium_id, status, created_at DESC);
CREATE INDEX condominium_allocation_rules_condominium_fk_idx ON public.condominium_allocation_rules USING btree (condominium_id);
CREATE INDEX condominium_allocation_rules_lookup_idx ON public.condominium_allocation_rules USING btree (workspace_id, condominium_id, active, priority, category, expense_type);
CREATE INDEX condominium_allocation_rules_table_fk_idx ON public.condominium_allocation_rules USING btree (allocation_table_id);
CREATE INDEX condominium_audit_log_condominium_fk_idx ON public.condominium_audit_log USING btree (condominium_id);
CREATE INDEX condominium_audit_log_scope_idx ON public.condominium_audit_log USING btree (workspace_id, condominium_id, created_at DESC);
CREATE INDEX condominium_budgets_condominium_fk_idx ON public.condominium_budgets USING btree (condominium_id);
CREATE INDEX condominium_budgets_fiscal_year_fk_idx ON public.condominium_budgets USING btree (fiscal_year_id);
CREATE INDEX condominium_budgets_workspace_year_idx ON public.condominium_budgets USING btree (workspace_id, condominium_id, fiscal_year_id);
CREATE INDEX condominium_consumption_readings_condominium_fk_idx ON public.condominium_consumption_readings USING btree (condominium_id);
CREATE INDEX condominium_consumption_readings_fiscal_year_fk_idx ON public.condominium_consumption_readings USING btree (fiscal_year_id);
CREATE INDEX condominium_consumption_readings_lookup_idx ON public.condominium_consumption_readings USING btree (workspace_id, condominium_id, fiscal_year_id, service_type, unit_id);
CREATE UNIQUE INDEX condominium_consumption_readings_unique_idx ON public.condominium_consumption_readings USING btree (workspace_id, condominium_id, fiscal_year_id, unit_id, service_type, meter_code, period_start, period_end);
CREATE INDEX condominium_consumption_readings_unit_fk_idx ON public.condominium_consumption_readings USING btree (unit_id);
CREATE INDEX condominium_creation_intakes_confirmed_by_idx ON public.condominium_creation_intakes USING btree (confirmed_by);
CREATE INDEX condominium_creation_intakes_created_by_idx ON public.condominium_creation_intakes USING btree (created_by);
CREATE INDEX condominium_creation_intakes_created_condominium_idx ON public.condominium_creation_intakes USING btree (created_condominium_id) WHERE (created_condominium_id IS NOT NULL);
CREATE INDEX condominium_creation_intakes_workspace_status_idx ON public.condominium_creation_intakes USING btree (workspace_id, status, created_at DESC);
CREATE INDEX idx_condominium_creation_intakes_status ON public.condominium_creation_intakes USING btree (workspace_id, status);
CREATE INDEX idx_condominium_creation_intakes_workspace ON public.condominium_creation_intakes USING btree (workspace_id, created_at DESC);
CREATE INDEX condominium_expense_allocations_condominium_idx ON public.condominium_expense_allocations USING btree (condominium_id);
CREATE INDEX condominium_expense_allocations_ledger_idx ON public.condominium_expense_allocations USING btree (ledger_entry_id);
CREATE INDEX condominium_expense_allocations_member_idx ON public.condominium_expense_allocations USING btree (member_id);
CREATE INDEX condominium_expense_allocations_table_idx ON public.condominium_expense_allocations USING btree (allocation_table_id);
CREATE INDEX condominium_expense_allocations_unit_idx ON public.condominium_expense_allocations USING btree (unit_id);
CREATE INDEX condominium_expense_allocations_workspace_idx ON public.condominium_expense_allocations USING btree (workspace_id);
CREATE INDEX condominium_expense_allocations_workspace_ledger_idx ON public.condominium_expense_allocations USING btree (workspace_id, condominium_id, ledger_entry_id);
CREATE INDEX condominium_fiscal_carryover_compensations_carryover_id_idx ON public.condominium_fiscal_carryover_compensations USING btree (carryover_id);
CREATE INDEX condominium_fiscal_carryover_compensations_condominium_id_idx ON public.condominium_fiscal_carryover_compensations USING btree (condominium_id);
CREATE INDEX condominium_fiscal_carryover_compensations_created_by_idx ON public.condominium_fiscal_carryover_compensations USING btree (created_by);
CREATE INDEX condominium_fiscal_carryover_compensations_target_installment_i ON public.condominium_fiscal_carryover_compensations USING btree (target_installment_id);
CREATE INDEX condominium_fiscal_carryovers_condominium_id_idx ON public.condominium_fiscal_carryovers USING btree (condominium_id);
CREATE INDEX condominium_fiscal_carryovers_member_id_idx ON public.condominium_fiscal_carryovers USING btree (member_id);
CREATE INDEX condominium_fiscal_carryovers_source_fiscal_year_id_idx ON public.condominium_fiscal_carryovers USING btree (source_fiscal_year_id);
CREATE INDEX condominium_fiscal_carryovers_target_fiscal_year_id_idx ON public.condominium_fiscal_carryovers USING btree (target_fiscal_year_id);
CREATE INDEX condominium_fiscal_carryovers_target_idx ON public.condominium_fiscal_carryovers USING btree (workspace_id, condominium_id, target_fiscal_year_id);
CREATE UNIQUE INDEX condominium_fiscal_carryovers_unique_period_position ON public.condominium_fiscal_carryovers USING btree (workspace_id, condominium_id, source_fiscal_year_id, target_fiscal_year_id, unit_id, COALESCE(member_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX condominium_fiscal_carryovers_unit_idx ON public.condominium_fiscal_carryovers USING btree (unit_id);
CREATE INDEX condominium_fiscal_years_condominium_idx ON public.condominium_fiscal_years USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_fiscal_years_unique ON public.condominium_fiscal_years USING btree (condominium_id, start_date, end_date);
CREATE INDEX condominium_fiscal_years_workspace_idx ON public.condominium_fiscal_years USING btree (workspace_id);
CREATE INDEX condominium_funds_condominium_idx ON public.condominium_funds USING btree (condominium_id);
CREATE INDEX condominium_funds_workspace_idx ON public.condominium_funds USING btree (workspace_id);
CREATE INDEX condominium_installments_condominium_idx ON public.condominium_installments USING btree (condominium_id);
CREATE INDEX condominium_installments_due_date_idx ON public.condominium_installments USING btree (due_date);
CREATE INDEX condominium_installments_fiscal_year_fk_idx ON public.condominium_installments USING btree (fiscal_year_id);
CREATE INDEX condominium_installments_member_idx ON public.condominium_installments USING btree (member_id);
CREATE INDEX condominium_installments_unit_idx ON public.condominium_installments USING btree (unit_id);
CREATE INDEX condominium_installments_workspace_idx ON public.condominium_installments USING btree (workspace_id);
CREATE INDEX idx_condominium_installments_ledger_entry_id ON public.condominium_installments USING btree (ledger_entry_id);
CREATE INDEX condominium_insurance_policies_condominium_id_idx ON public.condominium_insurance_policies USING btree (condominium_id);
CREATE INDEX condominium_insurance_policies_condominium_idx ON public.condominium_insurance_policies USING btree (condominium_id, end_date);
CREATE INDEX idx_condominium_insurance_policies_condo ON public.condominium_insurance_policies USING btree (workspace_id, condominium_id, end_date);
CREATE INDEX condominium_ledger_entries_assembly_id_idx ON public.condominium_ledger_entries USING btree (assembly_id);
CREATE INDEX condominium_ledger_entries_condominium_idx ON public.condominium_ledger_entries USING btree (condominium_id);
CREATE INDEX condominium_ledger_entries_deliberation_date_idx ON public.condominium_ledger_entries USING btree (condominium_id, deliberation_date) WHERE (deliberation_date IS NOT NULL);
CREATE INDEX condominium_ledger_entries_document_idx ON public.condominium_ledger_entries USING btree (document_id);
CREATE INDEX condominium_ledger_entries_fiscal_year_idx ON public.condominium_ledger_entries USING btree (fiscal_year_id);
CREATE INDEX condominium_ledger_entries_fund_idx ON public.condominium_ledger_entries USING btree (fund_id);
CREATE INDEX condominium_ledger_entries_lookup ON public.condominium_ledger_entries USING btree (condominium_id, entry_date);
CREATE INDEX condominium_ledger_entries_member_idx ON public.condominium_ledger_entries USING btree (member_id);
CREATE UNIQUE INDEX condominium_ledger_entries_outgoing_document_key ON public.condominium_ledger_entries USING btree (document_id) WHERE ((direction = 'Uscita'::text) AND (document_id IS NOT NULL));
CREATE INDEX condominium_ledger_entries_supplier_idx ON public.condominium_ledger_entries USING btree (supplier_id);
CREATE INDEX condominium_ledger_entries_unit_idx ON public.condominium_ledger_entries USING btree (unit_id);
CREATE INDEX condominium_ledger_entries_workspace_idx ON public.condominium_ledger_entries USING btree (workspace_id);
CREATE INDEX condominium_legal_cases_condominium_idx ON public.condominium_legal_cases USING btree (condominium_id);
CREATE INDEX condominium_legal_cases_workspace_idx ON public.condominium_legal_cases USING btree (workspace_id);
CREATE INDEX condominium_member_transfers_closed_by_idx ON public.condominium_member_transfers USING btree (closed_by);
CREATE INDEX condominium_member_transfers_condo_date_idx ON public.condominium_member_transfers USING btree (condominium_id, transfer_date DESC);
CREATE INDEX condominium_member_transfers_created_by_idx ON public.condominium_member_transfers USING btree (created_by);
CREATE INDEX condominium_member_transfers_incoming_member_id_idx ON public.condominium_member_transfers USING btree (incoming_member_id);
CREATE INDEX condominium_member_transfers_outgoing_member_id_idx ON public.condominium_member_transfers USING btree (outgoing_member_id);
CREATE INDEX condominium_member_transfers_unit_date_idx ON public.condominium_member_transfers USING btree (unit_id, transfer_date DESC);
CREATE INDEX condominium_member_transfers_workspace_id_idx ON public.condominium_member_transfers USING btree (workspace_id);
CREATE INDEX condominium_members_unit_idx ON public.condominium_members USING btree (unit_id);
CREATE INDEX condominium_members_user_id_idx ON public.condominium_members USING btree (user_id);
CREATE UNIQUE INDEX uq_members_condominium_legacy ON public.condominium_members USING btree (condominium_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE UNIQUE INDEX condominium_millesimal_tables_active_one_uidx ON public.condominium_millesimal_tables USING btree (condominium_id) WHERE active;
CREATE INDEX condominium_millesimal_tables_condominium_idx ON public.condominium_millesimal_tables USING btree (condominium_id);
CREATE INDEX condominium_millesimal_tables_scope_mode_idx ON public.condominium_millesimal_tables USING btree (workspace_id, condominium_id, scope_mode);
CREATE UNIQUE INDEX condominium_millesimal_tables_workspace_condominium_name_uidx ON public.condominium_millesimal_tables USING btree (workspace_id, condominium_id, lower(btrim(name)));
CREATE INDEX condominium_millesimal_tables_workspace_idx ON public.condominium_millesimal_tables USING btree (workspace_id);
CREATE INDEX condominium_millesimal_values_condominium_fk_idx ON public.condominium_millesimal_values USING btree (condominium_id);
CREATE INDEX condominium_millesimal_values_table_idx ON public.condominium_millesimal_values USING btree (table_id);
CREATE INDEX condominium_millesimal_values_unit_idx ON public.condominium_millesimal_values USING btree (unit_id);
CREATE INDEX condominium_millesimal_values_workspace_idx ON public.condominium_millesimal_values USING btree (workspace_id);
CREATE UNIQUE INDEX condominium_millesimal_values_workspace_table_unit_uidx ON public.condominium_millesimal_values USING btree (workspace_id, table_id, unit_id);
CREATE INDEX condominium_payment_movements_condominium_fk_idx ON public.condominium_payment_movements USING btree (condominium_id);
CREATE INDEX condominium_payment_movements_installment_idx ON public.condominium_payment_movements USING btree (installment_id);
CREATE INDEX condominium_payment_movements_workspace_idx ON public.condominium_payment_movements USING btree (workspace_id);
CREATE INDEX condominium_register_items_condominium_fk_idx ON public.condominium_register_items USING btree (condominium_id);
CREATE INDEX condominium_register_items_supplier_idx ON public.condominium_register_items USING btree (supplier_id);
CREATE INDEX condominium_register_items_workspace_condo_idx ON public.condominium_register_items USING btree (workspace_id, condominium_id, item_type, expiry_date);
CREATE INDEX condominium_requests_condominium_id_idx ON public.condominium_requests USING btree (condominium_id);
CREATE INDEX condominium_requests_condominium_status_idx ON public.condominium_requests USING btree (condominium_id, status, created_at DESC);
CREATE INDEX condominium_requests_member_id_idx ON public.condominium_requests USING btree (member_id);
CREATE INDEX condominium_requests_requester_idx ON public.condominium_requests USING btree (requester_user_id, created_at DESC) WHERE (requester_user_id IS NOT NULL);
CREATE INDEX condominium_requests_requester_user_id_idx ON public.condominium_requests USING btree (requester_user_id);
CREATE INDEX idx_requests_workspace ON public.condominium_requests USING btree (workspace_id);
CREATE UNIQUE INDEX uq_requests_workspace_legacy ON public.condominium_requests USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX condominium_suppliers_condominium_fk_idx ON public.condominium_suppliers USING btree (condominium_id);
CREATE INDEX condominium_suppliers_workspace_condo_idx ON public.condominium_suppliers USING btree (workspace_id, condominium_id, category);
CREATE INDEX condominium_tax_obligations_condominium_idx ON public.condominium_tax_obligations USING btree (condominium_id);
CREATE INDEX condominium_tax_obligations_workspace_idx ON public.condominium_tax_obligations USING btree (workspace_id);
CREATE INDEX idx_unit_transform_items_transformation ON public.condominium_unit_transformation_items USING btree (transformation_id);
CREATE INDEX idx_unit_transform_items_unit ON public.condominium_unit_transformation_items USING btree (unit_id);
CREATE INDEX idx_unit_transformations_condo_date ON public.condominium_unit_transformations USING btree (condominium_id, effective_date DESC);
CREATE INDEX idx_unit_transformations_confirmed_by ON public.condominium_unit_transformations USING btree (confirmed_by);
CREATE INDEX idx_unit_transformations_created_by ON public.condominium_unit_transformations USING btree (created_by);
CREATE INDEX idx_unit_transformations_status ON public.condominium_unit_transformations USING btree (status);
CREATE INDEX idx_unit_transformations_workspace ON public.condominium_unit_transformations USING btree (workspace_id);
CREATE INDEX condominium_units_building_code_idx ON public.condominium_units USING btree (workspace_id, condominium_id, building_code);
CREATE UNIQUE INDEX condominium_units_code_building_uq ON public.condominium_units USING btree (condominium_id, lower(btrim(building_code)), lower(btrim(unit_code)));
CREATE INDEX condominium_units_code_lookup_idx ON public.condominium_units USING btree (condominium_id, unit_code);
CREATE INDEX condominium_units_condominium_idx ON public.condominium_units USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_units_condominium_unit_code_normalized_uidx ON public.condominium_units USING btree (condominium_id, lower(TRIM(BOTH FROM unit_code)));
CREATE UNIQUE INDEX condominium_units_unique_unit ON public.condominium_units USING btree (condominium_id, lower(btrim(unit_code)));
CREATE INDEX condominium_units_workspace_idx ON public.condominium_units USING btree (workspace_id);
CREATE INDEX condominium_work_documents_condominium_fk_idx ON public.condominium_work_documents USING btree (condominium_id);
CREATE UNIQUE INDEX condominium_work_documents_work_document_key ON public.condominium_work_documents USING btree (work_id, document_id);
CREATE INDEX condominium_work_documents_work_idx ON public.condominium_work_documents USING btree (work_id);
CREATE INDEX condominium_work_documents_workspace_document_idx ON public.condominium_work_documents USING btree (workspace_id, document_id);
CREATE INDEX condominium_work_documents_workspace_fk_idx ON public.condominium_work_documents USING btree (workspace_id);
CREATE INDEX condominium_work_events_condominium_fk_idx ON public.condominium_work_events USING btree (condominium_id);
CREATE INDEX condominium_work_events_work_idx ON public.condominium_work_events USING btree (work_id, event_date);
CREATE INDEX condominium_work_events_workspace_fk_idx ON public.condominium_work_events USING btree (workspace_id);
CREATE INDEX condominium_work_progress_condominium_fk_idx ON public.condominium_work_progress USING btree (condominium_id);
CREATE INDEX condominium_work_progress_ledger_entry_idx ON public.condominium_work_progress USING btree (ledger_entry_id) WHERE (ledger_entry_id IS NOT NULL);
CREATE INDEX condominium_work_progress_ledger_idx ON public.condominium_work_progress USING btree (ledger_entry_id, payment_entry_id);
CREATE INDEX condominium_work_progress_payment_entry_fk_idx ON public.condominium_work_progress USING btree (payment_entry_id);
CREATE INDEX condominium_work_progress_payment_entry_idx ON public.condominium_work_progress USING btree (payment_entry_id) WHERE (payment_entry_id IS NOT NULL);
CREATE INDEX condominium_work_progress_work_idx ON public.condominium_work_progress USING btree (work_id, progress_date);
CREATE INDEX condominium_work_progress_workspace_fk_idx ON public.condominium_work_progress USING btree (workspace_id);
CREATE INDEX condominium_works_condominium_fk_idx ON public.condominium_works USING btree (condominium_id);
CREATE INDEX condominium_works_fund_idx ON public.condominium_works USING btree (fund_id);
CREATE INDEX condominium_works_register_item_fk_idx ON public.condominium_works USING btree (register_item_id);
CREATE INDEX condominium_works_supplier_fk_idx ON public.condominium_works USING btree (supplier_id);
CREATE INDEX condominium_works_workspace_condo_idx ON public.condominium_works USING btree (workspace_id, condominium_id, status);
CREATE INDEX condominiums_active_workspace_idx ON public.condominiums USING btree (workspace_id, archived_at, name);
CREATE INDEX condominiums_archived_by_idx ON public.condominiums USING btree (archived_by);
CREATE INDEX idx_condominiums_workspace ON public.condominiums USING btree (workspace_id);
CREATE UNIQUE INDEX uq_condominiums_workspace_legacy ON public.condominiums USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX deadlines_condominium_id_idx ON public.deadlines USING btree (condominium_id);
CREATE INDEX idx_deadlines_workspace ON public.deadlines USING btree (workspace_id);
CREATE UNIQUE INDEX uq_deadlines_workspace_legacy ON public.deadlines USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX documents_ai_status_idx ON public.documents USING btree (workspace_id, condominium_id, COALESCE((data ->> 'aiStatus'::text), 'Non elaborato'::text), updated_at DESC);
CREATE INDEX documents_condominium_id_idx ON public.documents USING btree (condominium_id);
CREATE INDEX documents_size_idx ON public.documents USING btree (file_size_bytes) WHERE (file_size_bytes IS NOT NULL);
CREATE INDEX idx_documents_workspace ON public.documents USING btree (workspace_id);
CREATE UNIQUE INDEX uq_documents_workspace_legacy ON public.documents USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX portal_access_condominium_idx ON public.portal_access USING btree (condominium_id);
CREATE INDEX portal_access_email_idx ON public.portal_access USING btree (lower(email));
CREATE INDEX portal_access_member_id_idx ON public.portal_access USING btree (member_id);
CREATE INDEX portal_access_user_id_idx ON public.portal_access USING btree (user_id);
CREATE INDEX portal_access_workspace_idx ON public.portal_access USING btree (workspace_id);
CREATE UNIQUE INDEX uq_portal_access_workspace_condominium_email_ci ON public.portal_access USING btree (workspace_id, condominium_id, lower(email)) WHERE (email IS NOT NULL);
CREATE INDEX idx_portal_registration_requests_email ON public.portal_registration_requests USING btree (lower(email));
CREATE INDEX idx_portal_registration_requests_workspace_status ON public.portal_registration_requests USING btree (workspace_id, status, created_at DESC);
CREATE INDEX portal_registration_requests_matched_member_id_idx ON public.portal_registration_requests USING btree (matched_member_id);
CREATE INDEX portal_registration_requests_requested_user_id_idx ON public.portal_registration_requests USING btree (requested_user_id);
CREATE INDEX portal_registration_requests_reviewed_by_idx ON public.portal_registration_requests USING btree (reviewed_by);
CREATE INDEX idx_suppliers_workspace ON public.suppliers USING btree (workspace_id);
CREATE INDEX suppliers_condominium_id_idx ON public.suppliers USING btree (condominium_id);
CREATE UNIQUE INDEX uq_suppliers_workspace_legacy ON public.suppliers USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
CREATE INDEX idx_workspace_members_user ON public.workspace_members USING btree (user_id);
CREATE INDEX workspace_members_condominium_id_idx ON public.workspace_members USING btree (condominium_id);
CREATE UNIQUE INDEX workspace_members_workspace_legacy_unique ON public.workspace_members USING btree (workspace_id, legacy_id) WHERE (legacy_id IS NOT NULL);
