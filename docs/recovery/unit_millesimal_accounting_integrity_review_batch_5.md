# Unità, millesimi e continuità contabile — review batch 5

**Ambito:** revisione statica di 13 migrazioni selezionate del branch `bethag-migration-repair`. Documento di audit, non SQL eseguibile.

## Riscontri principali

### Righe millesimali automatiche
`20260930180000_ensure_millesimal_rows_for_units.sql` crea righe millesimali a valore zero per le unità e le tabelle attive, con `ON CONFLICT DO NOTHING`, e applica un backfill. È coerente con il principio di non inventare quote, ma non dimostra la quadratura delle tabelle né l'assegnazione corretta per pertinenze autonome, unità escluse o fabbricati multipli. Collaudare unità preesistenti, nuove unità, nuove tabelle, tabelle disattivate/riattivate e ripetizione del backfill; verificare i vincoli univoci usati dal conflict target.

### Relazioni tra unità e pertinenze
`20260930184500_validate_unit_pertinence_relationship.sql` controlla UUID, auto-riferimenti, appartenenza allo stesso condominio e cicli, con limite di profondità 100. Il trigger è AFTER INSERT/UPDATE: la validazione può bloccare la transazione, ma è da verificare il comportamento in combinazione con altri trigger e vincoli. Un riferimento a un antenato con JSON malformato può causare errore nel cast a UUID. Il limite di profondità va specificato come regola di dominio: una catena valida che raggiunga il limite viene comunque respinta. Testare riferimenti mancanti, cross-condominio, cicli di 2+ unità, JSON malformato e catene lunghe.

### Eliminazione unità e storico
`20260930191500_harden_unit_delete_integrity.sql` impedisce l'eliminazione di unità con membri, pertinenze figlie, ripartizioni o rate. `20260930193000_allow_authorized_unit_delete.sql` consente la richiesta DELETE ai gestori autorizzati, lasciando il trigger come barriera d'integrità. È una protezione utile, ma il collaudo deve includere ulteriori riferimenti possibili (movimenti, millesimi, genealogia, trasformazioni, documenti e altri FK), e deve confermare che l'archiviazione sia il percorso ordinario quando esiste storico. La rimozione del trigger duplicato nella migrazione `20260930190000` va verificata rispetto alla definizione del trigger canonico e al suo effettivo mantenimento.

### Chiusura esercizio e riporti
`20260930195000_atomic_fiscal_year_transition.sql` blocca le righe degli esercizi, verifica autorizzazione, stato e cronologia, chiude l'esercizio e genera riporti nel medesimo flusso transazionale. La generazione dei riporti calcola il saldo unitario dalle rate meno i movimenti di pagamento e lascia nullo il membro quando le rate di una unità non identificano un unico membro.
- Verificare con casi sintetici che i pagamenti siano conteggiati una sola volta, che storni/rimborsi siano rappresentati secondo il modello contabile e che arrotondamenti e segni di debito/credito siano coerenti.
- Collaudare esercizio senza successore, esercizio successivo già chiuso, date non contigue, richiamate concorrenti e ripetizione della generazione. Il lock delle righe non esclude da solo tutte le possibili corse su rate/movimenti inseriti in parallelo: va testata la concorrenza sulle tabelle sorgenti.
- La funzione aggiorna il saldo di apertura dell'esercizio target e rigenera i riporti per la coppia sorgente/destinazione: verificare la preservazione di rettifiche manuali e la politica di idempotenza.

### Integrità del libro mastro, rate e millesimi
- `20260930197000_guard_linked_ledger_entries.sql` impedisce cancellazione e modifica di attributi contabili essenziali delle voci già collegate a ripartizioni o rate. QA deve verificare quali campi restano modificabili e che le correzioni avvengano tramite rettifiche tracciate.
- `20260930201000_guard_installment_paid_amount.sql` riserva l'aggiornamento di `paid_amount` alla RPC pagamenti e blocca la modifica di dati essenziali delle rate già pagate. Verificare che RPC di pagamento, storno, rimborso e rettifica siano compatibili con il trigger.
- `20260930202000_guard_millesimal_integrity.sql` blocca modifiche/cancellazioni di valori o basi millesimali quando la tabella è usata da ripartizioni. La verifica si basa sulla presenza di allocazioni associate alla tabella: controllare che tutte le tipologie di riparto rilevanti valorizzino correttamente `allocation_table_id`, e definire il processo di rettifica storica senza alterare silenziosamente la base originaria.
- Per i trigger che restituiscono `coalesce(NEW, OLD)`, verificare in PostgreSQL il comportamento in contesto DELETE e l'effetto effettivo sui trigger; non considerarlo certificato dalla sola lettura.

### Proprietari e ambito unità
- `20260930200000_clean_deleted_member_owner_references.sql` rimuove dall'array JSON `ownerMemberIds` il legacy_id del membro cancellato.
- `20260930214000_repair_unit_owner_references.sql` ricostruisce i riferimenti JSON a partire dai membri qualificati come Proprietario, mentre `20260930215000_validate_unit_owner_member_refs.sql` verifica che ciascun riferimento identifichi esattamente un proprietario nello stesso condominio.
- Questo modello mantiene una relazione duplicata tra tabella membri e JSON. Va chiarito quale sia la fonte autorevole (la relazione `condominium_members.unit_id` appare usata dal repair) e testato che inserimento, cambio ruolo/unità, cancellazione, subentro, comproprietà e trasformazione aggiornino entrambi i lati senza perdere proprietari legittimi. Il trigger di validazione non esplicita un confronto workspace; verificare i vincoli FK/trigger di scope che completano il controllo.
- `20260930211000_guard_unit_scope_changes.sql` blocca il trasferimento tra workspace/condomini e le modifiche di fabbricato/edificio/civico quando esiste storico contabile. Testare le varie rappresentazioni JSON di civico/fabbricato e assicurare che tutte le operazioni di fusione, frazionamento e cambio dati catastali seguano un flusso controllato.

## Matrice QA minima

1. Inserimento unità/tabelle millesimali con dati vuoti, parziali e già popolati; nessuna quota inventata e nessun duplicato.
2. Pertinenze autonome, collegate, scollegate, cross-condominio, cicliche e catene oltre il limite; verifica rollback.
3. DELETE unità con ciascuna dipendenza finanziaria/anagrafica e DELETE autorizzato senza dipendenze.
4. Chiusura esercizio con pagamenti parziali, storni, saldo positivo/negativo, più membri per unità, nessun esercizio target, target chiuso, retry e concorrenza.
5. Modifiche dirette a voci contabili, rate e millesimi collegate; confermare blocco e percorso alternativo di rettifica auditabile.
6. Comproprietari, ruolo non proprietario, cancellazione/subentro e riallineamento degli owner refs, incluse identità duplicate o dati legacy mancanti.
7. Cambio workspace/condominio/fabbricato/civico prima e dopo la registrazione di movimenti.

## Stato e limiti

La revisione è statica e limitata ai file elencati. Non sono stati eseguiti replay, SQL, test runtime o test di concorrenza. Il baseline QA resta bloccato dalla riconciliazione incompleta delle migrazioni e dall'assenza di replay certificato in ambiente isolato. Nessuna modifica a Supabase produzione, `main`, merge o deploy.
