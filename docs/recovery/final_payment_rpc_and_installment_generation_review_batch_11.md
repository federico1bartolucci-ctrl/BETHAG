# BETHAG — verifica delle versioni finali di pagamenti e generazione rate — batch 11

**Branch:** `bethag-migration-repair`  
**Tipo:** audit statico mirato delle sostituzioni successive delle RPC; non contiene SQL eseguibile.  
**Stato:** non eseguiti replay o test runtime; produzione invariata.

## Scopo

Verificare se i rischi segnalati nelle revisioni precedenti sono stati risolti da migrazioni successive, leggendo le definizioni disponibili in sequenza cronologica. La verifica resta limitata ai file indicati e non sostituisce l'ispezione del catalogo effettivo in un ambiente QA.

## 1. RPC di pagamento: il rischio di ritorno persiste nell'ultima sostituzione individuata

La funzione `register_condominium_installment_payment` compare nella migrazione `20260929230443_sync_allocation_payment_status.sql` e viene sostituita in `20260930130000_harden_installment_payment.sql`. Quest'ultima calcola il totale pagato della rata in `v_new_paid`, ma nel ciclo delle allocazioni riutilizza la stessa variabile per il totale pagato attribuito all'unità e infine esegue `return v_new_paid`.

La migrazione `20260930207000_allow_payment_rpc_allocation_update.sql` sostituisce nuovamente la RPC e ripropone lo stesso schema: calcola il pagato rata in `v_new_paid`, lo usa per aggiornare la rata, poi lo sovrascrive con `least(allocation.amount, sum(installment.paid_amount))` nel ciclo allocazioni e restituisce `v_new_paid`. Tra i file esaminati non è emersa una successiva sostituzione di questa RPC dopo `20260930207000`. La migrazione `20261001083000_payment_reversal_audit_and_reconciliation.sql` sostituisce la funzione trigger di sincronizzazione e introduce la RPC di storno, ma nel file esaminato non ridefinisce `register_condominium_installment_payment`.

**Conclusione circoscritta:** nel corpo finale ricostruibile dai file del branch esaminati, il valore di ritorno può essere quello dell'ultima allocazione elaborata, non il nuovo totale pagato della rata. È un difetto statico confermato del corpo SQL presente nel branch, non una prova del valore attualmente installato in produzione. L'effetto sui dati persistiti può restare corretto mentre il valore di risposta della RPC è errato; va controllato il contratto usato dalla UI/API per evitare visualizzazioni o calcoli successivi errati.

**Criterio di correzione:** usare variabili distinte e non ambigue, per esempio una per il totale pagato rata e una per il pagato allocazione; restituire il totale rata previsto dal contratto. La correzione va realizzata solo dopo baseline QA ricostruibile, quindi provata con singola e multipla allocazione, pagamenti parziali/totali, retry, concorrenza, storno e rollback. Non applicare la correzione in produzione sulla sola base di questa analisi.

## 2. Storno e sincronizzazione derivata

La migrazione `20261001083000_payment_reversal_audit_and_reconciliation.sql` crea un audit di storno con vincolo univoco sul pagamento originale, blocca l'aggiornamento dei campi contabili centrali del movimento e demanda lo storno a una funzione privata con controllo autenticazione/modulo, lock del pagamento, motivazione obbligatoria, inserimento audit e cancellazione del movimento nella stessa transazione. Il trigger ricalcola pagato e stato rata dalla somma dei movimenti e sincronizza allocazioni.

**Da provare in QA:** che INSERT/DELETE dei movimenti richiami il trigger atteso; che lo storno aggiorni rata e allocazioni prima del commit; che il vincolo univoco e il lock impediscano doppi storni concorrenti; che la tabella audit non sia modificabile da ruoli ordinari e che la lettura sia correttamente segregata per workspace; che l'esercizio chiuso, pagamenti senza unità/membro, comproprietari e allocazioni multiple siano gestiti coerentemente. L'audit non è una sostituzione di un test transazionale.

## 3. Generazione rate e lock di concorrenza

La migrazione `20261001083500_lock_concurrent_installment_generation.sql` aggiunge un `pg_advisory_xact_lock` alla specifica funzione `generate_installments_from_allocations_schedule`, prima delle verifiche di stato e della generazione. La lock è transazionale e quindi rilasciata al commit/rollback. Il file contiene controlli per condominio archiviato, esercizio, scadenze, percentuali, spesa valida, rate già esistenti e ripartizioni.

**Da provare:** che ogni percorso UI/API di generazione richiami questa precisa firma; che eventuali generatori alternativi condividano la medesima chiave di lock o siano protetti da vincoli univoci; che due richieste simultanee non generino duplicati; che la chiave advisory abbia scope coerente tra workspace, condominio e voce contabile; che l'unificazione per proprietario rispetti comproprietari e unità con titolarità non risolta.

## 4. Riporti fiscali e protezioni contabili

La migrazione `20261001082000_fix_fiscal_carryover_regeneration.sql` blocca gli esercizi di origine e destinazione, verifica stato, successione temporale, archivio e compensazioni esistenti prima della rigenerazione dei riporti. Le migrazioni `20260930205000`, `20260930206000`, `20260930208000` e `20260930209000` aggiungono guardie su cancellazioni a cascata, allocazioni, letture di consumo, saldo iniziale e fondi.

**Da provare:** completezza del grafo FK; compatibilità tra guardie e RPC autorizzate; concorrenza tra chiusura/riporto e pagamenti; riporti con compensazioni o aggiustamenti manuali; allineamento saldo di esercizio, ledger, rate e residui per unità. Le guardie basate su trigger non dimostrano da sole assenza di race condition.

## 5. Esito e azioni

- **Confermato staticamente:** la sostituzione della RPC pagamento in `20260930207000` conserva la sovrascrittura di `v_new_paid` prima del `return`.
- **Confermato staticamente:** è presente una lock advisory nel generatore rate della migrazione `20261001083500`; non è dimostrato che tutti i percorsi applicativi usino la stessa funzione/lock.
- **Presente ma non certificato:** audit storni, ricalcolo trigger e guardie di integrità contabile; richiedono prove runtime e verifica privilegi effettivi.
- **Non verificato:** corpo installato in produzione, replay end-to-end, isolamento tra ruoli/workspace, test concorrenti e correttezza UI/API del valore restituito.

**Gate:** baseline QA ancora **BLOCCATA**. Questa revisione non autorizza né comporta SQL in produzione, replay/reset, modifica di `main`, merge o deploy.
