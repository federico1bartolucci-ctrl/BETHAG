# BETHAG — Gap schema Production / bethag-develop

**Rilevazione:** 1 ottobre 2026. **Ambito:** sola lettura; nessuna modifica ai database.

## Esito

- Production: 47 tabelle pubbliche.
- `bethag-develop`: 20 tabelle pubbliche.
- Tabelle presenti in Production e assenti in sviluppo: 27.
- Le tabelle comuni `condominiums`, `condominium_units`, `condominium_members` e `condominium_unit_transformations` espongono le stesse colonne nei due ambienti, secondo i metadati acquisiti.
- Il registro migrazioni letto separatamente mostra 153 versioni in Production e 37 in sviluppo. La presenza nel registro non prova, da sola, che i file SQL corrispondenti siano disponibili o riproducibili.

## Tabelle assenti in sviluppo

### `condominium_fiscal_years`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `name` — text; `start_date` — date; `end_date` — date; `status` — text; `opening_balance` — numeric; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_ledger_entries`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `fiscal_year_id` — uuid; `entry_date` — date; `direction` — text; `category` — text; `description` — text; `amount` — numeric; `payment_status` — text; `due_date` — date; `supplier_id` — uuid; `unit_id` — uuid; `member_id` — uuid; `document_id` — uuid; `notes` — text; `data` — jsonb; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `fund_id` — uuid; `expense_type` — text; `deliberation_date` — date; `assembly_id` — uuid

### `condominium_funds`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `name` — text; `purpose` — text; `target_amount` — numeric; `allocated_amount` — numeric; `used_amount` — numeric; `active` — boolean; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_expense_allocations`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `ledger_entry_id` — uuid; `unit_id` — uuid; `member_id` — uuid; `allocation_basis` — text; `millesimi` — numeric; `amount` — numeric; `paid_amount` — numeric; `due_date` — date; `status` — text; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `allocation_table_id` — uuid

### `condominium_tax_obligations`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `title` — text; `category` — text; `due_date` — date; `amount` — numeric; `status` — text; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_legal_cases`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `title` — text; `counterpart` — text; `status` — text; `opened_date` — date; `closed_date` — date; `notes` — text; `data` — jsonb; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_millesimal_tables`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `name` — text; `description` — text; `total_millesimi` — numeric; `active` — boolean; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `basis_type` — text; `scope_mode` — text; `scope_unit_ids` — ARRAY; `scope_building_codes` — ARRAY

### `condominium_millesimal_values`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `table_id` — uuid; `unit_id` — uuid; `value` — numeric; `excluded` — boolean; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_installments`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `fiscal_year_id` — uuid; `member_id` — uuid; `unit_id` — uuid; `title` — text; `due_date` — date; `amount` — numeric; `paid_amount` — numeric; `status` — text; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `ledger_entry_id` — uuid

### `condominium_payment_movements`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `installment_id` — uuid; `payment_date` — date; `amount` — numeric; `method` — text; `reference` — text; `notes` — text; `created_at` — timestamp with time zone

### `condominium_budgets`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `fiscal_year_id` — uuid; `category` — text; `description` — text; `amount` — numeric; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_register_items`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `item_type` — text; `category` — text; `title` — text; `location` — text; `responsible` — text; `expiry_date` — date; `status` — text; `document_id` — uuid; `notes` — text; `data` — jsonb; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `supplier_id` — uuid; `estimated_amount` — numeric

### `condominium_suppliers`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `business_name` — text; `contact_name` — text; `fiscal_code` — text; `vat_number` — text; `email` — text; `phone` — text; `category` — text; `contract_start` — date; `contract_end` — date; `notes` — text; `data` — jsonb; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_works`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `title` — text; `category` — text; `description` — text; `status` — text; `priority` — text; `supplier_id` — uuid; `register_item_id` — uuid; `start_date` — date; `expected_end_date` — date; `actual_end_date` — date; `estimated_amount` — numeric; `approved_amount` — numeric; `actual_amount` — numeric; `notes` — text; `data` — jsonb; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `fund_id` — uuid; `progress_percent` — numeric; `paid_amount` — numeric; `remaining_amount` — numeric; `payment_status` — text

### `condominium_work_documents`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `work_id` — uuid; `document_id` — bigint; `title` — text; `notes` — text; `created_at` — timestamp with time zone

### `condominium_work_progress`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `work_id` — uuid; `progress_no` — integer; `progress_date` — date; `title` — text; `status` — text; `percentage` — numeric; `amount` — numeric; `paid_amount` — numeric; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `ledger_entry_id` — uuid; `payment_entry_id` — uuid

### `condominium_work_events`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `work_id` — uuid; `event_type` — text; `event_date` — timestamp with time zone; `title` — text; `description` — text; `amount` — numeric; `data` — jsonb; `created_at` — timestamp with time zone

### `condominium_audit_log`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `entity_type` — text; `entity_id` — uuid; `action` — text; `description` — text; `data` — jsonb; `created_at` — timestamp with time zone

### `condominium_fiscal_carryovers`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `source_fiscal_year_id` — uuid; `target_fiscal_year_id` — uuid; `unit_id` — uuid; `member_id` — uuid; `balance` — numeric; `kind` — text; `status` — text; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_accounting_settings`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `accounting_start_date` — date; `accounting_end_date` — date; `ordinary_installment_count` — integer; `ordinary_due_dates` — ARRAY; `extraordinary_mode` — text; `extraordinary_allow_multi_year` — boolean; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_allocation_rules`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `name` — text; `expense_type` — text; `category` — text; `allocation_table_id` — uuid; `priority` — integer; `active` — boolean; `notes` — text; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_consumption_readings`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `fiscal_year_id` — uuid; `unit_id` — uuid; `service_type` — text; `period_start` — date; `period_end` — date; `meter_code` — text; `previous_reading` — numeric; `current_reading` — numeric; `consumption` — numeric; `kwh` — numeric; `allocation_value` — numeric; `charge_amount` — numeric; `source` — text; `notes` — text; `data` — jsonb; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_allocation_intakes`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `source` — text; `status` — text; `document_id` — uuid; `ledger_entry_id` — uuid; `allocation_table_id` — uuid; `title` — text; `description` — text; `expense_amount` — numeric; `extracted_data` — jsonb; `rows` — jsonb; `validation_errors` — jsonb; `notes` — text; `created_by` — uuid; `confirmed_by` — uuid; `confirmed_at` — timestamp with time zone; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone

### `condominium_fiscal_carryover_compensations`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `carryover_id` — uuid; `target_installment_id` — uuid; `amount` — numeric; `notes` — text; `created_by` — uuid; `created_at` — timestamp with time zone

### `communication_recipients`

`id` — uuid; `communication_id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `member_id` — uuid; `user_id` — uuid; `email` — text; `name` — text; `recipient_role` — text; `status` — text; `provider_message_id` — text; `error_message` — text; `sent_at` — timestamp with time zone; `delivered_at` — timestamp with time zone; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `bounced_at` — timestamp with time zone; `complained_at` — timestamp with time zone; `event_type` — text; `provider_event_id` — text; `queued_at` — timestamp with time zone

### `condominium_payment_reversal_audit`

`id` — uuid; `original_payment_id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `installment_id` — uuid; `amount` — numeric; `payment_date` — date; `method` — text; `reference` — text; `notes` — text; `reversal_reason` — text; `reversed_at` — timestamp with time zone; `reversed_by` — uuid

### `condominium_member_transfers`

`id` — uuid; `workspace_id` — uuid; `condominium_id` — uuid; `unit_id` — uuid; `outgoing_member_id` — uuid; `incoming_member_id` — uuid; `transfer_date` — date; `transfer_type` — text; `status` — text; `notes` — text; `data` — jsonb; `created_by` — uuid; `created_at` — timestamp with time zone; `updated_at` — timestamp with time zone; `closed_at` — timestamp with time zone; `closed_by` — uuid


## Dipendenze e cautela

Le tabelle contabili fanno riferimento a entità già presenti (workspace, condominio, unità, persone, documenti) e tra loro (esercizi, scritture, riparti, rate, movimenti di pagamento, fondi e riporti). La creazione deve rispettare l'ordine delle chiavi esterne e includere vincoli, indici, trigger, funzioni, RLS e privilegi coerenti con Production.

Il repository contiene migrazioni successive per varie funzioni contabili e di integrità, ma non è stato individuato il file sorgente della migrazione iniziale `20260928021707_initial_bethag_backend`. Le colonne riportate qui sono metadati letti dal database Production, non sostituiscono il recupero delle definizioni complete di vincoli, default, policy e logica procedurale.

## Sequenza di ricostruzione

1. Recuperare o ricostruire la migrazione base delle tabelle mancanti a partire dai metadati Production e dai riferimenti effettivi nel codice.
2. Ordinare le migrazioni successive per dipendenza, risolvendo versioni duplicate e nomi/timestamp non allineati.
3. Applicare esclusivamente su un ambiente di sviluppo isolato e vuoto, quindi confrontare tabelle, colonne, vincoli, indici, trigger, funzioni, RLS e grants.
4. Eseguire test automatici di integrità contabile, permessi e flussi utente; non considerare il build frontend sufficiente.
5. Sottoporre a revisione e autorizzazione esplicita ogni eventuale passaggio verso Production.

## Limiti della rilevazione

Questo documento fotografa le differenze strutturali note al momento della rilevazione. Non certifica la correttezza funzionale, non costituisce una migrazione SQL e non autorizza modifiche ai dati o allo schema Production.
