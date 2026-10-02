# BETHAG — pagamenti, riporti, unità e integrità millesimale — review batch 10

**Branch:** `bethag-migration-repair`  
**Ambito:** revisione statica di 15 migrazioni selezionate. Documento di audit, non SQL eseguibile.  
**Stato:** nessun replay o test runtime; baseline QA ancora bloccata.

## Migrazioni esaminate

- `20260930130000_harden_installment_payment.sql`
- `20260930150000_harden_fiscal_carryover_member_scope.sql`
- `20260930160000_fiscal_carryover_compensation.sql`
- `20260930161000_harden_carryover_compensation_semantics.sql`
- `20260930180000_ensure_millesimal_rows_for_units.sql`
- `20260930184500_validate_unit_pertinence_relationship.sql`
- `20260930190000_remove_duplicate_unit_relationship_trigger.sql`
- `20260930191500_harden_unit_delete_integrity.sql`
- `20260930193000_allow_authorized_unit_delete.sql`
- `20260930195000_atomic_fiscal_year_transition.sql`
- `20260930197000_guard_linked_ledger_entries.sql`
- `20260930200000_clean_deleted_member_owner_references.sql`
- `20260930200500_harden_payment_movements_access.sql`
- `20260930201000_guard_installment_paid_amount.sql`
- `20260930202000_guard_millesimal_integrity.sql`

## Riscontri statici

### Pagamenti e contratto RPC
La migrazione `20260930130000` richiede il permesso contabile, blocca la rata con `FOR UPDATE`, valida residuo e data, registra il movimento e aggiorna la rata e le allocazioni. Tuttavia riutilizza `v_new_paid`: dopo aver calcolato il nuovo totale pagato della rata, la sovrascrive nel ciclo delle allocazioni con il pagato allocato e restituisce tale variabile. Se esistono allocazioni, il valore restituito può quindi non rappresentare il totale pagato della rata. Questo è un difetto concreto del corpo di questa migrazione, ma va verificato il corpo finale dopo tutte le successive `CREATE OR REPLACE FUNCTION`. La revisione precedente aveva già individuato il rischio di variabile di ritorno sovrascritta.

**Azione QA:** definire il contratto della RPC; verificare risposta e stato persistito per pagamento parziale, saldo, più allocazioni, più rate per unità/voce, retry, concorrenza, storno e rollback. Correggere solo nella migrazione/funzione finale del branch dopo aver stabilito la baseline.

### Riporti e compensazioni
La generazione dei riporti raggruppa le rate per unità e assegna `member_id` soltanto se esiste un unico membro distinto nelle rate. Questo evita attribuzioni arbitrarie in presenza di più persone, ma richiede una regola di prodotto esplicita per comproprietari, conduttori e passaggi di titolarità. Le migrazioni di compensazione bloccano il riporto, validano importo e residuo e registrano un evento di compensazione; la successiva versione vieta di applicare debiti riportati a rate correnti e sottrae le compensazioni già applicate al residuo rata.

**Da verificare:** che le due versioni siano coerenti con il corpo effettivo finale; che workspace/condominio della rata e del riporto siano allineati anche tramite vincoli; che ogni compensazione sia applicata una sola volta; che annullamenti/storni e rigenerazione riporti non cancellino la traccia; che i conteggi non duplicano importi in join; che il saldo individuale riconcili con libro mastro, rate e movimenti.

### Righe millesimali automatiche
I trigger creano righe a valore zero per unità nuove o nuove tabelle attive, e la migrazione inserisce anche le righe mancanti già presenti. Il commento specifica correttamente che zero non significa assegnazione automatica di millesimi. **Da verificare:** effetto su tabelle non quadrate, unità escluse, pertinenze autonome, nuove unità riattivate, conflitti dell'indice `(workspace_id, table_id, unit_id)` e completezza del backfill. La presenza di righe non certifica una ripartizione valida.

### Pertinenze e ciclo di vita unità
La funzione valida UUID del riferimento, auto-riferimento, esistenza, stesso condominio, cicli e profondità massima. Il cast iniziale intercetta UUID non valido, ma il cast dei riferimenti attraversati nella catena non è racchiuso nello stesso handler: dati legacy malformati possono interrompere l'operazione con errore di conversione non specifico. Inoltre il controllo è un trigger AFTER: va testato che il fallimento annulli integralmente l'operazione e che aggiornamenti concorrenti non possano introdurre cicli.

La migrazione successiva rimuove un trigger duplicato e lascia il trigger canonico; la cancellazione unità blocca membri, pertinenze figlie, allocazioni e rate. La policy DELETE autorizza i gestori del modulo, lasciando al trigger il controllo d'integrità. **Da verificare:** copertura di ogni FK/oggetto finanziario, permessi effettivi, coerenza dei riferimenti JSON `ownerMemberIds` e `incorporatedInUnitId`, e impossibilità di cancellazione indiretta tramite cascade o hard-delete.

### Transizione esercizio e saldo iniziale
La funzione di transizione blocca gli esercizi origine/destinazione, richiede origine chiusa e destinazione successiva/aperta, calcola saldo di chiusura dal saldo iniziale e dalle entrate/uscite del ledger, aggiorna il saldo iniziale di destinazione e rigenera i riporti. La funzione di chiusura marca prima l'origine come chiusa e poi richiama la generazione nella stessa transazione PostgreSQL: un errore dovrebbe annullare l'intera transazione, ma ciò va dimostrato con test reali.

**Da verificare:** se il saldo iniziale trasferito e i riporti per unità sono due rappresentazioni complementari o potenzialmente duplicative; trattamento di rate, crediti, fondi e movimenti non-rate; esercizio destinazione mancante/chiuso; chiamate concorrenti; rigenerazione ripetuta e compensazioni manuali.

### Protezione ledger, rate e millesimi
Il guard ledger impedisce cancellazione di voci usate da allocazioni/rate e blocca modifiche a importo, direzione, esercizio e scope quando collegate. Il guard rate protegge `paid_amount` da aggiornamenti diretti e congela campi contabili di rate già pagate. I guard millesimali impediscono modifica/cancellazione di valori e basi usate da allocazioni esistenti. Sono protezioni importanti, ma i controlli basati su conteggi devono essere verificati contro scritture concorrenti e percorsi privilegiati; va inoltre provato il flusso legittimo di storno/rettifica senza perdita di audit.

### Pulizia riferimenti proprietario
Il trigger AFTER DELETE rimuove da `ownerMemberIds` i riferimenti corrispondenti al `legacy_id` del membro. La logica presuppone che l'array contenga quel formato di identificativo e lascia intatto il JSON se il condominio non è più risolvibile. **Da verificare:** UUID vs legacy ID nei dati effettivi, valori JSON non-stringa, membri multipli per unità, cancellazione con storico contabile e coerenza con le successive funzioni di riparazione/validazione proprietari.

### Privilegi dei movimenti di pagamento
La migrazione rende la RPC di pagamento `SECURITY DEFINER`, revoca INSERT/UPDATE/DELETE diretti sui movimenti e concede SELECT ad authenticated. È essenziale provare che il corpo finale della RPC abbia controlli espliciti di autenticazione e autorizzazione, search_path sicuro, grants corretti per la firma esatta e nessun overload accessibile indebitamente. La revoca di scritture dirette deve essere compatibile con storni e strumenti amministrativi previsti, che dovrebbero passare da RPC tracciate.

## Casi di collaudo richiesti

1. Pagamento: totale di ritorno RPC vs importo aggiornato rata e allocazioni multiple.
2. Pagamenti simultanei sulla stessa rata, doppio invio e retry con la stessa richiesta.
3. Compensazione: credito/debito, target stessa unità, residuo già compensato, ripetizione e storno.
4. Chiusura esercizio: errore dopo il cambio stato, verifica rollback, rigenerazione e chiamate concorrenti.
5. Quadratura indipendente tra saldo iniziale, ledger, rate, movimenti, allocazioni, riporti e compensazioni.
6. Millesimi: zero iniziale, tabelle incomplete, escluse, pertinenze e backfill senza perdita.
7. Pertinenze: auto-link, unità di altro condominio, ciclo diretto/indiretto, UUID malformato e concorrenza.
8. Delete unità: member linked, pertinenza figlia, rate, allocazioni, altri riferimenti FK e accesso manager/non-manager.
9. Guard: aggiornamenti diretti, RPC autorizzate, storni e rettifiche con audit.
10. Owner references: identificativi legacy e UUID, JSON malformato e più proprietari.

## Esito

La batch individua un rischio concreto nella variabile di ritorno della versione `20260930130000` della RPC di pagamento e diverse condizioni che richiedono confronto col corpo finale e test runtime. Non prova che il difetto sia presente nel corpo effettivamente installato dopo tutte le migrazioni. Nessun replay, test runtime o modifica a Supabase produzione è stato eseguito. La baseline QA rimane **BLOCCATA**; non autorizza merge o deploy.
