#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

# Provide the minimal installment table before installing its production trigger.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.condominium_installments (
  id uuid PRIMARY KEY,
  ledger_entry_id uuid,
  amount numeric NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL
);
SQL

# Execute the ledger-status trigger migration and verify both sides of reassignment.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261124170000_reconcile_ledger_status_on_installment_move.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/installment-ledger-status-regression.sql

# Verify that closing-member installment protection is case/whitespace insensitive.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/closing-member-installment-guard-regression.sql

# Preserve ledger references and paid SAL amounts when ledger rows are deleted/edited.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/ledger-work-progress-reference-guard-regression.sql

# Audit changes to SAL expense/payment ledger references even when no amount changes.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-progress-accounting-link-audit-regression.sql

# Record every tracked dimension when a single work update changes several fields.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-change-audit-regression.sql

# Prevent moving existing records out of archived condominiums.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/archived-condominium-move-regression.sql

# Capture SAL descriptive/date/sequence changes in the audit payload.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-progress-field-audit-regression.sql

# Require each installment to have a fiscal year containing its due date.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/installment-fiscal-year-due-date-regression.sql

# Audit descriptive and accounting-reference-only work updates.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f scripts/work-details-reference-audit-regression.sql
