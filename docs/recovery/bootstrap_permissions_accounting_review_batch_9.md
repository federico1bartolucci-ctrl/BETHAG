# BETHAG — bootstrap, autorizzazioni collaboratori e fondamenti contabili — review batch 9

**Branch:** `bethag-migration-repair`  
**Ambito:** lettura statica di 10 migrazioni selezionate; documento di audit, non migrazione eseguibile.  
**Stato:** baseline non certificata; nessun replay, test runtime o scrittura su produzione eseguiti.

## Migrazioni esaminate

- `20260928060000_expose_first_admin_bootstrap.sql`
- `20260928070000_save_condominium_rpc.sql`
- `20260928081000_delete_condominium_rpc.sql`
- `20260928090000_collaborator_module_write_permissions.sql`
- `20260928093000_align_portal_request_access.sql`
- `20260928160001_include_regolamento_inquilino.sql`
- `20260929110000_add_condominium_insurance_policies.sql`
- `20260929170500_remove_member_millesimi.sql`
- `20260929230443_sync_allocation_payment_status.sql`
- `20260929232000_harden_fiscal_year_closure.sql`

## Riscontri statici

### 1. Bootstrap del primo amministratore
La migrazione espone una RPC pubblica che delega la logica a `private.claim_first_workspace_admin`, revoca l'esecuzione pubblica e la concede ad `authenticated`. La sicurezza sostanziale è quindi nella funzione privata richiamata e nel suo controllo di unicità/ammissibilità del primo amministratore, non nel wrapper. **Da verificare:** definizione completa e grants della funzione privata, comportamento con workspace già rivendicato, richieste concorrenti e invocazioni con workspace esplicito/non esplicito.

### 2. Salvataggio del condominio
`save_condominium` è `SECURITY DEFINER`, richiede `auth.uid()` e `private.can_manage_workspace_module(workspace,'condomini')`; usa upsert su `(workspace_id, legacy_id)`. **Da verificare:** che il vincolo univoco esista e sia coerente, che il payload JSON non possa sovrascrivere campi di sicurezza tramite altri percorsi, che il controllo modulo e la tabella workspace siano coerenti con la membership attiva e che la UI distingua creazione da aggiornamento. Nessuna prova runtime disponibile.

### 3. Cancellazione permanente e duplicazione della RPC
La migrazione `20260928070000` contiene già una definizione di `delete_condominium`; `20260928081000` la ridefinisce quasi identicamente. Entrambe verificano autenticazione e amministratore del workspace e poi eliminano esplicitamente una serie di tabelle collegate. La duplicazione è un segnale di storia evolutiva da riconciliare, non prova di errore in sé. La cancellazione è hard-delete, distinta dall'archiviazione. **Blocco:** confrontare l'insieme di dipendenze con la successiva hard-delete migration, tutte le FK e gli oggetti Storage; provare atomicità, autorizzazioni e conferma esplicita su QA. Non usare la cancellazione come sostituto dell'archiviazione.

### 4. Permessi modulari dei collaboratori
`private.can_manage_workspace_module` consente l'accesso a membri attivi con ruolo admin oppure collaborator con il permesso richiesto nell'array JSON. La migrazione sostituisce diverse policy `FOR ALL` di tabelle gestionali, usando helper e permessi distinti per modulo. **Da verificare:** coerenza dei nomi permesso con UI e RPC, semantica delle policy precedenti, righe con workspace nullo/incoerente, comportamento di collaboratore inattivo o rimosso, e separazione tra lettura e scrittura quando la policy `FOR ALL` non è l'unica policy applicabile. Richiesto test negativo cross-workspace e test per ogni modulo.

### 5. Accesso residenti e consiglieri
`can_access_resident_condominium` richiede accesso portale attivo, ruolo resident/council e corrispondenza con membro attivo per email; accetta il collegamento tramite user id oppure email JWT normalizzata in minuscolo. `can_access_condominium` unisce accesso amministrativo/modulare e accesso residente. **Da verificare:** email nulla/vuota o non normalizzata, collegamento user_id/email discordante, più membri con email equivalente, revoca immediata dell'accesso e semantica delle policy chiamanti. Il controllo statico non dimostra isolamento runtime.

### 6. Permessi specifici dell'inquilino
Il trigger di sincronizzazione assegna all'inquilino `pagamenti_ordinari`, `comunicazioni`, `regolamento`; al proprietario assegna un insieme più ampio di permessi. Il trigger cerca il membro per user id o email, privilegiando user id e considerando solo membri attivi. **Da verificare:** cambi ruolo, doppia corrispondenza user/email, coabitazione/comproprietà, permessi preesistenti per ruoli diversi da quelli esplicitamente gestiti e sincronizzazione tra trigger, profilo portale e interfaccia.

### 7. Polizze assicurative
La migrazione crea/integra la tabella polizze, indice condominio/scadenza, RLS e policy di lettura per membri attivi del workspace o accessi portale resident/council; la policy di gestione usa il permesso modulo `condomini`. **Da verificare:** allineamento workspace/condominio con vincolo o trigger, accesso ai documenti riferiti da `document_id`, visibilità al portale rispetto a flag di pubblicazione, privilegi effettivi e compatibilità delle colonne in installazioni con schema preesistente.

### 8. Rimozione dei millesimi legacy
`20260929170500` esegue un UPDATE che rimuove la chiave JSON `millesimi` da tutti i membri che la possiedono. È una trasformazione dati, non una semplice modifica strutturale. Prima di considerarla corretta occorre dimostrare che i valori siano stati migrati e riconciliati sulle unità, che non esistano unità orfane e che i totali e le tabelle millesimali restino coerenti. Il catalogo o la sola presenza della tabella non prova la conservazione dei valori rimossi.

### 9. Sincronizzazione dello stato pagamenti
La funzione registra il pagamento, blocca la rata con `FOR UPDATE`, aggiorna il pagato della rata e sincronizza le allocazioni per la stessa voce contabile/unità. In questa versione la variabile `v_new_paid` è restituita come totale pagato della rata e l'allocazione usa `v_unit_paid`, evitando il riuso variabile segnalato in una migrazione successiva. Occorre quindi confrontare le definizioni cronologiche effettivamente finali e il contratto RPC, non valutare una versione isolata. **Da verificare:** atomicità, importi parziali/totali, tolleranza di arrotondamento, più rate per stessa unità/voce, allocazioni multiple, storni, retry e concorrenza. L'esame statico di questa versione non prova quale corpo sia effettivo dopo l'intera sequenza.

### 10. Chiusura dell'esercizio
Il trigger impedisce la cancellazione di esercizi chiusi o con dati collegati nelle tabelle ledger, rate e budget; inoltre applica la guardia di immutabilità ai budget e valida scope workspace/condominio, intervallo date, nome, stato e sovrapposizioni. **Da verificare:** copertura di tutte le FK contabili e dei riporti/compensazioni, semantica NULL per workspace e date, aggiornamenti concorrenti che creano periodi sovrapposti e comportamento dei trigger già installati. La validazione applicativa non sostituisce un vincolo concorrente nel database.

## Test QA richiesti

1. Bootstrap con due amministratori concorrenti e workspace già inizializzato.
2. Save/upsert con admin, collaborator autorizzato/non autorizzato, workspace estraneo e legacy id duplicato.
3. Hard-delete vs archive: ruoli, grafo FK, Storage, audit, rollback e conferma UI.
4. Matrice permessi collaboratore per ogni modulo, incluse lettura/scrittura e accesso diretto RPC.
5. Portale: proprietario, inquilino, consigliere, membro inattivo, email mismatch, user_id/email discordanti e revoca.
6. Polizze: workspace/condominio incoerenti, file privati, resident/council e manager senza permesso.
7. Migrazione millesimi: snapshot prima/dopo, valori legacy, unità autonome/pertinenze e quadratura dei totali.
8. Pagamenti: parziale, saldo, multipla allocazione, storno, doppio invio, concorrenza e rollback.
9. Esercizi: chiuso, dati collegati, periodi sovrapposti, workspace mismatch e scritture concorrenti.

## Esito

Questa batch aggiunge evidenze su bootstrap, autorizzazioni modulari, accesso portale, polizze, trasformazione dei dati millesimali e controlli contabili. Non chiude la riconciliazione semantica dell'intero set di 132 file e non certifica replay o runtime. La baseline QA resta **BLOCCATA**; produzione resta read-only. Nessuna migrazione è stata eseguita e nessun merge/deploy è stato effettuato.
