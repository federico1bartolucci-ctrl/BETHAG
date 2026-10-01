# Pagamenti, riporti e integrità contabile — review batch 6

**Ambito:** revisione statica di 11 migrazioni selezionate del branch `bethag-migration-repair`. Questo documento registra osservazioni e test da eseguire; non è una migrazione SQL.

## Riscontri

### 1. Registrazione dei pagamenti rateali
`20260930130000_harden_installment_payment.sql` valida il permesso contabile, l'importo positivo, la rata nel workspace/condominio, lo stato dell'esercizio e la data del pagamento. Blocca la rata con `FOR UPDATE`, registra il movimento e aggiorna il pagato e lo stato della rata.

La successiva `20260930207000_allow_payment_rpc_allocation_update.sql` rende la RPC `SECURITY DEFINER`, revoca i privilegi diretti sui movimenti e introduce un flag transaction-local per consentire alla RPC l'aggiornamento del pagato nelle allocazioni.

**Possibile difetto da verificare/correggere:** la variabile `v_new_paid`, inizialmente calcolata come totale pagato della rata, viene riutilizzata nel ciclo delle allocazioni per contenere il pagato dell'allocazione (`least(allocation.amount, sum(installment.paid_amount))`). La funzione restituisce poi `v_new_paid`. Se il ciclo viene eseguito, il valore restituito può quindi essere il pagato dell'ultima allocazione aggiornata anziché il totale pagato della rata. Separare le variabili (es. `v_installment_paid` e `v_allocation_paid`) e verificare il contratto atteso dalla UI/chiamanti prima di intervenire.

Altri test necessari:
- pagamento parziale, saldo completo, importo con più di due decimali, soglia di arrotondamento e residuo minimo;
- due pagamenti concorrenti sulla stessa rata, retry e invio duplicato;
- esercizio chiuso, data fuori esercizio, rata senza esercizio, storno e rettifica;
- rata associata a più allocazioni, più rate sulla stessa voce contabile e unità senza allocazione corrispondente;
- confermare che il flag custom transaction-local non abiliti aggiornamenti fuori dal percorso autorizzato e che la RPC mantenga il controllo workspace/modulo.

### 2. Riporti fiscali
`20260930150000_harden_fiscal_carryover_member_scope.sql` rigenera i riporti per unità e lascia `member_id` nullo quando le rate dell'unità coinvolgono più membri. È coerente con una gestione a livello di unità nei casi di identità non univoca, ma il significato contabile e la successiva attribuzione del residuo devono essere espliciti.

La versione `20260930195000_atomic_fiscal_year_transition.sql` aggiunge lock sugli esercizi, chiusura e generazione dei riporti nel flusso della transizione. La generazione ricalcola i riporti per la coppia esercizi ed elimina i precedenti record della stessa coppia prima di inserirli: verificare come vengono conservate compensazioni, rettifiche o annotazioni manuali già associate ai riporti, in particolare in caso di rigenerazione.

La somma dei movimenti di pagamento è aggregata per rata e collegata alle rate sorgenti; occorre confrontare il risultato con storni, rimborsi, rettifiche e movimenti non standard. La chiusura blocca le righe degli esercizi, ma la concorrenza con nuovi movimenti sulle rate deve essere provata nel database QA.

### 3. Compensazioni dei riporti
`20260930160000_fiscal_carryover_compensation.sql` crea la tabella delle compensazioni e la RPC, con lock sulla partita e, se specificata, sulla rata target. `20260930161000_harden_carryover_compensation_semantics.sql` restringe l'uso delle partite: solo un credito riportato può essere applicato a una rata corrente, della stessa unità, e considera le compensazioni già applicate alla rata.

Test da eseguire:
- compensazione parziale e totale, ripetizione, importo superiore al residuo e valori non finiti;
- più richieste concorrenti sulla stessa partita e sulla stessa rata;
- credito/debito riportato, target appartenente ad altra unità/workspace/condominio e target già saldato;
- verifica della coerenza tra residuo, stato, compensazioni registrate e rata, anche dopo storni e rigenerazione dei riporti;
- confermare l'atomicità se un insert o update collegato fallisce.

### 4. Protezione dei movimenti e cancellazioni a cascata
`20260930200500_harden_payment_movements_access.sql` revoca agli utenti autenticati inserimento, modifica e cancellazione diretti dei movimenti di pagamento e lascia la lettura; la scrittura passa dalla RPC privilegiata. Verificare che policy RLS, grants e privilegi effettivi della funzione siano coerenti e che gli altri ruoli non dispongano di un percorso alternativo.

`20260930205000_guard_accounting_cascade_deletes.sql` aggiunge guardie contro la cancellazione di voci contabili con ripartizioni, tabelle millesimali con quote/ripartizioni e rate con movimenti. La copertura è specifica alle dipendenze verificate dalle query della funzione: confrontarla con l'intero grafo FK e con cancellazioni multi-tabella, inclusi hard-delete del condominio e flussi amministrativi.

### 5. Integrità delle allocazioni, consumi e fondi
- `20260930206000_guard_expense_allocation_integrity.sql` protegge allocazioni pagate o collegate a rate. La migrazione successiva introduce un flag per autorizzare il solo aggiornamento del pagato durante la RPC di pagamento. Provare che aggiornamenti di importo, unità, voce contabile o tenant restino bloccati quando esiste storico.
- `20260930208000_guard_consumption_and_opening_balance.sql` impedisce modifiche alle letture già utilizzate nei riparti e protegge il saldo iniziale dopo la generazione dei riporti. Verificare che la relazione tra lettura e riparto sia completa e che una rettifica autorizzata abbia un percorso tracciabile.
- `20260930209000_guard_fund_integrity.sql` controlla valori non negativi e impedisce che l'utilizzato superi l'allocato. Verificare importi nulli, precisione, aggiornamenti concorrenti e coerenza con il libro mastro.
- `20260930210500_validate_allocation_rule_scope.sql` controlla tabella millesimale, workspace/condominio, priorità e campi identificativi della regola. Restano da testare regole duplicate o sovrapposte, priorità uguali e conflitti tra categoria e tipo spesa.

## Casi di accettazione QA

1. Pagamenti concorrenti e idempotenza senza sovrapagamenti o movimenti duplicati.
2. Valore di ritorno della RPC confrontato con il totale pagato rata e con il pagato allocazione.
3. Riconciliazione matematica di rate, pagamenti, allocazioni e residui per casi parziali, completi e con storni.
4. Chiusura e riapertura controllata di esercizi con riporti, compensazioni e annotazioni preesistenti.
5. Compensazioni concorrenti, parziali/totali e applicate a rate con saldo residuo.
6. Tentativi diretti di INSERT/UPDATE/DELETE sui movimenti e modifiche a record protetti con ruoli differenti.
7. Cancellazioni a cascata su dati sintetici completi, verificando rollback e conservazione dello storico.
8. Regole di riparto e fondi con valori limite, duplicati e operazioni concorrenti.

## Limiti e stato

La review è statica e circoscritta ai file indicati. Non sono stati eseguiti replay, query di modifica, test runtime, test di concorrenza o collaudi di UI. Il baseline QA rimane bloccato finché la riconciliazione semantica della cronologia non è completata e il replay non è riuscito in un ambiente isolato. Nessuna scrittura su Supabase produzione, nessuna modifica a `main`, nessun merge o deploy.
