# Revisione mirata — trasferimento titolarità e avvisi Supabase

**Data:** 2026-10-03  
**Branch:** `bethag-migration-repair`  
**Ambito:** funzioni runtime di trasferimento lette dai cataloghi PostgreSQL di produzione e advisor Supabase. Analisi statica, nessuna modifica al database.

## Evidenze runtime

Le funzioni esposte `public.confirm_condominium_member_transfer(...)` e `public.close_condominium_member_transfer(uuid)` sono wrapper `SECURITY DEFINER` con `search_path TO ''`, eseguibili da `authenticated`. Entrambe delegano a funzioni omonime nello schema `private`. Le implementazioni private sono anch'esse `SECURITY DEFINER`, hanno `search_path TO ''` e ACL osservata `postgres=X/postgres`; non risultano direttamente eseguibili da `authenticated` nell'ACL letta.

Le implementazioni private verificano `auth.uid() IS NOT NULL` e autorizzazione del gestore tramite `private.can_manage_workspace_module(v_workspace,'condomini')`. La conferma blocca la riga dell'unità con `FOR UPDATE`, controlla che il cedente sia proprietario attivo dell'unità, impedisce una seconda conferma nella stessa data e rifiuta un altro proprietario attivo concorrente. La chiusura blocca il trasferimento e verifica che le posizioni contabili aperte del cedente siano chiuse prima di archiviare la posizione e marcare il trasferimento come chiuso.

L'advisor security segnala due RPC pubbliche `SECURITY DEFINER` eseguibili da utenti autenticati. Il rilievo descrive l'esposizione, ma non dimostra da solo una vulnerabilità: in questo caso i wrapper delegano a implementazioni private che effettuano verifiche di autenticazione e autorizzazione. Non revocare l'EXECUTE senza prima modificare il client e verificare il flusso legittimo; evitare di indebolire o rimuovere i controlli interni.

## Rischi residui da risolvere

1. **Associazione dell'identità entrante:** `p_incoming_user_id` è accettato e scritto nel nuovo membro senza che la funzione confronti esplicitamente l'email verificata dell'account con `p_incoming_email`, né dimostri che quell'account abbia richiesto/accettato il subentro. L'autorizzazione del gestore a operare sul condominio non equivale alla verifica dell'identità del nuovo titolare. Definire il modello previsto (account già autenticato, invito verificato o registrazione successiva) e imporre il relativo controllo server-side.
2. **Chiusura finanziaria:** `close_condominium_member_transfer` controlla importi residui su rate, allocazioni e riporti fiscali del cedente. Il controllo è aggregato sull'intera posizione del membro e non filtra per unità o data del trasferimento. Confermare se il requisito è chiudere ogni posizione del soggetto oppure soltanto la posizione relativa all'unità trasferita; rendere esplicita la regola anche nella UI.
3. **Continuità contabile:** la conferma registra uno snapshot con rate/allocazioni entro la data e conserva il membro cedente, ma non trasferisce automaticamente le registrazioni storiche al nuovo membro. È una separazione prudenziale dei riferimenti, ma il trattamento delle spese per competenza, delle rate con scadenza successiva, dei pagamenti parziali e della responsabilità verso il condominio deve essere specificato e verificato con casi contabili reali/sintetici.
4. **Concorrenza e unicità:** il lock sull'unità serializza le conferme che usano questa RPC, ma il vincolo di unicità del trasferimento per unità/data va verificato nel catalogo e nel replay; verificare anche inserimenti/modifiche effettuati da altri percorsi applicativi.

## Gate di correzione

- Definire e documentare l'evidenza dell'identità del subentrante prima di collegare `user_id`.
- Concordare la granularità temporale e soggettiva della chiusura contabile e gestire separatamente residui pregressi e nuovi addebiti.
- Testare in QA isolato trasferimenti con comproprietari, inquilini, email non verificate, account già associati, pagamenti parziali, rate future, saldi di altri immobili e richieste concorrenti.
- Verificare grants effettivi, FK, indici di unicità e comportamento delle RPC con ruoli sintetici.
- Riesaminare l'advisor dopo la correzione, mantenendo `SECURITY DEFINER` solo dove necessario e con controlli server-side espliciti.

## Stato

Revisione statica delle definizioni runtime osservate; non sono stati eseguiti test con identità sintetiche o dati di QA. Nessuna migrazione è stata applicata a produzione, nessun reset, merge in `main` o deploy è stato effettuato. La riconciliazione delle migrazioni resta incompleta: questo documento non autorizza il replay né certifica il sistema.


## Integrazione catalogo — vincoli e unicità (verifica 2026-10-03)

La lettura di `pg_constraint` conferma PK su `id`, FK per workspace, condominio, unità, membri entrante/uscente e utenti che confermano/chiudono, oltre ai CHECK ammessi per stato e tipologia. È presente l'indice univoco parziale `condominium_member_transfers_unit_date_confirmed_uidx` su `(unit_id, transfer_date)` limitato agli stati `Confermato` e `Chiuso`. Quindi il vincolo DB impedisce più trasferimenti confermati/chiusi per la stessa unità e data, anche in caso di chiamate concorrenti; le bozze e gli annullati non sono limitati da questo indice. Il controllo applicativo e l'indice risultano coerenti per i trasferimenti confermati/chiusi.

La presenza del vincolo non risolve i rischi di identità del subentrante né la semantica contabile. Inoltre, le FK confermano i riferimenti, non la correttezza semantica di workspace/condominio/unità tra tutte le righe collegate: tale coerenza deve risultare dai controlli transazionali e dai test. Nessuna riga o schema è stato modificato durante questa verifica.


## Verifica integrazione client (branch `bethag-migration-repair`, 2026-10-03)

La verifica iniziale che non rilevava un collegamento client è superata da interventi successivi sul ramo `bethag-migration-repair`: `src/lib/bethagBackend.ts` contiene ora i client per anteprima e conferma; `src/main.tsx` espone il comando Subentro nel dettaglio condominio agli amministratori e collega anteprima, presa d'atto, conferma e refresh post-commit. Il form e il client RPC non accettano `incomingUserId` e inviano esplicitamente `p_incoming_user_id: null`, quindi il percorso UI non collega account al subentrante. Questo presidio client non corregge però il contratto RPC: la funzione server continua ad accettare un `p_incoming_user_id` arbitrario se chiamata direttamente da un gestore autorizzato. Prima del rilascio occorre introdurre un controllo server-side che impedisca il collegamento senza identità verificata/invito accettato. Non sono stati eseguiti build o test browser dopo l'integrazione.


## Riscontro aggiuntivo: contratto RPC effettivo in produzione (2026-10-03)

La lettura diretta di `pg_proc` ha restituito le definizioni complete delle tre RPC. Le firme pubbliche effettive sono:

- `public.confirm_condominium_member_transfer(uuid,uuid,text,text,uuid,date,text,text,jsonb)`
- `public.preview_condominium_member_transfer(uuid,uuid,date)`
- `public.close_condominium_member_transfer(uuid)`

La conferma e la chiusura pubbliche risultano `SECURITY DEFINER`, non `SECURITY INVOKER`, e sono eseguibili da `authenticated`; le corrispondenti funzioni private sono anch'esse `SECURITY DEFINER`. L'anteprima pubblica è invece `SECURITY INVOKER`. Le funzioni hanno `search_path` fissato. Il wrapper di conferma inoltra il parametro `p_incoming_user_id` alla funzione privata; la definizione runtime privata inserisce tale UUID nel campo `condominium_members.user_id` senza un controllo che dimostri consenso o verifica dell'identità dell'account entrante. La rimozione del parametro dal client BETHAG riduce il rischio nel flusso UI, ma non è un controllo di sicurezza server-side.

Le migrazioni storiche presenti nel ramo non sono una rappresentazione sufficiente della definizione runtime: le versioni lette differiscono dalla funzione effettiva per controlli su proprietario corrente, lock dell'unità, disattivazione dell'accesso portale e snapshot. Non copiare quindi una vecchia definizione `CREATE OR REPLACE FUNCTION` in una nuova migrazione senza prima riconciliare l'intero corpo runtime, dipendenze, grants e trigger. È necessario progettare una correzione incrementale che preservi tutti i controlli già presenti e rifiuti ogni `p_incoming_user_id` non verificato, oppure rimuova del tutto il collegamento account dalla RPC e lo demandi a un flusso di invito/accettazione separato.

Questa è una verifica di catalogo in sola lettura. Non è stato eseguito alcun tentativo di chiamata RPC, non sono state cambiate ACL o definizioni e non è stata applicata alcuna migrazione. Prima di predisporre la patch SQL definitiva restano da verificare il flusso server di invito/accettazione, i controlli email verificata e conflitti account, nonché le grants di schema e l'intera catena dei trigger interessati.


## Dipendenza dal flusso di registrazione portale — identità e conflitti

L'ispezione delle funzioni runtime `private.complete_portal_registration(text,text,text)` e `private.admin_approve_portal_registration(uuid,uuid)` mostra che la prima richiede un account autenticato con email confermata e confronta l'email con quella anagrafica per l'approvazione automatica; in caso di incongruenza crea una richiesta. La seconda, eseguita da un amministratore autorizzato sul workspace, associa invece `requested_user_id` al membro selezionato e aggiorna `portal_access`, `workspace_members` e `profiles`. Nel corpo osservato non compare un controllo preventivo generale che rifiuti l'associazione se l'utente richiesto è già legato a un altro membro attivo/condominio incompatibile; inoltre il percorso automatico aggiorna il membro e fa upsert delle registrazioni collegate.

Queste evidenze confermano che non è sufficiente eliminare `p_incoming_user_id` dal client di subentro: l'identità deve essere governata coerentemente in tutti i percorsi di collegamento, inclusa l'approvazione amministrativa e la registrazione automatica. La correzione deve definire prima la regola per account che legittimamente accedono a più unità o condomìni, quindi introdurre controlli di conflitto compatibili con comproprietà e multi-associazione, senza imporre un vincolo globale uno-a-uno non previsto dal prodotto.

Il risultato è un rilievo statico delle definizioni runtime; nessuna richiesta o associazione utente è stata modificata e nessun test con account sintetici è stato eseguito.


## Patch SQL preparata sul ramo di riparazione (non applicata) — 2026-10-03

È stata aggiunta `supabase/migrations/20261003150000_block_unverified_member_transfer_identity.sql`. La migrazione ricrea soltanto il wrapper pubblico `public.confirm_condominium_member_transfer(...)`, mantenendone firma, valore di ritorno, `SECURITY DEFINER` e `search_path` vuoto. Il wrapper rifiuta con `INCOMING_IDENTITY_REQUIRES_VERIFICATION` ogni `p_incoming_user_id` non nullo e inoltra esplicitamente `NULL` alla funzione privata. La logica privata runtime non viene riscritta. La migrazione ribadisce l'EXECUTE per `authenticated` sul wrapper e revoca l'EXECUTE diretto alla funzione privata da `anon`, `public` e `authenticated`.

La migrazione è stata salvata sul ramo `bethag-migration-repair` (commit `55c6c33e56927ca6576c8c11654b1ca45d48d767`), ma **non è stata eseguita su Supabase**. La patch è una barriera server-side per l'associazione account durante il subentro, non implementa ancora il flusso verificato di invito/accettazione né risolve i rilievi contabili. Prima dell'applicazione occorre validare la migrazione su un database QA isolato, controllare le ACL effettive dopo la migrazione e testare il percorso UI attuale e le chiamate dirette con UUID nullo/non nullo.


## Verifica statica della migrazione di blocco identità (2026-10-03)

Confronto effettuato tra firma/argomenti runtime in `pg_proc`, wrapper pubblico e funzione privata runtime, migrazione preparata e chiamata RPC in `src/lib/bethagBackend.ts`. Firma e ordine degli argomenti corrispondono: `(uuid, uuid, text, text, uuid, date, text, text, jsonb) returns uuid`; anche i nomi dei parametri e i valori predefiniti corrispondono. Il client invia `p_incoming_user_id: null`; il nuovo wrapper controlla il parametro e passa `NULL` alla funzione privata. La migrazione non sostituisce il corpo della funzione privata, preservandone i controlli runtime correnti.

L'ACL letta prima della migrazione sul wrapper pubblico era `postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres`; sulla funzione privata era `postgres=X/postgres`. Il testo della migrazione revoca i privilegi ereditati da `PUBLIC` e `anon`, ribadisce `authenticated` sul wrapper e revoca ai ruoli client l'esecuzione diretta della funzione privata. L'accesso già concesso a `service_role` sul wrapper non viene rimosso da `CREATE OR REPLACE` né dalle revoche esplicite. L'ownership runtime osservata è `postgres`, ma il proprietario effettivo dopo l'applicazione dovrà comunque essere ricontrollato.

Esito: compatibilità **statica** della firma e del payload client confermata; non è un test di esecuzione SQL. La migrazione non è stata applicata e non è stato creato un branch Supabase QA: la creazione di un branch può comportare costi e richiede una scelta esplicita dell'utente. Restano necessari test SQL in ambiente isolato, verifica post-migrazione di owner/ACL/RPC e test con account sintetici prima di qualunque deploy.


## Estensione audit: collegamento account del portale

È stata riletta la definizione runtime di `private.complete_portal_registration(text,text,text)`, `private.admin_approve_portal_registration(uuid,uuid)` e dei rispettivi wrapper pubblici. Il flusso automatico di registrazione richiede un utente autenticato con e-mail confermata; se individua un solo membro e l'e-mail coincide, collega il profilo. In caso di discordanza crea una richiesta `email_mismatch`, mentre in assenza di corrispondenza automatica registra una richiesta `pending`.

È però emerso un punto da correggere: la funzione di approvazione amministrativa consente di associare la richiesta a un membro attivo dello stesso workspace anche quando l'e-mail della richiesta non coincide con quella anagrafica; restituisce il flag `email_mismatch`, ma non lo usa per impedire il collegamento. La funzione non verifica inoltre in modo preventivo se lo stesso `requested_user_id` sia già associato a un diverso membro attivo. Gli indici runtime su `portal_access` e `condominium_members` non impongono un vincolo univoco globale sull'identità utente; esistono invece unicità legate a legacy ID o a workspace/condominio/e-mail. Non è quindi corretto aggiungere un vincolo globale uno-a-uno senza prima preservare i casi legittimi di più unità o condomìni.

**Decisione tecnica prudenziale:** non modificare direttamente la funzione di approvazione con un semplice blocco di ogni mismatch, perché potrebbe interrompere il processo amministrativo intenzionale per risolvere anagrafiche errate. Il flusso va distinto in: (a) associazione automatica solo a e-mail verificata e coerente; (b) richiesta con mismatch mantenuta non autorizzata finché l'e-mail anagrafica non sia corretta o un passaggio separato di verifica/accettazione non attesti l'identità; (c) approvazione manageriale limitata al perimetro autorizzato, senza trasformarsi da sola in prova d'identità; (d) collegamenti multipli consentiti solo tramite relazioni esplicite membro-unità/condominio e permessi per singolo contesto.

La definizione runtime è stata ispezionata in sola lettura. Non è stata applicata alcuna modifica al database. La migrazione di guardia del subentro continua a coprire esclusivamente `p_incoming_user_id` non nullo nella RPC di conferma: non risolve il problema separato del collegamento identità nel portale. Prima di implementare il gate di approvazione occorre completare l'analisi dei trigger, delle policy RLS, dei vincoli completi e delle chiamate UI che gestiscono le richieste mismatch, quindi realizzare test su dati sintetici in QA isolato.


## Gate di approvazione identità portale — patch preparata (2026-10-03)

L'ulteriore verifica dell'ACL runtime ha rilevato che `private.admin_approve_portal_registration(uuid,uuid)` era direttamente eseguibile da `authenticated` (`postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres`). Il precedente audit aveva riportato una conclusione diversa per questa funzione: quella conclusione è rettificata. Il wrapper pubblico era `SECURITY INVOKER`; quindi revocare il solo wrapper non sarebbe stato sufficiente finché la funzione privata restava direttamente invocabile.

È stata preparata `supabase/migrations/20261003170000_gate_portal_registration_identity_approval.sql`. La patch trasforma il wrapper pubblico in `SECURITY DEFINER` con `search_path TO ''`, verifica l'autorizzazione di gestione Portale prima dei controlli d'identità, richiede account autenticato con e-mail confermata e corrispondenza tra e-mail account, richiesta e membro selezionato. Per richieste `email_mismatch` vincola inoltre la selezione al membro originariamente associato alla richiesta, se presente. Solo dopo i controlli delega alla funzione privata esistente, senza riscriverne il corpo. Revoca EXECUTE da `public`, `anon` e `authenticated` sulla funzione privata, mantenendolo a `postgres` e `service_role`; il wrapper pubblico è concesso a `authenticated` e `service_role`.

È stato aggiornato anche `src/main.tsx`: la UI non propone più di procedere comunque in presenza di mismatch, espone messaggi specifici per i nuovi errori RPC e invita a verificare l'identità e correggere l'e-mail anagrafica prima del collegamento. La funzione server resta l'autorità: la sola modifica UI non costituisce un controllo di sicurezza.

**Limiti e stato:** migrazione e client sono stati salvati nel ramo `bethag-migration-repair`, non applicati al database. È stata verificata la coerenza statica dei punti d'inserimento e riletta la migrazione dal repository; non sono stati eseguiti parser PostgreSQL, test RPC con JWT sintetici, build TypeScript o test browser. L'ACL post-migrazione non è quindi verificata. Il flusso separato di invito/accettazione non è ancora implementato; il gate attuale blocca il collegamento fino alla verifica email coerente e non pretende di sostituire tale flusso. Prima di rilasciare, testare sia l'approvazione valida sia mismatch, account non verificato, membro diverso dal match originario, utente non autorizzato e chiamata diretta alla funzione privata.


## Verifica successiva: registrazione automatica, indici, RLS e trigger (2026-10-03)

La lettura delle definizioni runtime conferma che `private.complete_portal_registration(text,text,text)` è `SECURITY DEFINER`, proprietario `postgres`, con `search_path TO ''`; l'ACL osservata include però `authenticated` direttamente. Il wrapper pubblico `complete_portal_registration(text,text,text)` è `SECURITY INVOKER` e anch'esso eseguibile da `authenticated`. La funzione privata richiede `auth.uid()` e un'e-mail confermata; quando individua un solo membro attivo e l'e-mail coincide, assegna `condominium_members.user_id`, aggiorna/crea `portal_access`, esegue upsert in `workspace_members`, aggiorna `profiles` e approva richieste pendenti associate alla stessa e-mail. Non controlla prima che il membro sia già collegato a un diverso `user_id`, né che l'utente sia già associato a un diverso membro nel medesimo contesto. Il ramo di corrispondenza usa un `SELECT ... LIMIT 1` dopo aver contato i candidati, senza blocco `FOR UPDATE`: la gestione delle corse concorrenti resta da verificare.

La funzione di approvazione privata, che la patch di gate intende lasciare come implementazione interna, aggiorna anch'essa `condominium_members.user_id` e fa upsert di `workspace_members` su `(workspace_id,user_id)`, sostituendo `condominium_id` e `legacy_id` in caso di conflitto. Il catalogo mostra che la PK di `workspace_members` è proprio `(workspace_id,user_id)`, mentre `condominium_id` è una colonna singola e non esiste un indice univoco che rappresenti più associazioni di condominio per la stessa coppia. Di conseguenza, l'attuale modello `workspace_members` non rappresenta autonomamente più condomìni nello stesso workspace per lo stesso account: l'upsert può rimpiazzare il contesto precedente. Non aggiungere un vincolo uno-a-uno globale; prima chiarire e modellare il legame account-membro-condominio, eventualmente con una relazione dedicata, preservando le autorizzazioni per singolo contesto.

Le quattro tabelle esaminate hanno RLS attiva (`condominium_members`, `portal_access`, `portal_registration_requests`, `workspace_members`). Le policy consentono ai gestori autorizzati la gestione dei membri/portale e la lettura/gestione delle membership secondo il workspace; le richieste portale sono leggibili/aggiornabili dai gestori del modulo Portale. I trigger rilevati includono normalizzazione contatti e nominativi, sincronizzazione dei campi legacy, validazione di scope per membri/accessi/richieste, applicazione dei permessi portale e sincronizzazione post-modifica del membro. In particolare, `private.sync_portal_after_member_change()` disattiva accessi e membership per membri inattivi o in uscita e aggiorna i riferimenti attivi in caso di cambio utente/condominio; questi effetti devono essere considerati nel test transazionale, non duplicati alla cieca nella patch.

**Decisione tecnica aggiornata:** non introdurre ora una nuova riscrittura di `complete_portal_registration` né revocare l'EXECUTE diretto alla funzione privata senza una sostituzione server-side del wrapper e una verifica completa dei grants e delle chiamate. Una correzione sicura deve bloccare l'appropriazione di membri già collegati, impedire la sovrascrittura silenziosa del contesto `workspace_members`, gestire atomicamente richieste duplicate/concorrenza e conservare i casi di comproprietà, più unità e più condomìni. Le funzioni trigger e le policy sono state ispezionate in sola lettura; non sono stati modificati dati o schema.

**Stato:** nuove evidenze catalogo documentate; nessuna migrazione aggiuntiva creata/applicata. Non eseguiti parser SQL, test RPC, build, typecheck o browser QA. Non effettuati deploy o modifiche a produzione. La QA end-to-end finale resta rinviata fino alla risoluzione dei problemi noti, come richiesto.


## Impatto sui controlli di accesso e decisione sul modello (2026-10-03, approfondimento)

L'ulteriore lettura delle funzioni private conferma che `private.can_access_resident_condominium(uuid)` e `private.can_access_resident_condominium_module(uuid,text)` verificano l'accesso del residente tramite `portal_access` collegato al condominio e a un membro attivo; non usano `workspace_members.condominium_id` come unica fonte per autorizzare l'accesso al portale. Al contrario, `private.can_access_workspace_module`, `private.can_manage_workspace_module`, `private.is_workspace_admin`, `private.is_workspace_member` e `private.is_workspace_staff` leggono `workspace_members` per stabilire i ruoli e le autorizzazioni generali dello workspace. La riga singola per (workspace_id,user_id) può quindi essere adeguata per il ruolo globale dello workspace, ma il suo singolo condominium_id/legacy_id non può rappresentare in modo affidabile tutti i contesti condominiali dell'utente.

La UI recupera le membership attive filtrando per user_id e raggruppa/ordina per workspace_id; il percorso di completamento della registrazione richiama il wrapper pubblico `complete_portal_registration` sia dopo la registrazione con sessione, sia al ripristino di una sessione. La correzione deve pertanto coprire entrambi i punti d'ingresso server-side, non soltanto l'approvazione amministrativa o la schermata.

**Requisito per la patch successiva:** separare l'appartenenza globale allo workspace dalla relazione di accesso residente per singolo condominio/membro, oppure documentare e applicare una regola coerente che non sovrascriva i riferimenti contestuali già validi. La relazione di accesso per condominio deve supportare più unità e più membri legittimi per account, con permessi derivati dal ruolo effettivo del singolo membro. Le operazioni devono essere serializzate e validate nella stessa transazione, impedendo che un account autenticato reclami un membro già associato a un altro account o che l'approvazione aggiorni un membro diverso da quello originariamente abbinato.

**Motivo per non applicare una patch SQL minimale:** l'ACL runtime della funzione privata `complete_portal_registration` include `authenticated`; una revoca isolata interromperebbe l'attuale wrapper pubblico invoker. Convertire il wrapper in `SECURITY DEFINER` e revocare l'accesso diretto senza anche correggere il corpo privato lascerebbe comunque la vulnerabilità di collegamento; riscrivere il corpo senza definire prima la semantica delle membership potrebbe invece spegnere o sovrascrivere accessi legittimi. La funzione privata di approvazione è proprietaria di `postgres`, quindi il wrapper definer precedentemente preparato può delegarvi dopo la revoca client, ma il comportamento complessivo va ancora validato in ambiente isolato.

Le definizioni e le chiamate applicative sono state ispezionate; il tentativo di interrogare in un'unica query le definizioni di tutte le funzioni private è fallito per una limitazione della query catalogo e non è stato usato come evidenza. Nessuna modifica è stata apportata al database. Nessun test funzionale, build, typecheck o collaudo browser è stato eseguito.
