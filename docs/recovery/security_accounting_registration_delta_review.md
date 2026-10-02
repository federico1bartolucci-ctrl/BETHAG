# Riconciliazione supplementare — sicurezza, contabilità e registrazione

**Branch:** `bethag-migration-repair`  
**Tipo:** audit statico mirato, non SQL eseguibile.

## Migrazioni esaminate

| File | Operazione rilevata | Verifica richiesta |
|---|---|---|
| `20260930530000_fix_portal_registration_case_insensitive_upsert.sql` | Sostituisce RPC di completamento e approvazione registrazione; aggiorna membri, profili e richieste | Chiave upsert normalizzata coerente con indici; conflitti, richieste ripetute, mismatch, rollback atomico |
| `20260930540000_harden_condominium_delete_carryover_compensations.sql` | Sostituisce RPC di hard-delete con eliminazioni esplicite, incluse compensazioni dei riporti | Grafo FK completo, isolamento workspace, audit/retention e distinzione dall'archiviazione |
| `20260930550000_harden_archived_condominium_visibility.sql` | Sostituisce helper e policy residenti per accessi, unità e membri | Comportamento con condominio archiviato e accessi revocati; regressione dei ruoli |
| `20261001063435_final_performance_indexes_communication_recipients.sql` | Rimuove un indice e aggiunge indici sui destinatari comunicazioni | Verificare dipendenze dall'indice rimosso e piani di query; non è una certificazione di performance |
| `20261001063800_lock_down_financial_rpc_anon_execute.sql` | Revoca EXECUTE da anon e PUBLIC per RPC finanziarie | Verificare grants finali per authenticated/service roles e invocazioni applicative |
| `20261001081500_lock_down_legacy_admin_rpc_anon_execute.sql` | Revoca EXECUTE da anon e PUBLIC per RPC amministrative legacy | Inventario chiamanti e privilegi effettivi dopo tutte le migrazioni |
| `20261001081600_lock_down_restore_condominium_rpc_anon_execute.sql` | Revoca EXECUTE da anon e PUBLIC per restore | Verificare che il ruolo autorizzato mantenga l'accesso previsto |
| `20261001081700_protect_profile_privilege_fields.sql` | Aggiunge trigger che impedisce all'utente di modificare i campi privilegiati del proprio profilo | Testare self-update, admin update, servizio e campi non privilegiati |
| `20261001082000_fix_fiscal_carryover_regeneration.sql` | Sostituisce generazione riporti; elimina riporti esistenti e aggiorna saldo apertura, con guardie | Provare rigenerazione, compensazioni presenti, esercizi chiusi, atomicità e ricalcolo |
| `20261001083000_payment_reversal_audit_and_reconciliation.sql` | Crea audit storni, sincronizza rate/allocazioni e aggiunge RPC di storno | Testare storno singolo/ripetuto, esercizio chiuso, importi, allineamento movimenti e audit |
| `20261001083500_lock_concurrent_installment_generation.sql` | Sostituisce generatore rate con controlli di ambito, date, percentuali e generazione concorrente | Test concorrenti, doppio invio, idempotenza, arrotondamenti e rollback |
| `20261001094000_index_transfer_closed_by.sql` | Aggiunge indice su chiusore del trasferimento | Confermare colonna e FK disponibili nella baseline precedente |

## Dipendenze trasversali

- Le RPC di registrazione dipendono da profili, membri, richieste, accesso portale, workspace e helper di autorizzazione. La sequenza delle sostituzioni va valutata sulla definizione finale effettiva.
- Le revoche EXECUTE non dimostrano da sole che l'accesso corretto sia mantenuto: servono grants effettivi e test da ciascun ruolo usato dall'applicazione.
- Le funzioni di contabilità mutano più tabelle collegate. La verifica deve includere transazioni, doppie invocazioni, concorrenza, dati parziali e vincoli che possono respingere l'operazione.
- Hard-delete e rigenerazione riporti includono cancellazioni o riscritture dati: devono essere provati esclusivamente con fixture sintetiche in QA usa-e-getta.
- Le policy per condomini archiviati devono essere confrontate con le regole di archivio, restore e accesso storico; non presumere che archived, access revoked e deleted siano stati equivalenti.

## Test di accettazione minimi

1. Registrazione e approvazione con email maiuscole/minuscole, spazi, utente già associato, mismatch, richiesta duplicata e workspace differente.
2. Chiamate anonime e authenticated alle RPC protette, verificando sia rifiuti attesi sia accessi autorizzati.
3. Aggiornamento profilo proprio: role/active non modificabili; dati ordinari modificabili secondo permessi; percorso amministrativo validato.
4. Riporti fiscali: generazione iniziale, rigenerazione senza compensazioni, blocco con compensazioni, esercizio chiuso e rollback in caso di errore.
5. Pagamento e storno: pagamento parziale, storno, secondo storno, esercizio chiuso, audit e riconciliazione rate/allocazioni.
6. Generazione rate simultanea da due sessioni, duplicazione della richiesta, date fuori esercizio, percentuali incoerenti e spesa già rateizzata.
7. Archiviazione, restore e cancellazione: verifica accessi, dati mantenuti e cancellazioni strettamente circoscritte al workspace.

## Stato della riconciliazione

Questa è un'ulteriore classificazione statica di file selezionati, non una riconciliazione completa di tutti i 132 file con i 153 record della history produzione. Non sono stati eseguiti replay o test runtime. La baseline rimane **bloccata/non certificata**. Nessuna scrittura o migrazione sulla produzione, nessun reset, merge su `main` o deploy.
