-- QA LEDGER ENTRY 20261017000001 bethag_baseline_schema
-- PostgreSQL md5=d66a49d3777c26e70a8f6a16c7e05fa2; UTF-8 chars=85517
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- BETHAG baseline: schemas, tables, constraints and RLS.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE TABLE "public"."activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "title" text NOT NULL,
  "status" text,
  "activity_date" timestamp with time zone,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint
);

CREATE TABLE "public"."assemblies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "title" text NOT NULL,
  "assembly_date" timestamp with time zone,
  "status" text,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint
);

CREATE TABLE "public"."communication_recipients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "communication_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "member_id" uuid,
  "user_id" uuid,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "recipient_role" text DEFAULT 'resident'::text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "provider_message_id" text,
  "error_message" text,
  "sent_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "bounced_at" timestamp with time zone,
  "complained_at" timestamp with time zone,
  "event_type" text,
  "provider_event_id" text,
  "queued_at" timestamp with time zone
);

CREATE TABLE "public"."communications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "title" text NOT NULL,
  "body" text,
  "published" boolean DEFAULT false NOT NULL,
  "email_status" text,
  "email_prepared_at" timestamp with time zone,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint
);

CREATE TABLE "public"."condominium_accounting_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "accounting_start_date" date DEFAULT make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 1, 1) NOT NULL,
  "accounting_end_date" date DEFAULT make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 12, 31) NOT NULL,
  "ordinary_installment_count" integer DEFAULT 12 NOT NULL,
  "ordinary_due_dates" date[] DEFAULT '{}'::date[] NOT NULL,
  "extraordinary_mode" text DEFAULT 'separata'::text NOT NULL,
  "extraordinary_allow_multi_year" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_allocation_intakes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "source" text DEFAULT 'Manuale'::text NOT NULL,
  "status" text DEFAULT 'Bozza'::text NOT NULL,
  "document_id" uuid,
  "ledger_entry_id" uuid,
  "allocation_table_id" uuid,
  "title" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "expense_amount" numeric(14,2),
  "extracted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_by" uuid,
  "confirmed_by" uuid,
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_allocation_rules" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "name" text NOT NULL,
  "expense_type" text,
  "category" text,
  "allocation_table_id" uuid NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "action" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_budgets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "fiscal_year_id" uuid,
  "category" text DEFAULT 'Generale'::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_consumption_readings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "fiscal_year_id" uuid,
  "unit_id" uuid NOT NULL,
  "service_type" text DEFAULT 'Riscaldamento'::text NOT NULL,
  "period_start" date,
  "period_end" date,
  "meter_code" text DEFAULT ''::text NOT NULL,
  "previous_reading" numeric(14,4),
  "current_reading" numeric(14,4),
  "consumption" numeric(14,4),
  "kwh" numeric(14,4),
  "allocation_value" numeric(14,4),
  "charge_amount" numeric(14,2),
  "source" text DEFAULT 'Manuale'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_creation_intakes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "status" text DEFAULT 'Bozza'::text NOT NULL,
  "source" text DEFAULT 'AI'::text NOT NULL,
  "source_documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "extracted_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "structure" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_by" uuid,
  "confirmed_by" uuid,
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_condominium_id" uuid
);

CREATE TABLE "public"."condominium_expense_allocations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "ledger_entry_id" uuid NOT NULL,
  "unit_id" uuid,
  "member_id" uuid,
  "allocation_basis" text DEFAULT 'Millesimi'::text NOT NULL,
  "millesimi" numeric(12,4),
  "amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "paid_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "due_date" date,
  "status" text DEFAULT 'Da pagare'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "allocation_table_id" uuid
);

CREATE TABLE "public"."condominium_fiscal_carryover_compensations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "carryover_id" uuid NOT NULL,
  "target_installment_id" uuid,
  "amount" numeric NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_fiscal_carryovers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "source_fiscal_year_id" uuid NOT NULL,
  "target_fiscal_year_id" uuid NOT NULL,
  "unit_id" uuid,
  "member_id" uuid,
  "balance" numeric(14,2) NOT NULL,
  "kind" text NOT NULL,
  "status" text DEFAULT 'Da riportare'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_fiscal_years" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "name" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" text DEFAULT 'Aperto'::text NOT NULL,
  "opening_balance" numeric(14,2) DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_funds" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "name" text NOT NULL,
  "purpose" text DEFAULT ''::text NOT NULL,
  "target_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "allocated_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "used_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_installments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "fiscal_year_id" uuid,
  "member_id" uuid,
  "unit_id" uuid,
  "title" text NOT NULL,
  "due_date" date,
  "amount" numeric DEFAULT 0 NOT NULL,
  "paid_amount" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'Da pagare'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ledger_entry_id" uuid
);

CREATE TABLE "public"."condominium_insurance_policies" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "company_name" text DEFAULT ''::text NOT NULL,
  "policy_number" text DEFAULT ''::text NOT NULL,
  "policy_type" text DEFAULT 'Globale fabbricati'::text NOT NULL,
  "coverage" text DEFAULT ''::text NOT NULL,
  "start_date" date,
  "end_date" date,
  "premium" numeric(12,2) DEFAULT 0 NOT NULL,
  "deductible" numeric(12,2) DEFAULT 0 NOT NULL,
  "contact_name" text DEFAULT ''::text NOT NULL,
  "contact_email" text DEFAULT ''::text NOT NULL,
  "contact_phone" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "document_id" bigint,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_ledger_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "fiscal_year_id" uuid,
  "entry_date" date NOT NULL,
  "direction" text NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(14,2) NOT NULL,
  "payment_status" text DEFAULT 'Registrato'::text NOT NULL,
  "due_date" date,
  "supplier_id" uuid,
  "unit_id" uuid,
  "member_id" uuid,
  "document_id" uuid,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "fund_id" uuid,
  "expense_type" text DEFAULT 'Ordinaria'::text NOT NULL,
  "deliberation_date" date,
  "assembly_id" uuid
);

CREATE TABLE "public"."condominium_legal_cases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "title" text NOT NULL,
  "counterpart" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'Aperto'::text NOT NULL,
  "opened_date" date,
  "closed_date" date,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_member_transfers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "outgoing_member_id" uuid NOT NULL,
  "incoming_member_id" uuid,
  "transfer_date" date NOT NULL,
  "transfer_type" text DEFAULT 'Vendita'::text NOT NULL,
  "status" text DEFAULT 'Confermato'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "closed_at" timestamp with time zone,
  "closed_by" uuid
);

CREATE TABLE "public"."condominium_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "condominium_id" uuid NOT NULL,
  "user_id" uuid,
  "name" text NOT NULL,
  "email" text,
  "role" text DEFAULT 'resident'::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint,
  "unit_id" uuid
);

CREATE TABLE "public"."condominium_millesimal_tables" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "total_millesimi" numeric DEFAULT 1000 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "basis_type" text DEFAULT 'Millesimi'::text NOT NULL,
  "scope_mode" text DEFAULT 'all'::text NOT NULL,
  "scope_unit_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "scope_building_codes" text[] DEFAULT '{}'::text[] NOT NULL
);

CREATE TABLE "public"."condominium_millesimal_values" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "table_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "value" numeric DEFAULT 0 NOT NULL,
  "excluded" boolean DEFAULT false NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_payment_movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "installment_id" uuid NOT NULL,
  "payment_date" date NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "method" text DEFAULT 'Bonifico'::text NOT NULL,
  "reference" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_payment_reversal_audit" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "original_payment_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "installment_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "payment_date" date NOT NULL,
  "method" text DEFAULT 'Bonifico'::text NOT NULL,
  "reference" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "reversal_reason" text NOT NULL,
  "reversed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reversed_by" uuid NOT NULL
);

CREATE TABLE "public"."condominium_register_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "item_type" text DEFAULT 'Sicurezza'::text NOT NULL,
  "category" text DEFAULT 'Generale'::text NOT NULL,
  "title" text NOT NULL,
  "location" text DEFAULT ''::text NOT NULL,
  "responsible" text DEFAULT ''::text NOT NULL,
  "expiry_date" date,
  "status" text DEFAULT 'Attivo'::text NOT NULL,
  "document_id" uuid,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "supplier_id" uuid,
  "estimated_amount" numeric DEFAULT 0 NOT NULL
);

CREATE TABLE "public"."condominium_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "member_id" uuid,
  "requester_user_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'Nuova'::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint
);

CREATE TABLE "public"."condominium_suppliers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "business_name" text NOT NULL,
  "contact_name" text DEFAULT ''::text NOT NULL,
  "fiscal_code" text DEFAULT ''::text NOT NULL,
  "vat_number" text DEFAULT ''::text NOT NULL,
  "email" text DEFAULT ''::text NOT NULL,
  "phone" text DEFAULT ''::text NOT NULL,
  "category" text DEFAULT ''::text NOT NULL,
  "contract_start" date,
  "contract_end" date,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_tax_obligations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "title" text NOT NULL,
  "category" text DEFAULT 'Fiscale'::text NOT NULL,
  "due_date" date NOT NULL,
  "amount" numeric(14,2),
  "status" text DEFAULT 'Da fare'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_unit_transformation_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "transformation_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "direction" text NOT NULL,
  "sequence_no" integer DEFAULT 1 NOT NULL,
  "unit_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_unit_transformations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "transformation_type" text NOT NULL,
  "status" text DEFAULT 'Bozza'::text NOT NULL,
  "effective_date" date NOT NULL,
  "cadastral_protocol" text DEFAULT ''::text NOT NULL,
  "cadastral_protocol_date" date,
  "accounting_resolution_status" text DEFAULT 'Da verificare'::text NOT NULL,
  "millesimal_review_status" text DEFAULT 'Da verificare'::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by" uuid,
  "confirmed_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "confirmed_at" timestamp with time zone,
  "millesimal_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "accounting_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source_unit_count" integer DEFAULT 0 NOT NULL,
  "destination_unit_count" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "public"."condominium_units" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "legacy_id" bigint,
  "unit_code" text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "building_code" text DEFAULT ''::text NOT NULL,
  "lifecycle_status" text DEFAULT 'Attiva'::text NOT NULL,
  "lifecycle_effective_date" date,
  "superseded_at" timestamp with time zone
);

CREATE TABLE "public"."condominium_work_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "work_id" uuid NOT NULL,
  "document_id" bigint,
  "title" text DEFAULT ''::text NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_work_events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "work_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "event_date" timestamp with time zone DEFAULT now() NOT NULL,
  "title" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."condominium_work_progress" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "work_id" uuid NOT NULL,
  "progress_no" integer NOT NULL,
  "progress_date" date NOT NULL,
  "title" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'Presentato'::text NOT NULL,
  "percentage" numeric DEFAULT 0 NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "paid_amount" numeric DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ledger_entry_id" uuid,
  "payment_entry_id" uuid
);

CREATE TABLE "public"."condominium_works" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "title" text NOT NULL,
  "category" text DEFAULT 'Manutenzione'::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'Da programmare'::text NOT NULL,
  "priority" text DEFAULT 'Media'::text NOT NULL,
  "supplier_id" uuid,
  "register_item_id" uuid,
  "start_date" date,
  "expected_end_date" date,
  "actual_end_date" date,
  "estimated_amount" numeric DEFAULT 0 NOT NULL,
  "approved_amount" numeric DEFAULT 0 NOT NULL,
  "actual_amount" numeric DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "fund_id" uuid,
  "progress_percent" numeric DEFAULT 0 NOT NULL,
  "paid_amount" numeric DEFAULT 0 NOT NULL,
  "remaining_amount" numeric DEFAULT 0 NOT NULL,
  "payment_status" text DEFAULT 'Nessun importo'::text NOT NULL
);

CREATE TABLE "public"."condominiums" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "name" text NOT NULL,
  "address" text,
  "city" text,
  "postal_code" text,
  "province" text,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint,
  "archived_at" timestamp with time zone,
  "archived_by" uuid,
  "archive_reason" text
);

CREATE TABLE "public"."deadlines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "title" text NOT NULL,
  "due_date" date,
  "status" text,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint
);

CREATE TABLE "public"."documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "title" text NOT NULL,
  "category" text,
  "status" text,
  "file_path" text,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint,
  "file_size_bytes" bigint
);

CREATE TABLE "public"."portal_access" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid NOT NULL,
  "legacy_id" bigint,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "role" text DEFAULT 'resident'::text NOT NULL,
  "apartment" text,
  "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "user_id" uuid,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "member_id" uuid
);

CREATE TABLE "public"."portal_registration_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid,
  "requested_user_id" uuid,
  "matched_member_id" uuid,
  "email" text NOT NULL,
  "full_name" text NOT NULL,
  "fiscal_code" text,
  "condominium_name" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid
);

CREATE TABLE "public"."profiles" (
  "id" uuid NOT NULL,
  "full_name" text,
  "email" text,
  "role" text DEFAULT 'resident'::text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."suppliers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "condominium_id" uuid,
  "name" text NOT NULL,
  "category" text,
  "status" text,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "legacy_id" bigint
);

CREATE TABLE "public"."user_security_settings" (
  "user_id" uuid NOT NULL,
  "personal_code_hash" text,
  "personal_code_enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "public"."workspace_members" (
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "condominium_id" uuid,
  "legacy_id" bigint
);

CREATE TABLE "public"."workspaces" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "plan" text DEFAULT 'free'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."assemblies" ADD CONSTRAINT "assemblies_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."assemblies" ADD CONSTRAINT "assemblies_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_delivery_consistency_chk" CHECK (((status <> ALL (ARRAY['sent'::text, 'delivered'::text])) OR provider_message_id IS NOT NULL) AND (status <> 'delivered'::text OR delivered_at IS NOT NULL) AND (status <> 'queued'::text OR queued_at IS NOT NULL));

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_email_chk" CHECK (POSITION(('@'::text) IN (email)) > 1);

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_role_chk" CHECK (recipient_role = ANY (ARRAY['resident'::text, 'council'::text, 'owner'::text, 'tenant'::text]));

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]));

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_status_chk" CHECK (status = ANY (ARRAY['pending'::text, 'queued'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]));

ALTER TABLE "public"."communications" ADD CONSTRAINT "communications_email_status_check" CHECK (email_status IS NULL OR (email_status = ANY (ARRAY['prepared'::text, 'no_recipients'::text, 'In elaborazione'::text, 'Inviata'::text, 'Parzialmente inviata'::text, 'Errore'::text, 'Consegnata'::text])));

ALTER TABLE "public"."communications" ADD CONSTRAINT "communications_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."communications" ADD CONSTRAINT "communications_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_setting_ordinary_installment_count_check" CHECK (ordinary_installment_count >= 1 AND ordinary_installment_count <= 12);

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_check" CHECK (accounting_start_date <= accounting_end_date);

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_extraordinary_mode_check" CHECK (extraordinary_mode = ANY (ARRAY['integrata'::text, 'separata'::text]));

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_ordinary_due_dates_check" CHECK (COALESCE(array_length(ordinary_due_dates, 1), 0) <= 12);

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_workspace_id_condominium_id_key" UNIQUE (workspace_id, condominium_id);

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "allocation_intake_amount_ck" CHECK (expense_amount IS NULL OR expense_amount >= 0::numeric);

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "allocation_intake_source_ck" CHECK (source = ANY (ARRAY['Manuale'::text, 'AI'::text, 'Importazione'::text]));

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "allocation_intake_status_ck" CHECK (status = ANY (ARRAY['Bozza'::text, 'Da verificare'::text, 'Confermato'::text, 'Annullato'::text]));

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_allocation_rules" ADD CONSTRAINT "allocation_rules_priority_ck" CHECK (priority >= 0);

ALTER TABLE "public"."condominium_allocation_rules" ADD CONSTRAINT "allocation_rules_scope_ck" CHECK (NULLIF(TRIM(BOTH FROM COALESCE(expense_type, ''::text)), ''::text) IS NOT NULL OR NULLIF(TRIM(BOTH FROM COALESCE(category, ''::text)), ''::text) IS NOT NULL);

ALTER TABLE "public"."condominium_allocation_rules" ADD CONSTRAINT "condominium_allocation_rules_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_audit_log" ADD CONSTRAINT "condominium_audit_log_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_budgets" ADD CONSTRAINT "condominium_budgets_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "condominium_consumption_readings_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "consumption_nonnegative_ck" CHECK (COALESCE(previous_reading, 0::numeric) >= 0::numeric AND COALESCE(current_reading, 0::numeric) >= 0::numeric AND COALESCE(consumption, 0::numeric) >= 0::numeric AND COALESCE(kwh, 0::numeric) >= 0::numeric AND COALESCE(allocation_value, 0::numeric) >= 0::numeric AND COALESCE(charge_amount, 0::numeric) >= 0::numeric);

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "consumption_period_ck" CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end);

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "consumption_reading_ck" CHECK (current_reading IS NULL OR previous_reading IS NULL OR current_reading >= previous_reading);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_extracted_object" CHECK (jsonb_typeof(extracted_data) = 'object'::text);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_source_check" CHECK (source = ANY (ARRAY['AI'::text, 'Importazione'::text, 'Manuale'::text]));

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_source_documents_array" CHECK (jsonb_typeof(source_documents) = 'array'::text);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_status_check" CHECK (status = ANY (ARRAY['Bozza'::text, 'Da verificare'::text, 'Confermato'::text, 'Annullato'::text]));

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_structure_object" CHECK (jsonb_typeof(structure) = 'object'::text);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_validation_array" CHECK (jsonb_typeof(validation_errors) = 'array'::text);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_warnings_array" CHECK (jsonb_typeof(warnings) = 'array'::text);

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_amount_nonnegative_chk" CHECK (amount >= 0::numeric);

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_amounts_valid" CHECK (amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= amount);

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_paid_amount_valid_chk" CHECK (paid_amount >= 0::numeric AND paid_amount <= amount);

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_status_amount_consistent" CHECK (status = 'Da pagare'::text AND paid_amount = 0::numeric OR status = 'Parzialmente pagato'::text AND paid_amount > 0::numeric AND paid_amount < amount OR status = 'Pagato'::text AND abs(paid_amount - amount) <= 0.005 OR status = 'Scaduto'::text AND paid_amount >= 0::numeric AND paid_amount < amount);

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ADD CONSTRAINT "condominium_fiscal_carryover_compensations_amount_positive" CHECK (amount > 0::numeric);

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ADD CONSTRAINT "condominium_fiscal_carryover_compensations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "condominium_fiscal_carryovers_kind_check" CHECK (kind = ANY (ARRAY['Debito'::text, 'Credito'::text]));

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "condominium_fiscal_carryovers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "condominium_fiscal_carryovers_status_check" CHECK (status = ANY (ARRAY['Da riportare'::text, 'Parzialmente compensato'::text, 'Compensato'::text]));

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_balance_kind" CHECK (kind = 'Debito'::text AND balance > 0::numeric OR kind = 'Credito'::text AND balance < 0::numeric);

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_balance_nonzero" CHECK (abs(balance) >= 0.01);

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_check" CHECK (end_date >= start_date);

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_no_overlap" EXCLUDE USING gist (workspace_id WITH =, condominium_id WITH =, daterange(start_date, end_date, '[]'::text) WITH &&);

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_opening_balance_finite" CHECK (opening_balance = opening_balance);

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_valid_dates" CHECK (start_date <= end_date);

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_valid_range" CHECK (start_date <= end_date);

ALTER TABLE "public"."condominium_funds" ADD CONSTRAINT "condominium_funds_nonnegative_amounts" CHECK (target_amount >= 0::numeric AND allocated_amount >= 0::numeric AND used_amount >= 0::numeric);

ALTER TABLE "public"."condominium_funds" ADD CONSTRAINT "condominium_funds_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_funds" ADD CONSTRAINT "condominium_funds_used_lte_allocated" CHECK (used_amount <= allocated_amount);

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_amount_positive_chk" CHECK (amount > 0::numeric);

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_amounts_valid" CHECK (amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= amount);

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_paid_amount_valid_chk" CHECK (paid_amount >= 0::numeric AND paid_amount <= amount);

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_status_amount_consistent" CHECK (status = 'Da pagare'::text AND paid_amount = 0::numeric OR status = 'Parzialmente pagato'::text AND paid_amount > 0::numeric AND paid_amount < amount OR status = 'Pagato'::text AND abs(paid_amount - amount) <= 0.005 OR status = 'Scaduto'::text AND paid_amount >= 0::numeric AND paid_amount < amount OR status = 'Accorpata'::text AND paid_amount >= 0::numeric AND paid_amount <= amount);

ALTER TABLE "public"."condominium_insurance_policies" ADD CONSTRAINT "condominium_insurance_policies_dates_valid" CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

ALTER TABLE "public"."condominium_insurance_policies" ADD CONSTRAINT "condominium_insurance_policies_deductible_nonnegative" CHECK (deductible IS NULL OR deductible >= 0::numeric);

ALTER TABLE "public"."condominium_insurance_policies" ADD CONSTRAINT "condominium_insurance_policies_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_insurance_policies" ADD CONSTRAINT "condominium_insurance_policies_premium_nonnegative" CHECK (premium IS NULL OR premium >= 0::numeric);

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_amount_check" CHECK (amount >= 0::numeric);

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_direction_check" CHECK (direction = ANY (ARRAY['Entrata'::text, 'Uscita'::text]));

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_expense_type_check" CHECK (expense_type = ANY (ARRAY['Ordinaria'::text, 'Straordinaria'::text]));

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_payment_status_check" CHECK (payment_status = ANY (ARRAY['Registrato'::text, 'Da pagare'::text, 'Parzialmente pagato'::text, 'Pagato'::text, 'Scaduto'::text]));

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_legal_cases" ADD CONSTRAINT "condominium_legal_cases_dates_valid" CHECK (closed_date IS NULL OR opened_date IS NULL OR closed_date >= opened_date);

ALTER TABLE "public"."condominium_legal_cases" ADD CONSTRAINT "condominium_legal_cases_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_status_check" CHECK (status = ANY (ARRAY['Bozza'::text, 'Confermato'::text, 'Chiuso'::text, 'Annullato'::text]));

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_type_ck" CHECK (transfer_type = ANY (ARRAY['Vendita'::text, 'Acquisto'::text, 'Donazione'::text, 'Successione'::text, 'Altro'::text]));

ALTER TABLE "public"."condominium_members" ADD CONSTRAINT "condominium_members_condominium_legacy_unique" UNIQUE (condominium_id, legacy_id);

ALTER TABLE "public"."condominium_members" ADD CONSTRAINT "condominium_members_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_millesimal_tables" ADD CONSTRAINT "condominium_millesimal_tables_basis_type_check" CHECK (basis_type = ANY (ARRAY['Millesimi'::text, 'Quote personalizzate'::text, 'Consumo'::text, 'Misto'::text]));

ALTER TABLE "public"."condominium_millesimal_tables" ADD CONSTRAINT "condominium_millesimal_tables_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_millesimal_tables" ADD CONSTRAINT "condominium_millesimal_tables_scope_mode_check" CHECK (scope_mode = ANY (ARRAY['all'::text, 'units'::text, 'buildings'::text]));

ALTER TABLE "public"."condominium_millesimal_tables" ADD CONSTRAINT "condominium_millesimal_tables_total_positive" CHECK (total_millesimi > 0::numeric);

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_table_id_unit_id_key" UNIQUE (table_id, unit_id);

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_value_nonnegative" CHECK (value >= 0::numeric);

ALTER TABLE "public"."condominium_payment_movements" ADD CONSTRAINT "condominium_payment_movements_amount_valid" CHECK (amount > 0::numeric);

ALTER TABLE "public"."condominium_payment_movements" ADD CONSTRAINT "condominium_payment_movements_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_payment_reversal_audit" ADD CONSTRAINT "condominium_payment_reversal_audit_amount_check" CHECK (amount > 0::numeric);

ALTER TABLE "public"."condominium_payment_reversal_audit" ADD CONSTRAINT "condominium_payment_reversal_audit_original_payment_id_key" UNIQUE (original_payment_id);

ALTER TABLE "public"."condominium_payment_reversal_audit" ADD CONSTRAINT "condominium_payment_reversal_audit_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_register_items" ADD CONSTRAINT "condominium_register_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_status_check" CHECK (status = ANY (ARRAY['Nuova'::text, 'In lavorazione'::text, 'In attesa'::text, 'Risolta'::text, 'Chiusa'::text, 'Annullata'::text]));

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_title_not_blank_chk" CHECK (length(btrim(title)) > 0);

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."condominium_suppliers" ADD CONSTRAINT "condominium_suppliers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_tax_obligations" ADD CONSTRAINT "condominium_tax_obligations_nonnegative_amount" CHECK (amount IS NULL OR amount >= 0::numeric);

ALTER TABLE "public"."condominium_tax_obligations" ADD CONSTRAINT "condominium_tax_obligations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformati_transformation_id_direction_s_key" UNIQUE (transformation_id, direction, sequence_no);

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformati_transformation_id_unit_id_dir_key" UNIQUE (transformation_id, unit_id, direction);

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformation_items_direction_check" CHECK (direction = ANY (ARRAY['Fonte'::text, 'Destinazione'::text]));

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformation_items_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformation_items_sequence_no_check" CHECK (sequence_no > 0);

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformat_accounting_resolution_status_check" CHECK (accounting_resolution_status = ANY (ARRAY['Da verificare'::text, 'Non necessaria'::text, 'Risolta'::text]));

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_confirmed_integrity_chk" CHECK (status <> 'Confermata'::text OR confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL AND source_unit_count > 0 AND destination_unit_count > 0 AND (transformation_type = 'Fusione'::text AND source_unit_count >= 2 AND destination_unit_count = 1 OR transformation_type = 'Frazionamento'::text AND source_unit_count = 1 AND destination_unit_count >= 2));

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_confirmed_reviews_chk" CHECK (status <> 'Confermata'::text OR (accounting_resolution_status = ANY (ARRAY['Non necessaria'::text, 'Risolta'::text])) AND (millesimal_review_status = ANY (ARRAY['Confermata invariata'::text, 'Nuove tabelle'::text])));

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_millesimal_review_status_check" CHECK (millesimal_review_status = ANY (ARRAY['Da verificare'::text, 'Confermata invariata'::text, 'Nuove tabelle'::text, 'Da aggiornare'::text]));

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_status_check" CHECK (status = ANY (ARRAY['Bozza'::text, 'Confermata'::text, 'Annullata'::text]));

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_transformation_type_check" CHECK (transformation_type = ANY (ARRAY['Fusione'::text, 'Frazionamento'::text]));

ALTER TABLE "public"."condominium_units" ADD CONSTRAINT "condominium_units_lifecycle_status_check" CHECK (lifecycle_status = ANY (ARRAY['Attiva'::text, 'Storica'::text, 'Soppressa'::text]));

ALTER TABLE "public"."condominium_units" ADD CONSTRAINT "condominium_units_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_work_documents" ADD CONSTRAINT "condominium_work_documents_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_work_events" ADD CONSTRAINT "condominium_work_events_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_amounts_chk" CHECK (amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= amount);

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_financial_consistency_chk" CHECK (progress_no > 0 AND amount >= 0::numeric AND paid_amount >= 0::numeric AND paid_amount <= (amount + 0.005) AND percentage >= 0::numeric AND percentage <= 100::numeric);

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_percentage_chk" CHECK (percentage >= 0::numeric AND percentage <= 100::numeric);

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_work_id_progress_no_key" UNIQUE (work_id, progress_no);

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_amounts_chk" CHECK (estimated_amount >= 0::numeric AND approved_amount >= 0::numeric AND actual_amount >= 0::numeric);

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_financial_consistency_chk" CHECK (estimated_amount >= 0::numeric AND approved_amount >= 0::numeric AND actual_amount >= 0::numeric AND paid_amount >= 0::numeric AND remaining_amount >= 0::numeric AND paid_amount <= (actual_amount + 0.005) AND abs(remaining_amount - GREATEST(actual_amount - paid_amount, 0::numeric)) <= 0.005);

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_paid_amount_check" CHECK (paid_amount >= 0::numeric);

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_payment_status_check" CHECK (payment_status = ANY (ARRAY['Nessun importo'::text, 'Da pagare'::text, 'Parzialmente pagato'::text, 'Pagato'::text]));

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_progress_chk" CHECK (progress_percent >= 0::numeric AND progress_percent <= 100::numeric);

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_remaining_amount_check" CHECK (remaining_amount >= 0::numeric);

ALTER TABLE "public"."condominiums" ADD CONSTRAINT "condominiums_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."condominiums" ADD CONSTRAINT "condominiums_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."deadlines" ADD CONSTRAINT "deadlines_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."deadlines" ADD CONSTRAINT "deadlines_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_file_size_nonnegative_chk" CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0);

ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_role_check" CHECK (role = ANY (ARRAY['resident'::text, 'council'::text]));

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."portal_registration_requests" ADD CONSTRAINT "portal_registration_requests_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."portal_registration_requests" ADD CONSTRAINT "portal_registration_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'email_mismatch'::text, 'approved'::text, 'rejected'::text]));

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'collaborator'::text, 'resident'::text, 'council'::text]));

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_workspace_legacy_unique" UNIQUE (workspace_id, legacy_id);

ALTER TABLE "public"."user_security_settings" ADD CONSTRAINT "user_security_settings_pkey" PRIMARY KEY (user_id);

ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY (workspace_id, user_id);

ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'collaborator'::text, 'resident'::text, 'council'::text]));

ALTER TABLE "public"."workspaces" ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."activities" ADD CONSTRAINT "activities_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."assemblies" ADD CONSTRAINT "assemblies_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."assemblies" ADD CONSTRAINT "assemblies_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_communication_id_fkey" FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_condominium_fk" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_member_fk" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_member_id_fkey" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_user_fk" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_workspace_fk" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."communication_recipients" ADD CONSTRAINT "communication_recipients_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."communications" ADD CONSTRAINT "communications_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."communications" ADD CONSTRAINT "communications_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_accounting_settings" ADD CONSTRAINT "condominium_accounting_settings_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_allocation_table_id_fkey" FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_confirmed_by_fkey" FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_ledger_entry_id_fkey" FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_allocation_intakes" ADD CONSTRAINT "condominium_allocation_intakes_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_allocation_rules" ADD CONSTRAINT "condominium_allocation_rules_allocation_table_id_fkey" FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_allocation_rules" ADD CONSTRAINT "condominium_allocation_rules_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_allocation_rules" ADD CONSTRAINT "condominium_allocation_rules_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_audit_log" ADD CONSTRAINT "condominium_audit_log_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_audit_log" ADD CONSTRAINT "condominium_audit_log_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_budgets" ADD CONSTRAINT "condominium_budgets_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_budgets" ADD CONSTRAINT "condominium_budgets_fiscal_year_id_fkey" FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_budgets" ADD CONSTRAINT "condominium_budgets_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "condominium_consumption_readings_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "condominium_consumption_readings_fiscal_year_id_fkey" FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "condominium_consumption_readings_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_consumption_readings" ADD CONSTRAINT "condominium_consumption_readings_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_confirmed_by_fkey" FOREIGN KEY (confirmed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_created_condominium_id_fkey" FOREIGN KEY (created_condominium_id) REFERENCES condominiums(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_creation_intakes" ADD CONSTRAINT "condominium_creation_intakes_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_allocation_table_id_fkey" FOREIGN KEY (allocation_table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_ledger_entry_id_fkey" FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_member_id_fkey" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_expense_allocations" ADD CONSTRAINT "condominium_expense_allocations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ADD CONSTRAINT "condominium_fiscal_carryover_compens_target_installment_id_fkey" FOREIGN KEY (target_installment_id) REFERENCES condominium_installments(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ADD CONSTRAINT "condominium_fiscal_carryover_compensations_carryover_id_fkey" FOREIGN KEY (carryover_id) REFERENCES condominium_fiscal_carryovers(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ADD CONSTRAINT "condominium_fiscal_carryover_compensations_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ADD CONSTRAINT "condominium_fiscal_carryover_compensations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_condominium_fk" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_member_fk" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_source_year_fk" FOREIGN KEY (source_fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_target_year_fk" FOREIGN KEY (target_fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_unit_fk" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_fiscal_carryovers" ADD CONSTRAINT "fiscal_carryovers_workspace_fk" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_fiscal_years" ADD CONSTRAINT "condominium_fiscal_years_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_funds" ADD CONSTRAINT "condominium_funds_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_funds" ADD CONSTRAINT "condominium_funds_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_fiscal_year_id_fkey" FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_ledger_entry_id_fkey" FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_member_id_fkey" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_installments" ADD CONSTRAINT "condominium_installments_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_insurance_policies" ADD CONSTRAINT "condominium_insurance_policies_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_insurance_policies" ADD CONSTRAINT "condominium_insurance_policies_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_assembly_fk" FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_fiscal_year_id_fkey" FOREIGN KEY (fiscal_year_id) REFERENCES condominium_fiscal_years(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_fund_id_fkey" FOREIGN KEY (fund_id) REFERENCES condominium_funds(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_member_id_fkey" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_ledger_entries" ADD CONSTRAINT "condominium_ledger_entries_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_legal_cases" ADD CONSTRAINT "condominium_legal_cases_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_legal_cases" ADD CONSTRAINT "condominium_legal_cases_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_closed_by_fkey" FOREIGN KEY (closed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_incoming_member_id_fkey" FOREIGN KEY (incoming_member_id) REFERENCES condominium_members(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_outgoing_member_id_fkey" FOREIGN KEY (outgoing_member_id) REFERENCES condominium_members(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_member_transfers" ADD CONSTRAINT "condominium_member_transfers_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_members" ADD CONSTRAINT "condominium_members_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_members" ADD CONSTRAINT "condominium_members_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_members" ADD CONSTRAINT "condominium_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_millesimal_tables" ADD CONSTRAINT "condominium_millesimal_tables_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_millesimal_tables" ADD CONSTRAINT "condominium_millesimal_tables_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_table_id_fkey" FOREIGN KEY (table_id) REFERENCES condominium_millesimal_tables(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_millesimal_values" ADD CONSTRAINT "condominium_millesimal_values_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_payment_movements" ADD CONSTRAINT "condominium_payment_movements_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_payment_movements" ADD CONSTRAINT "condominium_payment_movements_installment_id_fkey" FOREIGN KEY (installment_id) REFERENCES condominium_installments(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_payment_movements" ADD CONSTRAINT "condominium_payment_movements_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_register_items" ADD CONSTRAINT "condominium_register_items_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_register_items" ADD CONSTRAINT "condominium_register_items_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES condominium_suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_register_items" ADD CONSTRAINT "condominium_register_items_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_member_id_fkey" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_requester_user_id_fkey" FOREIGN KEY (requester_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_requests" ADD CONSTRAINT "condominium_requests_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_suppliers" ADD CONSTRAINT "condominium_suppliers_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_suppliers" ADD CONSTRAINT "condominium_suppliers_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_tax_obligations" ADD CONSTRAINT "condominium_tax_obligations_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_tax_obligations" ADD CONSTRAINT "condominium_tax_obligations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformation_items_transformation_id_fkey" FOREIGN KEY (transformation_id) REFERENCES condominium_unit_transformations(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_unit_transformation_items" ADD CONSTRAINT "condominium_unit_transformation_items_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES condominium_units(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_confirmed_by_fkey" FOREIGN KEY (confirmed_by) REFERENCES auth.users(id);

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE "public"."condominium_unit_transformations" ADD CONSTRAINT "condominium_unit_transformations_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE "public"."condominium_units" ADD CONSTRAINT "condominium_units_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_units" ADD CONSTRAINT "condominium_units_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_documents" ADD CONSTRAINT "condominium_work_documents_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_documents" ADD CONSTRAINT "condominium_work_documents_work_id_fkey" FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_documents" ADD CONSTRAINT "condominium_work_documents_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_events" ADD CONSTRAINT "condominium_work_events_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_events" ADD CONSTRAINT "condominium_work_events_work_id_fkey" FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_events" ADD CONSTRAINT "condominium_work_events_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_ledger_entry_id_fkey" FOREIGN KEY (ledger_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_payment_entry_id_fkey" FOREIGN KEY (payment_entry_id) REFERENCES condominium_ledger_entries(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_work_id_fkey" FOREIGN KEY (work_id) REFERENCES condominium_works(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_work_progress" ADD CONSTRAINT "condominium_work_progress_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_fund_id_fkey" FOREIGN KEY (fund_id) REFERENCES condominium_funds(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_register_item_id_fkey" FOREIGN KEY (register_item_id) REFERENCES condominium_register_items(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES condominium_suppliers(id) ON DELETE SET NULL;

ALTER TABLE "public"."condominium_works" ADD CONSTRAINT "condominium_works_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."condominiums" ADD CONSTRAINT "condominiums_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES profiles(id);

ALTER TABLE "public"."condominiums" ADD CONSTRAINT "condominiums_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."deadlines" ADD CONSTRAINT "deadlines_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."deadlines" ADD CONSTRAINT "deadlines_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_member_id_fkey" FOREIGN KEY (member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."portal_access" ADD CONSTRAINT "portal_access_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."portal_registration_requests" ADD CONSTRAINT "portal_registration_requests_matched_member_id_fkey" FOREIGN KEY (matched_member_id) REFERENCES condominium_members(id) ON DELETE SET NULL;

ALTER TABLE "public"."portal_registration_requests" ADD CONSTRAINT "portal_registration_requests_requested_user_id_fkey" FOREIGN KEY (requested_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."portal_registration_requests" ADD CONSTRAINT "portal_registration_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."portal_registration_requests" ADD CONSTRAINT "portal_registration_requests_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_security_settings" ADD CONSTRAINT "user_security_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_condominium_id_fkey" FOREIGN KEY (condominium_id) REFERENCES condominiums(id) ON DELETE CASCADE;

ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."assemblies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."communication_recipients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."communications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_accounting_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_allocation_intakes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_allocation_rules" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_audit_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_budgets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_consumption_readings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_creation_intakes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_expense_allocations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_fiscal_carryover_compensations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_fiscal_carryovers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_fiscal_years" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_funds" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_installments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_insurance_policies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_ledger_entries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_legal_cases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_member_transfers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_millesimal_tables" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_millesimal_values" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_payment_movements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_payment_reversal_audit" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_register_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_suppliers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_tax_obligations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_unit_transformation_items" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_unit_transformations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_units" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_work_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_work_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_work_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominium_works" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."condominiums" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."deadlines" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."portal_access" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."portal_registration_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_security_settings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;

-- END QA LEDGER ENTRY 20261017000001

-- QA LEDGER ENTRY 20261017000002 bethag_baseline_indexes_views
-- PostgreSQL md5=4363a411df272d63f8801390e9cdaaa7; UTF-8 chars=26003
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- BETHAG baseline: indexes and views.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

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

CREATE UNIQUE INDEX condominium_member_transfers_unit_date_confirmed_uidx ON public.condominium_member_transfers USING btree (unit_id, transfer_date) WHERE (status = ANY (ARRAY['Confermato'::text, 'Chiuso'::text]));

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

CREATE OR REPLACE VIEW "public"."condominium_fund_availability" WITH (security_invoker=true) AS
 SELECT id,
    workspace_id,
    condominium_id,
    name,
    purpose,
    target_amount,
    allocated_amount,
    used_amount,
    GREATEST(round(allocated_amount - used_amount, 2), 0::numeric) AS available_amount,
    GREATEST(round(target_amount - allocated_amount, 2), 0::numeric) AS target_remaining_amount,
    active,
    notes,
    created_at,
    updated_at
   FROM condominium_funds f;;

-- END QA LEDGER ENTRY 20261017000002

-- QA LEDGER ENTRY 20261017000003 bethag_baseline_functions
-- PostgreSQL md5=af65a6ee7c2c1d162353eeaf5235e6ec; UTF-8 chars=244312
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- BETHAG baseline: stored functions and procedures.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_request public.portal_registration_requests%rowtype;
 v_member public.condominium_members%rowtype;
 v_workspace uuid;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
 select * into v_request from public.portal_registration_requests
 where id=p_request_id and status in ('pending','email_mismatch') for update;
 if not found then raise exception 'Richiesta non trovata o già gestita'; end if;
 if v_request.requested_user_id is null then raise exception 'La richiesta non è associata ad un account autenticato'; end if;
 select * into v_member from public.condominium_members where id=p_member_id and active=true;
 if not found then raise exception 'Condòmino non trovato o non attivo'; end if;
 select c.workspace_id into v_workspace from public.condominiums c where c.id=v_member.condominium_id;
 if v_workspace is null or v_request.workspace_id is null or v_request.workspace_id<>v_workspace then
   raise exception 'Richiesta e condominio non appartengono allo stesso workspace';
 end if;
 if exists(select 1 from public.condominiums c where c.id=v_member.condominium_id and c.archived_at is not null) then
   raise exception 'Il condominio è archiviato: approvazione portale non consentita';
 end if;
 if not private.can_manage_workspace_module(v_workspace,'portale') then
   raise exception 'Autorizzazione gestione Portale richiesta';
 end if;
 update public.condominium_members set user_id=v_request.requested_user_id,updated_at=now() where id=v_member.id;
 insert into public.portal_access(workspace_id,condominium_id,member_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data)
 values(v_workspace,v_member.condominium_id,v_member.id,v_member.legacy_id,v_member.name,lower(trim(v_request.email)),'resident',coalesce(v_member.data->>'apartment',''),'[]'::jsonb,true,v_request.requested_user_id,coalesce(v_member.data,'{}'::jsonb))
 on conflict do update set member_id=excluded.member_id,name=excluded.name,email=excluded.email,legacy_id=excluded.legacy_id,apartment=excluded.apartment,permissions=excluded.permissions,active=true,user_id=excluded.user_id,data=excluded.data,updated_at=now();
 insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id)
 values(v_workspace,v_request.requested_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id)
 on conflict(workspace_id,user_id) do update set active=true,role='resident',condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
 update public.profiles set full_name=v_member.name,email=lower(trim(v_request.email)),role='resident',active=true,updated_at=now() where id=v_request.requested_user_id;
 update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=v_request.id;
 return jsonb_build_object('status','approved','workspace_id',v_workspace,'member_id',v_member.id,'email_mismatch',lower(trim(v_request.email))<>lower(trim(coalesce(v_member.email,''))));
end;
$function$
;

CREATE OR REPLACE FUNCTION private.apply_portal_member_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  member_role text;
begin
  select coalesce(cm.data->>'role',cm.role) into member_role
  from public.condominium_members cm
  where cm.id=new.member_id and cm.active=true;

  if member_role is null then
    select coalesce(cm.data->>'role',cm.role) into member_role
    from public.condominium_members cm
    where cm.condominium_id=new.condominium_id
      and ((new.user_id is not null and cm.user_id=new.user_id) or lower(trim(cm.email))=lower(trim(new.email)))
      and cm.active=true
    order by case when new.user_id is not null and cm.user_id=new.user_id then 0 else 1 end,cm.created_at
    limit 1;
  end if;

  if member_role='Inquilino' then
    new.permissions:='["pagamenti_ordinari","comunicazioni","regolamento"]'::jsonb;
  elsif member_role='Proprietario' then
    new.permissions:='["documenti","verbali","regolamento","pagamenti_ordinari","pagamenti_straordinari","assemblee","comunicazioni"]'::jsonb;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_row public.communication_recipients%rowtype;
  v_status text;
  v_comm uuid;
  v_counts jsonb;
begin
  if nullif(trim(p_provider_message_id),'') is null
     or nullif(trim(p_event_type),'') is null then
    raise exception 'Evento Resend incompleto';
  end if;

  select * into v_row
  from public.communication_recipients
  where provider_message_id=p_provider_message_id
    and (p_email is null or lower(trim(email))=lower(trim(p_email)))
  for update;

  if not found then
    return jsonb_build_object('status','ignored','reason','recipient_not_found');
  end if;

  v_status:=case p_event_type
    when 'email.delivered' then 'delivered'
    when 'email.bounced' then 'failed'
    when 'email.complained' then 'failed'
    when 'email.sent' then case when v_row.status='queued' then 'sent' else v_row.status end
    else v_row.status
  end;

  update public.communication_recipients
  set status=v_status,
      event_type=p_event_type,
      provider_event_id=coalesce(p_event_id,provider_event_id),
      delivered_at=case when p_event_type='email.delivered' then coalesce(p_event_at,now()) else delivered_at end,
      bounced_at=case when p_event_type='email.bounced' then coalesce(p_event_at,now()) else bounced_at end,
      complained_at=case when p_event_type='email.complained' then coalesce(p_event_at,now()) else complained_at end,
      error_message=case
        when p_event_type='email.bounced' then 'email.bounced'
        when p_event_type='email.complained' then 'email.complained'
        else error_message
      end,
      updated_at=now()
  where id=v_row.id
  returning communication_id into v_comm;

  select jsonb_build_object(
    'pending',count(*) filter(where status in ('pending','queued')),
    'sent',count(*) filter(where status='sent'),
    'delivered',count(*) filter(where status='delivered'),
    'failed',count(*) filter(where status='failed')
  ) into v_counts
  from public.communication_recipients
  where communication_id=v_comm;

  update public.communications
  set email_status=case
    when (v_counts->>'pending')::int>0 then 'In elaborazione'
    when (v_counts->>'failed')::int>0
      and ((v_counts->>'sent')::int+(v_counts->>'delivered')::int)>0 then 'Parzialmente inviata'
    when (v_counts->>'failed')::int>0 then 'Errore'
    when (v_counts->>'delivered')::int>0 and (v_counts->>'sent')::int=0 then 'Consegnata'
    when (v_counts->>'sent')::int>0 then 'Inviata'
    else email_status
  end,
  updated_at=now()
  where id=v_comm;

  return jsonb_build_object(
    'status','updated',
    'communication_id',v_comm,
    'counts',v_counts
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_archived_at timestamptz;
  v_archived_by uuid;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = coalesce(archived_at, now()),
      archived_by = case when archived_at is null then auth.uid() else archived_by end,
      archive_reason = case
        when nullif(trim(coalesce(p_reason,'')),'') is null then archive_reason
        else trim(p_reason)
      end,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
  returning archived_at, archived_by, archive_reason
  into v_archived_at, v_archived_by, v_reason;

  if not found then
    raise exception 'Condominio non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'archived',
      'Condominio archiviato',
      jsonb_build_object(
        'archived_at', v_archived_at,
        'archived_by', v_archived_by,
        'reason', v_reason
      )
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.can_access_condominium(target_condominium uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.condominiums c
    where c.id = target_condominium
      and c.archived_at is null
      and (
        private.is_workspace_admin(c.workspace_id)
        or private.can_access_workspace_module(c.workspace_id, 'condomini')
        or private.can_access_resident_condominium(c.id)
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION private.can_access_resident_condominium(target_condominium uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.condominiums c
    join public.portal_access pa on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and (
       (pa.user_id is not null and cm.user_id = pa.user_id)
       or lower(cm.email) = lower(pa.email)
     )
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (
        pa.user_id = (select auth.uid())
        or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION private.can_access_resident_condominium_module(target_condominium uuid, required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.condominiums c
    join public.portal_access pa on pa.condominium_id = c.id
    join public.condominium_members cm
      on cm.condominium_id = pa.condominium_id
     and cm.active = true
     and ((pa.user_id is not null and cm.user_id = pa.user_id) or lower(cm.email) = lower(pa.email))
    where c.id = target_condominium
      and c.archived_at is null
      and pa.active = true
      and pa.role in ('resident','council')
      and (pa.user_id = (select auth.uid()) or lower(pa.email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
      and coalesce(pa.permissions, '[]'::jsonb) @> jsonb_build_array(required_permission)
  );
$function$
;

CREATE OR REPLACE FUNCTION private.can_access_workspace_module(target_workspace uuid, required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '[]'::jsonb) ? required_permission
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(target_workspace uuid, required_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and (
        wm.role = 'admin'
        or (
          wm.role = 'collaborator'
          and coalesce(wm.permissions, '{}'::jsonb) ? required_permission
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_outgoing_ids uuid[]; v_status text; v_scope text;
  v_open_installments numeric:=0; v_open_allocations numeric:=0; v_open_member_carryovers numeric:=0; v_open_unit_carryovers numeric:=0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.workspace_id,t.status,coalesce(t.data->>'transfer_scope','whole_property'),
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
              else array[t.outgoing_member_id] end
    into v_workspace,v_status,v_scope,v_outgoing_ids
  from public.condominium_member_transfers t where t.id=p_transfer_id;
  if v_workspace is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
  if not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
  if v_scope='ownership_share' then
    return jsonb_build_object('transfer_id',p_transfer_id,'status',v_status,'transfer_scope',v_scope,'open_installments',0,'open_allocations',0,'open_member_carryovers',0,'open_unit_carryovers',0,'open_total',0);
  end if;
  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=any(v_outgoing_ids) and coalesce(i.amount-i.paid_amount,0)>0.005;
  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations from public.condominium_expense_allocations a where a.member_id=any(v_outgoing_ids) and coalesce(a.amount-a.paid_amount,0)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_member_carryovers from public.condominium_fiscal_carryovers c where c.member_id=any(v_outgoing_ids) and abs(coalesce(c.balance,0))>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c
    join public.condominium_member_transfers t on t.id=p_transfer_id
    where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(coalesce(c.balance,0))>0.005;
  return jsonb_build_object('transfer_id',p_transfer_id,'status',v_status,'transfer_scope',v_scope,'outgoing_member_ids',to_jsonb(v_outgoing_ids),
    'open_installments',round(v_open_installments,2),'open_allocations',round(v_open_allocations,2),'open_member_carryovers',round(v_open_member_carryovers,2),'open_unit_carryovers',round(v_open_unit_carryovers,2),
    'open_total',round(v_open_installments+v_open_allocations+v_open_member_carryovers+v_open_unit_carryovers,2));
end;
$function$
;

CREATE OR REPLACE FUNCTION private.claim_first_workspace_admin(p_workspace_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  target_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select w.id
    into target_workspace
  from public.workspaces w
  where (p_workspace_id is null or w.id = p_workspace_id)
  order by w.created_at
  limit 1;

  if target_workspace is null then
    raise exception 'Workspace BETHAG non trovato';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_workspace::text, 0));

  if exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
  ) then
    raise exception 'Il workspace è già stato inizializzato';
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    active,
    permissions
  )
  values (
    target_workspace,
    auth.uid(),
    'admin',
    true,
    '{}'::jsonb
  );

  update public.profiles
  set role = 'admin',
      active = true,
      updated_at = now()
  where id = auth.uid();

  return target_workspace;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_year public.condominium_fiscal_years%rowtype;
begin
  if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id, 'contabilita') then raise exception 'Operazione non autorizzata'; end if;

  select * into v_year
  from public.condominium_fiscal_years
  where id=p_fiscal_year_id and workspace_id=p_workspace_id
  for update;

  if not found then raise exception 'Esercizio contabile non trovato'; end if;
  if v_year.status='Chiuso' then return v_year.id; end if;

  if exists (
    select 1 from public.condominiums c
    where c.id=v_year.condominium_id and c.workspace_id=v_year.workspace_id and c.archived_at is not null
  ) then raise exception 'Non è possibile chiudere un esercizio di un condominio archiviato'; end if;

  if exists (
    select 1 from public.condominium_ledger_entries l
    where l.workspace_id=v_year.workspace_id and l.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id
      and (l.entry_date<v_year.start_date or l.entry_date>v_year.end_date)
  ) then raise exception 'L''esercizio contiene movimenti contabili fuori periodo'; end if;

  if exists (
    select 1 from public.condominium_installments i
    where i.workspace_id=v_year.workspace_id and i.condominium_id=v_year.condominium_id
      and i.fiscal_year_id=v_year.id and i.due_date is not null
      and (i.due_date<v_year.start_date or i.due_date>v_year.end_date)
  ) then raise exception 'L''esercizio contiene rate con scadenza fuori periodo'; end if;

  if exists (
    select 1 from public.condominium_ledger_entries l
    where l.workspace_id=v_year.workspace_id and l.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id and l.direction='Uscita'
      and (
        (select coalesce(sum(i.amount),0) from public.condominium_installments i
         where i.workspace_id=l.workspace_id and i.condominium_id=l.condominium_id
           and i.ledger_entry_id=l.id and i.status<>'Accorpata') > l.amount+0.005
        or
        (select coalesce(sum(i.paid_amount),0) from public.condominium_installments i
         where i.workspace_id=l.workspace_id and i.condominium_id=l.condominium_id
           and i.ledger_entry_id=l.id and i.status<>'Accorpata')
        >
        (select coalesce(sum(pm.amount),0)
         from public.condominium_payment_movements pm
         join public.condominium_installments pi on pi.id=pm.installment_id
         where pi.ledger_entry_id=l.id and pm.workspace_id=l.workspace_id and pm.condominium_id=l.condominium_id)+0.005
      )
  ) then raise exception 'L''esercizio presenta rate o pagamenti non riconciliati'; end if;

  if exists (
    select 1
    from public.condominium_expense_allocations a
    join public.condominium_ledger_entries l on l.id=a.ledger_entry_id
    where a.workspace_id=v_year.workspace_id and a.condominium_id=v_year.condominium_id
      and l.fiscal_year_id=v_year.id
    group by a.ledger_entry_id,l.amount
    having abs(sum(a.amount)-l.amount)>0.005
  ) then raise exception 'L''esercizio presenta ripartizioni non riconciliate'; end if;

  perform set_config('bethag.allow_fiscal_year_status_update','on',true);

  update public.condominium_fiscal_years
  set status='Chiuso', updated_at=now()
  where id=v_year.id;

  return v_year.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_outgoing_ids uuid[]; v_transfer_status text; v_scope text;
  v_open_installments numeric; v_open_allocations numeric; v_open_carryovers numeric; v_open_unit_carryovers numeric; v_outgoing_id uuid; v_out_data jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select t.workspace_id,t.status,coalesce(t.data->>'transfer_scope','whole_property'),
         case when jsonb_typeof(t.data->'outgoing_member_ids')='array'
              then (select array_agg(value::uuid) from jsonb_array_elements_text(t.data->'outgoing_member_ids'))
              else array[t.outgoing_member_id] end
    into v_workspace,v_transfer_status,v_scope,v_outgoing_ids
  from public.condominium_member_transfers t where t.id=p_transfer_id for update;
  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if v_transfer_status<>'Confermato' then raise exception 'TRANSFER_NOT_OPEN'; end if;
  if v_scope='ownership_share' then raise exception 'TRANSFER_QUOTA_NOT_CLOSABLE'; end if;
  select coalesce(sum(i.amount-i.paid_amount),0) into v_open_installments from public.condominium_installments i where i.member_id=any(v_outgoing_ids) and i.amount-i.paid_amount>0.005;
  select coalesce(sum(a.amount-a.paid_amount),0) into v_open_allocations from public.condominium_expense_allocations a where a.member_id=any(v_outgoing_ids) and a.amount-a.paid_amount>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_carryovers from public.condominium_fiscal_carryovers c where c.member_id=any(v_outgoing_ids) and abs(c.balance)>0.005;
  select coalesce(sum(abs(c.balance)),0) into v_open_unit_carryovers from public.condominium_fiscal_carryovers c
    join public.condominium_member_transfers t on t.id=p_transfer_id
    where c.workspace_id=t.workspace_id and c.condominium_id=t.condominium_id and c.unit_id=t.unit_id and c.member_id is null and abs(c.balance)>0.005;
  if v_open_installments>0.005 or v_open_allocations>0.005 or v_open_carryovers>0.005 or v_open_unit_carryovers>0.005 then
    raise exception 'TRANSFER_FINANCIAL_POSITIONS_OPEN: i cedenti mantengono la posizione attiva finché tutte le situazioni contabili non sono chiuse';
  end if;
  foreach v_outgoing_id in array v_outgoing_ids loop
    select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=v_outgoing_id for update;
    update public.condominium_members set active=false,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','Archiviato','current_owner',false) where id=v_outgoing_id;
  end loop;
  update public.condominium_member_transfers set status='Chiuso',closed_at=now(),closed_by=auth.uid(),updated_at=now(),data=coalesce(data,'{}'::jsonb)||jsonb_build_object('financial_positions_closed',true) where id=p_transfer_id;
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_source public.condominium_fiscal_years%rowtype;
  v_target public.condominium_fiscal_years%rowtype;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_source
  from public.condominium_fiscal_years
  where id=p_source_fiscal_year_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then raise exception 'Esercizio contabile non trovato'; end if;

  perform public.close_condominium_fiscal_year(p_workspace_id,p_source_fiscal_year_id);

  select * into v_target
  from public.condominium_fiscal_years
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and start_date>v_source.end_date
  order by start_date
  limit 1
  for update;

  if v_target.id is not null then
    if exists (
      select 1 from public.condominiums c
      where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null
    ) then
      raise exception 'Non è possibile generare riporti per un condominio archiviato';
    end if;
    if v_target.status='Chiuso' then
      raise exception 'L''esercizio successivo è già chiuso e non può ricevere il saldo iniziale';
    end if;

    v_count := public.generate_fiscal_year_carryovers(
      p_workspace_id,p_condominium_id,v_source.id,v_target.id
    );
  end if;

  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid := (select auth.uid());
 v_c public.condominium_fiscal_carryovers%rowtype;
 v_amount numeric;
 v_remaining numeric;
 v_new_balance numeric;
 v_target public.condominium_installments%rowtype;
 v_target_year public.condominium_fiscal_years%rowtype;
 v_already_applied numeric;
 v_target_residual numeric;
begin
 if v_uid is null then raise exception 'Autenticazione richiesta'; end if;
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
   raise exception 'Autorizzazione gestione contabilità richiesta';
 end if;

 if exists (
   select 1 from public.condominiums c
   where c.id=p_condominium_id
     and c.workspace_id=p_workspace_id
     and c.archived_at is not null
 ) then
   raise exception 'Il condominio è archiviato e non può essere modificato';
 end if;

 if p_amount is null
    or p_amount::text in ('NaN','Infinity','-Infinity')
    or p_amount<=0 then
   raise exception 'L''importo della compensazione deve essere maggiore di zero';
 end if;

 select * into v_c
 from public.condominium_fiscal_carryovers
 where id=p_carryover_id
   and workspace_id=p_workspace_id
   and condominium_id=p_condominium_id
 for update;

 if not found then raise exception 'Partita riportata non trovata'; end if;
 if v_c.status='Compensato' then raise exception 'La partita riportata è già completamente compensata'; end if;

 v_remaining:=round(abs(v_c.balance::numeric),2);
 v_amount:=round(p_amount::numeric,2);

 if v_remaining<=0.005 then
   raise exception 'La partita riportata non ha più un residuo compensabile';
 end if;

 if v_amount>v_remaining+0.005 then
   raise exception 'La compensazione supera il residuo della partita: residuo %',
     to_char(v_remaining,'FM999999990.00');
 end if;

 if v_c.kind='Debito' and p_target_installment_id is not null then
   raise exception 'Un debito riportato non può essere utilizzato come credito su una rata corrente';
 end if;

 if p_target_installment_id is not null then
   select * into v_target
   from public.condominium_installments
   where id=p_target_installment_id
     and workspace_id=p_workspace_id
     and condominium_id=p_condominium_id
   for update;

   if not found then raise exception 'Rata di destinazione non trovata'; end if;
   if v_c.kind<>'Credito' then
     raise exception 'Solo un credito riportato può essere applicato a una rata corrente';
   end if;

   select * into v_target_year
   from public.condominium_fiscal_years
   where id=v_c.target_fiscal_year_id
     and workspace_id=p_workspace_id
     and condominium_id=p_condominium_id
   for update;

   if not found then raise exception 'Esercizio di destinazione della partita riportata non trovato'; end if;
   if v_target_year.status='Chiuso' then raise exception 'L''esercizio di destinazione è chiuso'; end if;

   if v_target.fiscal_year_id is distinct from v_c.target_fiscal_year_id then
     raise exception 'La rata di destinazione deve appartenere all''esercizio destinatario della partita riportata';
   end if;

   if v_target.unit_id is distinct from v_c.unit_id then
     raise exception 'La rata di destinazione deve appartenere alla stessa unità della partita riportata';
   end if;

   /*
     Se il riporto è proprietario-specifico, anche la rata di destinazione
     deve essere dello stesso proprietario. Se il riporto è a livello unità
     (member_id NULL), può essere applicato soltanto a una rata ugualmente
     a livello unità, evitando di trasferire un credito comune su una
     posizione individuale non equivalente.
   */
   if v_c.member_id is not null and v_target.member_id is distinct from v_c.member_id then
     raise exception 'La rata di destinazione deve appartenere allo stesso proprietario della partita riportata';
   end if;

   if v_c.member_id is null and v_target.member_id is not null then
     raise exception 'Una partita riportata a livello di unità non può essere applicata a una rata proprietario-specifica';
   end if;

   select round(coalesce(sum(amount),0),2)
   into v_already_applied
   from public.condominium_fiscal_carryover_compensations
   where target_installment_id=v_target.id;

   v_target_residual:=round(v_target.amount-v_target.paid_amount-v_already_applied,2);

   if v_target_residual<=0.005 then
     raise exception 'La rata di destinazione non ha più un residuo compensabile';
   end if;

   if v_amount>v_target_residual+0.005 then
     raise exception 'La compensazione supera il residuo effettivo della rata di destinazione: residuo %',
       to_char(v_target_residual,'FM999999990.00');
   end if;
 end if;

 insert into public.condominium_fiscal_carryover_compensations(
   workspace_id,condominium_id,carryover_id,target_installment_id,
   amount,notes,created_by
 )
 values(
   p_workspace_id,p_condominium_id,p_carryover_id,p_target_installment_id,
   v_amount,trim(coalesce(p_notes,'')),v_uid
 );

 if v_c.kind='Debito' then
   v_new_balance:=round(abs(v_c.balance)-v_amount,2);
 else
   v_new_balance:=-round(abs(v_c.balance)-v_amount,2);
 end if;

 if abs(v_new_balance)<=0.005 then
   v_new_balance:=0;
   update public.condominium_fiscal_carryovers
   set balance=0,status='Compensato',updated_at=now()
   where id=v_c.id;
 else
   update public.condominium_fiscal_carryovers
   set balance=v_new_balance,status='Parzialmente compensato',updated_at=now()
   where id=v_c.id;
 end if;

 return v_new_balance;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.complete_portal_registration(p_full_name text, p_fiscal_code text DEFAULT NULL::text, p_condominium_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user_id uuid:=auth.uid(); v_email text; v_member public.condominium_members%rowtype;
v_candidate_count integer:=0; v_workspace uuid; v_request_id uuid;
begin
 if v_user_id is null then raise exception 'Autenticazione richiesta'; end if;
 select lower(trim(u.email)) into v_email from auth.users u where u.id=v_user_id and u.email_confirmed_at is not null;
 if v_email is null then raise exception 'E-mail non ancora verificata'; end if;
 select count(*) into v_candidate_count from public.condominium_members cm where cm.active=true and
 (lower(trim(cm.name))=lower(trim(p_full_name)) or
 (coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>'' and
 regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')=regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g')));
 if v_candidate_count=1 then
  select cm.* into v_member from public.condominium_members cm where cm.active=true and
  (lower(trim(cm.name))=lower(trim(p_full_name)) or
  (coalesce(nullif(regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'),''),'')<>'' and
  regexp_replace(lower(coalesce(cm.data->>'fiscalCode','')),'[^a-z0-9]','','g')=regexp_replace(lower(trim(p_fiscal_code)),'[^a-z0-9]','','g'))) limit 1;
  select c.workspace_id into v_workspace from public.condominiums c where c.id=v_member.condominium_id;
  if lower(trim(coalesce(v_member.email,'')))=v_email then
   update public.condominium_members set user_id=v_user_id,updated_at=now() where id=v_member.id;
   insert into public.portal_access(workspace_id,condominium_id,legacy_id,name,email,role,apartment,permissions,active,user_id,data,member_id)
   values(v_workspace,v_member.condominium_id,v_member.legacy_id,v_member.name,v_email,'resident',coalesce(v_member.data->>'apartment',''),'["documenti","verbali","regolamento","assemblee","comunicazioni"]'::jsonb,true,v_user_id,coalesce(v_member.data,'{}'::jsonb),v_member.id)
   on conflict do update set name=excluded.name,legacy_id=excluded.legacy_id,apartment=excluded.apartment,permissions=excluded.permissions,active=true,user_id=excluded.user_id,data=excluded.data,member_id=excluded.member_id,updated_at=now();
   insert into public.workspace_members(workspace_id,user_id,role,active,permissions,condominium_id,legacy_id)
   values(v_workspace,v_user_id,'resident',true,'{}'::jsonb,v_member.condominium_id,v_member.legacy_id)
   on conflict(workspace_id,user_id) do update set active=true,role='resident',condominium_id=excluded.condominium_id,legacy_id=excluded.legacy_id;
   update public.profiles set full_name=v_member.name,email=v_email,role='resident',active=true,updated_at=now() where id=v_user_id;
   update public.portal_registration_requests set status='approved',matched_member_id=v_member.id,workspace_id=v_workspace,requested_user_id=v_user_id,reviewed_at=coalesce(reviewed_at,now()),updated_at=now() where lower(trim(email))=v_email and status in ('pending','email_mismatch');
   return jsonb_build_object('status','approved','workspace_id',v_workspace,'condominium_id',v_member.condominium_id,'member_id',v_member.id);
  end if;
  insert into public.portal_registration_requests(workspace_id,requested_user_id,email,full_name,fiscal_code,condominium_name,status,matched_member_id,note)
  values(v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),nullif(trim(p_condominium_name),''),'email_mismatch',v_member.id,'Incongruenza e-mail: e-mail dell''account diversa da quella presente nell''anagrafica del condòmino.')
  on conflict do nothing returning id into v_request_id;
  return jsonb_build_object('status','email_mismatch','request_id',v_request_id);
 end if;
 select c.workspace_id into v_workspace from public.condominiums c where p_condominium_name is not null and lower(trim(c.name))=lower(trim(p_condominium_name)) group by c.workspace_id having count(*)=1 limit 1;
 if v_workspace is null then select min(w.id) into v_workspace from public.workspaces w having count(*)=1; end if;
 insert into public.portal_registration_requests(workspace_id,requested_user_id,email,full_name,fiscal_code,condominium_name,status,note)
 values(v_workspace,v_user_id,v_email,trim(p_full_name),nullif(trim(p_fiscal_code),''),nullif(trim(p_condominium_name),''),'pending','Profilo condòmino non individuato automaticamente.')
 on conflict do nothing returning id into v_request_id;
 update public.profiles set full_name=trim(p_full_name),email=v_email,role='resident',active=true,updated_at=now() where id=v_user_id;
 return jsonb_build_object('status','pending','request_id',v_request_id);
end;$function$
;

CREATE OR REPLACE FUNCTION private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_workspace_id uuid;
 v_status text;
 v_validation_errors jsonb;
 v_condominium_workspace uuid;
 v_archived_at timestamptz;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;

 select workspace_id,status,validation_errors
 into v_workspace_id,v_status,v_validation_errors
 from public.condominium_creation_intakes
 where id=p_intake_id
 for update;

 if v_workspace_id is null then raise exception 'Importazione condominiale non trovata'; end if;
 if not private.can_manage_workspace_module(v_workspace_id,'condomini') then raise exception 'Autorizzazione gestione condomini richiesta'; end if;
 if v_status <> 'Da verificare' then raise exception 'L''importazione deve essere nello stato Da verificare'; end if;
 if coalesce(jsonb_array_length(v_validation_errors),0) > 0 then
   raise exception 'L''importazione contiene errori di validazione e non può essere confermata';
 end if;

 select workspace_id,archived_at
 into v_condominium_workspace,v_archived_at
 from public.condominiums
 where id=p_condominium_id
 for update;

 if v_condominium_workspace is null then raise exception 'Condominio non trovato'; end if;
 if v_condominium_workspace <> v_workspace_id then raise exception 'Il condominio appartiene a un workspace diverso'; end if;
 if v_archived_at is not null then raise exception 'Non è possibile confermare un condominio archiviato'; end if;

 update public.condominium_creation_intakes
 set status='Confermato',created_condominium_id=p_condominium_id,
     confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id;

 return p_condominium_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text DEFAULT 'Vendita'::text, p_notes text DEFAULT ''::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_condominium uuid; v_transfer_id uuid; v_incoming_id uuid;
  v_existing_count int; v_snapshot jsonb; v_out_data jsonb;
  v_scope text := coalesce(p_data->>'transfer_scope','whole_property');
  v_outgoing_ids uuid[] := array[p_outgoing_member_id];
  v_outgoing_id uuid;
  v_outgoing_share numeric;
  v_incoming_share numeric;
  v_incoming_members jsonb := case when jsonb_typeof(p_data->'incoming_members')='array' and jsonb_array_length(p_data->'incoming_members')>0 then p_data->'incoming_members' else jsonb_build_array(jsonb_build_object('name',p_incoming_name,'email',p_incoming_email,'ownership_share',coalesce(nullif(trim(coalesce(p_data->>'incoming_share','')),'')::numeric,100))) end;
  v_incoming_record jsonb;
  v_created_incoming_ids uuid[] := '{}'::uuid[];
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
  if nullif(trim(coalesce(p_incoming_name,'')),'') is null then raise exception 'INCOMING_NAME_REQUIRED'; end if;

  select u.workspace_id,u.condominium_id into v_workspace,v_condominium
  from public.condominium_units u where u.id=p_unit_id for update;
  if v_workspace is null or not private.can_manage_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived_at is not null) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;

  if v_scope not in ('whole_property','ownership_share') then raise exception 'INVALID_TRANSFER_SCOPE'; end if;

  if v_scope='whole_property' and jsonb_typeof(p_data->'outgoing_member_ids')='array' then
    select array_agg(value::uuid) into v_outgoing_ids
    from jsonb_array_elements_text(p_data->'outgoing_member_ids');
    if v_outgoing_ids is null or array_length(v_outgoing_ids,1)=0 then
      v_outgoing_ids := array[p_outgoing_member_id];
    end if;
    if not (p_outgoing_member_id = any(v_outgoing_ids)) then
      v_outgoing_ids := array_prepend(p_outgoing_member_id,v_outgoing_ids);
    end if;
  end if;

  if not exists(
    select 1 from public.condominium_members m
    where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id
      and m.active and trim(coalesce(m.data->>'role',''))='Proprietario'
      and coalesce(m.data->>'current_owner','true')='true'
      and coalesce(m.data->>'position_status','Attivo') not in ('In chiusura','Archiviato')
  ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT'; end if;

  if exists(select 1 from public.condominium_member_transfers t
    where t.unit_id=p_unit_id and t.transfer_date=p_transfer_date and t.status in ('Confermato','Chiuso'))
  then raise exception 'TRANSFER_ALREADY_EXISTS'; end if;

  if v_scope='whole_property' then
    if exists(
      select 1 from public.condominium_members m
      where m.id = any(v_outgoing_ids)
        and (m.condominium_id<>v_condominium or m.unit_id<>p_unit_id or not m.active
          or trim(coalesce(m.data->>'role',''))<>'Proprietario'
          or coalesce(m.data->>'current_owner','true')<>'true'
          or coalesce(m.data->>'position_status','Attivo') in ('In chiusura','Archiviato'))
    ) then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT'; end if;

    select count(*) into v_existing_count
    from public.condominium_members m
    where m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active and not (m.id=any(v_outgoing_ids))
      and coalesce(m.data->>'current_owner','true')='true'
      and coalesce(m.data->>'position_status','Attivo')='Attivo'
      and trim(coalesce(m.data->>'role',''))='Proprietario';
    if v_existing_count>0 then raise exception 'ACTIVE_INCOMING_OWNER_ALREADY_PRESENT'; end if;
  else
    v_outgoing_share := nullif(trim(coalesce(p_data->>'outgoing_share','')),'')::numeric;
    v_incoming_share := nullif(trim(coalesce(p_data->>'incoming_share','')),'')::numeric;
    if v_outgoing_share is null or v_incoming_share is null or v_outgoing_share <= 0 or v_incoming_share <= 0 then
      raise exception 'OWNERSHIP_SHARE_REQUIRED';
    end if;
    if v_incoming_share > v_outgoing_share + 0.0001 then
      raise exception 'OWNERSHIP_SHARE_EXCEEDS_OUTGOING';
    end if;
    select coalesce(nullif(trim(coalesce(m.data->>'ownership_share','')),'')::numeric,0)
      into v_outgoing_share
    from public.condominium_members m where m.id=p_outgoing_member_id for update;
    if v_outgoing_share <= 0 or v_incoming_share > v_outgoing_share + 0.0001 then
      raise exception 'OUTGOING_OWNERSHIP_SHARE_NOT_AVAILABLE';
    end if;
  end if;

  if jsonb_typeof(v_incoming_members) <> 'array' or jsonb_array_length(v_incoming_members)=0 then
    raise exception 'INCOMING_MEMBERS_REQUIRED';
  end if;

  if exists(
    select 1 from jsonb_array_elements(v_incoming_members) as x
    where nullif(trim(coalesce(x.value->>'name','')),'') is null
       or nullif(trim(coalesce(x.value->>'ownership_share','')),'') is null
       or (x.value->>'ownership_share')::numeric <= 0
  ) then raise exception 'INCOMING_MEMBER_DATA_INVALID'; end if;

  select coalesce(sum((x.value->>'ownership_share')::numeric),0) into v_incoming_share
  from jsonb_array_elements(v_incoming_members) as x;

  if v_scope='whole_property' and abs(v_incoming_share-100) > 0.0001 then
    raise exception 'INCOMING_OWNERSHIP_SHARES_MUST_TOTAL_100';
  end if;

  if v_scope='ownership_share' then
    if v_incoming_share <= 0 or v_incoming_share > coalesce(nullif(trim(coalesce(p_data->>'incoming_share','')),'')::numeric,0) + 0.0001 then
      raise exception 'INCOMING_OWNERSHIP_SHARES_EXCEED_TRANSFERRED_SHARE';
    end if;
  end if;

  v_snapshot:=jsonb_build_object(
    'captured_at',now(),'transfer_date',p_transfer_date,'outgoing_member_id',p_outgoing_member_id,
    'outgoing_member_ids',to_jsonb(v_outgoing_ids),'unit_id',p_unit_id,'transfer_scope',v_scope,
    'installments_due_before',coalesce((select sum(i.amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
    'installments_paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
    'installments_residual',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
    'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'assignment_scope',case when i.member_id is null then 'unit_unassigned' else 'member' end,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),
    'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id)) and i.amount-i.paid_amount>0.005),0),
    'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=any(v_outgoing_ids) or (i.member_id is null and i.unit_id=p_unit_id) ) and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),
    'allocations_before',coalesce((select sum(a.amount) from public.condominium_expense_allocations a where a.member_id=any(v_outgoing_ids) and (a.due_date is null or a.due_date<=p_transfer_date)),0),
    'extraordinary_deliberated_before_due_after',coalesce((select jsonb_agg(jsonb_build_object('allocation_id',a.id,'ledger_entry_id',a.ledger_entry_id,'amount',a.amount,'paid_amount',a.paid_amount,'residual',a.amount-a.paid_amount,'due_date',a.due_date,'deliberation_date',l.deliberation_date,'description',l.description) order by l.deliberation_date,a.due_date,a.id) from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=any(v_outgoing_ids) and l.expense_type='Straordinaria' and l.deliberation_date is not null and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),'[]'::jsonb),
    'unit_unassigned_carryovers',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'balance',c.balance,'kind',c.kind,'status',c.status,'source_fiscal_year_id',c.source_fiscal_year_id,'target_fiscal_year_id',c.target_fiscal_year_id) order by c.created_at,c.id) from public.condominium_fiscal_carryovers c where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),'[]'::jsonb),
    'legal_liability_review_required',true
  );

  if v_scope='whole_property' then
    foreach v_outgoing_id in array v_outgoing_ids loop
      select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=v_outgoing_id for update;
      update public.condominium_members set active=true,updated_at=now(),data=v_out_data||jsonb_build_object('position_status','In chiusura','current_owner',false,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type) where id=v_outgoing_id;
      update public.portal_access set active=false,updated_at=now() where member_id=v_outgoing_id;
      update public.workspace_members set active=false where workspace_id=v_workspace and condominium_id=v_condominium and legacy_id=(select m.legacy_id from public.condominium_members m where m.id=v_outgoing_id) and role='resident';
    end loop;
  end if;

  for v_incoming_record in select value from jsonb_array_elements(v_incoming_members) loop
    insert into public.condominium_members(condominium_id,user_id,name,email,role,active,permissions,data,unit_id,created_at,updated_at)
    values(v_condominium,null,trim(v_incoming_record->>'name'),nullif(lower(trim(coalesce(v_incoming_record->>'email',''))),''),
      'resident',true,'{}'::jsonb,
      coalesce(p_data,'{}'::jsonb)||jsonb_build_object('role','Proprietario','position_status','Attivo','current_owner',true,'subentro_date',p_transfer_date,'subentro_type',p_transfer_type,
        'ownership_share',(v_incoming_record->>'ownership_share')::numeric),p_unit_id,now(),now())
    returning id into v_incoming_id;
    v_created_incoming_ids := array_append(v_created_incoming_ids,v_incoming_id);
  end loop;

  if v_scope='ownership_share' then
    select coalesce(m.data,'{}'::jsonb) into v_out_data from public.condominium_members m where m.id=p_outgoing_member_id for update;
    update public.condominium_members
      set updated_at=now(),
          data=v_out_data||jsonb_build_object(
            'ownership_share',round(v_outgoing_share-v_incoming_share,4),
            'current_owner',true,'position_status','Attivo')
      where id=p_outgoing_member_id;
  end if;

  insert into public.condominium_member_transfers(workspace_id,condominium_id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data,created_by)
  values(v_workspace,v_condominium,p_unit_id,p_outgoing_member_id,v_incoming_id,p_transfer_date,p_transfer_type,'Confermato',coalesce(p_notes,''),
    coalesce(p_data,'{}'::jsonb)||jsonb_build_object('financial_history_preserved',true,'legal_liability_review_required',true,'accounting_snapshot',v_snapshot,'outgoing_portal_deactivated',v_scope='whole_property','transfer_scope',v_scope,'outgoing_member_ids',to_jsonb(v_outgoing_ids),'incoming_ownership_share',v_incoming_share,'incoming_member_ids',to_jsonb(v_created_incoming_ids)),
    auth.uid())
  returning id into v_transfer_id;
  return v_transfer_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_condominium_id uuid;
  v_code_enabled boolean:=false;
  v_code_ok boolean:=false;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'condomini') then
    raise exception 'Operazione non autorizzata';
  end if;

  select coalesce(s.personal_code_enabled,false)
    into v_code_enabled
  from public.user_security_settings s
  where s.user_id=auth.uid();

  if v_code_enabled then
    select public.verify_personal_security_code(p_security_code) into v_code_ok;
    if not v_code_ok then raise exception 'Codice personale non valido'; end if;
  end if;

  select c.id into v_condominium_id
  from public.condominiums c
  where c.workspace_id=p_workspace_id and c.legacy_id=p_legacy_id
  for update;

  if v_condominium_id is null then raise exception 'Condominio non trovato'; end if;

  delete from public.portal_registration_requests
  where workspace_id=p_workspace_id
    and matched_member_id in (
      select id from public.condominium_members
      where condominium_id=v_condominium_id
    );

  delete from public.portal_access
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_work_documents
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_work_events
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_work_progress
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_works
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_register_items
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_suppliers
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.suppliers
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_payment_movements
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_installments
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_ledger_entries
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_budgets
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  -- Must precede fiscal-year deletion because this FK is intentionally RESTRICT.
  delete from public.condominium_fiscal_carryover_compensations
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_fiscal_carryovers
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_fiscal_years
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_funds
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_tax_obligations
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_legal_cases
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_millesimal_values
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_millesimal_tables
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominium_requests
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_members
  where condominium_id=v_condominium_id;
  delete from public.condominium_units
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.documents
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.deadlines
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.assemblies
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.communications
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.activities
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_insurance_policies
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.condominium_audit_log
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;
  delete from public.workspace_members
  where workspace_id=p_workspace_id and condominium_id=v_condominium_id;

  delete from public.condominiums
  where id=v_condominium_id and workspace_id=p_workspace_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_source public.condominium_fiscal_years%rowtype;
  v_target public.condominium_fiscal_years%rowtype;
  v_count integer := 0;
  v_closing numeric := 0;
begin
  if (select auth.uid()) is null then raise exception 'Autenticazione richiesta'; end if;
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_source from public.condominium_fiscal_years
   where id=p_source_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Esercizio di origine non trovato'; end if;

  select * into v_target from public.condominium_fiscal_years
   where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id for update;
  if not found then raise exception 'Esercizio di destinazione non trovato'; end if;

  if exists (select 1 from public.condominiums c where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null) then
    raise exception 'Non è possibile generare riporti per un condominio archiviato';
  end if;
  if v_source.status<>'Chiuso' then raise exception 'L''esercizio di origine deve essere chiuso'; end if;
  if v_target.id=v_source.id then raise exception 'Gli esercizi devono essere diversi'; end if;
  if v_target.start_date<=v_source.end_date then raise exception 'L''esercizio di destinazione deve essere successivo a quello di origine'; end if;
  if v_target.status='Chiuso' then raise exception 'L''esercizio di destinazione è chiuso e non può ricevere il saldo iniziale'; end if;

  if exists (
    select 1 from public.condominium_fiscal_carryovers c
    where c.workspace_id=p_workspace_id and c.condominium_id=p_condominium_id
      and c.source_fiscal_year_id=p_source_fiscal_year_id and c.target_fiscal_year_id=p_target_fiscal_year_id
      and exists (select 1 from public.condominium_fiscal_carryover_compensations cc where cc.carryover_id=c.id)
  ) then
    raise exception 'I riporti dell''esercizio indicato hanno già compensazioni e non possono essere rigenerati';
  end if;

  select round(
    coalesce(v_source.opening_balance,0)
    + coalesce(sum(case when e.direction='Entrata' then e.amount else 0 end),0)
    - coalesce(sum(case when e.direction='Uscita' then e.amount else 0 end),0),2)
    into v_closing
  from public.condominium_ledger_entries e
  where e.workspace_id=p_workspace_id and e.condominium_id=p_condominium_id and e.fiscal_year_id=p_source_fiscal_year_id;

  /* Prima rimuoviamo eventuali riporti rigenerabili: il trigger sul saldo iniziale
     impedisce infatti di cambiarlo mentre esistono riporti collegati. */
  delete from public.condominium_fiscal_carryovers
   where workspace_id=p_workspace_id and condominium_id=p_condominium_id
     and source_fiscal_year_id=p_source_fiscal_year_id and target_fiscal_year_id=p_target_fiscal_year_id;

  update public.condominium_fiscal_years
   set opening_balance=v_closing
   where id=p_target_fiscal_year_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id;

  insert into public.condominium_fiscal_carryovers(
    workspace_id,condominium_id,source_fiscal_year_id,target_fiscal_year_id,unit_id,member_id,balance,kind,status,notes
  )
  select p_workspace_id,p_condominium_id,p_source_fiscal_year_id,p_target_fiscal_year_id,
         q.unit_id,q.member_id,q.balance,
         case when q.balance>0 then 'Debito' else 'Credito' end,
         'Da riportare',
         'Saldo individuale riportato dall''esercizio '||v_source.name
  from (
    select i.unit_id,i.member_id,
           round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2) balance
    from public.condominium_installments i
    left join (
      select installment_id,sum(amount) total_paid
      from public.condominium_payment_movements
      where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      group by installment_id
    ) pm on pm.installment_id=i.id
    where i.workspace_id=p_workspace_id and i.condominium_id=p_condominium_id and i.fiscal_year_id=p_source_fiscal_year_id
    group by i.unit_id,i.member_id
    having abs(round(sum(i.amount)-coalesce(sum(pm.total_paid),0),2))>=0.01
  ) q;

  get diagnostics v_count=row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ declare v_count_before integer; v_count_after integer; begin if p_due_date is null then raise exception 'Titolo e scadenza sono obbligatori'; end if; select count(*) into v_count_before from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id; perform public.generate_installments_from_allocations_schedule(p_workspace_id,p_condominium_id,p_ledger_entry_id,p_title,array[p_due_date],p_fiscal_year_id,array[100]::numeric[],false); select count(*) into v_count_after from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id; return v_count_after-v_count_before; end; $function$
;

CREATE OR REPLACE FUNCTION private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid DEFAULT NULL::uuid, p_percentages numeric[] DEFAULT NULL::numeric[], p_unify_by_member boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a record; m record; i int; n int; part numeric; group_sum numeric; prior numeric; created_count integer:=0;
begin
if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;
perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace_id::text||':'||p_condominium_id::text||':'||p_ledger_entry_id::text,0));
if exists(select 1 from public.condominiums c where c.id=p_condominium_id and c.workspace_id=p_workspace_id and c.archived_at is not null) then raise exception 'Il condominio è archiviato e non può essere modificato'; end if;
if trim(coalesce(p_title,''))='' then raise exception 'Il titolo delle rate è obbligatorio'; end if;
n:=coalesce(array_length(p_due_dates,1),0);
if p_fiscal_year_id is not null and not exists(select 1 from public.condominium_fiscal_years fy where fy.id=p_fiscal_year_id and fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id) then raise exception 'Esercizio contabile selezionato non valido'; end if;
if exists(select 1 from unnest(p_due_dates) d where (select count(*) from public.condominium_fiscal_years fy where fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id and d between fy.start_date and fy.end_date)<>1) then raise exception 'Ogni scadenza deve ricadere in un solo esercizio contabile valido'; end if;
if p_fiscal_year_id is not null and exists(select 1 from public.condominium_fiscal_years fy where fy.id=p_fiscal_year_id and fy.status='Chiuso') then raise exception 'Esercizio contabile di riferimento della spesa chiuso'; end if;
if exists(select 1 from unnest(p_due_dates) d join public.condominium_fiscal_years fy on fy.workspace_id=p_workspace_id and fy.condominium_id=p_condominium_id and d between fy.start_date and fy.end_date where fy.status='Chiuso') then raise exception 'Una o più scadenze ricadono in un esercizio contabile chiuso'; end if;
if n<1 or n>12 then raise exception 'Indicare da 1 a 12 scadenze'; end if;
for i in 1..n loop if p_due_dates[i] is null or (i>1 and p_due_dates[i]<=p_due_dates[i-1]) then raise exception 'Le scadenze devono essere valide, cronologiche e non duplicate'; end if; end loop;
if p_percentages is not null and (array_length(p_percentages,1)<>n or abs((select sum(x) from unnest(p_percentages) x)-100)>0.001 or exists(select 1 from unnest(p_percentages) x where x<=0)) then raise exception 'Percentuali rate non valide'; end if;
if not exists(select 1 from public.condominium_ledger_entries where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and direction='Uscita' and amount>0) then raise exception 'Spesa non valida'; end if;
if exists(select 1 from public.condominium_installments where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id) then raise exception 'La spesa ha già rate collegate'; end if;
if not exists(select 1 from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id and amount>0) then raise exception 'La spesa non ha ripartizioni'; end if;
if p_unify_by_member then
if exists(select 1 from public.condominium_expense_allocations ea where ea.workspace_id=p_workspace_id and ea.condominium_id=p_condominium_id and ea.ledger_entry_id=p_ledger_entry_id and (select count(*) from public.condominium_members cm where cm.condominium_id=p_condominium_id and cm.unit_id=ea.unit_id and cm.active and trim(coalesce(cm.data->>'role',''))='Proprietario' and coalesce(cm.data->>'position_status','')<>'In chiusura')<>1) then raise exception 'Unificazione non consentita: ogni unità deve avere un unico proprietario corrente'; end if;
if exists(select 1 from public.condominium_expense_allocations ea join public.condominium_members cm on cm.condominium_id=p_condominium_id and cm.unit_id=ea.unit_id and cm.active and trim(coalesce(cm.data->>'role',''))='Proprietario' and coalesce(cm.data->>'position_status','')<>'In chiusura' where ea.workspace_id=p_workspace_id and ea.condominium_id=p_condominium_id and ea.ledger_entry_id=p_ledger_entry_id and nullif(trim(cm.user_id::text),'') is null and nullif(lower(trim(coalesce(cm.email,''))),'') is null) then raise exception 'Unificazione non consentita: almeno un proprietario corrente non dispone di un identificativo stabile'; end if;
end if;
for i in 1..n loop
if p_unify_by_member then
for m in select (array_agg(cm.id order by cm.id))[1] member_id,case when cm.user_id is not null then 'u:'||cm.user_id::text else 'e:'||lower(trim(cm.email)) end owner_key from public.condominium_members cm where cm.condominium_id=p_condominium_id and cm.active and trim(coalesce(cm.data->>'role',''))='Proprietario' and coalesce(cm.data->>'position_status','')<>'In chiusura' and exists(select 1 from public.condominium_expense_allocations a2 where a2.workspace_id=p_workspace_id and a2.condominium_id=p_condominium_id and a2.ledger_entry_id=p_ledger_entry_id and a2.unit_id=cm.unit_id) group by case when cm.user_id is not null then 'u:'||cm.user_id::text else 'e:'||lower(trim(cm.email)) end order by (array_agg(cm.id order by cm.id))[1] loop
group_sum:=0;
for a in select ea.* from public.condominium_expense_allocations ea join public.condominium_members cm2 on cm2.condominium_id=p_condominium_id and cm2.unit_id=ea.unit_id and cm2.active and trim(coalesce(cm2.data->>'role',''))='Proprietario' and coalesce(cm2.data->>'position_status','')<>'In chiusura' where ea.workspace_id=p_workspace_id and ea.condominium_id=p_condominium_id and ea.ledger_entry_id=p_ledger_entry_id and case when cm2.user_id is not null then 'u:'||cm2.user_id::text else 'e:'||lower(trim(cm2.email)) end=m.owner_key order by ea.id loop
if i=n then if p_percentages is null then part:=round(a.amount-round(a.amount/n,2)*(n-1),2); else prior:=coalesce((select sum(round(a.amount*x/100,2)) from unnest(p_percentages[1:n-1]) x),0); part:=round(a.amount-prior,2); end if;
else if p_percentages is null then part:=round(a.amount/n,2); else part:=round(a.amount*p_percentages[i]/100,2); end if; end if;
group_sum:=group_sum+part;
end loop;
if group_sum>0 then
insert into public.condominium_installments(workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes)
select p_workspace_id,p_condominium_id,y.id,p_ledger_entry_id,m.member_id,null,trim(p_title)||' - rata '||i||'/'||n,round(group_sum,2),0,'Da pagare',p_due_dates[i],'Rata unificata per proprietario' from public.condominium_fiscal_years y where y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and p_due_dates[i] between y.start_date and y.end_date order by y.start_date limit 1;
created_count:=created_count+1;
end if;
end loop;
else
for a in select * from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id and amount>0 order by id loop
if i=n then if p_percentages is null then part:=round(a.amount-round(a.amount/n,2)*(n-1),2); else prior:=coalesce((select sum(round(a.amount*x/100,2)) from unnest(p_percentages[1:n-1]) x),0); part:=round(a.amount-prior,2); end if;
else if p_percentages is null then part:=round(a.amount/n,2); else part:=round(a.amount*p_percentages[i]/100,2); end if; end if;
insert into public.condominium_installments(workspace_id,condominium_id,fiscal_year_id,ledger_entry_id,member_id,unit_id,title,amount,paid_amount,status,due_date,notes)
select p_workspace_id,p_condominium_id,y.id,p_ledger_entry_id,a.member_id,a.unit_id,trim(p_title)||' - rata '||i||'/'||n,part,0,'Da pagare',p_due_dates[i],coalesce(a.notes,'') from public.condominium_fiscal_years y where y.workspace_id=p_workspace_id and y.condominium_id=p_condominium_id and p_due_dates[i] between y.start_date and y.end_date order by y.start_date limit 1;
created_count:=created_count+1;
end loop;
end if;
end loop;
return created_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.get_my_workspace_access()
 RETURNS TABLE(workspace_id uuid, role text, permissions jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    wm.workspace_id,
    wm.role,
    coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION private.guard_confirmed_intake_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if tg_op='DELETE' and old.status='Confermato' then
   raise exception 'Un''acquisizione confermata non può essere eliminata';
 end if;
 if tg_op='UPDATE' and old.status='Confermato' then
   raise exception 'Un''acquisizione confermata non può essere modificata';
 end if;
 return coalesce(new,old);
end;
$function$
;

CREATE OR REPLACE FUNCTION private.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.is_workspace_admin(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
      and wm.active = true
      and wm.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION private.is_workspace_manager(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.active = true
      and wm.role in ('admin','collaborator')
  );
$function$
;

CREATE OR REPLACE FUNCTION private.is_workspace_member(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
); $function$
;

CREATE OR REPLACE FUNCTION private.is_workspace_staff(target_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.active = true
    and wm.role in ('admin','collaborator')
); $function$
;

CREATE OR REPLACE FUNCTION private.list_archived_condominiums(p_workspace_id uuid)
 RETURNS SETOF condominiums
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  return query
  select c.*
  from public.condominiums c
  where c.workspace_id = p_workspace_id
    and c.archived_at is not null
  order by c.archived_at desc, c.name asc;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.prepare_communication_recipients(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_comm public.communications%rowtype;
  v_count int;
  v_retry_count int;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  select * into v_comm
  from public.communications
  where id=p_communication_id
  for update;

  if not found then
    raise exception 'Comunicazione non trovata';
  end if;

  if not private.can_manage_workspace_module(v_comm.workspace_id,'comunicazioni') then
    raise exception 'Autorizzazione gestione Comunicazioni richiesta';
  end if;

  if v_comm.condominium_id is null then
    raise exception 'La comunicazione deve essere associata a un condominio per l''invio email';
  end if;

  if exists(
    select 1 from public.condominiums c
    where c.id=v_comm.condominium_id and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato';
  end if;

  update public.communication_recipients
  set status='pending',
      provider_message_id=null,
      provider_event_id=null,
      sent_at=null,
      delivered_at=null,
      bounced_at=null,
      complained_at=null,
      queued_at=null,
      event_type=null,
      error_message=null,
      updated_at=now()
  where communication_id=p_communication_id
    and status='failed';

  get diagnostics v_retry_count=row_count;

  delete from public.communication_recipients
  where communication_id=p_communication_id
    and status='pending';

  insert into public.communication_recipients(
    communication_id,workspace_id,condominium_id,member_id,user_id,
    email,name,recipient_role,status
  )
  select
    v_comm.id,v_comm.workspace_id,m.condominium_id,m.id,m.user_id,
    lower(trim(m.email)),m.name,
    case
      when coalesce(m.data->>'role',m.role)='Proprietario' then 'owner'
      when coalesce(m.data->>'role',m.role)='Inquilino' then 'tenant'
      when m.role='council' then 'council'
      else 'resident'
    end,
    'pending'
  from public.condominium_members m
  where m.condominium_id=v_comm.condominium_id
    and m.active=true
    and nullif(trim(m.email),'') is not null
  on conflict (communication_id,lower(btrim(email))) do update set
    member_id=excluded.member_id,
    user_id=excluded.user_id,
    name=excluded.name,
    recipient_role=excluded.recipient_role,
    updated_at=now();

  select count(*) into v_count
  from public.communication_recipients
  where communication_id=p_communication_id
    and status='pending';

  update public.communications
  set email_status=case when v_count>0 then 'prepared' else 'no_recipients' end,
      email_prepared_at=case when v_count>0 then now() else null end,
      updated_at=now()
  where id=p_communication_id;

  return jsonb_build_object(
    'status',case when v_count>0 then 'prepared' else 'no_recipients' end,
    'recipient_count',v_count,
    'retried_failed',v_retry_count
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.prevent_new_installment_for_closing_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.member_id is not null
     and exists (
       select 1 from public.condominium_members cm
       where cm.id=new.member_id
         and cm.active
         and coalesce(cm.data->>'position_status','')='In chiusura'
     )
  then
    raise exception 'MEMBER_POSITION_CLOSING: il titolare è in chiusura e non può ricevere nuove rate';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text DEFAULT 'Bonifico'::text, p_reference text DEFAULT ''::text, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_installment public.condominium_installments%rowtype;
  v_new_paid numeric;
  v_status text;
  v_year_status text;
  v_start date;
  v_end date;
  v_allocation public.condominium_expense_allocations%rowtype;
  v_residual numeric;
  v_result_paid numeric;
  v_allocation_paid numeric;
  v_allocation_target numeric;
  v_remaining numeric;
  v_member_id uuid;
  v_owner_user_id uuid;
  v_owner_email text;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if exists (
    select 1 from public.condominiums c
    where c.id=p_condominium_id
      and c.workspace_id=p_workspace_id
      and c.archived_at is not null
  ) then
    raise exception 'Il condominio è archiviato e non può ricevere nuovi pagamenti';
  end if;

  if p_amount is null
     or p_amount::text in ('NaN','Infinity','-Infinity')
     or p_amount<=0 then
    raise exception 'L''importo del pagamento deve essere maggiore di zero';
  end if;

  if p_payment_date is null then
    raise exception 'La data del pagamento è obbligatoria';
  end if;

  select * into v_installment
  from public.condominium_installments
  where id=p_installment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Rata non trovata o non appartenente al condominio';
  end if;

  if v_installment.fiscal_year_id is not null then
    select status,start_date,end_date
    into v_year_status,v_start,v_end
    from public.condominium_fiscal_years
    where id=v_installment.fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id;

    if not found then
      raise exception 'Esercizio contabile della rata non valido';
    end if;

    if v_year_status='Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere modificato';
    end if;

    if p_payment_date<v_start or p_payment_date>v_end then
      raise exception 'La data del pagamento non rientra nell''esercizio contabile della rata';
    end if;
  end if;

  if v_installment.amount is null or v_installment.amount<=0 then
    raise exception 'Importo della rata non valido';
  end if;

  if coalesce(v_installment.paid_amount,0)<0
     or coalesce(v_installment.paid_amount,0)>v_installment.amount then
    raise exception 'Importo già pagato della rata non valido';
  end if;

  v_residual:=round(v_installment.amount-coalesce(v_installment.paid_amount,0),2);

  if v_residual<=0.005 then
    raise exception 'La rata risulta già completamente pagata';
  end if;

  if round(p_amount::numeric,2)>v_residual+0.005 then
    raise exception 'Il pagamento supera il residuo della rata: residuo %',
      to_char(v_residual,'FM999999990.00');
  end if;

  v_new_paid:=round(
    coalesce(v_installment.paid_amount,0)+round(p_amount::numeric,2)
  ,2);
  v_result_paid:=v_new_paid;

  if v_new_paid>=v_installment.amount-0.005 then
    v_new_paid:=round(v_installment.amount::numeric,2);
    v_status:='Pagato';
  elsif v_new_paid>0 then
    v_status:='Parzialmente pagato';
  else
    v_status:='Da pagare';
  end if;

  perform set_config('bethag.allow_installment_paid_update','on',true);

  insert into public.condominium_payment_movements(
    workspace_id,condominium_id,installment_id,payment_date,
    amount,method,reference,notes
  )
  values (
    p_workspace_id,p_condominium_id,p_installment_id,p_payment_date,
    round(p_amount::numeric,2),
    coalesce(nullif(trim(coalesce(p_method,'')),''),'Bonifico'),
    trim(coalesce(p_reference,'')),
    trim(coalesce(p_notes,''))
  );

  update public.condominium_installments
  set paid_amount=v_new_paid,status=v_status
  where id=p_installment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id;

  perform set_config('bethag.allow_allocation_paid_update','on',true);

  if v_installment.ledger_entry_id is not null then

    /*
      Rata unificata: il saldo viene distribuito esclusivamente tra le
      ripartizioni appartenenti allo stesso proprietario identificato
      dalla rata, mantenendo la semantica dell'unificazione.
    */
    if v_installment.unit_id is null and v_installment.member_id is not null then
      v_member_id:=v_installment.member_id;

      select cm.user_id, nullif(lower(trim(cm.email)),'')
      into v_owner_user_id,v_owner_email
      from public.condominium_members cm
      where cm.id=v_member_id
        and cm.condominium_id=p_condominium_id
        and cm.active
        and trim(coalesce(cm.data->>'role',''))='Proprietario';

      if not found then
        raise exception 'Proprietario della rata unificata non valido';
      end if;

      v_remaining:=v_new_paid;

      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=p_workspace_id
          and a.condominium_id=p_condominium_id
          and a.ledger_entry_id=v_installment.ledger_entry_id
          and exists (
            select 1
            from public.condominium_members cm
            where cm.condominium_id=p_condominium_id
              and cm.unit_id=a.unit_id
              and cm.active
              and trim(coalesce(cm.data->>'role',''))='Proprietario'
              and (
                (v_owner_user_id is not null and cm.user_id=v_owner_user_id)
                or
                (v_owner_user_id is null
                 and nullif(lower(trim(cm.email)),'') is not null
                 and nullif(lower(trim(cm.email)),'')=v_owner_email)
              )
          )
        order by a.id
        for update
      loop
        v_allocation_target:=least(
          round(coalesce(v_allocation.amount,0),2),
          greatest(round(v_remaining,2),0)
        );

        update public.condominium_expense_allocations
        set paid_amount=v_allocation_target,
            status=case
              when v_allocation_target>=amount-0.005 then 'Pagato'
              when v_allocation_target>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;

        v_remaining:=round(v_remaining-v_allocation_target,2);
        exit when v_remaining<=0.005;
      end loop;

      if v_remaining>0.005 then
        raise exception 'Il pagamento non è stato interamente riconciliato con le ripartizioni del proprietario';
      end if;

    else
      /*
        Rata non unificata: la ripartizione viene riconciliata sulla coppia
        unità + proprietario. Prima della correzione il solo unit_id poteva
        attribuire lo stesso totale pagato a più proprietari della stessa unità.
      */
      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=p_workspace_id
          and a.condominium_id=p_condominium_id
          and a.ledger_entry_id=v_installment.ledger_entry_id
          and a.unit_id=v_installment.unit_id
          and (
            (v_installment.member_id is not null and a.member_id=v_installment.member_id)
            or
            (v_installment.member_id is null and a.member_id is null)
          )
        order by a.id
        for update
      loop
        select least(
          v_allocation.amount,
          coalesce(sum(i.paid_amount),0)
        )
        into v_allocation_paid
        from public.condominium_installments i
        where i.workspace_id=p_workspace_id
          and i.condominium_id=p_condominium_id
          and i.ledger_entry_id=v_installment.ledger_entry_id
          and i.unit_id=v_allocation.unit_id
          and (
            (v_installment.member_id is not null and i.member_id=v_installment.member_id)
            or
            (v_installment.member_id is null and i.member_id is null)
          );

        update public.condominium_expense_allocations
        set paid_amount=coalesce(v_allocation_paid,0),
            status=case
              when coalesce(v_allocation_paid,0)>=amount-0.005 then 'Pagato'
              when coalesce(v_allocation_paid,0)>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;
      end loop;
    end if;
  end if;

  return v_result_paid;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.reset_stale_communication_recipients(p_communication_id uuid DEFAULT NULL::uuid, p_age interval DEFAULT '00:15:00'::interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
 if p_age < interval '5 minutes' then raise exception 'Intervallo di recupero troppo breve'; end if;
 update public.communication_recipients
 set status='pending', queued_at=null, error_message=null, updated_at=now()
 where status='queued'
   and queued_at is not null
   and queued_at < now()-p_age
   and (p_communication_id is null or communication_id=p_communication_id);
 get diagnostics v_count=row_count;
 return jsonb_build_object('reset',v_count);
end;
$function$
;

CREATE OR REPLACE FUNCTION private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  update public.condominiums
  set archived_at = null,
      archived_by = null,
      archive_reason = null,
      updated_at = now()
  where id = p_condominium_id
    and workspace_id = p_workspace_id
    and archived_at is not null
  returning name into v_name;

  if not found then
    raise exception 'Condominio archiviato non trovato';
  end if;

  insert into public.condominium_audit_log
    (workspace_id, condominium_id, entity_type, entity_id, action, description, data)
  values
    (
      p_workspace_id,
      p_condominium_id,
      'condominium',
      p_condominium_id,
      'restored',
      'Condominio ripristinato dall''archivio',
      jsonb_build_object(
        'restored_by', auth.uid(),
        'restored_at', now(),
        'name', v_name
      )
    );
end;
$function$
;

CREATE OR REPLACE FUNCTION private.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_payment public.condominium_payment_movements%rowtype;
  v_year_status text;
  v_actor uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if nullif(trim(coalesce(p_reason,'')),'') is null then
    raise exception 'La motivazione dello storno è obbligatoria';
  end if;

  select * into v_payment
  from public.condominium_payment_movements
  where id=p_payment_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Pagamento non trovato o non appartenente al condominio';
  end if;

  select fy.status into v_year_status
  from public.condominium_installments i
  left join public.condominium_fiscal_years fy on fy.id=i.fiscal_year_id
  where i.id=v_payment.installment_id
    and i.workspace_id=p_workspace_id
    and i.condominium_id=p_condominium_id;

  if v_year_status='Chiuso' then
    raise exception 'L''esercizio contabile è chiuso: storno non consentito';
  end if;

  if exists (
    select 1 from public.condominium_payment_reversal_audit
    where original_payment_id=v_payment.id
  ) then
    raise exception 'Il pagamento è già stato stornato';
  end if;

  insert into public.condominium_payment_reversal_audit(
    original_payment_id,workspace_id,condominium_id,installment_id,
    amount,payment_date,method,reference,notes,reversal_reason,reversed_by
  )
  values (
    v_payment.id,v_payment.workspace_id,v_payment.condominium_id,
    v_payment.installment_id,v_payment.amount,v_payment.payment_date,
    v_payment.method,v_payment.reference,v_payment.notes,
    trim(p_reason),v_actor
  );

  delete from public.condominium_payment_movements
  where id=v_payment.id;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_archived_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta';
  end if;

  if not private.can_manage_workspace_module(p_workspace_id, 'condomini') then
    raise exception 'Autorizzazione gestione condomini richiesta';
  end if;

  if p_legacy_id is not null then
    select id, archived_at
      into v_id, v_archived_at
    from public.condominiums
    where workspace_id = p_workspace_id
      and legacy_id = p_legacy_id
    for update;

    if v_id is not null and v_archived_at is not null then
      raise exception 'Il condominio è archiviato: utilizzare prima il ripristino';
    end if;
  end if;

  insert into public.condominiums (
    workspace_id, legacy_id, name, address, city, postal_code, province, data
  )
  values (
    p_workspace_id, p_legacy_id, p_name, p_address, p_city, p_postal_code,
    p_province, coalesce(p_data, '{}'::jsonb)
  )
  on conflict (workspace_id, legacy_id)
  do update set
    name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    postal_code = excluded.postal_code,
    province = excluded.province,
    data = excluded.data,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.set_personal_security_code(p_code text, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  if p_enabled and (p_code is null or length(trim(p_code)) < 6 or length(trim(p_code)) > 32) then
    raise exception 'Il codice personale deve contenere da 6 a 32 caratteri';
  end if;
  insert into public.user_security_settings(user_id, personal_code_hash, personal_code_enabled, updated_at)
  values (auth.uid(), case when p_enabled then crypt(trim(p_code), gen_salt('bf')) else null end, p_enabled, now())
  on conflict (user_id) do update set personal_code_hash=excluded.personal_code_hash, personal_code_enabled=excluded.personal_code_enabled, updated_at=now();
end; $function$
;

CREATE OR REPLACE FUNCTION private.sync_portal_after_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_old_workspace uuid;
 v_new_workspace uuid;
begin
 select c.workspace_id into v_old_workspace from public.condominiums c where c.id=old.condominium_id;
 select c.workspace_id into v_new_workspace from public.condominiums c where c.id=coalesce(new.condominium_id,old.condominium_id);

 if tg_op='DELETE' then
   update public.portal_access set active=false,updated_at=now() where member_id=old.id;
   update public.workspace_members wm set active=false
   where wm.workspace_id=v_old_workspace and wm.user_id=old.user_id and wm.role='resident' and wm.condominium_id=old.condominium_id;
   return old;
 end if;

 if new.active=false
    or new.user_id is null
    or coalesce(new.data->>'position_status','') in ('In chiusura','Archiviato')
    or (coalesce(new.data->>'role','')='Proprietario' and coalesce(new.data->>'current_owner','true')='false') then
   update public.portal_access set active=false,user_id=coalesce(new.user_id,user_id),updated_at=now() where member_id=new.id;
   update public.workspace_members wm set active=false
   where wm.workspace_id=v_old_workspace and wm.user_id=old.user_id and wm.role='resident' and wm.condominium_id=old.condominium_id;
   if new.user_id is distinct from old.user_id then
     update public.workspace_members wm set active=false
     where wm.workspace_id=v_new_workspace and wm.user_id=new.user_id and wm.role='resident' and wm.condominium_id=new.condominium_id;
   end if;
 else
   if old.user_id is distinct from new.user_id or old.condominium_id is distinct from new.condominium_id or v_old_workspace is distinct from v_new_workspace then
     update public.workspace_members wm set active=false
     where wm.workspace_id=v_old_workspace and wm.user_id=old.user_id and wm.role='resident' and wm.condominium_id=old.condominium_id;
   end if;
   update public.portal_access p set user_id=new.user_id,name=new.name,email=coalesce(new.email,p.email),apartment=coalesce(new.data->>'apartment',p.apartment),data=coalesce(new.data,'{}'::jsonb),updated_at=now()
   where p.member_id=new.id and p.active=true;
   update public.workspace_members wm set user_id=new.user_id,active=true
   where wm.workspace_id=v_new_workspace and wm.role='resident' and wm.condominium_id=new.condominium_id and wm.user_id=old.user_id;
 end if;

 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.touch_condominium_request_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.verify_personal_security_code(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_hash text;
begin
  if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
  select personal_code_hash into v_hash from public.user_security_settings where user_id=auth.uid() and personal_code_enabled=true;
  if v_hash is null or p_code is null then return false; end if;
  return crypt(trim(p_code), v_hash)=v_hash;
end; $function$
;

CREATE OR REPLACE FUNCTION public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  return private.admin_approve_portal_registration(p_request_id,p_member_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select private.apply_resend_communication_event(
    p_provider_message_id,p_event_id,p_event_type,p_email,p_event_at
  );
$function$
;

CREATE OR REPLACE FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.archive_condominium($1,$2,$3); end $function$
;

CREATE OR REPLACE FUNCTION public.assign_condominium_member_legacy_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.legacy_id is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.condominium_id::text,0));
    select coalesce(max(m.legacy_id),0)+1 into new.legacy_id
    from public.condominium_members m where m.condominium_id=new.condominium_id;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_condominium_work_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare ws uuid;co uuid;wid uuid;act text;descr text;dat jsonb:='{}';begin if tg_op='DELETE' then ws:=old.workspace_id;co:=old.condominium_id;wid:=old.id;act:='work_deleted';descr:='Lavoro eliminato';dat:=jsonb_build_object('title',old.title,'status',old.status);elsif tg_op='INSERT' then ws:=new.workspace_id;co:=new.condominium_id;wid:=new.id;act:='work_created';descr:='Lavoro creato';dat:=jsonb_build_object('title',new.title,'status',new.status);else ws:=new.workspace_id;co:=new.condominium_id;wid:=new.id;if old.status is distinct from new.status then act:='work_status_changed';descr:='Stato del lavoro modificato';dat:=jsonb_build_object('old_status',old.status,'new_status',new.status);elsif old.approved_amount is distinct from new.approved_amount or old.estimated_amount is distinct from new.estimated_amount then act:='work_budget_changed';descr:='Importi del lavoro modificati';dat:=jsonb_build_object('old_estimated_amount',old.estimated_amount,'new_estimated_amount',new.estimated_amount,'old_approved_amount',old.approved_amount,'new_approved_amount',new.approved_amount);elsif old.supplier_id is distinct from new.supplier_id then act:='work_supplier_changed';descr:='Fornitore del lavoro modificato';dat:=jsonb_build_object('old_supplier_id',old.supplier_id,'new_supplier_id',new.supplier_id);elsif old.start_date is distinct from new.start_date or old.expected_end_date is distinct from new.expected_end_date or old.actual_end_date is distinct from new.actual_end_date then act:='work_dates_changed';descr:='Date del lavoro modificate';dat:=jsonb_build_object('old_start_date',old.start_date,'new_start_date',new.start_date,'old_expected_end_date',old.expected_end_date,'new_expected_end_date',new.expected_end_date,'old_actual_end_date',old.actual_end_date,'new_actual_end_date',new.actual_end_date);else return new;end if;end if;insert into public.condominium_audit_log(workspace_id,condominium_id,entity_type,entity_id,action,description,data) values(ws,co,'condominium_work',wid,act,descr,dat||jsonb_build_object('actor_user_id',auth.uid(),'recorded_at',now()));if tg_op='DELETE' then return old;end if;return new;end $function$
;

CREATE OR REPLACE FUNCTION public.audit_condominium_work_progress_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare ws uuid;co uuid;wid uuid;pid uuid;act text;descr text;dat jsonb;begin if tg_op='DELETE' then ws:=old.workspace_id;co:=old.condominium_id;wid:=old.work_id;pid:=old.id;act:='work_progress_deleted';descr:='SAL eliminato';dat:=jsonb_build_object('progress_no',old.progress_no,'amount',old.amount,'percentage',old.percentage);elsif tg_op='INSERT' then ws:=new.workspace_id;co:=new.condominium_id;wid:=new.work_id;pid:=new.id;act:='work_progress_created';descr:='SAL registrato';dat:=jsonb_build_object('progress_no',new.progress_no,'amount',new.amount,'paid_amount',new.paid_amount,'percentage',new.percentage);else if old.amount is not distinct from new.amount and old.paid_amount is not distinct from new.paid_amount and old.percentage is not distinct from new.percentage and old.status is not distinct from new.status and old.progress_date is not distinct from new.progress_date and old.title is not distinct from new.title then return new;end if;ws:=new.workspace_id;co:=new.condominium_id;wid:=new.work_id;pid:=new.id;act:='work_progress_changed';descr:='SAL modificato';dat:=jsonb_build_object('old_amount',old.amount,'new_amount',new.amount,'old_paid_amount',old.paid_amount,'new_paid_amount',new.paid_amount,'old_percentage',old.percentage,'new_percentage',new.percentage,'old_status',old.status,'new_status',new.status);end if;insert into public.condominium_audit_log(workspace_id,condominium_id,entity_type,entity_id,action,description,data) values(ws,co,'condominium_work_progress',pid,act,descr,dat||jsonb_build_object('work_id',wid,'actor_user_id',auth.uid(),'recorded_at',now()));if tg_op='DELETE' then return old;end if;return new;end $function$
;

CREATE OR REPLACE FUNCTION public.audit_document_ai_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old text := coalesce(nullif(btrim(old.data->>'aiStatus'),''),'Non elaborato');
  v_new text := coalesce(nullif(btrim(new.data->>'aiStatus'),''),'Non elaborato');
begin
  if v_old is distinct from v_new then
    insert into public.condominium_audit_log
      (workspace_id,condominium_id,entity_type,entity_id,action,description,data)
    values
      (new.workspace_id,new.condominium_id,'document',new.id,'AI_STATUS_CHANGE',
       'Cambio stato elaborazione AI documento',
       jsonb_build_object('from',v_old,'to',v_new,'title',new.title,'timestamp',now()));
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  return private.check_condominium_member_transfer_closure(p_transfer_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.claim_first_workspace_admin(p_workspace_id);
$function$
;

CREATE OR REPLACE FUNCTION public.clean_deleted_member_owner_references()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.legacy_id is not null then
    update public.condominium_units as u
    set data = jsonb_set(
      coalesce(u.data, '{}'::jsonb),
      '{ownerMemberIds}',
      coalesce((
        select jsonb_agg(e.elem order by e.ord)
        from jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
            then u.data->'ownerMemberIds'
            else '[]'::jsonb
          end
        ) with ordinality as e(elem, ord)
        where e.elem #>> '{}' <> old.legacy_id::text
      ), '[]'::jsonb),
      true
    ),
    updated_at = pg_catalog.now()
    from public.condominiums as c
    where c.id = u.condominium_id
      and c.id = old.condominium_id
      and u.workspace_id = c.workspace_id
      and pg_catalog.jsonb_typeof(u.data->'ownerMemberIds') = 'array'
      and exists (
        select 1
        from pg_catalog.jsonb_array_elements(u.data->'ownerMemberIds') as e(elem)
        where e.elem #>> '{}' = old.legacy_id::text
      );
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_condominium_member_unit_legacy_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  update public.condominium_members
  set data = data - 'unitId' - 'apartment',
      updated_at = now()
  where unit_id = old.id;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_condominium_fiscal_year($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return private.close_condominium_member_transfer(p_transfer_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.close_fiscal_year_and_generate_carryovers($1,$2,$3); end $function$
;

CREATE OR REPLACE FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.compensate_fiscal_carryover($1,$2,$3,$4,$5,$6); end $function$
;

CREATE OR REPLACE FUNCTION public.complete_portal_registration(p_full_name text, p_fiscal_code text DEFAULT NULL::text, p_condominium_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  return private.complete_portal_registration($1,$2,$3);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_intake public.condominium_allocation_intakes%rowtype;
 v_row jsonb;
 v_count integer:=0;
 v_unit_id uuid;
 v_amount numeric;
 v_millesimi numeric;
 v_total numeric:=0;
 v_total_millesimi numeric:=0;
 v_expense_amount numeric;
 v_table_total numeric;
 v_table_scope text;
 v_expected_millesimi numeric;
 v_building_code text;
begin
 if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then raise exception 'Autorizzazione gestione contabilità richiesta'; end if;

 select * into v_intake from public.condominium_allocation_intakes
 where id=p_intake_id and workspace_id=p_workspace_id for update;

 if not found then raise exception 'Acquisizione riparto non trovata'; end if;
 if v_intake.status='Confermato' then
   return (select count(*) from public.condominium_expense_allocations where workspace_id=p_workspace_id and ledger_entry_id=v_intake.ledger_entry_id);
 end if;
 if v_intake.status='Annullato' then raise exception 'L''acquisizione è stata annullata'; end if;
 if coalesce(jsonb_array_length(v_intake.validation_errors),0)>0 then raise exception 'Il riparto contiene errori di validazione e non può essere confermato'; end if;
 if v_intake.ledger_entry_id is null then raise exception 'Collegare prima una spesa contabile'; end if;
 if coalesce(jsonb_array_length(v_intake.rows),0)=0 then raise exception 'Nessuna quota da confermare'; end if;

 select amount into v_expense_amount from public.condominium_ledger_entries
 where id=v_intake.ledger_entry_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and direction='Uscita';
 if v_expense_amount is null then raise exception 'La spesa collegata non è valida'; end if;
 if v_intake.expense_amount is not null and abs(v_intake.expense_amount-v_expense_amount)>0.005 then raise exception 'L''importo dell''acquisizione non coincide con la spesa contabile'; end if;

 if v_intake.allocation_table_id is not null then
   select total_millesimi,scope_mode into v_table_total,v_table_scope
   from public.condominium_millesimal_tables
   where id=v_intake.allocation_table_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and active=true;
   if not found then raise exception 'La tabella millesimale selezionata non è valida'; end if;
 end if;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round(coalesce((v_row->>'amount')::numeric,0),2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   if v_unit_id is null or v_amount<=0 or v_millesimi<0 then raise exception 'Riga di riparto non valida'; end if;
   if not exists(select 1 from public.condominium_units where id=v_unit_id and workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id) then raise exception 'L''unità indicata non appartiene al condominio'; end if;

   if v_intake.allocation_table_id is not null then
     if v_table_scope='units' and not exists(select 1 from public.condominium_millesimal_tables t where t.id=v_intake.allocation_table_id and v_unit_id=any(t.scope_unit_ids)) then raise exception 'L''unità % non rientra nell''ambito della tabella millesimale selezionata',v_unit_id; end if;
     if v_table_scope='buildings' then
       select lower(trim(coalesce(data->>'building_code',data->>'civic_code',data->>'fabbricato',''))) into v_building_code from public.condominium_units where id=v_unit_id;
       if not exists(select 1 from public.condominium_millesimal_tables t cross join lateral unnest(t.scope_building_codes) as codes(code) where t.id=v_intake.allocation_table_id and lower(trim(codes.code))=v_building_code) then raise exception 'L''unità % non rientra nell''ambito per fabbricato/civico della tabella selezionata',v_unit_id; end if;
     end if;
     select value into v_expected_millesimi from public.condominium_millesimal_values where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and table_id=v_intake.allocation_table_id and unit_id=v_unit_id limit 1;
     if v_expected_millesimi is not null and abs(v_expected_millesimi-v_millesimi)>0.005 then raise exception 'I millesimi dell''unità % non coincidono con la tabella selezionata',v_unit_id; end if;
   end if;

   v_total:=v_total+v_amount; v_total_millesimi:=v_total_millesimi+v_millesimi; v_count:=v_count+1;
 end loop;

 if abs(v_total-v_expense_amount)>0.005 then raise exception 'La somma delle quote (%s) non coincide con la spesa (%s)',round(v_total,2),round(v_expense_amount,2); end if;
 if v_intake.allocation_table_id is not null and v_table_total is not null and abs(v_total_millesimi-v_table_total)>0.01 then raise exception 'I millesimi del riparto (%s) non coincidono con il totale della tabella (%s)',round(v_total_millesimi,3),round(v_table_total,3); end if;

 delete from public.condominium_expense_allocations where workspace_id=p_workspace_id and condominium_id=v_intake.condominium_id and ledger_entry_id=v_intake.ledger_entry_id;

 for v_row in select value from jsonb_array_elements(v_intake.rows) loop
   v_unit_id:=nullif(v_row->>'unit_id','')::uuid;
   v_amount:=round((v_row->>'amount')::numeric,2);
   v_millesimi:=coalesce((v_row->>'millesimi')::numeric,0);
   insert into public.condominium_expense_allocations(workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,allocation_basis,millesimi,amount,paid_amount,due_date,status,notes)
   values(p_workspace_id,v_intake.condominium_id,v_intake.ledger_entry_id,v_intake.allocation_table_id,v_unit_id,null,
          case when v_intake.source='AI' then 'AI - confermato' else 'Manuale - confermato' end,
          v_millesimi,v_amount,0,(select due_date from public.condominium_ledger_entries where id=v_intake.ledger_entry_id),'Da pagare',coalesce(v_intake.notes,''));
 end loop;

 update public.condominium_allocation_intakes
 set status='Confermato',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now()
 where id=p_intake_id and workspace_id=p_workspace_id;

 return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.confirm_condominium_creation_intake($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text DEFAULT 'Vendita'::text, p_notes text DEFAULT ''::text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if p_incoming_user_id is not null then
    raise exception 'INCOMING_IDENTITY_REQUIRES_VERIFICATION' using errcode='22023';
  end if;
  return private.confirm_condominium_member_transfer(
    p_unit_id,p_outgoing_member_id,p_incoming_name,p_incoming_email,null,
    p_transfer_date,p_transfer_type,p_notes,p_data
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.delete_condominium($1,$2,$3); end $function$
;

CREATE OR REPLACE FUNCTION public.ensure_table_millesimal_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if NEW.active then
    insert into public.condominium_millesimal_values
      (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
    select NEW.workspace_id, NEW.condominium_id, NEW.id, u.id, 0, false, ''
    from public.condominium_units u
    where u.condominium_id = NEW.condominium_id and u.workspace_id = NEW.workspace_id
    on conflict (workspace_id, table_id, unit_id) do nothing;
  end if;
  return NEW;
end; $function$
;

CREATE OR REPLACE FUNCTION public.ensure_unit_millesimal_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.condominium_millesimal_values
    (workspace_id, condominium_id, table_id, unit_id, value, excluded, notes)
  select NEW.workspace_id, NEW.condominium_id, t.id, NEW.id, 0, false, ''
  from public.condominium_millesimal_tables t
  where t.condominium_id = NEW.condominium_id and t.workspace_id = NEW.workspace_id and t.active
  on conflict (workspace_id, table_id, unit_id) do nothing;
  return NEW;
end; $function$
;

CREATE OR REPLACE FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date DEFAULT NULL::date)
 RETURNS TABLE(unit_id uuid, millesimi numeric, amount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_entry public.condominium_ledger_entries%rowtype;
  v_table public.condominium_millesimal_tables%rowtype;
  v_expense numeric;
  v_due_date date;
  v_total numeric;
  v_unit_count integer;
  v_value_count integer;
  v_installments integer;
  v_other_allocations integer;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  select * into v_entry
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id
  for update;

  if not found or v_entry.direction<>'Uscita' or coalesce(v_entry.amount,0)<=0 then
    raise exception 'Spesa non valida o non appartenente al condominio';
  end if;

  select * into v_table
  from public.condominium_millesimal_tables
  where id=p_table_id and workspace_id=p_workspace_id and condominium_id=p_condominium_id and active=true;

  if not found then raise exception 'Tabella millesimale non valida o non attiva'; end if;

  v_installments := (
    select count(*) from public.condominium_installments
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id and ledger_entry_id=p_ledger_entry_id
  );
  if v_installments>0 then
    raise exception 'La spesa ha già rate collegate: modifica o elimina prima le rate per poter rigenerare la ripartizione';
  end if;

  v_other_allocations := (
    select count(*) from public.condominium_expense_allocations
    where workspace_id=p_workspace_id and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
      and allocation_table_id is distinct from p_table_id
  );
  if v_other_allocations>0 then
    raise exception 'La spesa è già ripartita con un''altra tabella: elimina prima il riparto esistente per evitare una doppia imputazione';
  end if;

  v_expense:=round(v_entry.amount::numeric,2);
  v_due_date:=coalesce(p_due_date,v_entry.due_date);

  v_unit_count := (
    select count(*) from public.condominium_units u
    where u.workspace_id=p_workspace_id and u.condominium_id=p_condominium_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_unit_count=0 then raise exception 'Il criterio di riparto non contiene unità eleggibili'; end if;

  v_value_count := (
    select count(*) from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_value_count<>v_unit_count then
    raise exception 'Tabella millesimale incompleta: inserire una quota per ogni unità prevista dal criterio';
  end if;

  v_total := (
    select coalesce(sum(v.value),0)
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id and v.table_id=p_table_id
      and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  );
  if v_total<=0 then raise exception 'Nessuna quota millesimale eleggibile'; end if;
  if abs(v_total-coalesce(v_table.total_millesimi,0))>0.001 then
    raise exception 'La somma delle quote millesimali del criterio non coincide con il totale della tabella';
  end if;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id and allocation_table_id=p_table_id;

  return query
  with eligible as (
    select v.unit_id eligible_unit_id,v.value::numeric eligible_millesimi,
           v_expense*v.value::numeric/v_total exact_amount
    from public.condominium_millesimal_values v
    join public.condominium_units u on u.id=v.unit_id
    where v.workspace_id=p_workspace_id and v.condominium_id=p_condominium_id
      and v.table_id=p_table_id and v.excluded=false and v.value>0
      and case
        when v_table.scope_mode='all' then true
        when v_table.scope_mode='units' then u.id=any(v_table.scope_unit_ids)
        when v_table.scope_mode='buildings' then exists(
          select 1 from unnest(v_table.scope_building_codes) x
          where lower(trim(x))=lower(trim(coalesce(u.building_code,u.data->>'building_code',u.data->>'civic_code',u.data->>'fabbricato','')))
        )
        else false end
  ), rounded as (
    select e.*,floor(e.exact_amount*100)/100 base_amount,
           e.exact_amount-floor(e.exact_amount*100)/100 remainder from eligible e
  ), delta as (
    select round(v_expense*100)-round(coalesce(sum(r.base_amount),0)*100) cents from rounded r
  ), ranked as (
    select r.*,row_number() over(order by r.remainder desc,r.eligible_unit_id) rn from rounded r
  ), final_amounts as (
    select r.eligible_unit_id final_unit_id,r.eligible_millesimi final_millesimi,
           r.base_amount+case when r.rn <= greatest((select cents from delta),0) then 0.01 else 0 end final_amount
    from ranked r
  )
  insert into public.condominium_expense_allocations(
    workspace_id,condominium_id,ledger_entry_id,allocation_table_id,unit_id,member_id,
    allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
  )
  select p_workspace_id,p_condominium_id,p_ledger_entry_id,p_table_id,
         f.final_unit_id,null,v_table.basis_type,f.final_millesimi,f.final_amount,
         0,v_due_date,'Da pagare','Generata automaticamente secondo il criterio configurato'
  from final_amounts f
  returning condominium_expense_allocations.unit_id,
            condominium_expense_allocations.millesimi,
            condominium_expense_allocations.amount;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_expense public.condominium_ledger_entries%rowtype;
  v_total_weight numeric;
  v_total_cents bigint;
  v_used_cents bigint := 0;
  v_alloc_cents bigint;
  v_idx integer := 0;
  v_count integer;
  v_rows integer;
  v_row record;
begin
  if not private.can_manage_workspace_module(p_workspace_id,'contabilita') then
    raise exception 'Autorizzazione gestione contabilità richiesta';
  end if;

  if trim(coalesce(p_service_type,''))='' then
    raise exception 'Servizio di consumo obbligatorio';
  end if;

  select * into v_expense
  from public.condominium_ledger_entries
  where id=p_ledger_entry_id
    and workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
  for update;

  if not found then
    raise exception 'Spesa non trovata';
  end if;

  if v_expense.direction<>'Uscita' or v_expense.amount<=0 then
    raise exception 'Il movimento selezionato non è una spesa valida';
  end if;

  if exists(
    select 1 from public.condominium_fiscal_years
    where id=p_fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and status='Chiuso'
  ) then
    raise exception 'L''esercizio contabile è chiuso';
  end if;

  if not exists(
    select 1 from public.condominium_fiscal_years
    where id=p_fiscal_year_id
      and workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
  ) then
    raise exception 'Esercizio contabile non valido';
  end if;

  if exists(
    select 1 from public.condominium_installments
    where workspace_id=p_workspace_id
      and condominium_id=p_condominium_id
      and ledger_entry_id=p_ledger_entry_id
  ) then
    raise exception 'La spesa ha già rate collegate';
  end if;

  select count(*), coalesce(sum(w.weight),0)
  into v_count,v_total_weight
  from (
    select r.unit_id,
      sum(
        coalesce(
          nullif(r.charge_amount,0),
          nullif(r.allocation_value,0),
          nullif(r.consumption,0),
          nullif(r.kwh,0),
          0
        )
      ) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
  ) w;

  if v_count=0 then
    raise exception 'Nessun dato di consumo disponibile per il servizio selezionato';
  end if;

  if v_total_weight<=0 then
    raise exception 'I dati di consumo non contengono un valore utile al riparto';
  end if;

  v_total_cents:=round(v_expense.amount*100);

  select count(*) into v_rows
  from (
    select r.unit_id
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
  ) q;

  delete from public.condominium_expense_allocations
  where workspace_id=p_workspace_id
    and condominium_id=p_condominium_id
    and ledger_entry_id=p_ledger_entry_id;

  for v_row in
    select r.unit_id,u.unit_code,
      sum(
        coalesce(
          nullif(r.charge_amount,0),
          nullif(r.allocation_value,0),
          nullif(r.consumption,0),
          nullif(r.kwh,0),
          0
        )
      ) as weight
    from public.condominium_consumption_readings r
    join public.condominium_units u
      on u.id=r.unit_id
     and u.workspace_id=p_workspace_id
     and u.condominium_id=p_condominium_id
    where r.workspace_id=p_workspace_id
      and r.condominium_id=p_condominium_id
      and r.fiscal_year_id=p_fiscal_year_id
      and lower(trim(r.service_type))=lower(trim(p_service_type))
    group by r.unit_id,u.unit_code
    having sum(
      coalesce(
        nullif(r.charge_amount,0),
        nullif(r.allocation_value,0),
        nullif(r.consumption,0),
        nullif(r.kwh,0),
        0
      )
    ) > 0
    order by u.unit_code
  loop
    v_idx:=v_idx+1;

    if v_idx=v_rows then
      v_alloc_cents:=v_total_cents-v_used_cents;
    else
      v_alloc_cents:=floor(v_total_cents*v_row.weight/v_total_weight);
    end if;

    if v_alloc_cents<0 then
      raise exception 'Importo di riparto non valido';
    end if;

    v_used_cents:=v_used_cents+v_alloc_cents;

    insert into public.condominium_expense_allocations(
      workspace_id,condominium_id,ledger_entry_id,unit_id,
      allocation_basis,millesimi,amount,paid_amount,due_date,status,notes
    )
    values(
      p_workspace_id,p_condominium_id,p_ledger_entry_id,v_row.unit_id,
      'Consumo - '||trim(p_service_type),v_row.weight,
      v_alloc_cents/100.0,0,v_expense.due_date,'Da pagare',
      'Riparto generato dai dati di consumo inseriti/importati in BETHAG; letture aggregate per unità.'
    );
  end loop;

  return v_rows;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_fiscal_year_carryovers($1,$2,$3,$4); end $function$
;

CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations($1,$2,$3,$4,$5,$6); end $function$
;

CREATE OR REPLACE FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[] DEFAULT NULL::numeric[], p_unify_by_member boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.generate_installments_from_allocations_schedule($1,$2,$3,$4,$5,$6,$7,$8); end $function$
;

CREATE OR REPLACE FUNCTION public.get_member_transfer_accounting_snapshot(p_transfer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 t public.condominium_member_transfers%rowtype;
 result jsonb;
begin
 select * into t from public.condominium_member_transfers where id=p_transfer_id;
 if t.id is null then raise exception 'TRANSFER_NOT_FOUND'; end if;
 if not private.can_access_workspace_module(t.workspace_id,'condomini') then raise exception 'FORBIDDEN'; end if;

 select jsonb_build_object(
   'captured_accounting_snapshot', coalesce(t.data->'accounting_snapshot','{}'::jsonb),
   'transfer', jsonb_build_object(
      'id',t.id,'unit_id',t.unit_id,'outgoing_member_id',t.outgoing_member_id,
      'incoming_member_id',t.incoming_member_id,'transfer_date',t.transfer_date,
      'transfer_type',t.transfer_type,'status',t.status
   ),
   'outgoing', jsonb_build_object(
      'installments_due_before', coalesce((select sum(i.amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date),0),
      'installments_paid_before', coalesce((select sum(i.paid_amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date),0),
      'installments_residual', coalesce((select sum(i.amount-i.paid_amount) from condominium_installments i where i.member_id=t.outgoing_member_id and i.due_date <= t.transfer_date),0),
      'allocations_before', coalesce((select sum(a.amount) from condominium_expense_allocations a where a.member_id=t.outgoing_member_id and (a.due_date is null or a.due_date <= t.transfer_date)),0)
   ),
   'post_transfer', jsonb_build_object(
      'installments_after', coalesce((select sum(i.amount) from condominium_installments i where i.member_id=t.incoming_member_id and i.due_date > t.transfer_date),0),
      'allocations_after', coalesce((select sum(a.amount) from condominium_expense_allocations a where a.member_id=t.incoming_member_id and (a.due_date is null or a.due_date > t.transfer_date)),0)
   ),
   'unit_expenses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',l.id,'description',l.description,'expense_type',l.expense_type,
        'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,
        'amount',l.amount,'assembly_id',l.assembly_id,
        'deliberation_before_transfer',
          case when l.deliberation_date is not null and l.deliberation_date <= t.transfer_date then true else false end
      ) order by coalesce(l.deliberation_date,l.entry_date),l.id)
      from condominium_ledger_entries l
      where l.unit_id=t.unit_id and l.condominium_id=t.condominium_id
        and (l.entry_date <= t.transfer_date or (l.deliberation_date is not null and l.deliberation_date <= t.transfer_date))
   ),'[]'::jsonb)
 ) into result;
 return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_workspace_access()
 RETURNS TABLE(workspace_id uuid, role text, permissions jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    wm.workspace_id,
    wm.role,
    coalesce(wm.permissions, '{}'::jsonb)
  from public.workspace_members wm
  where wm.user_id = (select auth.uid())
    and wm.active = true
  order by wm.workspace_id
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.guard_condominium_expense_allocation_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ledger_amount numeric;
  v_other_total numeric;
begin
  if new.amount is null or new.amount < 0 then
    raise exception 'Importo della ripartizione non valido';
  end if;

  select le.amount
    into v_ledger_amount
  from public.condominium_ledger_entries le
  where le.id=new.ledger_entry_id
    and le.workspace_id=new.workspace_id
    and le.condominium_id=new.condominium_id
    and le.direction='Uscita'
  for update;

  if not found then
    raise exception 'La spesa collegata alla ripartizione non è valida';
  end if;

  select coalesce(sum(ea.amount),0)
    into v_other_total
  from public.condominium_expense_allocations ea
  where ea.ledger_entry_id=new.ledger_entry_id
    and ea.workspace_id=new.workspace_id
    and ea.condominium_id=new.condominium_id
    and ea.id is distinct from new.id;

  if round(v_other_total + new.amount,2) > round(v_ledger_amount,2) + 0.005 then
    raise exception 'Le ripartizioni superano l''importo della spesa';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_confirmed_unit_transformation_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if old.status='Confermata' then raise exception 'CONFIRMED_TRANSFORMATION_IMMUTABLE: una trasformazione confermata è immodificabile'; end if; return case when tg_op='DELETE' then old else new end; end $function$
;

CREATE OR REPLACE FUNCTION public.guard_confirmed_unit_transformation_items_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if tg_op<>'INSERT' and exists(select 1 from public.condominium_unit_transformations where id=old.transformation_id and status='Confermata') then raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili'; end if; if tg_op<>'DELETE' and exists(select 1 from public.condominium_unit_transformations where id=new.transformation_id and status='Confermata') then raise exception 'CONFIRMED_TRANSFORMATION_ITEMS_IMMUTABLE: i collegamenti genealogici confermati sono immodificabili'; end if; return case when tg_op='DELETE' then old else new end; end $function$
;

CREATE OR REPLACE FUNCTION public.guard_consumption_reading_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and l.fiscal_year_id=old.fiscal_year_id and a.allocation_basis='Consumo - '||trim(old.service_type) and a.unit_id=old.unit_id) then raise exception 'La lettura di consumo è già utilizzata in un riparto e non può essere modificata o cancellata'; end if; return case when tg_op='DELETE' then old else new end; end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_expense_allocation_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_op='DELETE' then
    if coalesce(old.paid_amount,0)>0.005 then
      raise exception 'La ripartizione ha pagamenti registrati e non può essere cancellata';
    end if;
    if exists(
      select 1 from public.condominium_installments i
      where i.workspace_id=old.workspace_id
        and i.condominium_id=old.condominium_id
        and i.ledger_entry_id=old.ledger_entry_id
    ) then
      raise exception 'La ripartizione è collegata a rate e non può essere cancellata';
    end if;
    return old;
  end if;

  if tg_op='UPDATE' then
    if new.paid_amount is distinct from old.paid_amount
       and current_setting('bethag.allow_allocation_paid_update',true) is distinct from 'on' then
      raise exception 'Il pagato della ripartizione viene aggiornato esclusivamente dai movimenti di pagamento';
    end if;

    if coalesce(old.paid_amount,0)>0.005
       and (
         new.amount is distinct from old.amount
         or new.unit_id is distinct from old.unit_id
         or new.member_id is distinct from old.member_id
         or new.ledger_entry_id is distinct from old.ledger_entry_id
         or new.condominium_id is distinct from old.condominium_id
         or new.workspace_id is distinct from old.workspace_id
       ) then
      raise exception 'Una ripartizione con pagamenti registrati non può essere scollegata o modificata nei dati contabili';
    end if;

    if exists(
      select 1 from public.condominium_installments i
      where i.workspace_id=old.workspace_id
        and i.condominium_id=old.condominium_id
        and i.ledger_entry_id=old.ledger_entry_id
    ) and (
      new.amount is distinct from old.amount
      or new.unit_id is distinct from old.unit_id
      or new.member_id is distinct from old.member_id
      or new.ledger_entry_id is distinct from old.ledger_entry_id
      or new.condominium_id is distinct from old.condominium_id
      or new.workspace_id is distinct from old.workspace_id
    ) then
      raise exception 'Una ripartizione collegata a rate non può essere scollegata o modificata nei dati contabili';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_fiscal_carryover_compensation_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_c public.condominium_fiscal_carryovers%rowtype;
  v_total numeric;
  v_target public.condominium_installments%rowtype;
  v_target_comp numeric;
begin
  select * into v_c
  from public.condominium_fiscal_carryovers
  where id=new.carryover_id
  for update;

  if not found then
    raise exception 'Partita riportata non trovata';
  end if;

  if new.amount is null or new.amount<=0 then
    raise exception 'Importo compensazione non valido';
  end if;

  select coalesce(sum(x.amount),0)
    into v_total
  from public.condominium_fiscal_carryover_compensations x
  where x.carryover_id=new.carryover_id
    and (tg_op='INSERT' or x.id<>new.id);

  v_total:=round(v_total+new.amount,2);

  if v_total>round(abs(v_c.balance)+coalesce(v_total,0)-coalesce(v_total,0),2)+0.005 then
    -- The carryover balance is reduced after the compensation insert.
    -- Therefore the pre-insert remaining balance alone is not the original cap.
    -- Reconstruct the original cap from existing compensations plus current balance.
    null;
  end if;

  if v_total>round(abs(v_c.balance)+(
    select coalesce(sum(x.amount),0)
    from public.condominium_fiscal_carryover_compensations x
    where x.carryover_id=new.carryover_id
      and (tg_op='INSERT' or x.id<>new.id)
  ),2)+0.005 then
    raise exception 'Le compensazioni superano il valore originario della partita riportata';
  end if;

  if new.target_installment_id is not null then
    select * into v_target
    from public.condominium_installments
    where id=new.target_installment_id
    for update;

    if not found then
      raise exception 'Rata di destinazione non trovata';
    end if;

    select coalesce(sum(x.amount),0)
      into v_target_comp
    from public.condominium_fiscal_carryover_compensations x
    where x.target_installment_id=new.target_installment_id
      and (tg_op='INSERT' or x.id<>new.id);

    if round(v_target_comp+new.amount,2)>round(v_target.amount-v_target.paid_amount,2)+0.005 then
      raise exception 'Le compensazioni superano il residuo della rata di destinazione';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_fiscal_year_opening_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.opening_balance is distinct from old.opening_balance and exists(select 1 from public.condominium_fiscal_carryovers c where c.workspace_id=old.workspace_id and c.condominium_id=old.condominium_id and c.target_fiscal_year_id=old.id) then raise exception 'Il saldo iniziale è vincolato ai riporti dell''esercizio precedente e non può essere modificato manualmente'; end if; return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_fund_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if new.target_amount is null or new.target_amount < 0
     or new.allocated_amount is null or new.allocated_amount < 0
     or new.used_amount is null or new.used_amount < 0 then
    raise exception 'Gli importi del fondo devono essere numerici e non negativi';
  end if;

  if tg_op = 'UPDATE'
     and new.used_amount is distinct from old.used_amount
     and coalesce(current_setting('bethag.allow_fund_used_update', true), 'off') <> 'on' then
    raise exception 'L''importo utilizzato del fondo è calcolato automaticamente dalla contabilità e non può essere modificato manualmente';
  end if;

  if new.used_amount > new.allocated_amount + 0.005 then
    raise exception 'L''importo utilizzato non può superare l''importo allocato';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_installment_paid_amount_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
 if tg_op='UPDATE' and new.paid_amount is distinct from old.paid_amount and coalesce(current_setting('bethag.allow_installment_paid_update',true),'off') <> 'on' then
  raise exception 'Il totale pagato della rata può essere modificato esclusivamente tramite la registrazione di un movimento di pagamento';
 end if;
 if tg_op='UPDATE' and coalesce(old.paid_amount,0)>0 and (new.amount is distinct from old.amount or new.unit_id is distinct from old.unit_id or new.ledger_entry_id is distinct from old.ledger_entry_id or new.fiscal_year_id is distinct from old.fiscal_year_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then
  raise exception 'Una rata con pagamenti registrati non può modificare importo, unità, esercizio o collegamento contabile';
 end if;
 return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_installment_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if old.ledger_entry_id is not null then raise exception 'La rata è collegata a un riparto contabile e non può essere cancellata singolarmente'; end if; if exists(select 1 from public.condominium_payment_movements where installment_id=old.id) then raise exception 'La rata ha movimenti di pagamento collegati e non può essere cancellata'; end if; return old; end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_ledger_entry_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
 v_allocations integer:=0;
 v_installments integer:=0;
begin
 if tg_op='DELETE' then
  select count(*) into v_allocations
  from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  select count(*) into v_installments
  from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  if v_allocations>0 or v_installments>0 then
    raise exception 'La voce contabile è collegata a ripartizioni o rate e non può essere cancellata';
  end if;
  return old;
 end if;

 if tg_op='UPDATE' then
  select count(*) into v_allocations
  from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  select count(*) into v_installments
  from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and ledger_entry_id=old.id;

  if (v_allocations>0 or v_installments>0) and (
    new.amount is distinct from old.amount
    or new.direction is distinct from old.direction
    or new.fiscal_year_id is distinct from old.fiscal_year_id
    or new.condominium_id is distinct from old.condominium_id
    or new.workspace_id is distinct from old.workspace_id
    or new.supplier_id is distinct from old.supplier_id
    or new.document_id is distinct from old.document_id
  ) then
    raise exception 'La voce contabile è già collegata a ripartizioni o rate: importo, direzione, esercizio, fornitore, documento e appartenenza non possono essere modificati';
  end if;
  return new;
 end if;

 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_ledger_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where ledger_entry_id=old.id) then raise exception 'La voce contabile ha ripartizioni collegate e non può essere cancellata'; end if; return old; end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_millesimal_table_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_allocations integer:=0;
begin
 select count(*) into v_allocations from public.condominium_expense_allocations a where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and a.allocation_table_id=old.id;
 if tg_op='DELETE' and v_allocations>0 then raise exception 'La tabella millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata'; end if;
 if tg_op='UPDATE' and v_allocations>0 and (new.basis_type is distinct from old.basis_type or new.scope_mode is distinct from old.scope_mode or new.scope_unit_ids is distinct from old.scope_unit_ids or new.scope_building_codes is distinct from old.scope_building_codes or new.total_millesimi is distinct from old.total_millesimi or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then raise exception 'La tabella millesimale è già utilizzata da ripartizioni esistenti e la base di calcolo non può essere modificata'; end if;
 return coalesce(new,old);
end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_millesimal_table_parent_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if exists(select 1 from public.condominium_expense_allocations where allocation_table_id=old.id) then raise exception 'La tabella millesimale ha ripartizioni collegate e non può essere cancellata'; end if; if exists(select 1 from public.condominium_millesimal_values where table_id=old.id) then raise exception 'La tabella millesimale ha quote collegate e non può essere cancellata'; end if; return old; end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_millesimal_value_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_allocations integer:=0;
begin
 select count(*) into v_allocations from public.condominium_expense_allocations a where a.workspace_id=old.workspace_id and a.condominium_id=old.condominium_id and a.allocation_table_id=old.table_id;
 if tg_op='DELETE' and v_allocations>0 then raise exception 'La quota millesimale è utilizzata da ripartizioni esistenti e non può essere cancellata'; end if;
 if tg_op='UPDATE' and v_allocations>0 and (new.value is distinct from old.value or new.excluded is distinct from old.excluded or new.table_id is distinct from old.table_id or new.unit_id is distinct from old.unit_id or new.condominium_id is distinct from old.condominium_id or new.workspace_id is distinct from old.workspace_id) then raise exception 'La quota millesimale è già utilizzata da ripartizioni esistenti e non può essere modificata'; end if;
 return coalesce(new,old);
end; $function$
;

CREATE OR REPLACE FUNCTION public.guard_unit_scope_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_old_building text;
  v_new_building text;
  v_old_civic text;
  v_new_civic text;
  v_old_fabbricato text;
  v_new_fabbricato text;
begin
  v_old_building := nullif(btrim(coalesce(old.building_code, '')), '');
  v_new_building := nullif(btrim(coalesce(new.building_code, '')), '');
  v_old_civic := nullif(btrim(coalesce(old.data->>'civic_code', old.data->>'civicCode', old.data->>'civico', '')), '');
  v_new_civic := nullif(btrim(coalesce(new.data->>'civic_code', new.data->>'civicCode', new.data->>'civico', '')), '');
  v_old_fabbricato := nullif(btrim(coalesce(old.data->>'fabbricato', old.data->>'building_code', old.data->>'buildingCode', '')), '');
  v_new_fabbricato := nullif(btrim(coalesce(new.data->>'fabbricato', new.data->>'building_code', new.data->>'buildingCode', '')), '');

  if old.workspace_id is distinct from new.workspace_id
     or old.condominium_id is distinct from new.condominium_id then
    if exists (
      select 1 from public.condominium_expense_allocations
      where unit_id = old.id
    ) or exists (
      select 1 from public.condominium_installments
      where unit_id = old.id
    ) then
      raise exception 'UNIT_HAS_FINANCIAL_HISTORY: impossibile spostare un''unità con storico contabile tra workspace o condomini';
    end if;
  end if;

  if v_old_building is distinct from v_new_building
     or v_old_civic is distinct from v_new_civic
     or v_old_fabbricato is distinct from v_new_fabbricato then
    if exists (
      select 1 from public.condominium_expense_allocations
      where workspace_id = old.workspace_id
        and condominium_id = old.condominium_id
        and unit_id = old.id
    ) or exists (
      select 1 from public.condominium_installments
      where workspace_id = old.workspace_id
        and condominium_id = old.condominium_id
        and unit_id = old.id
    ) then
      raise exception 'UNIT_SCOPE_LOCKED: fabbricato, edificio o civico non possono essere modificati dopo la registrazione di movimenti contabili o rate per l''unità';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.list_archived_condominiums(p_workspace_id uuid)
 RETURNS SETOF condominiums
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return query select * from private.list_archived_condominiums($1); end $function$
;

CREATE OR REPLACE FUNCTION public.normalize_condominium_member_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.email is not null then new.email:=nullif(lower(btrim(new.email)),''); end if;
  new.role:=nullif(btrim(new.role),'');
  if new.role is null then new.role:='resident'; end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_condominium_member_names()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_data jsonb;
begin
  v_data:=coalesce(new.data,'{}'::jsonb);
  if nullif(btrim(coalesce(v_data->>'lastName','')),'') is not null then
    v_data:=jsonb_set(v_data,'{lastName}',to_jsonb(upper(btrim(v_data->>'lastName'))),true);
  end if;
  if nullif(btrim(coalesce(v_data->>'firstName','')),'') is not null then
    v_data:=jsonb_set(v_data,'{firstName}',to_jsonb(initcap(lower(btrim(v_data->>'firstName')))),true);
  end if;
  new.data:=v_data;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_zero_ownership_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.prepare_communication_recipients(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public', 'pg_catalog'
AS $function$ select private.prepare_communication_recipients(p_communication_id); $function$
;

CREATE OR REPLACE FUNCTION public.preserve_closing_condominium_member_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if lower(trim(coalesce(new.data->>'position_status', ''))) = 'in chiusura' then
    new.active := true;
    new.data := coalesce(new.data, '{}'::jsonb)
      || jsonb_build_object('current_owner', false);
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_archived_condominium_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_condominium_id uuid;
begin
  if tg_op='DELETE' then return old; end if;
  v_condominium_id:=new.condominium_id;
  if v_condominium_id is not null and exists(select 1 from public.condominiums c where c.id=v_condominium_id and c.archived_at is not null) then
    raise exception 'Il condominio è archiviato: modifica non consentita';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_condominium_accounting()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_year_id uuid;
  v_new_year_id uuid;
  v_status text;
  v_old_parent_id uuid;
  v_new_parent_id uuid;
begin
  if tg_table_name in ('condominium_ledger_entries','condominium_budgets','condominium_installments') then
    if tg_op <> 'INSERT' then v_old_year_id := old.fiscal_year_id; end if;
    if tg_op <> 'DELETE' then v_new_year_id := new.fiscal_year_id; end if;
  elsif tg_table_name = 'condominium_expense_allocations' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.ledger_entry_id;
      select le.fiscal_year_id into v_old_year_id
      from public.condominium_ledger_entries le where le.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.ledger_entry_id;
      select le.fiscal_year_id into v_new_year_id
      from public.condominium_ledger_entries le where le.id = v_new_parent_id;
    end if;
  elsif tg_table_name = 'condominium_payment_movements' then
    if tg_op <> 'INSERT' then
      v_old_parent_id := old.installment_id;
      select i.fiscal_year_id into v_old_year_id
      from public.condominium_installments i where i.id = v_old_parent_id;
    end if;
    if tg_op <> 'DELETE' then
      v_new_parent_id := new.installment_id;
      select i.fiscal_year_id into v_new_year_id
      from public.condominium_installments i where i.id = v_new_parent_id;
    end if;
  end if;

  if v_old_year_id is not null then
    select fy.status into v_status
    from public.condominium_fiscal_years fy where fy.id = v_old_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile di origine è chiuso: modifica non consentita.';
    end if;
  end if;

  if v_new_year_id is not null and v_new_year_id is distinct from v_old_year_id then
    select fy.status into v_status
    from public.condominium_fiscal_years fy where fy.id = v_new_year_id;
    if v_status = 'Chiuso' then
      raise exception 'L''esercizio contabile di destinazione è chiuso: modifica non consentita.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere eliminato';
  end if;
  if exists (select 1 from public.condominium_ledger_entries where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_installments where fiscal_year_id=old.id)
     or exists (select 1 from public.condominium_budgets where fiscal_year_id=old.id) then
    raise exception 'L''esercizio ha dati contabili collegati e non può essere eliminato';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_payment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_year_id uuid;
  v_status text;
begin
  select i.fiscal_year_id into v_year_id
  from public.condominium_installments i
  where i.id=old.installment_id;

  if v_year_id is not null then
    select status into v_status from public.condominium_fiscal_years where id=v_year_id;
    if v_status='Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e i pagamenti non possono essere modificati';
    end if;
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_record_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere modificato';
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'Chiuso' then
      raise exception 'L''esercizio contabile è chiuso e non può essere eliminato';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_reopen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op='INSERT' then
    if new.status='Chiuso'
       and coalesce(current_setting('bethag.allow_fiscal_year_status_update',true),'off')<>'on' then
      raise exception 'Un nuovo esercizio non può essere creato direttamente come chiuso: utilizzare la procedura di chiusura contabile';
    end if;
    return new;
  end if;

  if old.status='Chiuso' and new.status<>'Chiuso' then
    raise exception 'L''esercizio contabile è chiuso e non può essere riaperto.';
  end if;

  if new.status='Chiuso' and old.status is distinct from 'Chiuso'
     and coalesce(current_setting('bethag.allow_fiscal_year_status_update',true),'off')<>'on' then
    raise exception 'La chiusura dell''esercizio deve essere effettuata tramite la procedura di chiusura contabile.';
  end if;

  if new.start_date>new.end_date then
    raise exception 'La data di inizio esercizio non può essere successiva alla data di fine.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if old.status='Chiuso' then
    raise exception 'Un esercizio chiuso non può essere modificato o riaperto';
  end if;
  if new.status='Chiuso' then
    return new;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_condominium_unit_delete_with_financial_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if exists (
    select 1 from public.condominium_expense_allocations
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_ALLOCATIONS: impossibile eliminare l''unità % perché contiene ripartizioni contabili. Eliminare o trasferire prima le ripartizioni collegate.', old.unit_code
      using errcode = '23503';
  end if;
  if exists (
    select 1 from public.condominium_installments
    where unit_id = old.id
  ) then
    raise exception 'UNIT_HAS_INSTALLMENTS: impossibile eliminare l''unità % perché contiene rate. Eliminare o trasferire prima le rate collegate.', old.unit_code
      using errcode = '23503';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_condominium_unit_delete_with_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.condominium_members where unit_id = old.id) then
    raise exception 'UNIT_HAS_MEMBERS: impossibile eliminare l''unità % perché contiene uno o più condòmini. Spostare prima i condòmini ad altra unità oppure eliminarli esplicitamente.', old.unit_code
      using errcode = '23503';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_financial_unit_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_alloc integer; v_inst integer;
begin
  select count(*) into v_alloc from public.condominium_expense_allocations
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  select count(*) into v_inst from public.condominium_installments
  where workspace_id=old.workspace_id and condominium_id=old.condominium_id and unit_id=old.id;
  if v_alloc>0 or v_inst>0 then
    raise exception 'L''unità ha movimenti contabili o rate collegate e non può essere eliminata';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_fiscal_year_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_count bigint;
begin
 select count(*) into v_count from public.condominium_ledger_entries where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene movimenti contabili'; end if;
 select count(*) into v_count from public.condominium_installments where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene rate'; end if;
 select count(*) into v_count from public.condominium_budgets where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene voci di preventivo'; end if;
 select count(*) into v_count from public.condominium_consumption_readings where fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: contiene dati di consumo'; end if;
 select count(*) into v_count from public.condominium_fiscal_carryovers where source_fiscal_year_id=old.id or target_fiscal_year_id=old.id;
 if v_count>0 then raise exception 'L''esercizio non può essere cancellato: esistono partite riportate collegate'; end if;
 if old.status='Chiuso' then raise exception 'Un esercizio chiuso non può essere cancellato'; end if;
 return old;
end; $function$
;

CREATE OR REPLACE FUNCTION public.prevent_member_delete_with_financial_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if exists(select 1 from public.condominium_installments i where i.member_id=old.id)
     or exists(select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
     or exists(select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id)
  then raise exception 'MEMBER_FINANCIAL_HISTORY_LOCK: non è possibile eliminare un membro con storico contabile; disattivare la posizione o creare una nuova posizione anagrafica'; end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_member_unit_reassignment_with_financial_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.unit_id is distinct from old.unit_id and (
    exists(select 1 from public.condominium_installments i where i.member_id=old.id)
    or exists(select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
    or exists(select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id))
  then raise exception 'MEMBER_UNIT_HISTORY_LOCK: non è possibile riassegnare l''unità di un membro con storico contabile; creare una nuova posizione anagrafica per il nuovo intestatario'; end if;
  if new.condominium_id is distinct from old.condominium_id and (
    exists(select 1 from public.condominium_installments i where i.member_id=old.id)
    or exists(select 1 from public.condominium_expense_allocations a where a.member_id=old.id)
    or exists(select 1 from public.condominium_fiscal_carryovers c where c.member_id=old.id))
  then raise exception 'MEMBER_CONDOMINIUM_HISTORY_LOCK: non è possibile spostare un membro con storico contabile in un altro condominio'; end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_paid_allocation_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(old.paid_amount,0)>0 then
    raise exception 'Non è possibile cancellare una ripartizione con pagamenti registrati';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_paid_installment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(old.paid_amount,0)>0 then
    raise exception 'Non è possibile cancellare una rata con pagamenti registrati: utilizzare una procedura di rettifica del pagamento';
  end if;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_payment_core_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.amount is distinct from old.amount
     or new.payment_date is distinct from old.payment_date
     or new.installment_id is distinct from old.installment_id
     or new.workspace_id is distinct from old.workspace_id
     or new.condominium_id is distinct from old.condominium_id then
    raise exception 'Importo, data e collegamento del pagamento sono immutabili: utilizzare lo storno con motivazione';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_self_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if auth.uid() is not null and (new.role is distinct from old.role or new.active is distinct from old.active) then raise exception 'I campi role e active del profilo non sono modificabili dall utente'; end if; return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.prevent_unsafe_condominium_unit_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end; $function$
;

CREATE OR REPLACE FUNCTION public.preview_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_workspace uuid; v_condominium uuid; v_result jsonb;
begin
 if p_transfer_date is null then raise exception 'TRANSFER_DATE_REQUIRED'; end if;
 select u.workspace_id,u.condominium_id into v_workspace,v_condominium from public.condominium_units u where u.id=p_unit_id;
 if v_workspace is null or not private.can_access_workspace_module(v_workspace,'condomini') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.condominiums c where c.id=v_condominium and c.archived_at is not null) then raise exception 'ARCHIVED_CONDOMINIUM'; end if;
 if not exists(select 1 from public.condominium_members m where m.id=p_outgoing_member_id and m.condominium_id=v_condominium and m.unit_id=p_unit_id and m.active and trim(coalesce(m.data->>'role',''))='Proprietario' and coalesce(m.data->>'current_owner','true')='true' and coalesce(m.data->>'position_status','Attivo')<>'In chiusura') then raise exception 'OUTGOING_MEMBER_NOT_ACTIVE_OWNER_ON_UNIT'; end if;
 select jsonb_build_object(
 'transfer_date',p_transfer_date,'unit_id',p_unit_id,'outgoing_member_id',p_outgoing_member_id,
 'outstanding_before',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
 'paid_before',coalesce((select sum(i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),0),
 'installments_before',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'assignment_scope',case when i.member_id is null then 'unit_unassigned' else 'member' end,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date),'[]'::jsonb),
 'installments_after',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'assignment_scope',case when i.member_id is null then 'unit_unassigned' else 'member' end,'title',i.title,'amount',i.amount,'paid_amount',i.paid_amount,'residual',i.amount-i.paid_amount,'due_date',i.due_date,'status',i.status,'fiscal_year_id',i.fiscal_year_id) order by i.due_date,i.id) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and (i.due_date is null or i.due_date>p_transfer_date)),'[]'::jsonb),
 'outstanding_total',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.amount-i.paid_amount>0.005),0),
 'outstanding_due_after',coalesce((select sum(i.amount-i.paid_amount) from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id) ) and (i.due_date is null or i.due_date>p_transfer_date) and i.amount-i.paid_amount>0.005),0),
 'extraordinary_deliberated_before_due_after',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'amount',a.amount,'paid_amount',a.paid_amount,'due_date',a.due_date,'status',a.status,'ledger_entry_id',a.ledger_entry_id,'deliberation_date',l.deliberation_date,'description',l.description) order by l.deliberation_date,a.due_date,a.id) from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),'[]'::jsonb),
 'unit_unassigned_carryovers',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'balance',c.balance,'kind',c.kind,'status',c.status,'source_fiscal_year_id',c.source_fiscal_year_id,'target_fiscal_year_id',c.target_fiscal_year_id) order by c.created_at,c.id) from public.condominium_fiscal_carryovers c where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),'[]'::jsonb),
 'unit_expenses',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'description',l.description,'expense_type',l.expense_type,'entry_date',l.entry_date,'deliberation_date',l.deliberation_date,'amount',l.amount,'assembly_id',l.assembly_id) order by coalesce(l.deliberation_date,l.entry_date),l.id) from public.condominium_ledger_entries l where l.unit_id=p_unit_id and l.condominium_id=v_condominium and (l.entry_date<=p_transfer_date or (l.deliberation_date is not null and l.deliberation_date<=p_transfer_date))),'[]'::jsonb),
 'review_flags',jsonb_build_object('unpaid_before_transfer',exists(select 1 from public.condominium_installments i where (i.member_id=p_outgoing_member_id or (i.member_id is null and i.unit_id=p_unit_id)) and i.due_date<=p_transfer_date and i.amount-i.paid_amount>0.005),'extraordinary_deliberated_before_due_after',exists(select 1 from public.condominium_expense_allocations a join public.condominium_ledger_entries l on l.id=a.ledger_entry_id where a.member_id=p_outgoing_member_id and l.expense_type='Straordinaria' and l.deliberation_date<=p_transfer_date and (a.due_date is null or a.due_date>p_transfer_date)),'unit_unassigned_carryovers',exists(select 1 from public.condominium_fiscal_carryovers c where c.unit_id=p_unit_id and c.member_id is null and abs(c.balance)>0.005),'legal_liability_review_required',true)
 ) into v_result;
 return v_result;
end;$function$
;

CREATE OR REPLACE FUNCTION public.preview_condominium_unit_transformation(p_condominium_id uuid, p_transformation_type text, p_source_unit_ids uuid[])
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
with requested as (
  select coalesce(cardinality(p_source_unit_ids),0) as requested_count,
         count(distinct x.unit_id) as distinct_count
  from unnest(coalesce(p_source_unit_ids, array[]::uuid[])) as x(unit_id)
),
eligible as (
  select u.id,u.unit_code,u.building_code,u.data,u.lifecycle_status
  from public.condominium_units u
  where u.id=any(coalesce(p_source_unit_ids,array[]::uuid[]))
    and u.condominium_id=p_condominium_id
    and u.lifecycle_status='Attiva'
),
counts as (
  select count(*)::integer as eligible_count from eligible
),
issues as (
  select coalesce(jsonb_agg(message order by priority),'[]'::jsonb) as errors
  from (values
    (1,case when p_condominium_id is null then 'Condominio non specificato.' end),
    (2,case when p_transformation_type not in ('Fusione','Frazionamento') or p_transformation_type is null then 'Tipo di trasformazione non valido.' end),
    (3,case when (select requested_count from requested)=0 then 'Selezionare almeno un’unità di origine.' end),
    (4,case when (select requested_count from requested)<>(select distinct_count from requested) then 'La selezione contiene unità duplicate.' end),
    (5,case when p_transformation_type='Fusione' and (select requested_count from requested)<2 then 'La fusione richiede almeno due unità di origine.' end),
    (6,case when p_transformation_type='Frazionamento' and (select requested_count from requested)<>1 then 'Il frazionamento richiede una sola unità di origine.' end),
    (7,case when (select eligible_count from counts)<>(select distinct_count from requested) then 'Una o più unità non esistono, non sono attive o non sono accessibili nel condominio selezionato.' end)
  ) v(priority,message)
  where message is not null
)
select jsonb_build_object(
  'condominium_id',p_condominium_id,
  'transformation_type',p_transformation_type,
  'requested_source_count',(select requested_count from requested),
  'source_unit_count',(select eligible_count from counts),
  'valid',jsonb_array_length((select errors from issues))=0,
  'validation_errors',(select errors from issues),
  'source_units',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'unit_code',e.unit_code,'building_code',e.building_code,'data',e.data,'lifecycle_status',e.lifecycle_status) order by e.unit_code) from eligible e),'[]'::jsonb),
  'active_members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'unit_id',m.unit_id,'name',m.name,'email',m.email,'user_id',m.user_id,'role',m.role,'active',m.active,'data',m.data) order by m.unit_id,m.id) from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and m.active),'[]'::jsonb),
  'ownership_summary',coalesce((select jsonb_agg(jsonb_build_object('owner_key',x.owner_key,'member_count',x.member_count,'unit_ids',x.unit_ids) order by x.owner_key) from (select case when m.user_id is not null then 'u:'||m.user_id::text when nullif(lower(trim(coalesce(m.email,''))),'') is not null then 'e:'||lower(trim(m.email)) else 'm:'||m.id::text end owner_key,count(*) member_count,jsonb_agg(distinct m.unit_id) unit_ids from public.condominium_members m where m.condominium_id=p_condominium_id and m.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and m.active and trim(coalesce(m.data->>'role',m.role,''))='Proprietario' group by 1) x),'[]'::jsonb),
  'open_installments',coalesce((select round(sum(greatest(i.amount-i.paid_amount,0)),2) from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),0),
  'open_allocations',coalesce((select round(sum(greatest(a.amount-a.paid_amount,0)),2) from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),0),
  'millesimal_tables',coalesce((select jsonb_agg(jsonb_build_object('table_id',mt.id,'name',mt.name,'total_millesimi',mt.total_millesimi,'basis_type',mt.basis_type,'affected_values',coalesce((select jsonb_agg(jsonb_build_object('unit_id',mv.unit_id,'value',mv.value,'excluded',mv.excluded)) from public.condominium_millesimal_values mv where mv.table_id=mt.id and mv.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[]))),'[]'::jsonb)) order by mt.name) from public.condominium_millesimal_tables mt where mt.condominium_id=p_condominium_id and mt.active),'[]'::jsonb),
  'accounting_resolution_required',exists(select 1 from public.condominium_installments i where i.condominium_id=p_condominium_id and i.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and i.amount-i.paid_amount>0.005) or exists(select 1 from public.condominium_expense_allocations a where a.condominium_id=p_condominium_id and a.unit_id=any(coalesce(p_source_unit_ids,array[]::uuid[])) and a.amount-a.paid_amount>0.005),
  'millesimal_review_required',true,
  'unit_count_delta',case when p_transformation_type='Fusione' then 1-(select requested_count from requested) when p_transformation_type='Frazionamento' then null else 0 end
)
$function$
;

CREATE OR REPLACE FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text DEFAULT 'Bonifico'::text, p_reference text DEFAULT ''::text, p_notes text DEFAULT ''::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.register_condominium_installment_payment($1,$2,$3,$4,$5,$6,$7,$8); end $function$
;

CREATE OR REPLACE FUNCTION public.require_confirmed_genealogy_for_unit_lifecycle()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.lifecycle_status is not distinct from old.lifecycle_status
     and new.lifecycle_effective_date is not distinct from old.lifecycle_effective_date then
    return new;
  end if;

  if current_user = 'postgres' then
    return new;
  end if;

  if new.lifecycle_status = 'Attiva' then
    raise exception 'UNIT_LIFECYCLE_REACTIVATION_REQUIRES_TRUSTED_RPC: la riattivazione deve essere gestita da una procedura autorizzata';
  end if;

  if old.lifecycle_status <> 'Attiva'
     or new.lifecycle_status not in ('Storica','Soppressa') then
    raise exception 'UNIT_LIFECYCLE_TRANSITION_INVALID: transizione dello stato catastale non consentita';
  end if;

  if new.lifecycle_effective_date is null or not exists (
    select 1
    from public.condominium_unit_transformation_items i
    join public.condominium_unit_transformations t on t.id = i.transformation_id
    where i.unit_id = old.id
      and i.direction = 'Fonte'
      and t.condominium_id = old.condominium_id
      and t.workspace_id = old.workspace_id
      and t.status = 'Confermata'
      and t.effective_date = new.lifecycle_effective_date
  ) then
    raise exception 'UNIT_LIFECYCLE_REQUIRES_CONFIRMED_GENEALOGY: unità storicizzabile o sopprimibile solo tramite trasformazione catastale confermata con data coincidente';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.require_trusted_unit_transformation_confirmation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.status='Confermata' and (tg_op='INSERT' or old.status is distinct from 'Confermata') and current_user<>'postgres' then raise exception 'UNIT_TRANSFORMATION_CONFIRMATION_REQUIRES_TRUSTED_RPC: la conferma deve avvenire tramite una procedura transazionale autorizzata'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.reset_stale_communication_recipients(p_communication_id uuid, p_age interval DEFAULT '00:15:00'::interval)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_ws uuid; v_count integer;
begin
 if auth.uid() is null then raise exception 'Autenticazione richiesta'; end if;
 if p_age < interval '5 minutes' then raise exception 'Intervallo di recupero troppo breve'; end if;
 select workspace_id into v_ws from public.communications where id=p_communication_id and condominium_id is not null;
 if v_ws is null then raise exception 'Comunicazione non trovata'; end if;
 if not private.can_manage_workspace_module(v_ws,'comunicazioni') then raise exception 'Permessi insufficienti'; end if;
 update public.communication_recipients
 set status='pending', queued_at=null, error_message=null, updated_at=now()
 where communication_id=p_communication_id and status='queued'
   and queued_at is not null and queued_at < now()-p_age;
 get diagnostics v_count=row_count;
 return jsonb_build_object('reset',v_count);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.restore_condominium($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.reverse_condominium_installment_payment($1,$2,$3,$4);
$function$
;

CREATE OR REPLACE FUNCTION public.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.save_condominium($1,$2,$3,$4,$5,$6,$7,$8); end $function$
;

CREATE OR REPLACE FUNCTION public.set_personal_security_code(p_code text, p_enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin perform private.set_personal_security_code($1,$2); end $function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_expense_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ledger_id uuid;
  v_total numeric;
  v_paid numeric;
  v_status text;
  v_has_installments boolean;
begin
  v_ledger_id := coalesce(new.ledger_entry_id, old.ledger_entry_id);

  if v_ledger_id is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount),0), coalesce(sum(paid_amount),0), count(*) > 0
    into v_total, v_paid, v_has_installments
  from public.condominium_installments
  where ledger_entry_id=v_ledger_id;

  if not v_has_installments then
    v_status := 'Registrato';
  elsif v_paid >= v_total - 0.005 and v_total > 0 then
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif exists (
    select 1 from public.condominium_installments
    where ledger_entry_id=v_ledger_id
      and due_date < current_date
      and paid_amount < amount
  ) then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  update public.condominium_ledger_entries
  set payment_status=v_status
  where id=v_ledger_id;

  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_fund_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_old_fund uuid;
  v_new_fund uuid;
  v_fund uuid;
  v_used numeric;
begin
  v_old_fund := case when tg_op in ('UPDATE','DELETE') then old.fund_id else null end;
  v_new_fund := case when tg_op in ('INSERT','UPDATE') then new.fund_id else null end;

  if v_old_fund is not null and v_new_fund is not null and v_old_fund <> v_new_fund then
    if v_old_fund < v_new_fund then
      perform 1 from public.condominium_funds where id = v_old_fund for update;
      perform 1 from public.condominium_funds where id = v_new_fund for update;
    else
      perform 1 from public.condominium_funds where id = v_new_fund for update;
      perform 1 from public.condominium_funds where id = v_old_fund for update;
    end if;
  else
    v_fund := coalesce(v_new_fund, v_old_fund);
    if v_fund is not null then
      perform 1 from public.condominium_funds where id = v_fund for update;
    end if;
  end if;

  if v_old_fund is not null then
    select coalesce(sum(case when direction = 'Uscita' then amount else 0 end),0)
      into v_used
    from public.condominium_ledger_entries
    where fund_id = v_old_fund;

    perform set_config('bethag.allow_fund_used_update','on',true);
    update public.condominium_funds
       set used_amount = greatest(v_used,0),
           updated_at = now()
     where id = v_old_fund;
  end if;

  if v_new_fund is not null and v_new_fund is distinct from v_old_fund then
    select coalesce(sum(case when direction = 'Uscita' then amount else 0 end),0)
      into v_used
    from public.condominium_ledger_entries
    where fund_id = v_new_fund;

    perform set_config('bethag.allow_fund_used_update','on',true);
    update public.condominium_funds
       set used_amount = greatest(v_used,0),
           updated_at = now()
     where id = v_new_fund;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_installment_from_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_installment_id uuid;
  v_workspace_id uuid;
  v_condominium_id uuid;
  v_amount numeric;
  v_paid numeric;
  v_status text;
  v_due_date date;
  v_unit_id uuid;
  v_member_id uuid;
  v_owner_user_id uuid;
  v_owner_email text;
  v_remaining numeric;
  v_allocation public.condominium_expense_allocations%rowtype;
  v_target numeric;
begin
  v_installment_id := coalesce(new.installment_id, old.installment_id);
  v_workspace_id := coalesce(new.workspace_id, old.workspace_id);
  v_condominium_id := coalesce(new.condominium_id, old.condominium_id);

  select amount, due_date, unit_id, member_id
    into v_amount, v_due_date, v_unit_id, v_member_id
  from public.condominium_installments
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id
  for update;

  if not found then
    return coalesce(new, old);
  end if;

  select round(coalesce(sum(amount),0)::numeric,2)
    into v_paid
  from public.condominium_payment_movements
  where installment_id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  if v_paid > v_amount + 0.005 then
    raise exception 'I pagamenti della rata superano l''importo della rata.';
  end if;

  if v_paid >= v_amount - 0.005 then
    v_paid := round(v_amount::numeric,2);
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif v_due_date < current_date then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  perform set_config('bethag.allow_installment_paid_update','on',true);

  update public.condominium_installments
  set paid_amount=v_paid,status=v_status
  where id=v_installment_id
    and workspace_id=v_workspace_id
    and condominium_id=v_condominium_id;

  /*
    Dopo INSERT/UPDATE/DELETE di un movimento, riallinea anche le
    ripartizioni interessate. Questo è indispensabile soprattutto per
    lo storno: la rata può tornare parzialmente/non pagata e le
    ripartizioni devono riflettere lo stesso saldo.
  */
  perform set_config('bethag.allow_allocation_paid_update','on',true);

  if v_unit_id is null and v_member_id is not null then
    select cm.user_id, nullif(lower(trim(cm.email)),'')
      into v_owner_user_id, v_owner_email
    from public.condominium_members cm
    where cm.id=v_member_id
      and cm.condominium_id=v_condominium_id
      and cm.active
      and trim(coalesce(cm.data->>'role',''))='Proprietario';

    if found then
      v_remaining := v_paid;

      for v_allocation in
        select a.*
        from public.condominium_expense_allocations a
        where a.workspace_id=v_workspace_id
          and a.condominium_id=v_condominium_id
          and a.ledger_entry_id=(
            select i.ledger_entry_id
            from public.condominium_installments i
            where i.id=v_installment_id
          )
          and exists (
            select 1
            from public.condominium_members cm
            where cm.condominium_id=v_condominium_id
              and cm.unit_id=a.unit_id
              and cm.active
              and trim(coalesce(cm.data->>'role',''))='Proprietario'
              and (
                (v_owner_user_id is not null and cm.user_id=v_owner_user_id)
                or
                (v_owner_user_id is null
                 and nullif(lower(trim(cm.email)),'') is not null
                 and nullif(lower(trim(cm.email)),'')=v_owner_email)
              )
          )
        order by a.id
        for update
      loop
        v_target := least(
          round(coalesce(v_allocation.amount,0),2),
          greatest(round(v_remaining,2),0)
        );

        update public.condominium_expense_allocations
        set paid_amount=v_target,
            status=case
              when v_target>=amount-0.005 then 'Pagato'
              when v_target>0 then 'Parzialmente pagato'
              else 'Da pagare'
            end
        where id=v_allocation.id;

        v_remaining := round(v_remaining-v_target,2);
        exit when v_remaining<=0.005;
      end loop;
    end if;
  else
    update public.condominium_expense_allocations a
    set paid_amount=v_paid,
        status=case
          when v_paid>=a.amount-0.005 then 'Pagato'
          when v_paid>0 then 'Parzialmente pagato'
          else 'Da pagare'
        end
    where a.workspace_id=v_workspace_id
      and a.condominium_id=v_condominium_id
      and a.unit_id=v_unit_id
      and (
        (v_member_id is not null and a.member_id=v_member_id)
        or
        (v_member_id is null and a.member_id is null)
      )
      and a.ledger_entry_id=(
        select i.ledger_entry_id
        from public.condominium_installments i
        where i.id=v_installment_id
      );
  end if;

  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_member_unit_legacy_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_code text;
begin
  if new.unit_id is not null then
    select unit_code into v_code from public.condominium_units where id=new.unit_id;
    new.data:=jsonb_set(jsonb_set(coalesce(new.data,'{}'::jsonb),'{unitId}',to_jsonb(new.unit_id::text),true),'{apartment}',to_jsonb(v_code),true);
  else new.data:=new.data-'unitId'-'apartment';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_work_financial_summary(p_work_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare a numeric:=0;p numeric:=0;q numeric:=0;s text:='Nessun importo';begin if p_work_id is null then return;end if;perform 1 from public.condominium_works where id=p_work_id for update;if not found then return;end if;select coalesce(sum(amount),0),coalesce(sum(paid_amount),0),coalesce((select percentage from public.condominium_work_progress where work_id=p_work_id order by progress_date desc,progress_no desc,created_at desc limit 1),0) into a,p,q from public.condominium_work_progress where work_id=p_work_id;p:=least(greatest(round(p,2),0),round(a,2));if a<=0 then s:='Nessun importo';elsif p>=a-0.005 then s:='Pagato';elsif p>0 then s:='Parzialmente pagato';else s:='Da pagare';end if;update public.condominium_works set actual_amount=round(a,2),paid_amount=p,remaining_amount=greatest(round(a-p,2),0),progress_percent=least(greatest(q,0),100),payment_status=s,updated_at=now() where id=p_work_id;end $function$
;

CREATE OR REPLACE FUNCTION public.sync_condominium_work_financial_summary_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if tg_op='DELETE' then perform public.sync_condominium_work_financial_summary(old.work_id);return old;end if;perform public.sync_condominium_work_financial_summary(new.work_id);if tg_op='UPDATE' and old.work_id is distinct from new.work_id then perform public.sync_condominium_work_financial_summary(old.work_id);end if;return new;end $function$
;

CREATE OR REPLACE FUNCTION public.touch_documents_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_allocation_rule_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$ begin if new.allocation_table_id is null then raise exception 'Una regola di riparto deve indicare una tabella millesimale'; end if; if not exists(select 1 from public.condominium_millesimal_tables t where t.id=new.allocation_table_id and t.workspace_id=new.workspace_id and t.condominium_id=new.condominium_id) then raise exception 'La tabella della regola di riparto non appartiene al condominio selezionato'; end if; if new.priority is null or new.priority<0 then raise exception 'La priorità della regola di riparto non può essere negativa'; end if; if coalesce(trim(new.name),'')='' then raise exception 'Il nome della regola di riparto è obbligatorio'; end if; if coalesce(trim(new.expense_type),'')='' and coalesce(trim(new.category),'')='' then raise exception 'La regola deve indicare almeno il tipo di spesa o la categoria'; end if; return new; end; $function$
;

CREATE OR REPLACE FUNCTION public.validate_audit_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid;
begin
  if new.workspace_id is null then
    raise exception 'workspace_id audit obbligatorio';
  end if;

  if new.condominium_id is not null then
    select workspace_id into v_workspace
    from public.condominiums
    where id=new.condominium_id;

    if v_workspace is null then
      raise exception 'Condominio audit non trovato';
    end if;
    if v_workspace<>new.workspace_id then
      raise exception 'Workspace audit e condominio non coincidono';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_communication_recipient_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_ws uuid; v_cond uuid; v_member_cond uuid; v_member_user uuid; v_active boolean;
begin
 select workspace_id,condominium_id into v_ws,v_cond from public.communications where id=new.communication_id;
 if v_ws is null then raise exception 'La comunicazione del destinatario non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Destinatario e comunicazione devono appartenere allo stesso workspace'; end if;
 if new.condominium_id is distinct from v_cond then raise exception 'Destinatario e comunicazione devono appartenere allo stesso condominio'; end if;
 if new.member_id is not null then
   select condominium_id,user_id,active into v_member_cond,v_member_user,v_active from public.condominium_members where id=new.member_id;
   if v_member_cond is null or v_member_cond<>new.condominium_id then raise exception 'Il membro del destinatario non appartiene al condominio'; end if;
   if not coalesce(v_active,false) then raise exception 'Il membro del destinatario non è attivo'; end if;
   if new.user_id is not null and v_member_user is not null and new.user_id<>v_member_user then raise exception 'Utente e membro del destinatario non corrispondono'; end if;
 end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_communication_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare v_ws uuid; v_archived timestamptz;
begin
 if new.condominium_id is null then
   if new.published then raise exception 'Una comunicazione senza condominio non può essere pubblicata'; end if;
   return new;
 end if;
 select workspace_id,archived_at into v_ws,v_archived from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio della comunicazione non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Comunicazione e condominio devono appartenere allo stesso workspace'; end if;
 if new.published and v_archived is not null then raise exception 'Una comunicazione non può essere pubblicata su un condominio archiviato'; end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_allocation_intake_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_ws uuid;
  v_cond uuid;
begin
  if new.document_id is not null then
    select workspace_id, condominium_id
    into v_ws, v_cond
    from public.documents
    where id=new.document_id;

    if v_ws is null then
      raise exception 'Il documento collegato all''acquisizione non esiste';
    end if;

    if v_ws <> new.workspace_id then
      raise exception 'Il documento collegato appartiene a un workspace diverso';
    end if;

    if v_cond is not null and v_cond <> new.condominium_id then
      raise exception 'Il documento collegato appartiene a un condominio diverso';
    end if;
  end if;

  if new.ledger_entry_id is not null and not exists (
    select 1
    from public.condominium_ledger_entries le
    where le.id=new.ledger_entry_id
      and le.workspace_id=new.workspace_id
      and le.condominium_id=new.condominium_id
  ) then
    raise exception 'La spesa contabile collegata non appartiene al condominio/workspace dell''acquisizione';
  end if;

  if new.allocation_table_id is not null and not exists (
    select 1
    from public.condominium_millesimal_tables mt
    where mt.id=new.allocation_table_id
      and mt.workspace_id=new.workspace_id
      and mt.condominium_id=new.condominium_id
  ) then
    raise exception 'La tabella millesimale collegata non appartiene al condominio/workspace dell''acquisizione';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_budget_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid; v_fy_ws uuid; v_fy_cond uuid;
begin
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio indicato non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Budget e condominio devono appartenere allo stesso workspace'; end if;
 if new.fiscal_year_id is not null then
   select workspace_id,condominium_id into v_fy_ws,v_fy_cond from public.condominium_fiscal_years where id=new.fiscal_year_id;
   if v_fy_ws is null then raise exception 'L''esercizio contabile indicato non esiste'; end if;
   if v_fy_ws<>new.workspace_id or v_fy_cond<>new.condominium_id then raise exception 'Budget ed esercizio contabile devono appartenere allo stesso workspace e condominio'; end if;
 end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_consumption_reading_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ws uuid;
  v_archived timestamptz;
begin
  select c.workspace_id,c.archived_at
    into v_ws,v_archived
  from public.condominiums c
  where c.id=new.condominium_id;

  if v_ws is null then
    raise exception 'Condominio della lettura non trovato';
  end if;

  if new.workspace_id<>v_ws then
    raise exception 'Workspace della lettura non coerente con il condominio';
  end if;

  if v_archived is not null then
    raise exception 'Non è possibile modificare consumi di un condominio archiviato';
  end if;

  if not exists (
    select 1 from public.condominium_units u
    where u.id=new.unit_id
      and u.workspace_id=new.workspace_id
      and u.condominium_id=new.condominium_id
  ) then
    raise exception 'Unità non coerente con workspace e condominio della lettura';
  end if;

  if new.fiscal_year_id is not null and not exists (
    select 1 from public.condominium_fiscal_years fy
    where fy.id=new.fiscal_year_id
      and fy.workspace_id=new.workspace_id
      and fy.condominium_id=new.condominium_id
  ) then
    raise exception 'Esercizio contabile non coerente con workspace e condominio della lettura';
  end if;

  if trim(coalesce(new.service_type,''))='' then
    raise exception 'Tipo di servizio obbligatorio';
  end if;

  if trim(coalesce(new.meter_code,''))='' then
    raise exception 'Codice contatore obbligatorio';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_creation_intake_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_doc uuid;
  v_doc_workspace uuid;
  v_doc_condominium uuid;
  v_size bigint;
begin
  if jsonb_typeof(new.source_documents) <> 'array' then
    raise exception 'source_documents deve essere un array';
  end if;

  for v_item in select value from jsonb_array_elements(new.source_documents)
  loop
    v_doc := nullif(v_item->>'document_id','')::uuid;
    if v_doc is not null then
      select d.workspace_id,d.condominium_id,d.file_size_bytes
      into v_doc_workspace,v_doc_condominium,v_size
      from public.documents d where d.id=v_doc;

      if v_doc_workspace is null then
        raise exception 'Documento sorgente non trovato';
      end if;
      if v_doc_workspace <> new.workspace_id then
        raise exception 'Documento sorgente appartenente a workspace diverso';
      end if;
      if v_doc_condominium is not null then
        raise exception 'Il documento sorgente è già associato a un condominio';
      end if;
      if coalesce(v_size,0) > 104857600 then
        raise exception 'Documento sorgente oltre il limite massimo di 100 MB';
      end if;
    end if;
  end loop;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_expense_allocation_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ledger record;
  v_unit record;
  v_table record;
  v_member record;
begin
  select workspace_id, condominium_id, direction
    into v_ledger
  from public.condominium_ledger_entries
  where id = new.ledger_entry_id;

  if not found then
    raise exception 'La spesa collegata alla ripartizione non esiste';
  end if;

  if v_ledger.workspace_id <> new.workspace_id or v_ledger.condominium_id <> new.condominium_id then
    raise exception 'Ripartizione e spesa devono appartenere allo stesso condominio e workspace';
  end if;

  if v_ledger.direction <> 'Uscita' then
    raise exception 'Una ripartizione può essere collegata solo a una spesa di uscita';
  end if;

  select workspace_id, condominium_id
    into v_unit
  from public.condominium_units
  where id = new.unit_id;

  if not found or v_unit.workspace_id <> new.workspace_id or v_unit.condominium_id <> new.condominium_id then
    raise exception 'L''unità della ripartizione deve appartenere allo stesso condominio e workspace';
  end if;

  if new.allocation_table_id is not null then
    select workspace_id, condominium_id
      into v_table
    from public.condominium_millesimal_tables
    where id = new.allocation_table_id;

    if not found or v_table.workspace_id <> new.workspace_id or v_table.condominium_id <> new.condominium_id then
      raise exception 'La tabella millesimale della ripartizione deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  if new.member_id is not null then
    select c.workspace_id, m.condominium_id
      into v_member
    from public.condominium_members m
    join public.condominiums c on c.id = m.condominium_id
    where m.id = new.member_id;

    if not found or v_member.workspace_id <> new.workspace_id or v_member.condominium_id <> new.condominium_id then
      raise exception 'Il condomino della ripartizione deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_expense_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_total numeric;
  v_paid numeric;
  v_status text;
  v_has_installments boolean;
begin
  if new.direction <> 'Uscita' then
    return new;
  end if;

  select coalesce(sum(amount),0),
         coalesce(sum(paid_amount),0),
         count(*) > 0
    into v_total,v_paid,v_has_installments
  from public.condominium_installments
  where ledger_entry_id=new.id
    and workspace_id=new.workspace_id
    and condominium_id=new.condominium_id;

  if not v_has_installments then
    return new;
  end if;

  if v_paid >= v_total - 0.005 and v_total > 0 then
    v_status := 'Pagato';
  elsif v_paid > 0 then
    v_status := 'Parzialmente pagato';
  elsif exists (
    select 1 from public.condominium_installments
    where ledger_entry_id=new.id
      and workspace_id=new.workspace_id
      and condominium_id=new.condominium_id
      and due_date < current_date
      and paid_amount < amount
  ) then
    v_status := 'Scaduto';
  else
    v_status := 'Da pagare';
  end if;

  new.payment_status := v_status;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_fiscal_year_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_workspace uuid;
begin
  select c.workspace_id into v_workspace
  from public.condominiums c
  where c.id=new.condominium_id;

  if v_workspace is null then
    raise exception 'Il condominio indicato non esiste';
  end if;

  if new.workspace_id<>v_workspace then
    raise exception 'L''esercizio contabile e il condominio devono appartenere allo stesso workspace';
  end if;

  if new.start_date>new.end_date then
    raise exception 'La data iniziale dell''esercizio non può essere successiva alla data finale';
  end if;

  if nullif(btrim(new.name),'') is null then
    raise exception 'Il nome dell''esercizio contabile è obbligatorio';
  end if;

  if new.status not in ('Aperto','Provvisorio','Chiuso') then
    raise exception 'Stato dell''esercizio contabile non valido';
  end if;

  if exists (
    select 1
    from public.condominium_fiscal_years fy
    where fy.condominium_id=new.condominium_id
      and fy.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid)
      and new.start_date<=fy.end_date
      and fy.start_date<=new.end_date
  ) then
    raise exception 'Le date dell''esercizio contabile si sovrappongono a un altro esercizio dello stesso condominio';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_fund_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid;
begin
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio indicato non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Fondo e condominio devono appartenere allo stesso workspace'; end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_installment_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_payment_total numeric;
begin
  select coalesce(sum(amount),0)
    into v_payment_total
  from public.condominium_payment_movements
  where installment_id = new.id
    and workspace_id = new.workspace_id
    and condominium_id = new.condominium_id;

  v_payment_total := round(v_payment_total::numeric,2);

  if abs(coalesce(new.paid_amount,0) - v_payment_total) > 0.005 then
    raise exception 'Il pagato della rata deve corrispondere ai movimenti di pagamento registrati';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'Importo della rata non valido';
  end if;

  if v_payment_total >= new.amount - 0.005 then
    new.paid_amount := round(new.amount::numeric,2);
    new.status := 'Pagato';
  elsif v_payment_total > 0 then
    new.paid_amount := v_payment_total;
    new.status := 'Parzialmente pagato';
  elsif new.due_date is not null and new.due_date < current_date then
    new.paid_amount := 0;
    new.status := 'Scaduto';
  else
    new.paid_amount := 0;
    new.status := 'Da pagare';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_installment_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ledger record;
  v_unit record;
  v_year record;
  v_member record;
begin
  if new.ledger_entry_id is not null then
    select workspace_id, condominium_id, direction
      into v_ledger
    from public.condominium_ledger_entries
    where id = new.ledger_entry_id;

    if not found or v_ledger.workspace_id <> new.workspace_id or v_ledger.condominium_id <> new.condominium_id then
      raise exception 'La rata e il movimento contabile devono appartenere allo stesso condominio e workspace';
    end if;

    if v_ledger.direction <> 'Uscita' then
      raise exception 'Una rata contabile può essere collegata solo a una spesa di uscita';
    end if;
  end if;

  if new.unit_id is not null then
    select workspace_id, condominium_id
      into v_unit
    from public.condominium_units
    where id = new.unit_id;

    if not found or v_unit.workspace_id <> new.workspace_id or v_unit.condominium_id <> new.condominium_id then
      raise exception 'L''unità della rata deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  if new.fiscal_year_id is not null then
    select workspace_id, condominium_id
      into v_year
    from public.condominium_fiscal_years
    where id = new.fiscal_year_id;

    if not found or v_year.workspace_id <> new.workspace_id or v_year.condominium_id <> new.condominium_id then
      raise exception 'L''esercizio della rata deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  if new.member_id is not null then
    select c.workspace_id, m.condominium_id
      into v_member
    from public.condominium_members m
    join public.condominiums c on c.id = m.condominium_id
    where m.id = new.member_id;

    if not found or v_member.workspace_id <> new.workspace_id or v_member.condominium_id <> new.condominium_id then
      raise exception 'Il condomino della rata deve appartenere allo stesso condominio e workspace';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_installment_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ledger_amount numeric;
  v_total numeric;
begin
  if new.ledger_entry_id is null then
    return new;
  end if;

  select le.amount
    into v_ledger_amount
  from public.condominium_ledger_entries le
  where le.id=new.ledger_entry_id
    and le.workspace_id=new.workspace_id
    and le.condominium_id=new.condominium_id
    and le.direction='Uscita'
  for update;

  if not found or v_ledger_amount is null or v_ledger_amount<=0 then
    raise exception 'Movimento contabile della rata non valido';
  end if;

  select coalesce(sum(i.amount),0)
    into v_total
  from public.condominium_installments i
  where i.ledger_entry_id=new.ledger_entry_id
    and i.workspace_id=new.workspace_id
    and i.condominium_id=new.condominium_id
    and i.id is distinct from new.id;

  if round(v_total + new.amount,2) > round(v_ledger_amount,2) + 0.005 then
    raise exception 'Il totale delle rate supera l''importo della spesa';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_ledger_fund_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid; v_cond uuid;
begin
 if new.fund_id is null then return new; end if;
 if new.direction<>'Uscita' then raise exception 'Un fondo può essere collegato solo a un movimento di uscita'; end if;
 select workspace_id,condominium_id into v_ws,v_cond from public.condominium_funds where id=new.fund_id;
 if v_ws is null then raise exception 'Fondo non trovato'; end if;
 if v_ws<>new.workspace_id or v_cond<>new.condominium_id then raise exception 'Fondo e movimento contabile devono appartenere allo stesso workspace e condominio'; end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_ledger_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ws uuid;
  v_cond uuid;
  v_ref_ws uuid;
  v_ref_cond uuid;
begin
  if new.fiscal_year_id is not null then
    select workspace_id, condominium_id into v_ws, v_cond
    from public.condominium_fiscal_years where id=new.fiscal_year_id;
    if not found then
      raise exception 'L''esercizio contabile indicato non esiste';
    end if;
    if v_ws <> new.workspace_id or v_cond <> new.condominium_id then
      raise exception 'Il movimento e l''esercizio contabile devono appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.unit_id is not null then
    select workspace_id, condominium_id into v_ref_ws, v_ref_cond
    from public.condominium_units where id=new.unit_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond <> new.condominium_id then
      raise exception 'L''unità collegata al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.member_id is not null then
    select c.workspace_id, m.condominium_id into v_ref_ws, v_ref_cond
    from public.condominium_members m
    join public.condominiums c on c.id=m.condominium_id
    where m.id=new.member_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond <> new.condominium_id then
      raise exception 'Il condòmino collegato al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.supplier_id is not null then
    select workspace_id, condominium_id into v_ref_ws, v_ref_cond
    from public.suppliers where id=new.supplier_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond is distinct from new.condominium_id then
      raise exception 'Il fornitore collegato al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  if new.document_id is not null then
    select workspace_id, condominium_id into v_ref_ws, v_ref_cond
    from public.documents where id=new.document_id;
    if not found or v_ref_ws <> new.workspace_id or v_ref_cond is distinct from new.condominium_id then
      raise exception 'Il documento collegato al movimento deve appartenere allo stesso workspace e condominio';
    end if;
  end if;

  return new;
end
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_legal_case_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare w uuid; begin select workspace_id into w from public.condominiums where id=new.condominium_id; if w is null then raise exception 'Il condominio indicato non esiste'; end if; if new.workspace_id<>w then raise exception 'Contenzioso e condominio devono appartenere allo stesso workspace'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_member_unit_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_cond_workspace uuid; v_unit_cond uuid; v_unit_workspace uuid;
begin
  select workspace_id into v_cond_workspace from public.condominiums where id=new.condominium_id;
  if v_cond_workspace is null then raise exception 'Il condominio indicato non esiste'; end if;
  if new.unit_id is not null then
    select condominium_id,workspace_id into v_unit_cond,v_unit_workspace from public.condominium_units where id=new.unit_id;
    if v_unit_cond is null then raise exception 'L''unità immobiliare indicata non esiste'; end if;
    if v_unit_cond<>new.condominium_id or v_unit_workspace<>v_cond_workspace then
      raise exception 'Condomino e unità immobiliare devono appartenere allo stesso condominio e workspace';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_millesimal_table_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_workspace_id uuid;
begin
  select workspace_id
    into v_workspace_id
  from public.condominiums
  where id=new.condominium_id;

  if not found then
    raise exception 'Condominio non trovato';
  end if;

  if new.workspace_id <> v_workspace_id then
    raise exception 'La tabella millesimale deve appartenere allo stesso workspace del condominio';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_millesimal_value_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_table_condo uuid;
  v_table_workspace uuid;
  v_unit_condo uuid;
  v_unit_workspace uuid;
begin
  select condominium_id, workspace_id
    into v_table_condo, v_table_workspace
  from public.condominium_millesimal_tables
  where id=new.table_id;

  if not found then
    raise exception 'Tabella millesimale non trovata';
  end if;

  select condominium_id, workspace_id
    into v_unit_condo, v_unit_workspace
  from public.condominium_units
  where id=new.unit_id;

  if not found then
    raise exception 'Unità immobiliare non trovata';
  end if;

  if new.condominium_id <> v_table_condo
     or new.condominium_id <> v_unit_condo
     or new.workspace_id <> v_table_workspace
     or new.workspace_id <> v_unit_workspace then
    raise exception 'Tabella millesimale e unità devono appartenere allo stesso condominio e workspace';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_payment_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid; v_cond uuid;
begin
  select workspace_id, condominium_id into v_ws, v_cond
  from public.condominium_installments where id=new.installment_id;
  if not found then raise exception 'La rata associata al pagamento non esiste'; end if;
  if v_ws <> new.workspace_id or v_cond <> new.condominium_id then
    raise exception 'Il pagamento e la rata devono appartenere allo stesso workspace e condominio';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_request_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
 v_ws uuid;
 v_member_cond uuid;
 v_member_user uuid;
 v_member_active boolean;
begin
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio della richiesta non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Richiesta e condominio devono appartenere allo stesso workspace'; end if;

 if new.member_id is not null then
   select condominium_id,user_id,active
   into v_member_cond,v_member_user,v_member_active
   from public.condominium_members
   where id=new.member_id;

   if v_member_cond is null then raise exception 'Il condòmino della richiesta non esiste'; end if;
   if v_member_cond<>new.condominium_id then raise exception 'Il condòmino e la richiesta devono appartenere allo stesso condominio'; end if;
   if not coalesce(v_member_active,false) then raise exception 'Il condòmino indicato non è attivo'; end if;

   if new.requester_user_id is not null and v_member_user is not null and new.requester_user_id<>v_member_user then
     raise exception 'L''utente richiedente non corrisponde al condòmino indicato';
   end if;
 end if;

 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_request_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_op <> 'UPDATE' or new.status = old.status then
    return new;
  end if;

  if old.status in ('Chiusa','Annullata') then
    raise exception 'Una richiesta chiusa o annullata non può essere riaperta';
  end if;

  if not (
    (old.status='Nuova' and new.status in ('In lavorazione','Annullata'))
    or
    (old.status='In lavorazione' and new.status in ('In attesa','Risolta','Annullata'))
    or
    (old.status='In attesa' and new.status in ('In lavorazione','Risolta','Annullata'))
    or
    (old.status='Risolta' and new.status in ('In lavorazione','Chiusa'))
  ) then
    raise exception 'Transizione stato richiesta non consentita: % -> %', old.status, new.status;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_tax_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare w uuid; begin select workspace_id into w from public.condominiums where id=new.condominium_id; if w is null then raise exception 'Il condominio indicato non esiste'; end if; if new.workspace_id<>w then raise exception 'Obbligo fiscale e condominio devono appartenere allo stesso workspace'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_unit_relationship()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_parent_id uuid; v_parent_condominium uuid; v_current uuid; v_depth integer:=0;
begin
  if nullif(trim(coalesce(new.data->>'incorporatedInUnitId','')), '') is null then return new; end if;
  begin v_parent_id := (new.data->>'incorporatedInUnitId')::uuid;
  exception when invalid_text_representation then raise exception 'L''unità di riferimento della pertinenza non è valida.'; end;
  if v_parent_id=new.id then raise exception 'Un''unità non può essere la propria pertinenza.'; end if;
  select condominium_id into v_parent_condominium from public.condominium_units where id=v_parent_id;
  if v_parent_condominium is null then raise exception 'L''unità principale indicata per la pertinenza non esiste.'; end if;
  if v_parent_condominium<>new.condominium_id then raise exception 'La pertinenza deve appartenere allo stesso condominio dell''unità principale.'; end if;
  v_current:=v_parent_id;
  while v_current is not null and v_depth<100 loop
    v_depth:=v_depth+1;
    if v_current=new.id then raise exception 'Collegamento circolare tra unità immobiliari non consentito.'; end if;
    select nullif(trim(coalesce(data->>'incorporatedInUnitId','')), '')::uuid into v_current from public.condominium_units where id=v_current;
  end loop;
  if v_depth>=100 then raise exception 'Catena di pertinenze non valida.'; end if;
  return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_unit_workspace_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_workspace uuid;
begin
  select c.workspace_id
    into v_workspace
  from public.condominiums c
  where c.id = new.condominium_id;

  if v_workspace is null then
    raise exception 'Il condominio indicato non esiste';
  end if;

  if new.workspace_id <> v_workspace then
    raise exception 'Unità e condominio devono appartenere allo stesso workspace';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_child_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace uuid; v_condominium uuid; v_archived timestamptz;
  v_doc_ws uuid; v_doc_cond uuid;
begin
  select w.workspace_id,w.condominium_id,c.archived_at
    into v_workspace,v_condominium,v_archived
  from public.condominium_works w
  join public.condominiums c on c.id=w.condominium_id
  where w.id=new.work_id;
  if v_workspace is null then raise exception 'Lavoro non trovato'; end if;
  if new.workspace_id<>v_workspace or new.condominium_id<>v_condominium then
    raise exception 'Workspace/condominio non coerenti con il lavoro';
  end if;
  if v_archived is not null then raise exception 'Non è possibile modificare dati di un lavoro archiviato'; end if;
  if new.document_id is not null then
    select d.workspace_id,d.condominium_id into v_doc_ws,v_doc_cond
    from public.documents d
    where d.legacy_id=new.document_id;
    if not found or v_doc_ws<>new.workspace_id or v_doc_cond is distinct from new.condominium_id then
      raise exception 'Il documento collegato al lavoro deve appartenere allo stesso workspace e condominio';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_financial_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare w uuid;c uuid;begin select workspace_id,condominium_id into w,c from public.condominium_works where id=new.work_id; if new.ledger_entry_id is not null and not exists(select 1 from public.condominium_ledger_entries where id=new.ledger_entry_id and workspace_id=w and condominium_id=c) then raise exception 'Movimento contabile non coerente con il lavoro'; end if; if new.payment_entry_id is not null and not exists(select 1 from public.condominium_ledger_entries where id=new.payment_entry_id and workspace_id=w and condominium_id=c) then raise exception 'Movimento di pagamento non coerente con il lavoro'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_progress_accounting_links()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare w record;l record;p record;begin select workspace_id,condominium_id,supplier_id into w from public.condominium_works where id=new.work_id; if not found then raise exception 'Lavoro collegato al SAL non trovato'; end if; if new.ledger_entry_id is not null then select workspace_id,condominium_id,direction,supplier_id into l from public.condominium_ledger_entries where id=new.ledger_entry_id; if not found or l.workspace_id<>w.workspace_id or l.condominium_id<>w.condominium_id then raise exception 'Movimento contabile non coerente con il lavoro'; end if; if l.direction<>'Uscita' then raise exception 'Il movimento contabile della spesa deve essere un''Uscita'; end if; if w.supplier_id is not null and l.supplier_id is not null and w.supplier_id<>l.supplier_id then raise exception 'Il fornitore del movimento contabile non coincide con quello del lavoro'; end if; end if; if new.payment_entry_id is not null then if new.ledger_entry_id is not null and new.payment_entry_id=new.ledger_entry_id then raise exception 'Il movimento di pagamento deve essere distinto dal movimento della spesa'; end if; select workspace_id,condominium_id,direction,supplier_id,amount into p from public.condominium_ledger_entries where id=new.payment_entry_id; if not found or p.workspace_id<>w.workspace_id or p.condominium_id<>w.condominium_id then raise exception 'Movimento di pagamento non coerente con il lavoro'; end if; if p.direction<>'Uscita' then raise exception 'Il movimento di pagamento deve essere un''Uscita'; end if; if w.supplier_id is not null and p.supplier_id is not null and w.supplier_id<>p.supplier_id then raise exception 'Il fornitore del pagamento non coincide con quello del lavoro'; end if; if coalesce(new.paid_amount,0)>coalesce(p.amount,0)+0.005 then raise exception 'Il pagato del SAL supera l''importo del movimento di pagamento collegato'; end if; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_reference_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin if new.fund_id is not null and not exists(select 1 from public.condominium_funds f where f.id=new.fund_id and f.workspace_id=new.workspace_id and f.condominium_id=new.condominium_id) then raise exception 'Fondo non coerente con il lavoro'; end if; if new.supplier_id is not null and not exists(select 1 from public.condominium_suppliers s where s.id=new.supplier_id and s.workspace_id=new.workspace_id and s.condominium_id=new.condominium_id) then raise exception 'Fornitore non coerente con il lavoro'; end if; if new.register_item_id is not null and not exists(select 1 from public.condominium_register_items r where r.id=new.register_item_id and r.workspace_id=new.workspace_id and r.condominium_id=new.condominium_id) then raise exception 'Voce registro non coerente con il lavoro'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_condominium_work_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare w uuid; a timestamptz; begin select workspace_id,archived_at into w,a from public.condominiums where id=new.condominium_id; if w is null then raise exception 'Condominio non trovato'; end if; if new.workspace_id<>w then raise exception 'Workspace del lavoro non coerente con il condominio'; end if; if a is not null then raise exception 'Non è possibile modificare lavori di un condominio archiviato'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_confirmed_unit_transformation_genealogy()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare s int; d int; v int; u int; a int; b int; begin if new.status<>'Confermata' then return new; end if; select count(*) filter(where i.direction='Fonte')::int,count(*) filter(where i.direction='Destinazione')::int,count(*) filter(where x.id is not null and x.workspace_id=new.workspace_id and x.condominium_id=new.condominium_id)::int,count(distinct i.unit_id)::int,count(*) filter(where i.direction='Fonte' and x.lifecycle_status='Attiva' and x.workspace_id=new.workspace_id and x.condominium_id=new.condominium_id)::int,count(*) filter(where i.direction='Destinazione' and x.lifecycle_status='Attiva' and x.workspace_id=new.workspace_id and x.condominium_id=new.condominium_id)::int into s,d,v,u,a,b from public.condominium_unit_transformation_items i left join public.condominium_units x on x.id=i.unit_id where i.transformation_id=new.id; if s<>new.source_unit_count or d<>new.destination_unit_count or v<>s+d or u<>s+d then raise exception 'UNIT_TRANSFORMATION_GENEALOGY_MISMATCH'; end if; if a<>s or b<>d then raise exception 'UNIT_TRANSFORMATION_UNITS_NOT_ACTIVE'; end if; if new.transformation_type='Fusione' and (s<2 or d<>1) then raise exception 'UNIT_TRANSFORMATION_FUSION_GENEALOGY_INVALID'; end if; if new.transformation_type='Frazionamento' and (s<>1 or d<2) then raise exception 'UNIT_TRANSFORMATION_SPLIT_GENEALOGY_INVALID'; end if; return new; end $function$
;

CREATE OR REPLACE FUNCTION public.validate_document_ai_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  old_ai text := nullif(btrim(coalesce(old.data->>'aiStatus','Non elaborato')),'');
  new_ai text := nullif(btrim(coalesce(new.data->>'aiStatus','Non elaborato')),'');
begin
  if old_ai is null then old_ai := 'Non elaborato'; end if;
  if new_ai is null then new_ai := 'Non elaborato'; end if;

  if old_ai <> new_ai and not (
    (old_ai='Non elaborato' and new_ai='In elaborazione') or
    (old_ai='Errore' and new_ai='In elaborazione') or
    (old_ai='In elaborazione' and new_ai in ('Elaborato','Errore')) or
    (old_ai='Elaborato' and new_ai in ('Confermato','In elaborazione','Errore')) or
    (old_ai='Confermato' and new_ai='In elaborazione')
  ) then
    raise exception 'Transizione AI documento non consentita: % -> %', old_ai, new_ai;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_document_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_publication text;
  v_ai_status text;
begin
  if new.status is not null and new.status not in ('Privato','Condiviso') then
    raise exception 'Stato documento non valido: %', new.status;
  end if;

  v_publication := nullif(btrim(new.data->>'publication'),'');
  if v_publication is not null and new.status is not null and v_publication <> new.status then
    raise exception 'Publication e status del documento devono coincidere';
  end if;

  v_ai_status := nullif(btrim(new.data->>'aiStatus'),'');
  if v_ai_status is not null and v_ai_status not in ('Non elaborato','In elaborazione','Elaborato','Confermato','Errore') then
    raise exception 'Stato AI del documento non valido: %', v_ai_status;
  end if;

  if coalesce(new.file_size_bytes,0) > 104857600
     and coalesce(v_ai_status,'Non elaborato') <> 'Errore' then
    raise exception 'Il documento supera il limite massimo di 100 MB e non può essere elaborato';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_document_upload_size(p_size_bytes bigint, p_warning_bytes bigint DEFAULT 52428800, p_max_bytes bigint DEFAULT 104857600)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if p_size_bytes is null or p_size_bytes < 0 then
    raise exception 'Dimensione file non valida';
  end if;
  if p_warning_bytes is null or p_warning_bytes <= 0 then
    raise exception 'Soglia di avviso non valida';
  end if;
  if p_max_bytes is null or p_max_bytes <= p_warning_bytes then
    raise exception 'Soglia massima non valida';
  end if;

  if p_size_bytes > p_max_bytes then
    return jsonb_build_object(
      'status','rejected',
      'size_bytes',p_size_bytes,
      'warning_bytes',p_warning_bytes,
      'max_bytes',p_max_bytes,
      'warning',true,
      'message','Il file supera la dimensione massima consentita.'
    );
  elsif p_size_bytes > p_warning_bytes then
    return jsonb_build_object(
      'status','warning',
      'size_bytes',p_size_bytes,
      'warning_bytes',p_warning_bytes,
      'max_bytes',p_max_bytes,
      'warning',true,
      'message','Il file è molto grande e potrebbe richiedere più tempo e risorse per archiviazione o elaborazione AI.'
    );
  end if;

  return jsonb_build_object(
    'status','ok',
    'size_bytes',p_size_bytes,
    'warning_bytes',p_warning_bytes,
    'max_bytes',p_max_bytes,
    'warning',false,
    'message','Dimensione file compatibile.'
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_fiscal_carryover_compensation_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_c public.condominium_fiscal_carryovers%rowtype;
 v_i public.condominium_installments%rowtype;
begin
 select * into v_c from public.condominium_fiscal_carryovers where id=new.carryover_id for share;
 if not found then raise exception 'Riporto da compensare non trovato'; end if;
 if v_c.workspace_id<>new.workspace_id then raise exception 'La compensazione non appartiene al workspace del riporto'; end if;
 if v_c.condominium_id<>new.condominium_id then raise exception 'La compensazione non appartiene al condominio del riporto'; end if;

 if new.target_installment_id is not null then
   select * into v_i from public.condominium_installments where id=new.target_installment_id for share;
   if not found then raise exception 'Rata destinataria della compensazione non trovata'; end if;
   if v_i.workspace_id<>v_c.workspace_id or v_i.condominium_id<>v_c.condominium_id or v_i.fiscal_year_id<>v_c.target_fiscal_year_id then
     raise exception 'La rata destinataria non è coerente con il riporto';
   end if;
   if v_c.kind<>'Credito' then raise exception 'Solo un credito può essere compensato su una rata dell''esercizio successivo'; end if;
   if v_c.unit_id is null then
     if v_i.unit_id is not null or v_i.member_id is distinct from v_c.member_id then
       raise exception 'La rata destinataria non è coerente con il proprietario del riporto';
     end if;
   else
     if v_i.unit_id is distinct from v_c.unit_id then
       raise exception 'La rata destinataria non è coerente con l''unità del riporto';
     end if;
     if v_i.member_id is distinct from v_c.member_id then
       raise exception 'La rata destinataria deve appartenere allo stesso proprietario della partita riportata';
     end if;
   end if;
 end if;

 if v_c.status='Compensato' then raise exception 'Il riporto è già completamente compensato'; end if;
 if new.amount<=0 then raise exception 'L''importo della compensazione deve essere positivo'; end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_fiscal_carryover_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_source public.condominium_fiscal_years%rowtype; v_target public.condominium_fiscal_years%rowtype; v_unit public.condominium_units%rowtype; v_member public.condominium_members%rowtype;
begin
 select * into v_source from public.condominium_fiscal_years where id=new.source_fiscal_year_id for share;
 if not found then raise exception 'Esercizio di origine del riporto non trovato'; end if;
 select * into v_target from public.condominium_fiscal_years where id=new.target_fiscal_year_id for share;
 if not found then raise exception 'Esercizio di destinazione del riporto non trovato'; end if;
 if v_source.workspace_id<>new.workspace_id or v_target.workspace_id<>new.workspace_id or v_source.condominium_id<>new.condominium_id or v_target.condominium_id<>new.condominium_id then
   raise exception 'Il riporto deve appartenere allo stesso workspace e condominio dei due esercizi';
 end if;
 if v_source.status<>'Chiuso' then raise exception 'Il riporto può provenire solo da un esercizio chiuso'; end if;
 if v_target.id=v_source.id or v_target.start_date<=v_source.end_date then raise exception 'L''esercizio di destinazione del riporto non è successivo all''origine'; end if;

 if new.unit_id is not null then
   select * into v_unit from public.condominium_units where id=new.unit_id for share;
   if not found then raise exception 'Unità del riporto non trovata'; end if;
   if v_unit.workspace_id<>new.workspace_id or v_unit.condominium_id<>new.condominium_id then
     raise exception 'L''unità del riporto non appartiene al condominio indicato';
   end if;
 elsif new.member_id is null then
   raise exception 'Un riporto senza unità deve identificare il proprietario';
 end if;

 if new.member_id is not null then
   select * into v_member from public.condominium_members where id=new.member_id for share;
   if not found then raise exception 'Proprietario del riporto non trovato'; end if;
   if v_member.condominium_id<>new.condominium_id then raise exception 'Il proprietario del riporto non appartiene al condominio indicato'; end if;
   if new.unit_id is not null and v_member.unit_id is not null and v_member.unit_id<>new.unit_id then
     raise exception 'Il proprietario del riporto non è associato all''unità indicata';
   end if;
 end if;
 return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_ledger_entry_deliberation_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_workspace uuid;
  v_condominium uuid;
begin
  if new.assembly_id is null then
    return new;
  end if;

  select a.workspace_id, a.condominium_id
    into v_workspace, v_condominium
  from public.assemblies a
  where a.id=new.assembly_id;

  if v_workspace is null or v_condominium is null then
    raise exception 'LEDGER_ASSEMBLY_SCOPE: l''assemblea collegata deve appartenere a un condominio valido';
  end if;

  if v_workspace <> new.workspace_id or v_condominium <> new.condominium_id then
    raise exception 'LEDGER_ASSEMBLY_SCOPE: l''assemblea collegata non appartiene allo stesso workspace/condominio della spesa';
  end if;

  if new.deliberation_date is null then
    new.deliberation_date := (select a.assembly_date::date from public.assemblies a where a.id=new.assembly_id);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_portal_access_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_workspace uuid; v_member_condominium uuid;
begin
  select workspace_id into v_workspace from public.condominiums where id=new.condominium_id;
  if v_workspace is null then raise exception 'Condominio portale non trovato'; end if;
  if v_workspace<>new.workspace_id then raise exception 'Workspace e condominio del portale non coincidono'; end if;
  if new.member_id is not null then
    select condominium_id into v_member_condominium from public.condominium_members where id=new.member_id;
    if v_member_condominium is null then raise exception 'Membro portale non trovato'; end if;
    if v_member_condominium<>new.condominium_id then raise exception 'Il membro portale appartiene a un altro condominio'; end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_portal_registration_request_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_member_workspace uuid;
begin
  if new.matched_member_id is not null then
    select c.workspace_id into v_member_workspace
    from public.condominium_members m join public.condominiums c on c.id=m.condominium_id
    where m.id=new.matched_member_id;
    if v_member_workspace is null then raise exception 'Membro associato alla richiesta portale non trovato'; end if;
    if new.workspace_id is null then new.workspace_id:=v_member_workspace;
    elsif new.workspace_id<>v_member_workspace then raise exception 'Workspace della richiesta portale non coerente con il membro'; end if;
  end if;
  if new.status='approved' and (new.workspace_id is null or new.matched_member_id is null or new.requested_user_id is null) then
    raise exception 'Una richiesta portale approvata deve avere workspace, membro e utente associati';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_unit_owner_member_refs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_owner text;
  v_member_count integer;
begin
  if jsonb_typeof(coalesce(new.data->'ownerMemberIds','[]'::jsonb)) <> 'array' then
    raise exception 'OWNER_REFS_INVALID: ownerMemberIds deve essere un array';
  end if;

  for v_owner in
    select value
    from jsonb_array_elements_text(coalesce(new.data->'ownerMemberIds','[]'::jsonb))
  loop
    select count(*)
    into v_member_count
    from public.condominium_members m
    where m.condominium_id=new.condominium_id
      and m.unit_id=new.id
      and m.legacy_id::text=v_owner
      and coalesce(m.data->>'role','')='Proprietario';

    if v_member_count<>1 then
      raise exception
        'OWNER_REF_INVALID: il proprietario % non appartiene all''unità, al condominio o non è qualificato come Proprietario',
        v_owner;
    end if;
  end loop;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_workspace_condominium_scope()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_ws uuid;
begin
 if new.condominium_id is null then return new; end if;
 select workspace_id into v_ws from public.condominiums where id=new.condominium_id;
 if v_ws is null then raise exception 'Il condominio indicato non esiste'; end if;
 if new.workspace_id<>v_ws then raise exception 'Record e condominio devono appartenere allo stesso workspace'; end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.verify_personal_security_code(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin return private.verify_personal_security_code($1); end $function$
;

-- END QA LEDGER ENTRY 20261017000003

-- QA LEDGER ENTRY 20261017000004 bethag_baseline_security
-- PostgreSQL md5=03df30d9541152147489c04a600c2d53; UTF-8 chars=60603
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- BETHAG baseline: RLS policies and triggers.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

CREATE POLICY "authorized managers manage activities" ON "public"."activities" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "authorized users read activities" ON "public"."activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "authorized managers manage assemblies" ON "public"."assemblies" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'assemblee'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'assemblee'::text));

CREATE POLICY "authorized users read assemblies" ON "public"."assemblies" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'assemblee'::text) OR (((data ->> 'publishedToPortal'::text) = 'true'::text) AND (private.can_access_resident_condominium_module(condominium_id, 'assemblee'::text) OR private.can_access_resident_condominium_module(condominium_id, 'verbali'::text)))));

CREATE POLICY "authorized managers manage communication recipients" ON "public"."communication_recipients" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text));

CREATE POLICY "recipients read own communication delivery" ON "public"."communication_recipients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "authorized managers manage communications" ON "public"."communications" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'comunicazioni'::text));

CREATE POLICY "authorized users read communications" ON "public"."communications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'comunicazioni'::text) OR ((published = true) AND private.can_access_resident_condominium_module(condominium_id, 'comunicazioni'::text))));

CREATE POLICY "authorized users read accounting settings" ON "public"."condominium_accounting_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "managers manage accounting settings" ON "public"."condominium_accounting_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read allocation intakes" ON "public"."condominium_allocation_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "managers manage allocation intakes" ON "public"."condominium_allocation_intakes" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read allocation rules" ON "public"."condominium_allocation_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT private.can_access_workspace_module(condominium_allocation_rules.workspace_id, 'contabilita'::text) AS can_access_workspace_module));

CREATE POLICY "managers manage allocation rules" ON "public"."condominium_allocation_rules" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "condominium_audit_log_read_manager" ON "public"."condominium_audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_workspace_admin(workspace_id));

CREATE POLICY "condominium_budgets_manager_all" ON "public"."condominium_budgets" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read consumption readings" ON "public"."condominium_consumption_readings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (( SELECT private.can_access_workspace_module(condominium_consumption_readings.workspace_id, 'contabilita'::text) AS can_access_workspace_module));

CREATE POLICY "managers manage consumption readings" ON "public"."condominium_consumption_readings" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read condominium creation intakes" ON "public"."condominium_creation_intakes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "managers manage condominium creation intakes" ON "public"."condominium_creation_intakes" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "Managers can delete condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_expense_allocations" ON "public"."condominium_expense_allocations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "carryover compensations managers select" ON "public"."condominium_fiscal_carryover_compensations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized users read fiscal carryovers" ON "public"."condominium_fiscal_carryovers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "managers manage fiscal carryovers" ON "public"."condominium_fiscal_carryovers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_fiscal_years" ON "public"."condominium_fiscal_years" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_funds" ON "public"."condominium_funds" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_installments" ON "public"."condominium_installments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "authorized managers manage insurance policies" ON "public"."condominium_insurance_policies" AS PERMISSIVE FOR ALL TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_insurance_policies.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_insurance_policies.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "authorized users read insurance policies" ON "public"."condominium_insurance_policies" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'condomini'::text) OR private.can_access_resident_condominium_module(condominium_id, 'documenti'::text)));

CREATE POLICY "Managers can delete condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_ledger_entries" ON "public"."condominium_ledger_entries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_legal_cases" ON "public"."condominium_legal_cases" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "condominium_member_transfers_manager_all" ON "public"."condominium_member_transfers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "authorized managers manage condominium members" ON "public"."condominium_members" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND private.can_manage_workspace_module(c.workspace_id, 'condomini'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND private.can_manage_workspace_module(c.workspace_id, 'condomini'::text)))));

CREATE POLICY "authorized users read condominium members" ON "public"."condominium_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.can_access_workspace_module(( SELECT c.workspace_id
           FROM condominiums c
          WHERE (c.id = condominium_members.condominium_id)), 'condomini'::text) AS can_access_workspace_module) OR ((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND (c.archived_at IS NULL))))) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))) AND (active = true) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_members.condominium_id) AND (c.archived_at IS NULL)))))));

CREATE POLICY "Managers can delete condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_millesimal_tables" ON "public"."condominium_millesimal_tables" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_millesimal_values" ON "public"."condominium_millesimal_values" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can delete condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_payment_movements" ON "public"."condominium_payment_movements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read payment reversal audit" ON "public"."condominium_payment_reversal_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "condominium_register_items_manager_all" ON "public"."condominium_register_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.is_workspace_admin(workspace_id)) WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "authorized managers manage requests" ON "public"."condominium_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "authorized users read requests" ON "public"."condominium_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.can_access_workspace_module(condominium_requests.workspace_id, 'condomini'::text) AS can_access_workspace_module) OR (requester_user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY "residents create own requests" ON "public"."condominium_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((private.can_manage_workspace_module(workspace_id, 'condomini'::text) OR ((requester_user_id = ( SELECT auth.uid() AS uid)) AND private.can_access_condominium(condominium_id) AND ((member_id IS NULL) OR (EXISTS ( SELECT 1
   FROM condominium_members cm
  WHERE ((cm.id = condominium_requests.member_id) AND (cm.condominium_id = condominium_requests.condominium_id) AND (cm.active = true) AND ((cm.user_id = ( SELECT auth.uid() AS uid)) OR (lower(cm.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))))))))));

CREATE POLICY "condominium_suppliers_manager_all" ON "public"."condominium_suppliers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'fornitori'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'fornitori'::text));

CREATE POLICY "Managers can delete condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can insert condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can read condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "Managers can update condominium_tax_obligations" ON "public"."condominium_tax_obligations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'contabilita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'contabilita'::text));

CREATE POLICY "unit transformation items manager access" ON "public"."condominium_unit_transformation_items" AS PERMISSIVE FOR ALL TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM condominium_unit_transformations t
  WHERE ((t.id = condominium_unit_transformation_items.transformation_id) AND ( SELECT private.can_manage_workspace_module(t.workspace_id, 'condomini'::text) AS can_manage_workspace_module))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM condominium_unit_transformations t
  WHERE ((t.id = condominium_unit_transformation_items.transformation_id) AND ( SELECT private.can_manage_workspace_module(t.workspace_id, 'condomini'::text) AS can_manage_workspace_module)))));

CREATE POLICY "unit transformations manager access" ON "public"."condominium_unit_transformations" AS PERMISSIVE FOR ALL TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_unit_transformations.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_unit_transformations.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "Authorized condominium managers can delete units" ON "public"."condominium_units" AS PERMISSIVE FOR DELETE TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "Authorized condominium managers can insert units" ON "public"."condominium_units" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "Authorized condominium managers can read units" ON "public"."condominium_units" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT private.can_access_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_access_workspace_module) OR ((EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = condominium_units.condominium_id) AND (c.archived_at IS NULL)))) AND (EXISTS ( SELECT 1
   FROM (portal_access pa
     JOIN condominium_members cm ON (((cm.condominium_id = pa.condominium_id) AND (cm.unit_id = condominium_units.id) AND (cm.active = true) AND (((pa.user_id IS NOT NULL) AND (cm.user_id = ( SELECT auth.uid() AS uid))) OR (lower(cm.email) = lower(pa.email))))))
  WHERE ((pa.condominium_id = condominium_units.condominium_id) AND (pa.active = true) AND (pa.role = ANY (ARRAY['resident'::text, 'council'::text])) AND ((pa.user_id = ( SELECT auth.uid() AS uid)) OR (lower(pa.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))))))));

CREATE POLICY "Authorized condominium managers can update units" ON "public"."condominium_units" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module)) WITH CHECK (( SELECT private.can_manage_workspace_module(condominium_units.workspace_id, 'condomini'::text) AS can_manage_workspace_module));

CREATE POLICY "condominium_work_documents_manager_all" ON "public"."condominium_work_documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "condominium_work_events_manager_all" ON "public"."condominium_work_events" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "condominium_work_progress_manager_all" ON "public"."condominium_work_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "condominium_works_manager_all" ON "public"."condominium_works" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'attivita'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'attivita'::text));

CREATE POLICY "authorized managers manage condominiums" ON "public"."condominiums" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'condomini'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'condomini'::text));

CREATE POLICY "workspace members can read active condominiums" ON "public"."condominiums" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((archived_at IS NULL) AND (private.can_access_workspace_module(workspace_id, 'condomini'::text) OR private.can_access_resident_condominium(id))));

CREATE POLICY "authorized managers manage deadlines" ON "public"."deadlines" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'scadenze'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'scadenze'::text));

CREATE POLICY "authorized users read deadlines" ON "public"."deadlines" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'scadenze'::text));

CREATE POLICY "authorized managers manage documents" ON "public"."documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'documenti'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'documenti'::text));

CREATE POLICY "authorized users read documents" ON "public"."documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((private.can_access_workspace_module(workspace_id, 'documenti'::text) OR (private.can_access_resident_condominium_module(condominium_id, 'documenti'::text) AND (COALESCE((data ->> 'publication'::text), ''::text) = 'Condiviso'::text))));

CREATE POLICY "authorized managers manage portal access" ON "public"."portal_access" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'portale'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'portale'::text));

CREATE POLICY "residents read own portal access" ON "public"."portal_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((active = true) AND (EXISTS ( SELECT 1
   FROM condominiums c
  WHERE ((c.id = portal_access.condominium_id) AND (c.archived_at IS NULL)))) AND ((user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))))));

DROP POLICY IF EXISTS "managers read portal registration requests" ON "public"."portal_registration_requests";
CREATE POLICY "managers read portal registration requests" ON "public"."portal_registration_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'portale'::text));

CREATE POLICY "managers update portal registration requests" ON "public"."portal_registration_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'portale'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'portale'::text));

CREATE POLICY "users can read own profile" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users can update own profile" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "authorized managers manage suppliers" ON "public"."suppliers" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.can_manage_workspace_module(workspace_id, 'fornitori'::text)) WITH CHECK (private.can_manage_workspace_module(workspace_id, 'fornitori'::text));

CREATE POLICY "authorized users read suppliers" ON "public"."suppliers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.can_access_workspace_module(workspace_id, 'fornitori'::text));

CREATE POLICY "Users can read own security settings" ON "public"."user_security_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "admins manage memberships" ON "public"."workspace_members" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.is_workspace_admin(workspace_id)) WITH CHECK (private.is_workspace_admin(workspace_id));

CREATE POLICY "members can read memberships" ON "public"."workspace_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_workspace_admin(workspace_members.workspace_id) AS is_workspace_admin)));

CREATE POLICY "admins can manage workspaces" ON "public"."workspaces" AS PERMISSIVE FOR ALL TO "authenticated" USING (private.is_workspace_admin(id)) WITH CHECK (private.is_workspace_admin(id));

CREATE POLICY "workspace members can read workspaces" ON "public"."workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING (private.is_workspace_member(id));

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_activities BEFORE INSERT OR UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."assemblies" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_assemblies BEFORE INSERT OR UPDATE ON "public"."assemblies" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."communication_recipients" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_communication_recipient_scope BEFORE INSERT OR UPDATE ON "public"."communication_recipients" FOR EACH ROW EXECUTE FUNCTION validate_communication_recipient_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."communications" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_communication_scope BEFORE INSERT OR UPDATE ON "public"."communications" FOR EACH ROW EXECUTE FUNCTION validate_communication_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_accounting_settings" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_guard_confirmed_allocation_intake BEFORE DELETE OR UPDATE ON "public"."condominium_allocation_intakes" FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_intakes" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_allocation_intake_scope BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_intakes" FOR EACH ROW EXECUTE FUNCTION validate_condominium_allocation_intake_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_rules" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_allocation_rule_scope BEFORE INSERT OR UPDATE ON "public"."condominium_allocation_rules" FOR EACH ROW EXECUTE FUNCTION validate_allocation_rule_scope();

CREATE TRIGGER trg_validate_audit_scope BEFORE INSERT OR UPDATE ON "public"."condominium_audit_log" FOR EACH ROW EXECUTE FUNCTION validate_audit_scope();

CREATE TRIGGER trg_block_closed_budgets BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_budgets" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_budgets" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_budget_scope BEFORE INSERT OR UPDATE ON "public"."condominium_budgets" FOR EACH ROW EXECUTE FUNCTION validate_condominium_budget_scope();

CREATE TRIGGER trg_guard_consumption_reading_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_consumption_readings" FOR EACH ROW EXECUTE FUNCTION guard_consumption_reading_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_consumption_readings" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_consumption_reading_scope BEFORE INSERT OR UPDATE ON "public"."condominium_consumption_readings" FOR EACH ROW EXECUTE FUNCTION validate_condominium_consumption_reading_scope();

CREATE TRIGGER trg_guard_confirmed_creation_intake BEFORE DELETE OR UPDATE ON "public"."condominium_creation_intakes" FOR EACH ROW EXECUTE FUNCTION private.guard_confirmed_intake_immutability();

CREATE TRIGGER trg_validate_creation_intake_scope BEFORE INSERT OR UPDATE ON "public"."condominium_creation_intakes" FOR EACH ROW EXECUTE FUNCTION validate_condominium_creation_intake_scope();

CREATE TRIGGER trg_block_closed_allocations BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_guard_condominium_expense_allocation_total BEFORE INSERT OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION guard_condominium_expense_allocation_total();

CREATE TRIGGER trg_guard_expense_allocation_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION guard_expense_allocation_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_paid_allocation_delete BEFORE DELETE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_paid_allocation_delete();

CREATE TRIGGER trg_validate_expense_allocation_scope BEFORE INSERT OR UPDATE ON "public"."condominium_expense_allocations" FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_allocation_scope();

CREATE TRIGGER trg_guard_fiscal_carryover_compensation_total BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryover_compensations" FOR EACH ROW EXECUTE FUNCTION guard_fiscal_carryover_compensation_total();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryover_compensations" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_fiscal_carryover_compensation_scope BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryover_compensations" FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_compensation_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryovers" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_fiscal_carryover_scope BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_carryovers" FOR EACH ROW EXECUTE FUNCTION validate_fiscal_carryover_scope();

CREATE TRIGGER trg_guard_fiscal_year_opening_balance BEFORE UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION guard_fiscal_year_opening_balance();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_closed_fiscal_year_delete BEFORE DELETE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_delete();

CREATE TRIGGER trg_prevent_closed_fiscal_year_record_mutation BEFORE DELETE OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_record_mutation();

CREATE TRIGGER trg_prevent_closed_fiscal_year_reopen BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_reopen();

CREATE TRIGGER trg_prevent_fiscal_year_delete BEFORE DELETE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION prevent_fiscal_year_delete();

CREATE TRIGGER trg_validate_fiscal_year_scope BEFORE INSERT OR UPDATE ON "public"."condominium_fiscal_years" FOR EACH ROW EXECUTE FUNCTION validate_condominium_fiscal_year_scope();

CREATE TRIGGER trg_guard_fund_integrity BEFORE INSERT OR UPDATE ON "public"."condominium_funds" FOR EACH ROW EXECUTE FUNCTION guard_fund_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_funds" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_fund_scope BEFORE INSERT OR UPDATE ON "public"."condominium_funds" FOR EACH ROW EXECUTE FUNCTION validate_condominium_fund_scope();

CREATE TRIGGER trg_block_closed_installments BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_guard_installment_paid_amount BEFORE UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION guard_installment_paid_amount_update();

CREATE TRIGGER trg_guard_installment_parent_delete BEFORE DELETE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION guard_installment_parent_delete();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_new_installment_for_closing_member BEFORE INSERT ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION private.prevent_new_installment_for_closing_member();

CREATE TRIGGER trg_prevent_paid_installment_delete BEFORE DELETE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION prevent_paid_installment_delete();

CREATE TRIGGER trg_sync_expense_payment_status AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION sync_condominium_expense_payment_status();

CREATE TRIGGER trg_validate_installment_paid_amount BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_paid_amount();

CREATE TRIGGER trg_validate_installment_scope BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_scope();

CREATE TRIGGER trg_validate_installment_total BEFORE INSERT OR UPDATE ON "public"."condominium_installments" FOR EACH ROW EXECUTE FUNCTION validate_condominium_installment_total();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_insurance_policies" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_insurance_policies BEFORE INSERT OR UPDATE ON "public"."condominium_insurance_policies" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_block_closed_ledger BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_guard_ledger_entry_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION guard_ledger_entry_integrity();

CREATE TRIGGER trg_guard_ledger_parent_delete BEFORE DELETE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION guard_ledger_parent_delete();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_sync_condominium_fund_usage AFTER INSERT OR DELETE OR UPDATE OF fund_id, amount, direction ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION sync_condominium_fund_usage();

CREATE TRIGGER trg_validate_expense_payment_status BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_condominium_expense_payment_status();

CREATE TRIGGER trg_validate_ledger_entry_deliberation_scope BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_deliberation_scope();

CREATE TRIGGER trg_validate_ledger_fund_scope BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_fund_scope();

CREATE TRIGGER trg_validate_ledger_scope BEFORE INSERT OR UPDATE ON "public"."condominium_ledger_entries" FOR EACH ROW EXECUTE FUNCTION validate_condominium_ledger_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_legal_cases" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_legal_case_scope BEFORE INSERT OR UPDATE ON "public"."condominium_legal_cases" FOR EACH ROW EXECUTE FUNCTION validate_condominium_legal_case_scope();

CREATE TRIGGER trg_assign_condominium_member_legacy_id BEFORE INSERT ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION assign_condominium_member_legacy_id();

CREATE TRIGGER trg_clean_deleted_member_owner_references AFTER DELETE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION clean_deleted_member_owner_references();

CREATE TRIGGER trg_normalize_condominium_member_contact BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION normalize_condominium_member_contact();

CREATE TRIGGER trg_normalize_condominium_member_names BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION normalize_condominium_member_names();

CREATE TRIGGER trg_normalize_zero_ownership_owner BEFORE INSERT OR UPDATE OF data ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION normalize_zero_ownership_owner();

CREATE TRIGGER trg_preserve_closing_condominium_member_history BEFORE INSERT OR UPDATE OF active, data ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION preserve_closing_condominium_member_history();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_member_delete_with_financial_history BEFORE DELETE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION prevent_member_delete_with_financial_history();

CREATE TRIGGER trg_prevent_member_unit_reassignment_with_financial_history BEFORE UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION prevent_member_unit_reassignment_with_financial_history();

CREATE TRIGGER trg_sync_member_unit_legacy_fields BEFORE INSERT OR UPDATE OF unit_id ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION sync_condominium_member_unit_legacy_fields();

CREATE TRIGGER trg_sync_portal_after_member_change AFTER DELETE OR UPDATE OF active, user_id, name, email, data, unit_id, condominium_id ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION private.sync_portal_after_member_change();

CREATE TRIGGER trg_validate_member_unit_scope BEFORE INSERT OR UPDATE ON "public"."condominium_members" FOR EACH ROW EXECUTE FUNCTION validate_condominium_member_unit_scope();

CREATE TRIGGER trg_ensure_table_millesimal_values AFTER INSERT ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION ensure_table_millesimal_values();

CREATE TRIGGER trg_guard_millesimal_table_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION guard_millesimal_table_integrity();

CREATE TRIGGER trg_guard_millesimal_table_parent_delete BEFORE DELETE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION guard_millesimal_table_parent_delete();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_millesimal_table_scope BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_tables" FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_table_scope();

CREATE TRIGGER trg_guard_millesimal_value_integrity BEFORE DELETE OR UPDATE ON "public"."condominium_millesimal_values" FOR EACH ROW EXECUTE FUNCTION guard_millesimal_value_integrity();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_values" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_millesimal_value_scope BEFORE INSERT OR UPDATE ON "public"."condominium_millesimal_values" FOR EACH ROW EXECUTE FUNCTION validate_condominium_millesimal_value_scope();

CREATE TRIGGER trg_block_closed_payments BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION prevent_closed_condominium_accounting();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_payment_core_mutation BEFORE UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION prevent_payment_core_mutation();

CREATE TRIGGER trg_sync_installment_from_payments AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION sync_condominium_installment_from_payments();

CREATE TRIGGER trg_validate_payment_scope BEFORE INSERT OR UPDATE ON "public"."condominium_payment_movements" FOR EACH ROW EXECUTE FUNCTION validate_condominium_payment_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_register_items" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_touch_condominium_request_updated_at BEFORE UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION private.touch_condominium_request_updated_at();

CREATE TRIGGER trg_validate_request_scope BEFORE INSERT OR UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION validate_condominium_request_scope();

CREATE TRIGGER trg_validate_request_status BEFORE UPDATE ON "public"."condominium_requests" FOR EACH ROW EXECUTE FUNCTION validate_condominium_request_status();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_suppliers" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_tax_obligations" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_tax_scope BEFORE INSERT OR UPDATE ON "public"."condominium_tax_obligations" FOR EACH ROW EXECUTE FUNCTION validate_condominium_tax_scope();

CREATE TRIGGER trg_guard_confirmed_unit_transformation_items_immutable BEFORE INSERT OR DELETE OR UPDATE ON "public"."condominium_unit_transformation_items" FOR EACH ROW EXECUTE FUNCTION guard_confirmed_unit_transformation_items_immutable();

CREATE TRIGGER require_trusted_unit_transformation_confirmation_trg BEFORE INSERT OR UPDATE OF status ON "public"."condominium_unit_transformations" FOR EACH ROW EXECUTE FUNCTION require_trusted_unit_transformation_confirmation();

CREATE TRIGGER trg_guard_confirmed_unit_transformation_immutable BEFORE DELETE OR UPDATE ON "public"."condominium_unit_transformations" FOR EACH ROW EXECUTE FUNCTION guard_confirmed_unit_transformation_immutable();

CREATE TRIGGER validate_confirmed_unit_transformation_genealogy_trg BEFORE INSERT OR UPDATE OF status, source_unit_count, destination_unit_count ON "public"."condominium_unit_transformations" FOR EACH ROW EXECUTE FUNCTION validate_confirmed_unit_transformation_genealogy();

CREATE TRIGGER prevent_condominium_unit_delete_with_financial_data BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_condominium_unit_delete_with_financial_data();

CREATE TRIGGER prevent_condominium_unit_delete_with_members BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_condominium_unit_delete_with_members();

CREATE TRIGGER require_confirmed_genealogy_for_unit_lifecycle_trg BEFORE UPDATE OF lifecycle_status, lifecycle_effective_date ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION require_confirmed_genealogy_for_unit_lifecycle();

CREATE TRIGGER trg_clear_member_unit_legacy_on_unit_delete AFTER DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION clear_condominium_member_unit_legacy_fields();

CREATE TRIGGER trg_ensure_unit_millesimal_values AFTER INSERT ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION ensure_unit_millesimal_values();

CREATE TRIGGER trg_guard_unit_scope_changes BEFORE UPDATE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION guard_unit_scope_changes();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_prevent_financial_unit_delete BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_financial_unit_delete();

CREATE TRIGGER trg_prevent_unsafe_condominium_unit_delete BEFORE DELETE ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION prevent_unsafe_condominium_unit_delete();

CREATE TRIGGER trg_validate_condominium_unit_relationship AFTER INSERT OR UPDATE OF condominium_id, data ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION validate_condominium_unit_relationship();

CREATE CONSTRAINT TRIGGER trg_validate_unit_owner_member_refs AFTER INSERT OR UPDATE OF condominium_id, data ON condominium_units DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_unit_owner_member_refs();

CREATE TRIGGER trg_validate_unit_workspace_scope BEFORE INSERT OR UPDATE OF workspace_id, condominium_id ON "public"."condominium_units" FOR EACH ROW EXECUTE FUNCTION validate_condominium_unit_workspace_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_work_documents" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_documents_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_documents" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_work_events" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_events_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_events" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope();

CREATE TRIGGER audit_condominium_work_progress_change AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION audit_condominium_work_progress_change();

CREATE TRIGGER sync_condominium_work_financial_summary AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION sync_condominium_work_financial_summary_trigger();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_financial_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_financial_scope();

CREATE TRIGGER validate_condominium_work_progress_accounting_links BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_progress_accounting_links();

CREATE TRIGGER validate_condominium_work_progress_scope BEFORE INSERT OR UPDATE ON "public"."condominium_work_progress" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_child_scope();

CREATE TRIGGER audit_condominium_work_change AFTER INSERT OR DELETE OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION audit_condominium_work_change();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER validate_condominium_work_reference_scope BEFORE INSERT OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_reference_scope();

CREATE TRIGGER validate_condominium_work_scope BEFORE INSERT OR UPDATE ON "public"."condominium_works" FOR EACH ROW EXECUTE FUNCTION validate_condominium_work_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."deadlines" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_deadlines BEFORE INSERT OR UPDATE ON "public"."deadlines" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_audit_document_ai_change AFTER UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION audit_document_ai_change();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_touch_documents_updated_at BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION touch_documents_updated_at();

CREATE TRIGGER trg_validate_document_ai_transition BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION validate_document_ai_transition();

CREATE TRIGGER trg_validate_document_metadata BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION validate_document_metadata();

CREATE TRIGGER trg_validate_scope_documents BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_portal_member_permissions BEFORE INSERT OR UPDATE OF email, user_id, member_id, condominium_id, data ON "public"."portal_access" FOR EACH ROW EXECUTE FUNCTION private.apply_portal_member_permissions();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."portal_access" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_portal_access_scope BEFORE INSERT OR UPDATE ON "public"."portal_access" FOR EACH ROW EXECUTE FUNCTION validate_portal_access_scope();

CREATE TRIGGER trg_validate_portal_registration_request_scope BEFORE INSERT OR UPDATE ON "public"."portal_registration_requests" FOR EACH ROW EXECUTE FUNCTION validate_portal_registration_request_scope();

CREATE TRIGGER trg_prevent_profile_privilege_self_change BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_self_change();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();

CREATE TRIGGER trg_validate_scope_suppliers BEFORE INSERT OR UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION validate_workspace_condominium_scope();

CREATE TRIGGER trg_prevent_archived_condominium_mutation BEFORE INSERT OR UPDATE ON "public"."workspace_members" FOR EACH ROW EXECUTE FUNCTION prevent_archived_condominium_mutation();


-- Supabase-managed Storage is not present in the isolated PGlite baseline test.
-- When rebuilding on Supabase, restore the private document bucket and its object policies here.
DO $bethag_storage_baseline$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL
     AND to_regclass('storage.objects') IS NOT NULL
     AND to_regprocedure('storage.foldername(text)') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('bethag-documents', 'bethag-documents', false, 104857600)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, public = false, file_size_limit = EXCLUDED.file_size_limit;

    EXECUTE $policy$DROP POLICY IF EXISTS "BETHAG documents select" ON storage.objects$policy$;
    EXECUTE $policy$CREATE POLICY "BETHAG documents select" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'bethag-documents'
        AND (
          private.can_access_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
          OR EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.file_path = objects.name
              AND d.condominium_id::text = (storage.foldername(objects.name))[2]
              AND COALESCE(d.data ->> 'publication', '') = 'Condiviso'
              AND private.can_access_resident_condominium_module(d.condominium_id, 'documenti'::text)
          )
        )
      )$policy$;

    EXECUTE $policy$DROP POLICY IF EXISTS "BETHAG documents insert" ON storage.objects$policy$;
    EXECUTE $policy$CREATE POLICY "BETHAG documents insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'bethag-documents'
        AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
      )$policy$;

    EXECUTE $policy$DROP POLICY IF EXISTS "BETHAG documents update" ON storage.objects$policy$;
    EXECUTE $policy$CREATE POLICY "BETHAG documents update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'bethag-documents'
        AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
      )
      WITH CHECK (
        bucket_id = 'bethag-documents'
        AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
      )$policy$;

    EXECUTE $policy$DROP POLICY IF EXISTS "BETHAG documents delete" ON storage.objects$policy$;
    EXECUTE $policy$CREATE POLICY "BETHAG documents delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'bethag-documents'
        AND private.can_manage_workspace_module(((storage.foldername(name))[1])::uuid, 'documenti'::text)
      )$policy$;
  END IF;
END
$bethag_storage_baseline$;

-- END QA LEDGER ENTRY 20261017000004

-- QA LEDGER ENTRY 20261017000005 bethag_baseline_grants
-- PostgreSQL md5=cbe8c640e9158397ad813a098f2e9766; UTF-8 chars=44816
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- BETHAG baseline: grants and default privileges.

-- BETHAG schema baseline reconstructed from live Production catalog on 2026-10-17.

-- Schema-only export: no condominium or personal data included.

-- Intended for a fresh Supabase database; do not run against existing Production.

SET search_path = public, private, auth, extensions;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO service_role;













GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.activities TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.activities TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.assemblies TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.assemblies TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communication_recipients TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communication_recipients TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communications TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.communications TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_accounting_settings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_accounting_settings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_intakes TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_intakes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_rules TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_allocation_rules TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_audit_log TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_audit_log TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_budgets TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_budgets TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_consumption_readings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_consumption_readings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_creation_intakes TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_creation_intakes TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_expense_allocations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_expense_allocations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryover_compensations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryover_compensations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryovers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_carryovers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_years TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fiscal_years TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO authenticated;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_fund_availability TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_funds TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_funds TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_installments TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_installments TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_insurance_policies TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_insurance_policies TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_ledger_entries TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_ledger_entries TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_legal_cases TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_legal_cases TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_member_transfers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_member_transfers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_members TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_members TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_tables TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_tables TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_values TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_millesimal_values TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_movements TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_movements TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_reversal_audit TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_payment_reversal_audit TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_register_items TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_register_items TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_requests TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_requests TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_suppliers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_suppliers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_tax_obligations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_tax_obligations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformation_items TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformation_items TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformations TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_unit_transformations TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_units TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_units TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_documents TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_documents TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_events TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_events TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_progress TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_work_progress TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_works TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominium_works TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominiums TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.condominiums TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.deadlines TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.deadlines TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_access TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_access TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_registration_requests TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.portal_registration_requests TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suppliers TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suppliers TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_security_settings TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_security_settings TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspace_members TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspace_members TO service_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO postgres;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workspaces TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.activities TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.assemblies TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.communication_recipients TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.communications TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_accounting_settings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_allocation_intakes TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_allocation_rules TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_budgets TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_consumption_readings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_creation_intakes TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_expense_allocations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_fiscal_years TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_funds TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_installments TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_insurance_policies TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_ledger_entries TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_legal_cases TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_member_transfers TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_millesimal_tables TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_millesimal_values TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_register_items TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_requests TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_suppliers TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_tax_obligations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_unit_transformation_items TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_unit_transformations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_units TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_work_documents TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_work_events TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_work_progress TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominium_works TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.condominiums TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.deadlines TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.documents TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.portal_access TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.portal_registration_requests TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.suppliers TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.user_security_settings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.workspace_members TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.workspaces TO authenticated;

GRANT DELETE, SELECT ON TABLE public.profiles TO authenticated;

GRANT EXECUTE ON FUNCTION private.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION private.can_access_condominium(target_condominium uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_access_condominium(target_condominium uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.can_access_resident_condominium(target_condominium uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_access_resident_condominium_module(target_condominium uuid, required_permission text) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_access_workspace_module(target_workspace uuid, required_permission text) TO authenticated;

GRANT EXECUTE ON FUNCTION private.can_manage_workspace_module(target_workspace uuid, required_permission text) TO authenticated;



GRANT EXECUTE ON FUNCTION private.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION private.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) TO service_role;

GRANT EXECUTE ON FUNCTION private.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION private.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) TO service_role;

GRANT EXECUTE ON FUNCTION private.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) TO service_role;

GRANT EXECUTE ON FUNCTION private.get_my_workspace_access() TO authenticated;

GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role;

GRANT EXECUTE ON FUNCTION private.is_workspace_admin(target_workspace uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_workspace_admin(target_workspace uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.is_workspace_member(target_workspace uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_workspace_member(target_workspace uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.is_workspace_staff(target_workspace uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.list_archived_condominiums(p_workspace_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION private.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION private.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION private.set_personal_security_code(p_code text, p_enabled boolean) TO service_role;

GRANT EXECUTE ON FUNCTION private.verify_personal_security_code(p_code text) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.apply_resend_communication_event(p_provider_message_id text, p_event_id text, p_event_type text, p_email text, p_event_at timestamp with time zone) TO service_role;

GRANT EXECUTE ON FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.archive_condominium(p_workspace_id uuid, p_condominium_id uuid, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_condominium_work_change() TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_condominium_work_progress_change() TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_document_ai_change() TO service_role;



GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.claim_first_workspace_admin(p_workspace_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.clear_condominium_member_unit_legacy_fields() TO service_role;

GRANT EXECUTE ON FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_condominium_fiscal_year(p_workspace_id uuid, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_condominium_member_transfer(p_transfer_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.close_fiscal_year_and_generate_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.compensate_fiscal_carryover(p_workspace_id uuid, p_condominium_id uuid, p_carryover_id uuid, p_amount numeric, p_target_installment_id uuid, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION public.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.complete_portal_registration(p_full_name text, p_fiscal_code text, p_condominium_name text) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_allocation_intake(p_workspace_id uuid, p_intake_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_creation_intake(p_intake_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_incoming_name text, p_incoming_email text, p_incoming_user_id uuid, p_transfer_date date, p_transfer_type text, p_notes text, p_data jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.delete_condominium(p_workspace_id uuid, p_legacy_id bigint, p_security_code text) TO service_role;

GRANT EXECUTE ON FUNCTION public.ensure_table_millesimal_values() TO service_role;

GRANT EXECUTE ON FUNCTION public.ensure_unit_millesimal_values() TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_condominium_expense_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_table_id uuid, p_due_date date) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_consumption_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_fiscal_year_id uuid, p_service_type text) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_fiscal_year_carryovers(p_workspace_id uuid, p_condominium_id uuid, p_source_fiscal_year_id uuid, p_target_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_date date, p_fiscal_year_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_installments_from_allocations_schedule(p_workspace_id uuid, p_condominium_id uuid, p_ledger_entry_id uuid, p_title text, p_due_dates date[], p_fiscal_year_id uuid, p_percentages numeric[], p_unify_by_member boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_member_transfer_accounting_snapshot(p_transfer_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_member_transfer_accounting_snapshot(p_transfer_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_workspace_access() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_workspace_access() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_condominium_expense_allocation_total() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_confirmed_unit_transformation_immutable() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_confirmed_unit_transformation_items_immutable() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_consumption_reading_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_expense_allocation_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_fiscal_carryover_compensation_total() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_fiscal_year_opening_balance() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_fund_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_installment_paid_amount_update() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_installment_paid_amount_update() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_installment_parent_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_ledger_entry_integrity() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_ledger_entry_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_ledger_parent_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_ledger_parent_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_integrity() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_parent_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_table_parent_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_value_integrity() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_millesimal_value_integrity() TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_unit_scope_changes() TO service_role;

GRANT EXECUTE ON FUNCTION public.list_archived_condominiums(p_workspace_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.list_archived_condominiums(p_workspace_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.normalize_condominium_member_contact() TO service_role;

GRANT EXECUTE ON FUNCTION public.normalize_condominium_member_names() TO service_role;



GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO service_role;

GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(p_communication_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_communication_recipients(p_communication_id uuid) TO service_role;



GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_archived_condominium_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_condominium_accounting() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_payment_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_payment_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_record_mutation() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_record_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_reopen() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_update() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_closed_fiscal_year_update() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_financial_data() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_financial_data() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_members() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_condominium_unit_delete_with_members() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_financial_unit_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_financial_unit_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_fiscal_year_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_member_delete_with_financial_history() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_member_delete_with_financial_history() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_member_unit_reassignment_with_financial_history() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_member_unit_reassignment_with_financial_history() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_paid_allocation_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_paid_allocation_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_paid_installment_delete() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_paid_installment_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_payment_core_mutation() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_payment_core_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_self_change() TO authenticated;

GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_self_change() TO service_role;

GRANT EXECUTE ON FUNCTION public.prevent_unsafe_condominium_unit_delete() TO service_role;

GRANT EXECUTE ON FUNCTION public.preview_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.preview_condominium_member_transfer(p_unit_id uuid, p_outgoing_member_id uuid, p_transfer_date date) TO service_role;

GRANT EXECUTE ON FUNCTION public.preview_condominium_unit_transformation(p_condominium_id uuid, p_transformation_type text, p_source_unit_ids uuid[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.preview_condominium_unit_transformation(p_condominium_id uuid, p_transformation_type text, p_source_unit_ids uuid[]) TO service_role;

GRANT EXECUTE ON FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_installment_id uuid, p_payment_date date, p_amount numeric, p_method text, p_reference text, p_notes text) TO service_role;

GRANT EXECUTE ON FUNCTION public.reset_stale_communication_recipients(p_communication_id uuid, p_age interval) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reset_stale_communication_recipients(p_communication_id uuid, p_age interval) TO service_role;

GRANT EXECUTE ON FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.restore_condominium(p_workspace_id uuid, p_condominium_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.reverse_condominium_installment_payment(p_workspace_id uuid, p_condominium_id uuid, p_payment_id uuid, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION public.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_condominium(p_workspace_id uuid, p_legacy_id bigint, p_name text, p_address text, p_city text, p_postal_code text, p_province text, p_data jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.set_personal_security_code(p_code text, p_enabled boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_personal_security_code(p_code text, p_enabled boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_expense_payment_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_fund_usage() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_installment_from_payments() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_member_unit_legacy_fields() TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_work_financial_summary(p_work_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.sync_condominium_work_financial_summary_trigger() TO service_role;

GRANT EXECUTE ON FUNCTION public.touch_documents_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_allocation_rule_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_audit_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_communication_recipient_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_communication_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_allocation_intake_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_budget_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_consumption_reading_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_creation_intake_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_expense_allocation_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_expense_payment_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_fiscal_year_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_fund_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_installment_paid_amount() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_installment_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_installment_total() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_ledger_fund_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_ledger_fund_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_ledger_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_legal_case_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_member_unit_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_table_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_table_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_value_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_millesimal_value_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_payment_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_request_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_request_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_tax_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_unit_relationship() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_unit_workspace_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_unit_workspace_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_child_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_financial_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_financial_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_progress_accounting_links() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_reference_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_reference_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_condominium_work_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_document_ai_transition() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_document_metadata() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_document_upload_size(p_size_bytes bigint, p_warning_bytes bigint, p_max_bytes bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_document_upload_size(p_size_bytes bigint, p_warning_bytes bigint, p_max_bytes bigint) TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_fiscal_carryover_compensation_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_fiscal_carryover_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_ledger_entry_deliberation_scope() TO authenticated;

GRANT EXECUTE ON FUNCTION public.validate_ledger_entry_deliberation_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_portal_access_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_portal_registration_request_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_unit_owner_member_refs() TO service_role;

GRANT EXECUTE ON FUNCTION public.validate_workspace_condominium_scope() TO service_role;

GRANT EXECUTE ON FUNCTION public.verify_personal_security_code(p_code text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.verify_personal_security_code(p_code text) TO service_role;




























































































































































































































































































































































































GRANT SELECT ON TABLE public.condominium_audit_log TO authenticated;

GRANT SELECT ON TABLE public.condominium_fiscal_carryover_compensations TO authenticated;

GRANT SELECT ON TABLE public.condominium_fiscal_carryovers TO authenticated;

GRANT SELECT ON TABLE public.condominium_payment_movements TO authenticated;

GRANT SELECT ON TABLE public.condominium_payment_reversal_audit TO authenticated;











































































































































GRANT USAGE ON SCHEMA private TO authenticated;

GRANT USAGE ON SCHEMA public TO PUBLIC;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO service_role;

-- Reconcile PostgreSQL's implicit PUBLIC EXECUTE grants with Production ACLs.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(p_transfer_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO PUBLIC;

-- END QA LEDGER ENTRY 20261017000005

-- QA LEDGER ENTRY 20261022210629 restrict_private_function_public_execute
-- PostgreSQL md5=b5e4ca4596bd20c895bb28de5d12e369; UTF-8 chars=252
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Revoke implicit PUBLIC execution on private-schema routines.
-- Applied and verified on the three isolated BETHAG QA projects.
-- This migration intentionally does not alter Production.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

-- END QA LEDGER ENTRY 20261022210629

-- QA LEDGER ENTRY 20261022210630 harden_default_privileges_and_private_execute
-- PostgreSQL md5=d3cf59cf8c2cf6f05c17b81d04ff00a9; UTF-8 chars=445
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Keep existing table grants intact while preventing newly-created public objects
-- from inheriting broad table privileges. Supabase-managed roles are not modified.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

-- END QA LEDGER ENTRY 20261022210630

-- QA LEDGER ENTRY 20261022213544 restrict_close_member_transfer_execute
-- PostgreSQL md5=91f4b3a5497046713bce2473f898c058; UTF-8 chars=428
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- The close operation is an authenticated application workflow, not an anonymous RPC.
-- The implementation independently checks auth.uid(), workspace authorization,
-- transfer status/scope, and outstanding financial positions.
REVOKE EXECUTE ON FUNCTION public.close_condominium_member_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_condominium_member_transfer(uuid) TO authenticated, service_role;

-- END QA LEDGER ENTRY 20261022213544

-- QA LEDGER ENTRY 20261022233440 align_public_function_execute
-- PostgreSQL md5=e3f4615b160625a93269a1415496df81; UTF-8 chars=807
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Align effective function EXECUTE grants with the captured Production ACL baseline.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_zero_ownership_owner() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.preserve_closing_condominium_member_history() TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- END QA LEDGER ENTRY 20261022233440

-- QA LEDGER ENTRY 20261023000001 revoke_authenticated_maintain
-- PostgreSQL md5=6c7da689e349eba8c2d17097017d2bc3; UTF-8 chars=724
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Remove structural table privileges that ordinary API roles do not need.
-- RLS does not govern TRUNCATE. Keep ordinary CRUD grants intact for
-- authenticated; the RLS policies remain the row-level authorization boundary.
-- This is a controlled-release migration and has NOT been run on Production.
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- Remove existing MAINTAIN grants from API-facing roles.
-- service_role is handled by the following explicit migration so the change
-- remains independently auditable. Default ACL revocations do not affect
-- existing tables. PostgreSQL 17+.
REVOKE MAINTAIN
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- END QA LEDGER ENTRY 20261023000001

-- QA LEDGER ENTRY 20261023000002 revoke_default_maintain
-- PostgreSQL md5=4e70dd04c53393a8a15a1b10aa2e8fe4; UTF-8 chars=1416
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Least-privilege default table ACLs for objects created by postgres.
-- PostgreSQL default privileges are additive: schema-specific REVOKE statements
-- do not cancel grants inherited from global defaults, so both scopes are handled.
-- Hosted Supabase validation showed the connected postgres role is not a member
-- of supabase_admin. Do not mutate supabase_admin defaults: they are platform-
-- managed and must be reported as a platform-owned divergence, not remediated here.
-- This migration has NOT been applied to Production.

-- anon must receive no table privileges by default (global and public-schema ACLs).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;

-- authenticated retains ordinary CRUD only; remove maintenance and structural powers.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- service_role keeps backend CRUD/structural privileges, but not MAINTAIN.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE MAINTAIN ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM service_role;

-- END QA LEDGER ENTRY 20261023000002

-- QA LEDGER ENTRY 20261023000003 revoke_service_role_maintain
-- PostgreSQL md5=f104e5f91a0b9fb7bf60414c6f62df98; UTF-8 chars=1968
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Remove PostgreSQL 17 MAINTAIN from the application service_role.
-- Keep data, sequence, function and ordinary relation privileges unchanged.
-- Supabase-managed supabase_admin defaults are intentionally outside this migration.
REVOKE MAINTAIN ON TABLE
  public.activities,
  public.assemblies,
  public.communication_recipients,
  public.communications,
  public.condominium_accounting_settings,
  public.condominium_allocation_intakes,
  public.condominium_allocation_rules,
  public.condominium_audit_log,
  public.condominium_budgets,
  public.condominium_consumption_readings,
  public.condominium_creation_intakes,
  public.condominium_expense_allocations,
  public.condominium_fiscal_carryover_compensations,
  public.condominium_fiscal_carryovers,
  public.condominium_fiscal_years,
  public.condominium_funds,
  public.condominium_installments,
  public.condominium_insurance_policies,
  public.condominium_ledger_entries,
  public.condominium_legal_cases,
  public.condominium_member_transfers,
  public.condominium_members,
  public.condominium_millesimal_tables,
  public.condominium_millesimal_values,
  public.condominium_payment_movements,
  public.condominium_payment_reversal_audit,
  public.condominium_register_items,
  public.condominium_requests,
  public.condominium_suppliers,
  public.condominium_tax_obligations,
  public.condominium_unit_transformation_items,
  public.condominium_unit_transformations,
  public.condominium_units,
  public.condominium_work_documents,
  public.condominium_work_events,
  public.condominium_work_progress,
  public.condominium_works,
  public.condominiums,
  public.deadlines,
  public.documents,
  public.portal_access,
  public.portal_registration_requests,
  public.profiles,
  public.suppliers,
  public.user_security_settings,
  public.workspace_members,
  public.workspaces
FROM service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM service_role;

-- END QA LEDGER ENTRY 20261023000003

-- QA LEDGER ENTRY 20261023000004 application_default_table_privileges
-- PostgreSQL md5=08b16c4c3cb0c6ff952b48b7f6d84add; UTF-8 chars=617
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Explicit least-privilege defaults for application tables created as postgres.
-- authenticated gets ordinary data access only; service_role keeps the data and
-- structural privileges required by the backend but neither role gets MAINTAIN.
-- Do not attempt to mutate supabase_admin-owned defaults: that ACL is platform-managed.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO service_role;

-- END QA LEDGER ENTRY 20261023000004

-- QA LEDGER ENTRY 20261023000733 use_invoker_for_close_transfer_rpc
-- PostgreSQL md5=71957ae9b5dee5d8fd91d8272875c9ce; UTF-8 chars=637
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- The public RPC is an invoker wrapper; privileged work remains in the
-- private SECURITY DEFINER implementation, which validates auth and workspace
-- permissions before touching any transfer data. This removes the exposed
-- SECURITY DEFINER entrypoint flagged by Supabase Security Advisor.
ALTER FUNCTION public.close_condominium_member_transfer(uuid) SECURITY INVOKER;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) FROM PUBLIC, anon;

-- END QA LEDGER ENTRY 20261023000733

-- QA LEDGER ENTRY 20261027100000 revoke_public_execute_from_transfer_closure_helpers
-- PostgreSQL md5=7f7ff3df2d9f7decfd4c40a5ade2f37f; UTF-8 chars=658
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- The prior function-ACL migration was already recorded on QA before its
-- helper-function allowlist was corrected. Reconcile existing environments
-- without changing the two intentionally PUBLIC-executable trigger routines.
REVOKE EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_condominium_member_transfer_closure(uuid) TO authenticated, service_role;

-- END QA LEDGER ENTRY 20261027100000

-- QA LEDGER ENTRY 20261027110000 repair_service_role_transfer_invoker_path
-- PostgreSQL md5=de3342afdbc95d868b022f64fa66ca33; UTF-8 chars=721
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Repair the service_role invocation path for the SECURITY INVOKER public wrapper.
-- Live catalog checks on 2026-10-27 showed that migration 20261023000733 is
-- recorded in QA but its intended service_role grants are not effective there:
-- service_role has EXECUTE on the public wrapper, but lacks private-schema USAGE
-- and/or EXECUTE on the private implementation. Do not edit/replay the old file;
-- this forward-only correction is safe to reapply and does not bypass auth checks.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION private.close_condominium_member_transfer(uuid) FROM PUBLIC, anon;

-- END QA LEDGER ENTRY 20261027110000

-- QA LEDGER ENTRY 20261028100000 fix_collaborator_module_permission_boolean
-- PostgreSQL md5=cd759283d268e1c74b51bd578f6f2e7b; UTF-8 chars=1789
-- Original canonical SQL statement. Evidence archive only; not a deployable migration.
-- Respect the boolean value of collaborator module permissions.
-- A JSON object key set to false must not grant access just because the key exists.
-- Legacy array-shaped permission lists remain supported.
CREATE OR REPLACE FUNCTION private.can_manage_workspace_module(
  target_workspace uuid,
  required_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace
      AND wm.user_id = (SELECT auth.uid())
      AND wm.active = true
      AND (
        wm.role = 'admin'
        OR (
          wm.role = 'collaborator'
          AND CASE jsonb_typeof(wm.permissions)
            WHEN 'array' THEN COALESCE(wm.permissions ? required_permission, false)
            WHEN 'object' THEN COALESCE((wm.permissions -> required_permission) = 'true'::jsonb, false)
            ELSE false
          END
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.can_access_workspace_module(
  target_workspace uuid,
  required_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = target_workspace
      AND wm.user_id = (SELECT auth.uid())
      AND wm.active = true
      AND (
        wm.role = 'admin'
        OR (
          wm.role = 'collaborator'
          AND CASE jsonb_typeof(wm.permissions)
            WHEN 'array' THEN COALESCE(wm.permissions ? required_permission, false)
            WHEN 'object' THEN COALESCE((wm.permissions -> required_permission) = 'true'::jsonb, false)
            ELSE false
          END
        )
      )
  );
$function$;

-- END QA LEDGER ENTRY 20261028100000
