# Follow-up — verifica dei vincoli finali su trasferimenti e trasformazioni

**Branch:** `bethag-migration-repair`  
**Ambito:** confronto statico di migrazioni selezionate del ciclo di vita.  
**Tipo:** nota di audit; non contiene SQL da eseguire.

## Evidenze verificate nel sorgente

### Trasferimento del titolare
- `20261001104500_add_condominium_member_transfer.sql` crea il registro dei trasferimenti, abilita RLS, definisce policy manager e indici, e introduce la funzione di conferma.
- `20261001111500_capture_transfer_accounting_snapshot.sql` sostituisce la funzione di conferma e incorpora uno snapshot JSON con rate dovute entro la data di trasferimento, importi pagati e residui, allocazioni entro data (o senza data), e spese di unità con data di registrazione/delibera.
- La funzione di conferma disattiva il membro uscente, crea il nuovo membro e registra il trasferimento come confermato nella stessa funzione PL/pgSQL. Ciò va provato come transazione completa in QA, compresi errori durante inserimento del nuovo membro e vincoli univoci.
- `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` sostituisce la logica per mantenere la posizione uscente attiva con stato di chiusura in corso, quindi introduce la chiusura separata e l'archiviazione della posizione uscente. Il comportamento finale deve essere letto come combinazione della funzione più recente e dei vincoli rimasti attivi, non isolando una singola migrazione.
- La funzione snapshot registra anche `legal_liability_review_required=true`: è un'indicazione per la revisione, non una decisione automatica sulla ripartizione giuridica dei debiti.

### Anomalia di vincolo da mantenere aperta
La precedente revisione statica del catalogo di produzione ha rilevato due CHECK distinti sullo stato in `condominium_member_transfers`:
- `condominium_member_transfers_status_check` ammette `Bozza`, `Confermato`, `Chiuso`, `Annullato`;
- `condominium_member_transfers_status_ck` ammette `Bozza`, `Confermato`, `Annullato`, senza `Chiuso`.

La migrazione `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` rimuove e ricrea il vincolo chiamato `condominium_member_transfers_status_check`; dal sorgente esaminato non risulta che rimuova anche il vincolo distinto `..._status_ck`. Se entrambi restano validi, lo stato `Chiuso` continua a essere respinto dal secondo CHECK. Questo è un blocco funzionale da risolvere e provare in QA; non applicare una correzione alla produzione sulla sola base dell'ispezione statica.

### Trasformazioni catastali
- `20261001095000_add_unit_cadastral_transformations.sql` crea le tabelle di trasformazione e gli elementi collegati, aggiunge indici, RLS, grants e policy manager; la migrazione presuppone l'esistenza di `condominium_units`.
- `20261001102100_unit_transformation_snapshots.sql` aggiunge campi snapshot alla trasformazione.
- `20261001133000_guard_confirmed_unit_transformation_integrity.sql` aggiunge un vincolo d'integrità per le trasformazioni confermate.
- `20261001140000_lock_confirmed_unit_transformation_audit.sql` protegge trasformazioni confermate e relativi elementi dall'alterazione.
- `20261001150000_require_trusted_unit_transformation_confirmation.sql`, `20261001153000_require_confirmed_genealogy_for_unit_lifecycle.sql` e `20261001160000_validate_confirmed_unit_transformation_genealogy.sql` introducono guardie e validazioni collegate a conferma attendibile e genealogia.
- `20261001170000_require_active_units_for_transformation_confirmation.sql` aggiorna la validazione per richiedere che tutte le unità fonte e destinazione siano attive, appartengano al medesimo workspace/condominio e corrispondano ai conteggi registrati; controlla inoltre cardinalità minime per fusione e frazionamento.
- `20261001173000_require_resolved_reviews_for_confirmed_unit_transformations.sql` aggiunge e valida un CHECK che consente la conferma solo se la revisione contabile è non necessaria/risolta e la revisione millesimale è confermata invariata/nuove tabelle.

## Test QA richiesti
1. Trasferimento: conferma riuscita, errore intermedio con rollback, duplicato unità/data, proprietario entrante già attivo, condominio archiviato, identità entrante già collegata.
2. Contabilità: confrontare snapshot e registri sorgente con rate scadute/non scadute, pagamenti parziali, storni, allocazioni senza data e spese deliberate prima della data ma registrate dopo.
3. Ciclo chiusura: passare da confermato a chiuso; verificare vincoli di stato attivi, disattivazione finale e conservazione dello storico economico.
4. Trasformazione: conferma con unità non attive, fuori workspace, duplicate, mancanti, conteggi incoerenti e genealogia non valida; tutte devono fallire senza lasciare modifiche parziali.
5. Conferma: provare revisioni contabili/millesimali pendenti e valori non ammessi; la trasformazione non deve diventare confermata.
6. Immutabilità: tentare update/delete diretto dei record confermati e verificare che i percorsi autorizzati di audit non siano compromessi.

## Esito
La lettura statica chiarisce i prerequisiti e mantiene visibile l'incoerenza potenziale dei CHECK di stato. Non dimostra il comportamento effettivo del database: non è stato eseguito replay, test runtime o SQL sulla produzione. La baseline continua a essere **non certificata**; questa nota non autorizza migrazioni, reset, merge o deploy.
