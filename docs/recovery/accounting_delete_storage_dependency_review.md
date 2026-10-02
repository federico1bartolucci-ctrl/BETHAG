# Revisione mirata — contabilità, cancellazione e autorizzazioni successive

**Branch:** `bethag-migration-repair`  
**Tipo:** analisi statica selettiva dei file SQL disponibili. Non è una migrazione né una certificazione di baseline.

## Operazioni rilevate

| Migrazione | Evidenza statica | Verifiche necessarie |
|---|---|---|
| `20260930205000_guard_accounting_cascade_deletes.sql` | Definisce funzioni di protezione dalla cancellazione di elementi contabili, tabelle millesimali e rate; revoca e concede EXECUTE a ruoli espliciti | Verificare trigger associati, privilegi effettivi, percorso di cancellazione legittimo e comportamento in rollback. |
| `20260930207000_allow_payment_rpc_allocation_update.sql` | Sostituisce la funzione di integrità ripartizioni e la RPC di registrazione pagamento; aggiorna rate e allocazioni; modifica EXECUTE | Provare pagamenti parziali, saldi, doppio invio, importi limite e coerenza tra movimenti, rate e ripartizioni. |
| `20260930208000_guard_consumption_and_opening_balance.sql` | Definisce guardie per letture consumi e saldi iniziali, con privilegi espliciti | Verificare trigger e transizioni di esercizio, inclusi casi storici e correzioni autorizzate. |
| `20260930209000_guard_fund_integrity.sql` | Definisce una funzione di integrità dei fondi con privilegi espliciti | Verificare relazione con movimenti di ledger, utilizzo del fondo e ricalcolo dopo modifica/storno. |
| `20260930210000_complete_condominium_hard_delete.sql` | Sostituisce la RPC di cancellazione e contiene cancellazioni esplicite di dati operativi, portale e contabili | Trattare come operazione distruttiva distinta dall'archiviazione; verificare copertura FK, retention, audit, storage e protezione da esecuzioni accidentali. |
| `20260930230000_fiscal_year_carryovers.sql` | Crea carryover di esercizio, RLS, generazione e RPC di pagamento | Verificare quadratura fonte/destinazione, idempotenza, compensazioni e scoping per workspace/condominio/unità. |
| `20260930232000_installment_schedules.sql` | Definisce generazione rate da ripartizioni e calendario | Testare date, percentuali, arrotondamenti, rigenerazione e prevenzione di rate duplicate. |
| `20260930233000_link_funds_to_ledger.sql` | Collega fondi alle righe di ledger e definisce validazione/aggiornamento utilizzo fondo | Provare inserimento, modifica, cancellazione e cambio fondo con controlli di ambito. |
| `20260930250000_manual_ai_allocation_intake.sql` | Crea intake di ripartizione, RLS, grant e RPC di conferma che modifica allocazioni e intake | Separare anteprima da conferma; verificare autorizzazione, idempotenza, quadratura e tracciabilità delle modifiche. |
| `20260930350000_harden_document_storage_rls.sql` | Sostituisce policy su `storage.objects` per documenti BETHAG | Verificare percorso/tenant isolation, upload, lettura, aggiornamento e cancellazione con ruoli sintetici. |
| `20260930470000_harden_portal_approval_workspace_scope.sql` | Sostituisce la RPC di approvazione registrazione e aggiorna membri, profili e richieste | Verificare che richiesta, membro, workspace e condominio coincidano e che non sia possibile associare identità cross-tenant. |

## Dipendenze e rischi di replay

- Queste migrazioni modificano oggetti preesistenti: le funzioni guard presuppongono tabelle e trigger corretti; le RPC contabili presuppongono relazioni, vincoli e funzioni di autorizzazione già installati.
- Le migrazioni di carryover, schedulazione rate, fondi e intake formano un gruppo funzionale. Riprodurle senza i prerequisiti e senza dati coerenti può fallire oppure produrre una baseline formalmente installata ma non semanticamente equivalente.
- Le RPC che aggiornano più tabelle devono essere validate come transazioni: un errore intermedio non deve lasciare saldi, rate, allocazioni o stato dell'intake disallineati.
- La cancellazione definitiva è una procedura esplicitamente distruttiva e non può essere confusa con archiviazione, cessazione dell'accesso al portale o trasferimento di proprietà.
- Policy RLS e privilegi SQL sono livelli distinti: l'esistenza di GRANT/REVOKE non dimostra da sola l'effettivo isolamento dei dati, che richiede test con ruoli e identità reali di QA.
- Le policy di storage vanno testate separatamente dalle policy sulle tabelle applicative, perché autorizzazione ai metadati e accesso agli oggetti archiviati sono superfici differenti.

## Test di accettazione da preparare in QA isolato

1. Eseguire ogni RPC contabile su un workspace sintetico, confrontando ledger, fondi, allocazioni, rate e saldi prima e dopo.
2. Ripetere le richieste per verificare idempotenza e comportamento su concorrenza; introdurre errori controllati in ambiente usa-e-getta per verificare rollback.
3. Provare carryover tra esercizi con debiti saldati, parziali, compensati e contestati, senza trasferire automaticamente responsabilità personali.
4. Provare hard-delete solo su dati sintetici, verificando dipendenze FK, audit, documenti e impossibilità di agire su altri workspace.
5. Provare storage e portale con amministratore, collaboratore, proprietario, inquilino, utente disassociato e utente di altro workspace.
6. Confrontare catalogo, privilegi, RLS e trigger dopo replay con gli snapshot di produzione e documentare ogni differenza.

## Stato e limiti

La revisione riguarda esclusivamente i file elencati e i pattern SQL rilevati. Non è un inventario completo dei 132 file, non sono stati eseguiti replay SQL o test runtime e non viene attestata l'equivalenza di questi file con le migrazioni storicamente applicate alla produzione. Il baseline resta **bloccato/non certificato** fino a inventario semantico completo, riconciliazione, replay riuscito in QA isolato e test di autorizzazione/transazione.

Nessuna scrittura, migrazione, reset o modifica della history è stata eseguita su Supabase produzione. Nessun merge su `main` e nessun deploy sono stati eseguiti.
