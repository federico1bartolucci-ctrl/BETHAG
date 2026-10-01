# BETHAG — Piano di ricostruzione schema e migrazioni

**Rilevazione:** 1 ottobre 2026  
**Ambito:** analisi read-only di Production e del ramo `backup/pre-rollback-20261001`. Nessuna migrazione è stata applicata.

## Risultato della verifica dei file

Il ramo contiene 129 file SQL in `supabase/migrations`, ma non contiene la migrazione iniziale `20260928021707_initial_bethag_backend` che compare nella storia del database Production. Il registro migrazioni di Production non è sufficiente a ricostruire il DDL originario: occorre disporre dei file sorgente o di un'esportazione strutturale affidabile.

Sono stati acquisiti in `docs/PRODUCTION-INTEGRITY-CATALOG.md`, `docs/PRODUCTION-FUNCTIONS-TRIGGERS-CATALOG.md` e `docs/PRODUCTION-FUNCTION-DEFINITIONS.md` vincoli, indici, policy, trigger e definizioni delle funzioni selezionate. I cataloghi sono una base di verifica, non uno script di ripristino.

## Ordine logico dei componenti mancanti

L'ordine seguente è un grafo di dipendenze preliminare, da confermare contro tutte le FK, le definizioni dei trigger e le funzioni complete prima di generare SQL applicabile.

| Gruppo | Tabelle | Dipendenze principali | Verifica necessaria |
|---|---|---|---|
| Fondazioni contabili | `condominium_fiscal_years`, `condominium_accounting_settings` | `workspaces`, `condominiums` | Chiavi, date non sovrapposte, stato esercizio e protezione chiusura |
| Struttura millesimale | `condominium_millesimal_tables`, `condominium_millesimal_values` | `condominiums`, `condominium_units` | Ambito edificio/unità, totale millesimi, esclusioni e integrità delle righe usate |
| Contabilità generale | `condominium_funds`, `condominium_ledger_entries`, `condominium_budgets`, `condominium_tax_obligations`, `condominium_legal_cases`, `condominium_register_items` | esercizi, fornitori, documenti, assemblee e fondi | Direzione entrata/uscita, collegamenti coerenti e vincoli di esercizio |
| Riparti | `condominium_expense_allocations`, `condominium_allocation_rules`, `condominium_consumption_readings`, `condominium_allocation_intakes` | movimenti contabili, unità, persone, tabelle millesimali e documenti | Riparto provvisorio vs definitivo, scope, riconciliazione importi e autorizzazione di conferma |
| Rate e incassi | `condominium_installments`, `condominium_payment_movements`, `condominium_payment_reversal_audit` | riparti, esercizi, unità, membri e movimenti | Scadenze per esercizio, pagamenti parziali, storni tracciati e importi riconciliati |
| Riporto fiscale | `condominium_fiscal_carryovers`, `condominium_fiscal_carryover_compensations` | esercizi, rate, pagamenti, unità e membri | Chiusura atomica, saldo iniziale, compensazioni e blocco rigenerazione |
| Lavori | `condominium_works`, `condominium_work_documents`, `condominium_work_progress`, `condominium_work_events` | condominio, documenti, fornitori e contabilità | Collegamento univoco al movimento, avanzamenti e audit senza doppia contabilizzazione |
| Audit e passaggi | `condominium_audit_log`, `condominium_member_transfers` | workspace, condominio, unità, membri e storico contabile | Snapshot alla data, subentro, ciclo di vita accessi e immutabilità dello storico |
| Destinatari comunicazioni | `communication_recipients` | comunicazioni, profili/membri e workspace | Identità destinatario, unicità e indici di consultazione |

## Migrazioni già presenti e cosa coprono

- `20260930110000_accounting_consumption_and_installment_percentages.sql` e `20260930241000_allocation_rules_and_consumption.sql`: regole di riparto, letture di consumo e percentuali; verificare sovrapposizioni e differenze, perché entrambe trattano le regole di allocazione.
- `20260930230000_fiscal_year_carryovers.sql`, `20260930231000_correct_carryover_payment_basis.sql`, `20260930232000_installment_schedules.sql`, `20260930233000_link_funds_to_ledger.sql`, `20260930235000_accounting_settings.sql`, `20260930250000_manual_ai_allocation_intake.sql` e successive: estensioni contabili, che dipendono da tabelle base già esistenti.
- Migrazioni dal 1 ottobre 2026: protezioni di pagamento/storno, subentro e snapshot contabili, trasformazioni catastali e genealogia delle unità.
- Migrazioni di hardening RLS, indici e trigger: da mantenere dopo il ripristino delle rispettive tabelle e routine, non anticipare rispetto agli oggetti cui si riferiscono.

## Problemi di sequenza rilevati

1. Sono presenti più file con lo stesso timestamp di migrazione (ad esempio `20260930110000`, `20260930200000`, `20260930210000` e `20260930110000` è duplicato per due nomi distinti). Le versioni devono essere rese univoche senza alterare l'ordine semantico.
2. Le migrazioni di estensione non possono essere eseguite correttamente su uno schema vuoto se prima non vengono ricreate le tabelle e le funzioni fondative.
3. Le definizioni `SECURITY DEFINER` richiedono verifica di `search_path`, proprietario, grant/revoke, controlli su workspace/modulo e chiamate dalle policy RLS.
4. La ricostruzione dei soli campi delle tabelle non basta: vincoli, indici, policy, trigger, funzioni e grants devono risultare coerenti tra loro.
5. I dati Production non vanno copiati né modificati durante la ricostruzione del DDL. Le prove devono usare un ambiente di sviluppo effettivamente isolato e con schema ripristinabile.

## Prossimo percorso di lavoro

1. Recuperare le definizioni delle tabelle base, incluse colonne con default, identity, PK/FK, check, unique ed exclusion, dai cataloghi Production.
2. Ricostruire una migrazione fondativa ordinata e idempotente per gruppi di dipendenza; evitare di ricreare oggetti già gestiti dalle migrazioni successive.
3. Ricollocare le migrazioni duplicate su versioni univoche e verificare tutte le dipendenze DDL.
4. Ricostruire le funzioni e i trigger rimanenti, confrontandoli con il catalogo e verificando grant/revoke e RLS.
5. Eseguire le migrazioni soltanto su un branch/ambiente di sviluppo isolato, poi test SQL/RLS e flussi contabili con dati sintetici.
6. Confrontare schema risultante e catalogo Production (struttura, sicurezza e logica); solo dopo una revisione esplicita si potrà valutare una procedura di rilascio.

## Stato

- **Completato:** rilevazione del gap, cataloghi di integrità e trigger/funzioni, estrazione delle 14 definizioni selezionate, mappa logica preliminare.
- **In corso:** recupero del DDL base e ricostruzione verificabile delle migrazioni.
- **Non eseguito:** applicazione di migrazioni, test runtime completi, deploy o modifiche al database Production.

