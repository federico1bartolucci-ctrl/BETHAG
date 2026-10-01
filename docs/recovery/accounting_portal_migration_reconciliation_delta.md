# Riconciliazione incrementale — migrazioni contabili e portale

**Branch:** `bethag-migration-repair`  
**Tipo:** classificazione statica di un gruppo di migrazioni. Non è baseline SQL e non autorizza l'esecuzione.

## File esaminati in questo passaggio

| Migrazione | Operazione | Dipendenza/controllo da verificare |
|---|---|---|
| `20260930231000_correct_carryover_payment_basis.sql` | Sostituisce generazione riporti fiscali e cancella/rigenera riporti del periodo indicato | Base di calcolo, compensazioni esistenti, duplicati e atomicità |
| `20260930234000_multiyear_installment_schedules.sql` | Sostituisce generatore rate per scadenze su più esercizi | Coerenza tra scadenze, esercizi, limiti per anno e distribuzione degli importi |
| `20260930235000_accounting_settings.sql` | Crea impostazioni contabili con RLS, policy e grant | Presenza workspace/condomini e autorizzazioni contabilità |
| `20260930235500_classify_expense_type.sql` | Aggiunge `expense_type`, aggiorna i dati esistenti e aggiunge CHECK | Compatibilità dei dati preesistenti e valori ammessi |
| `20260930240000_installment_percentages.sql` | Sostituisce generatore rate con percentuali per rata e vincoli contabili | Somma 100%, date, esercizi chiusi, arrotondamenti |
| `20260930241000_allocation_rules_and_consumption.sql` | Crea regole di riparto e letture consumi con indici, RLS e grants | Tabelle unità/millesimi e isolamento per workspace/condominio |
| `20260930260000_harden_allocation_intake_validation.sql` | Sostituisce RPC di conferma acquisizione riparto; ricrea allocazioni | Somma importi, unità, tabella millesimale, rollback completo |
| `20260930270000_validate_allocation_table_scope.sql` | Rafforza la conferma verificando ambito e millesimi della tabella | Corrispondenza unità/fabbricato/civico e coerenza millesimale |
| `20260930280000_work_accounting_integrity_indexes.sql` | Aggiunge indici univoci/ordinari su documenti lavori e movimenti contabili | Duplicati preesistenti e collisioni di chiave |
| `20260930290000_fix_installment_rounding_and_unification.sql` | Sostituisce generatore rate con controlli di arrotondamento e unificazione | Unico proprietario attivo per unità, identificativo stabile, somma centesimi |
| `20260930340000_add_missing_fk_indexes.sql` | Aggiunge indici su FK di tabelle di acquisizione, riporti e compensazioni | Colonne/FK presenti e impatto su replay/performance |
| `20260930370000_harden_portal_insurance_visibility.sql` | Sostituisce policy di lettura delle polizze | Ruoli e autorizzazione effettiva alla consultazione |

## Osservazioni sulla sequenza

1. I generatori di rate sono sostituiti in più passaggi: la semantica finale è data dall'ultima definizione applicabile, non dalla lettura di un singolo file. Serve confronto integrale delle definizioni e delle firme RPC, con test di regressione.
2. La conferma dell'acquisizione di riparto ricostruisce le allocazioni e aggiorna lo stato dell'acquisizione. Le migrazioni successive ampliano le verifiche di ambito; occorre garantire che le verifiche nuove non lascino passare unità appartenenti ad altra tabella/condominio.
3. La rigenerazione dei riporti è un'operazione data-changing. La presenza di compensazioni deve bloccare o governare la rigenerazione secondo la regola contabile prevista; testare anche errori a metà funzione.
4. Gli indici univoci possono fallire su dati duplicati e gli indici ordinari dipendono da colonne e tabelle già create. Preflight necessario prima del replay.
5. Le policy di lettura di impostazioni contabili e polizze dipendono dagli helper di accesso ai moduli e dall'identità/workspace. I grant SQL non sostituiscono il test RLS effettivo.

## Test QA minimi

- Esercizi consecutivi, chiusi/aperti, sovrapposti o con lacune; date rata esattamente sui confini.
- Rate multiple con percentuali valide, mancanti, non positive, fuori somma, e importi che producono frazioni di centesimo.
- Generazione ripetuta e concorrente per la stessa spesa; nessuna doppia rata o allocazione.
- Acquisizione riparto con importo diverso dalla spesa, unità fuori condominio, tabella/fabbricato errato, millesimi discordanti e righe duplicate.
- Rigenerazione riporti con e senza compensazioni, esercizi chiusi e errore indotto per verificare rollback.
- Identità admin/collaboratore con permesso contabilità, utente portale, altro workspace e anonimo: verificare accessi a impostazioni, polizze e RPC.
- Dati preesistenti duplicati prima di creare gli indici univoci.

## Copertura attuale

Il branch contiene 132 file di migrazione. Questo passaggio ha esaminato staticamente i 12 file elencati; revisioni precedenti coprono altri gruppi selezionati, ma non è stato dimostrato che ogni file sia stato letto e riconciliato semanticamente con tutti i 153 record della history produzione. La copertura non va pertanto descritta come completa.

Non sono stati eseguiti replay SQL, test runtime o scritture sulla produzione. Il baseline resta **bloccato/non certificato** finché non si chiudono inventario e dipendenze e non si supera un replay in QA isolato.
