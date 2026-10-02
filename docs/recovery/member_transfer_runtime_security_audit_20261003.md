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

La ricerca nei contenuti correnti di `src/main.tsx` e `src/AccountingPage.tsx` non ha trovato i nomi delle RPC `confirm_condominium_member_transfer` / `close_condominium_member_transfer`, né i riferimenti `subentro`, `member_transfer` o `transfer_date`. Nei due moduli esaminati non emerge quindi un collegamento client diretto alle RPC di trasferimento osservate nel database. Questo non esclude che esista un flusso in un altro file, componente dinamico o percorso esterno, ma la funzionalità server-side non risulta integrata in questi due file. Prima del rilascio va individuato il punto UI previsto oppure pianificata l'integrazione, includendo validazioni, anteprima contabile, conferma esplicita e gestione degli errori RPC. Non è stata modificata l'interfaccia.
