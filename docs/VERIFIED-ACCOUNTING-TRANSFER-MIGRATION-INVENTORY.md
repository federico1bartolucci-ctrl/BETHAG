# BETHAG — Inventario verificato migrazioni contabili e subentri

**Branch analizzato:** `backup/pre-rollback-20261001`  
**Metodo:** lettura dei file SQL del repository e individuazione delle istruzioni `CREATE [OR REPLACE] FUNCTION`.  
**Stato:** inventario statico; nessuna esecuzione SQL.

## Migrazioni esaminate

| File | Funzioni definite |
|---|---|
| `20260930230000_fiscal_year_carryovers.sql` | `public.generate_fiscal_year_carryovers`, `public.register_condominium_installment_payment` |
| `20260930232000_installment_schedules.sql` | `public.generate_installments_from_allocations_schedule` |
| `20260930233000_link_funds_to_ledger.sql` | `public.validate_condominium_ledger_fund_scope`, `public.sync_condominium_fund_usage` |
| `20260930235000_accounting_settings.sql` | nessuna funzione rilevata |
| `20260930241000_allocation_rules_and_consumption.sql` | `public.generate_consumption_allocations` |
| `20260930250000_manual_ai_allocation_intake.sql` | `public.confirm_allocation_intake` |
| `20260930260000_harden_allocation_intake_validation.sql` | `public.confirm_allocation_intake` |
| `20260930270000_validate_allocation_table_scope.sql` | `public.confirm_allocation_intake` |
| `20260930290000_fix_installment_rounding_and_unification.sql` | `public.generate_installments_from_allocations_schedule` |
| `20260930300000_harden_accounting_rls_permissions.sql` | nessuna funzione rilevata |
| `20261001083000_payment_reversal_audit_and_reconciliation.sql` | `public.sync_condominium_installment_from_payments`, `private.reverse_condominium_installment_payment`, `public.reverse_condominium_installment_payment`, `public.prevent_payment_core_mutation` |
| `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` | `private.confirm_condominium_member_transfer` |
| `20261001104500_add_condominium_member_transfer.sql` | `private.confirm_condominium_member_transfer`, `public.confirm_condominium_member_transfer` |
| `20261001110000_add_member_transfer_accounting_snapshot.sql` | `public.get_member_transfer_accounting_snapshot` |
| `20261001113000_add_member_transfer_preview.sql` | `public.preview_condominium_member_transfer` |

## Risultati dell'ispezione

- `confirm_allocation_intake` è ridefinita in tre migrazioni successive. La versione da ricostruire è quindi il risultato dell'intera sequenza, non la prima definizione isolata.
- `generate_installments_from_allocations_schedule` è ridefinita almeno nella migrazione iniziale di pianificazione rate e nella successiva correzione di arrotondamento/unificazione.
- La funzione privata di conferma subentro compare in due migrazioni; la funzione pubblica di conferma è aggiunta successivamente. È necessario controllare ordine, wrapper, grants e comportamento finale insieme.
- La migrazione di storno definisce sia la funzione privata sia l'RPC pubblica, oltre al trigger di sincronizzazione; il test deve includere la riconciliazione della rata dopo storno e una chiamata diretta senza autorizzazione.
- La presenza di una funzione in una migrazione non certifica che sia completa rispetto alla Production: restano da confrontare corpo, proprietario, grants, dipendenze e trigger.

## Ordine logico proposto per la ricostruzione isolata

1. Tabelle e tipi fondamentali già condivisi: workspace, condomini, unità, membri, documenti e profili.
2. Esercizi contabili, libro giornale, fondi, tabelle e valori millesimali.
3. Rate, pagamenti, allocazioni, riporti e compensazioni.
4. Regole di riparto, letture consumi, impostazioni e intake manuale/AI.
5. Helper autorizzativi e funzioni di scrittura, dopo aver risolto le dipendenze delle policy.
6. Trigger di integrità, audit, blocchi degli esercizi chiusi e protezione dei dati storici.
7. Policy RLS e grants, quindi test d'accesso positivo/negativo per ciascun ruolo.
8. Funzioni e trigger per subentri e trasformazioni catastali, testando date efficaci, genealogia e snapshot.
9. Confronto finale dei cataloghi risultanti con la fotografia Production, senza copiare dati personali o finanziari.

Questo ordine è una dipendenza logica preliminare, non un ordine eseguibile definitivo: i corpi e i riferimenti delle restanti migrazioni devono ancora essere verificati. Le tabelle create da un bootstrap proposto possono sovrapporsi alle migrazioni successive; non applicare entrambi senza una riconciliazione esplicita.

## Blocco prima del collaudo runtime

Il collaudo runtime resta sospeso finché non è dimostrato che il progetto destinatario è isolato e sacrificabile, e finché le migrazioni possono essere applicate da zero senza conflitti. In questa fase è stato svolto solo controllo statico del repository.