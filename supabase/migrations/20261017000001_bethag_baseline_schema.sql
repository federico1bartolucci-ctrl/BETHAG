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
