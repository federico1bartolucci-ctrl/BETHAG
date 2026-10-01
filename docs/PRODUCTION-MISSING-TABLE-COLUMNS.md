# BETHAG — Catalogo colonne delle tabelle Production assenti in sviluppo

**Rilevazione read-only:** 1 ottobre 2026. Dati estratti da `information_schema.columns` del database Production. Sono riportati tipo, nullabilità e default; questo catalogo non sostituisce il DDL completo di vincoli, indici, RLS, trigger, grants e funzioni, documentati separatamente.

**Copertura:** 27 tabelle, 381 colonne.


## `communication_recipients`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `communication_id` | `uuid` | No | — |
| 3 | `workspace_id` | `uuid` | No | — |
| 4 | `condominium_id` | `uuid` | Sì | — |
| 5 | `member_id` | `uuid` | Sì | — |
| 6 | `user_id` | `uuid` | Sì | — |
| 7 | `email` | `text` | No | — |
| 8 | `name` | `text` | No | — |
| 9 | `recipient_role` | `text` | No | `'resident'::text` |
| 10 | `status` | `text` | No | `'pending'::text` |
| 11 | `provider_message_id` | `text` | Sì | — |
| 12 | `error_message` | `text` | Sì | — |
| 13 | `sent_at` | `timestamp with time zone` | Sì | — |
| 14 | `delivered_at` | `timestamp with time zone` | Sì | — |
| 15 | `created_at` | `timestamp with time zone` | No | `now()` |
| 16 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 17 | `bounced_at` | `timestamp with time zone` | Sì | — |
| 18 | `complained_at` | `timestamp with time zone` | Sì | — |
| 19 | `event_type` | `text` | Sì | — |
| 20 | `provider_event_id` | `text` | Sì | — |
| 21 | `queued_at` | `timestamp with time zone` | Sì | — |


## `condominium_accounting_settings`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `accounting_start_date` | `date` | No | `make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 1, 1)` |
| 5 | `accounting_end_date` | `date` | No | `make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 12, 31)` |
| 6 | `ordinary_installment_count` | `integer` | No | `12` |
| 7 | `ordinary_due_dates` | `_date` | No | `'{}'::date[]` |
| 8 | `extraordinary_mode` | `text` | No | `'separata'::text` |
| 9 | `extraordinary_allow_multi_year` | `boolean` | No | `true` |
| 10 | `created_at` | `timestamp with time zone` | No | `now()` |
| 11 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_allocation_intakes`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `source` | `text` | No | `'Manuale'::text` |
| 5 | `status` | `text` | No | `'Bozza'::text` |
| 6 | `document_id` | `uuid` | Sì | — |
| 7 | `ledger_entry_id` | `uuid` | Sì | — |
| 8 | `allocation_table_id` | `uuid` | Sì | — |
| 9 | `title` | `text` | No | `''::text` |
| 10 | `description` | `text` | No | `''::text` |
| 11 | `expense_amount` | `numeric` | Sì | — |
| 12 | `extracted_data` | `jsonb` | No | `'{}'::jsonb` |
| 13 | `rows` | `jsonb` | No | `'[]'::jsonb` |
| 14 | `validation_errors` | `jsonb` | No | `'[]'::jsonb` |
| 15 | `notes` | `text` | No | `''::text` |
| 16 | `created_by` | `uuid` | Sì | — |
| 17 | `confirmed_by` | `uuid` | Sì | — |
| 18 | `confirmed_at` | `timestamp with time zone` | Sì | — |
| 19 | `created_at` | `timestamp with time zone` | No | `now()` |
| 20 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_allocation_rules`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `name` | `text` | No | — |
| 5 | `expense_type` | `text` | Sì | — |
| 6 | `category` | `text` | Sì | — |
| 7 | `allocation_table_id` | `uuid` | No | — |
| 8 | `priority` | `integer` | No | `100` |
| 9 | `active` | `boolean` | No | `true` |
| 10 | `notes` | `text` | No | `''::text` |
| 11 | `created_at` | `timestamp with time zone` | No | `now()` |
| 12 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_audit_log`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | Sì | — |
| 4 | `entity_type` | `text` | No | — |
| 5 | `entity_id` | `uuid` | Sì | — |
| 6 | `action` | `text` | No | — |
| 7 | `description` | `text` | No | `''::text` |
| 8 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 9 | `created_at` | `timestamp with time zone` | No | `now()` |


## `condominium_budgets`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `fiscal_year_id` | `uuid` | Sì | — |
| 5 | `category` | `text` | No | `'Generale'::text` |
| 6 | `description` | `text` | No | `''::text` |
| 7 | `amount` | `numeric` | No | `0` |
| 8 | `notes` | `text` | No | `''::text` |
| 9 | `created_at` | `timestamp with time zone` | No | `now()` |
| 10 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_consumption_readings`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `fiscal_year_id` | `uuid` | Sì | — |
| 5 | `unit_id` | `uuid` | No | — |
| 6 | `service_type` | `text` | No | `'Riscaldamento'::text` |
| 7 | `period_start` | `date` | Sì | — |
| 8 | `period_end` | `date` | Sì | — |
| 9 | `meter_code` | `text` | No | `''::text` |
| 10 | `previous_reading` | `numeric` | Sì | — |
| 11 | `current_reading` | `numeric` | Sì | — |
| 12 | `consumption` | `numeric` | Sì | — |
| 13 | `kwh` | `numeric` | Sì | — |
| 14 | `allocation_value` | `numeric` | Sì | — |
| 15 | `charge_amount` | `numeric` | Sì | — |
| 16 | `source` | `text` | No | `'Manuale'::text` |
| 17 | `notes` | `text` | No | `''::text` |
| 18 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 19 | `created_at` | `timestamp with time zone` | No | `now()` |
| 20 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_expense_allocations`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `ledger_entry_id` | `uuid` | No | — |
| 5 | `unit_id` | `uuid` | Sì | — |
| 6 | `member_id` | `uuid` | Sì | — |
| 7 | `allocation_basis` | `text` | No | `'Millesimi'::text` |
| 8 | `millesimi` | `numeric` | Sì | — |
| 9 | `amount` | `numeric` | No | `0` |
| 10 | `paid_amount` | `numeric` | No | `0` |
| 11 | `due_date` | `date` | Sì | — |
| 12 | `status` | `text` | No | `'Da pagare'::text` |
| 13 | `notes` | `text` | No | `''::text` |
| 14 | `created_at` | `timestamp with time zone` | No | `now()` |
| 15 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 16 | `allocation_table_id` | `uuid` | Sì | — |


## `condominium_fiscal_carryover_compensations`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `carryover_id` | `uuid` | No | — |
| 5 | `target_installment_id` | `uuid` | Sì | — |
| 6 | `amount` | `numeric` | No | — |
| 7 | `notes` | `text` | No | `''::text` |
| 8 | `created_by` | `uuid` | Sì | — |
| 9 | `created_at` | `timestamp with time zone` | No | `now()` |


## `condominium_fiscal_carryovers`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `source_fiscal_year_id` | `uuid` | No | — |
| 5 | `target_fiscal_year_id` | `uuid` | No | — |
| 6 | `unit_id` | `uuid` | Sì | — |
| 7 | `member_id` | `uuid` | Sì | — |
| 8 | `balance` | `numeric` | No | — |
| 9 | `kind` | `text` | No | — |
| 10 | `status` | `text` | No | `'Da riportare'::text` |
| 11 | `notes` | `text` | No | `''::text` |
| 12 | `created_at` | `timestamp with time zone` | No | `now()` |
| 13 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_fiscal_years`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `name` | `text` | No | — |
| 5 | `start_date` | `date` | No | — |
| 6 | `end_date` | `date` | No | — |
| 7 | `status` | `text` | No | `'Aperto'::text` |
| 8 | `opening_balance` | `numeric` | No | `0` |
| 9 | `notes` | `text` | No | `''::text` |
| 10 | `created_at` | `timestamp with time zone` | No | `now()` |
| 11 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_funds`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `name` | `text` | No | — |
| 5 | `purpose` | `text` | No | `''::text` |
| 6 | `target_amount` | `numeric` | No | `0` |
| 7 | `allocated_amount` | `numeric` | No | `0` |
| 8 | `used_amount` | `numeric` | No | `0` |
| 9 | `active` | `boolean` | No | `true` |
| 10 | `notes` | `text` | No | `''::text` |
| 11 | `created_at` | `timestamp with time zone` | No | `now()` |
| 12 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_installments`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `fiscal_year_id` | `uuid` | Sì | — |
| 5 | `member_id` | `uuid` | Sì | — |
| 6 | `unit_id` | `uuid` | Sì | — |
| 7 | `title` | `text` | No | — |
| 8 | `due_date` | `date` | Sì | — |
| 9 | `amount` | `numeric` | No | `0` |
| 10 | `paid_amount` | `numeric` | No | `0` |
| 11 | `status` | `text` | No | `'Da pagare'::text` |
| 12 | `notes` | `text` | No | `''::text` |
| 13 | `created_at` | `timestamp with time zone` | No | `now()` |
| 14 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 15 | `ledger_entry_id` | `uuid` | Sì | — |


## `condominium_ledger_entries`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `fiscal_year_id` | `uuid` | Sì | — |
| 5 | `entry_date` | `date` | No | — |
| 6 | `direction` | `text` | No | — |
| 7 | `category` | `text` | No | — |
| 8 | `description` | `text` | No | — |
| 9 | `amount` | `numeric` | No | — |
| 10 | `payment_status` | `text` | No | `'Registrato'::text` |
| 11 | `due_date` | `date` | Sì | — |
| 12 | `supplier_id` | `uuid` | Sì | — |
| 13 | `unit_id` | `uuid` | Sì | — |
| 14 | `member_id` | `uuid` | Sì | — |
| 15 | `document_id` | `uuid` | Sì | — |
| 16 | `notes` | `text` | No | `''::text` |
| 17 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 18 | `created_at` | `timestamp with time zone` | No | `now()` |
| 19 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 20 | `fund_id` | `uuid` | Sì | — |
| 21 | `expense_type` | `text` | No | `'Ordinaria'::text` |
| 22 | `deliberation_date` | `date` | Sì | — |
| 23 | `assembly_id` | `uuid` | Sì | — |


## `condominium_legal_cases`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `title` | `text` | No | — |
| 5 | `counterpart` | `text` | No | `''::text` |
| 6 | `status` | `text` | No | `'Aperto'::text` |
| 7 | `opened_date` | `date` | Sì | — |
| 8 | `closed_date` | `date` | Sì | — |
| 9 | `notes` | `text` | No | `''::text` |
| 10 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 11 | `created_at` | `timestamp with time zone` | No | `now()` |
| 12 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_member_transfers`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `unit_id` | `uuid` | No | — |
| 5 | `outgoing_member_id` | `uuid` | No | — |
| 6 | `incoming_member_id` | `uuid` | Sì | — |
| 7 | `transfer_date` | `date` | No | — |
| 8 | `transfer_type` | `text` | No | `'Vendita'::text` |
| 9 | `status` | `text` | No | `'Confermato'::text` |
| 10 | `notes` | `text` | No | `''::text` |
| 11 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 12 | `created_by` | `uuid` | Sì | — |
| 13 | `created_at` | `timestamp with time zone` | No | `now()` |
| 14 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 15 | `closed_at` | `timestamp with time zone` | Sì | — |
| 16 | `closed_by` | `uuid` | Sì | — |


## `condominium_millesimal_tables`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `name` | `text` | No | — |
| 5 | `description` | `text` | No | `''::text` |
| 6 | `total_millesimi` | `numeric` | No | `1000` |
| 7 | `active` | `boolean` | No | `true` |
| 8 | `notes` | `text` | No | `''::text` |
| 9 | `created_at` | `timestamp with time zone` | No | `now()` |
| 10 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 11 | `basis_type` | `text` | No | `'Millesimi'::text` |
| 12 | `scope_mode` | `text` | No | `'all'::text` |
| 13 | `scope_unit_ids` | `_uuid` | No | `'{}'::uuid[]` |
| 14 | `scope_building_codes` | `_text` | No | `'{}'::text[]` |


## `condominium_millesimal_values`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `table_id` | `uuid` | No | — |
| 5 | `unit_id` | `uuid` | No | — |
| 6 | `value` | `numeric` | No | `0` |
| 7 | `excluded` | `boolean` | No | `false` |
| 8 | `notes` | `text` | No | `''::text` |
| 9 | `created_at` | `timestamp with time zone` | No | `now()` |
| 10 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_payment_movements`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `installment_id` | `uuid` | No | — |
| 5 | `payment_date` | `date` | No | — |
| 6 | `amount` | `numeric` | No | `0` |
| 7 | `method` | `text` | No | `'Bonifico'::text` |
| 8 | `reference` | `text` | No | `''::text` |
| 9 | `notes` | `text` | No | `''::text` |
| 10 | `created_at` | `timestamp with time zone` | No | `now()` |


## `condominium_payment_reversal_audit`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `original_payment_id` | `uuid` | No | — |
| 3 | `workspace_id` | `uuid` | No | — |
| 4 | `condominium_id` | `uuid` | No | — |
| 5 | `installment_id` | `uuid` | No | — |
| 6 | `amount` | `numeric` | No | — |
| 7 | `payment_date` | `date` | No | — |
| 8 | `method` | `text` | No | `'Bonifico'::text` |
| 9 | `reference` | `text` | No | `''::text` |
| 10 | `notes` | `text` | No | `''::text` |
| 11 | `reversal_reason` | `text` | No | — |
| 12 | `reversed_at` | `timestamp with time zone` | No | `now()` |
| 13 | `reversed_by` | `uuid` | No | — |


## `condominium_register_items`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `item_type` | `text` | No | `'Sicurezza'::text` |
| 5 | `category` | `text` | No | `'Generale'::text` |
| 6 | `title` | `text` | No | — |
| 7 | `location` | `text` | No | `''::text` |
| 8 | `responsible` | `text` | No | `''::text` |
| 9 | `expiry_date` | `date` | Sì | — |
| 10 | `status` | `text` | No | `'Attivo'::text` |
| 11 | `document_id` | `uuid` | Sì | — |
| 12 | `notes` | `text` | No | `''::text` |
| 13 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 14 | `created_at` | `timestamp with time zone` | No | `now()` |
| 15 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 16 | `supplier_id` | `uuid` | Sì | — |
| 17 | `estimated_amount` | `numeric` | No | `0` |


## `condominium_suppliers`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `business_name` | `text` | No | — |
| 5 | `contact_name` | `text` | No | `''::text` |
| 6 | `fiscal_code` | `text` | No | `''::text` |
| 7 | `vat_number` | `text` | No | `''::text` |
| 8 | `email` | `text` | No | `''::text` |
| 9 | `phone` | `text` | No | `''::text` |
| 10 | `category` | `text` | No | `''::text` |
| 11 | `contract_start` | `date` | Sì | — |
| 12 | `contract_end` | `date` | Sì | — |
| 13 | `notes` | `text` | No | `''::text` |
| 14 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 15 | `created_at` | `timestamp with time zone` | No | `now()` |
| 16 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_tax_obligations`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `title` | `text` | No | — |
| 5 | `category` | `text` | No | `'Fiscale'::text` |
| 6 | `due_date` | `date` | No | — |
| 7 | `amount` | `numeric` | Sì | — |
| 8 | `status` | `text` | No | `'Da fare'::text` |
| 9 | `notes` | `text` | No | `''::text` |
| 10 | `created_at` | `timestamp with time zone` | No | `now()` |
| 11 | `updated_at` | `timestamp with time zone` | No | `now()` |


## `condominium_work_documents`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `work_id` | `uuid` | No | — |
| 5 | `document_id` | `bigint` | Sì | — |
| 6 | `title` | `text` | No | `''::text` |
| 7 | `notes` | `text` | No | `''::text` |
| 8 | `created_at` | `timestamp with time zone` | No | `now()` |


## `condominium_work_events`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `work_id` | `uuid` | No | — |
| 5 | `event_type` | `text` | No | — |
| 6 | `event_date` | `timestamp with time zone` | No | `now()` |
| 7 | `title` | `text` | No | `''::text` |
| 8 | `description` | `text` | No | `''::text` |
| 9 | `amount` | `numeric` | No | `0` |
| 10 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 11 | `created_at` | `timestamp with time zone` | No | `now()` |


## `condominium_work_progress`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `work_id` | `uuid` | No | — |
| 5 | `progress_no` | `integer` | No | — |
| 6 | `progress_date` | `date` | No | — |
| 7 | `title` | `text` | No | `''::text` |
| 8 | `status` | `text` | No | `'Presentato'::text` |
| 9 | `percentage` | `numeric` | No | `0` |
| 10 | `amount` | `numeric` | No | `0` |
| 11 | `paid_amount` | `numeric` | No | `0` |
| 12 | `notes` | `text` | No | `''::text` |
| 13 | `created_at` | `timestamp with time zone` | No | `now()` |
| 14 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 15 | `ledger_entry_id` | `uuid` | Sì | — |
| 16 | `payment_entry_id` | `uuid` | Sì | — |


## `condominium_works`

| # | Colonna | Tipo | Nullable | Default |
|---:|---|---|:---:|---|
| 1 | `id` | `uuid` | No | `gen_random_uuid()` |
| 2 | `workspace_id` | `uuid` | No | — |
| 3 | `condominium_id` | `uuid` | No | — |
| 4 | `title` | `text` | No | — |
| 5 | `category` | `text` | No | `'Manutenzione'::text` |
| 6 | `description` | `text` | No | `''::text` |
| 7 | `status` | `text` | No | `'Da programmare'::text` |
| 8 | `priority` | `text` | No | `'Media'::text` |
| 9 | `supplier_id` | `uuid` | Sì | — |
| 10 | `register_item_id` | `uuid` | Sì | — |
| 11 | `start_date` | `date` | Sì | — |
| 12 | `expected_end_date` | `date` | Sì | — |
| 13 | `actual_end_date` | `date` | Sì | — |
| 14 | `estimated_amount` | `numeric` | No | `0` |
| 15 | `approved_amount` | `numeric` | No | `0` |
| 16 | `actual_amount` | `numeric` | No | `0` |
| 17 | `notes` | `text` | No | `''::text` |
| 18 | `data` | `jsonb` | No | `'{}'::jsonb` |
| 19 | `created_at` | `timestamp with time zone` | No | `now()` |
| 20 | `updated_at` | `timestamp with time zone` | No | `now()` |
| 21 | `fund_id` | `uuid` | Sì | — |
| 22 | `progress_percent` | `numeric` | No | `0` |
| 23 | `paid_amount` | `numeric` | No | `0` |
| 24 | `remaining_amount` | `numeric` | No | `0` |
| 25 | `payment_status` | `text` | No | `'Nessun importo'::text` |
