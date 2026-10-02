# BETHAG — verifica di collegamento applicazione/RPC finanziarie — batch 12

**Branch:** `bethag-migration-repair`  
**Tipo:** verifica statica del codice client e delle migrazioni disponibili.  
**Stato:** nessun test runtime; nessuna modifica applicativa o al database.

## Ambito

Sono stati confrontati `src/AccountingPage.tsx` e le migrazioni che definiscono le RPC di pagamento e generazione rate nel branch `bethag-migration-repair`.

## 1. Difetto del valore restituito dal pagamento: propagazione UI confermata

In `src/AccountingPage.tsx`, la funzione `savePayment` chiama `register_condominium_installment_payment`, legge `data` e la presenta direttamente all'utente nel messaggio “Nuovo totale pagato”. Non ricalcola il valore dal record rata aggiornato né lo valida rispetto all'importo rata.

Nella migrazione `20260930207000_allow_payment_rpc_allocation_update.sql`, la RPC aggiorna `v_new_paid` al totale pagato della rata, ma nel successivo ciclo delle allocazioni riutilizza la stessa variabile per il valore pagato dell'allocazione; il `return v_new_paid` restituisce quindi il valore sovrascritto se il ciclo viene eseguito. La migrazione successiva esaminata `20261001083000_payment_reversal_audit_and_reconciliation.sql` ridefinisce il trigger di sincronizzazione e la RPC di storno, non questa RPC di registrazione.

**Esito:** la discrepanza non è solo teorica rispetto all'interfaccia: il client mostra il valore di ritorno RPC come totale rata. Il difetto può produrre un messaggio di conferma errato anche se la scrittura del pagamento e il ricalcolo dei dati persistiti sono riusciti. Non è stata verificata la definizione effettivamente installata in produzione.

**Correzione da pianificare in QA:** separare il valore `v_installment_paid` dal valore `v_allocation_paid` nella RPC e restituire esplicitamente il primo. Nel client, dopo il successo, ricaricare la rata aggiornata e usare il valore persistito come conferma visuale, mantenendo la risposta RPC per eventuali errori/contratto applicativo. Non modificare produzione prima della baseline QA e della revisione della migrazione correttiva.

## 2. Generazione rate: collegamento alla RPC con lock confermato nel sorgente

La funzione `generateInstallmentsFromAllocation` in `src/AccountingPage.tsx` chiama la RPC `generate_installments_from_allocations_schedule` con workspace, condominio, voce contabile, scadenze, percentuali e opzione di unificazione. La migrazione `20261001083500_lock_concurrent_installment_generation.sql` sostituisce questa firma e acquisisce una advisory transaction lock.

**Esito:** il percorso principale presente nel componente usa il nome della RPC protetta dalla migrazione. Resta da verificare in runtime che il catalogo QA abbia quella versione della funzione, che non esistano altri percorsi client o backend che generano rate diversamente e che la lock protegga correttamente le richieste concorrenti.

## 3. Contratto client e test di accettazione

Test da eseguire in ambiente QA isolato, con identità e dati sintetici:

1. Registrare un pagamento parziale su rata collegata a una sola allocazione: conferma UI uguale al nuovo `paid_amount` persistito.
2. Ripetere su rata collegata a più allocazioni: conferma UI uguale al totale rata, non al valore dell'ultima allocazione.
3. Pagare il residuo esatto: rata e allocazioni passano allo stato coerente, senza superamento per arrotondamento.
4. Simulare errore RPC: il form non mostra conferma di successo e conserva un messaggio d'errore.
5. Lanciare due generazioni concorrenti per la stessa voce: una sola generazione completa e nessun duplicato.
6. Verificare che l'eventuale chiamata diretta della RPC sia negata a ruoli non autorizzati e su workspace/condominio non corrispondenti.

## Limiti

Questa è un'ispezione statica di sorgente e migrazioni nel branch. Non prova l'esecuzione del client, la risposta di Supabase in un ambiente attivo, l'effettiva definizione in produzione, la concorrenza o i privilegi effettivi. Nessun SQL è stato eseguito; nessun dato, migrazione, storico o configurazione di produzione è stato modificato. La baseline QA resta **BLOCCATA** e non si certifica il lancio.
