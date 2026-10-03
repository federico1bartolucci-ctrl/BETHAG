# Verifica puntuale routine critiche — 2026-10-03

## Perimetro
Lettura delle definizioni effettivamente installate nel database BETHAG Production tramite catalogo PostgreSQL e controllo advisor Supabase del 2026-10-03. Nessuna funzione è stata eseguita e non sono state apportate modifiche al database. La ricerca delle routine nel codice SQL del branch `main` non ha restituito corrispondenze, quindi non è possibile attestare la parità con una migrazione versionata.

## Avviso advisor sicurezza

Il Security Advisor Supabase ha rilevato tre funzioni `SECURITY DEFINER` eseguibili dal ruolo `authenticated` attraverso l'API pubblica:
- `public.admin_approve_portal_registration(p_request_id uuid, p_member_id uuid)`
- `public.close_condominium_member_transfer(p_transfer_id uuid)`
- `public.confirm_condominium_member_transfer(...)`

L'avviso conferma la raggiungibilità delle tre RPC nello schema `public`, non dimostra da solo un bypass di autorizzazione. Le routine contengono controlli applicativi descritti sotto; resta necessario verificare i percorsi negativi e che non esistano varianti invocabili con argomenti manipolati. Nessuna revoca automatica è stata applicata.

## Verifica ACL effettiva dello schema privato

Una query PostgreSQL di sola lettura eseguita il 2026-10-03 ha restituito `authenticated_has_usage = true` per lo schema `private`. La verifica specifica dei privilegi EXECUTE sulle tre implementazioni private ha però restituito `false` per tutte:
- `private.admin_approve_portal_registration`: authenticated non può eseguire.
- `private.close_condominium_member_transfer`: authenticated non può eseguire.
- `private.confirm_condominium_member_transfer`: authenticated non può eseguire.

Quindi, pur avendo USAGE sullo schema, il ruolo autenticato non ha EXECUTE su queste tre implementazioni private. Questo riduce il rischio di invocazione diretta per queste specifiche firme. L'advisor segnala invece le tre RPC pubbliche come eseguibili via REST: restano da mantenere e verificare i controlli applicativi dei wrapper pubblici. Non è stata applicata alcuna modifica ai privilegi.

## ACL delle RPC pubbliche

La verifica PostgreSQL di sola lettura sulle firme pubbliche ha rilevato:
- Tutte e tre le RPC negano EXECUTE ad `anon`.
- Tutte e tre consentono EXECUTE ad `authenticated`, in linea con la raggiungibilità REST segnalata dall'advisor.
- `service_role` non ha EXECUTE su `admin_approve_portal_registration`, mentre risulta abilitato su `close_condominium_member_transfer` e `confirm_condominium_member_transfer`.

Questa differenza va confrontata con i chiamanti effettivi e con il modello operativo del backend prima di cambiare i grant; non è stata assunta come errore né corretta automaticamente.

## Approvazione accesso portale

Sono presenti due livelli:
- `public.admin_approve_portal_registration(uuid, uuid)` è una funzione `SECURITY DEFINER` con `search_path TO ''`. Verifica che l'account autenticato abbia email confermata, che questa corrisponda alla richiesta e al membro, che la richiesta/condominio siano coerenti e che l'operatore possa gestire il modulo Portale; quindi delega alla routine privata.
- `private.admin_approve_portal_registration(uuid, uuid)` è anch'essa `SECURITY DEFINER` con `search_path TO ''`, ma la sua implementazione non ripete il controllo di email confermata né il confronto con l'email dell'utente autenticato. Verifica invece l'autenticazione, la richiesta, il membro attivo, il workspace, l'archiviazione e il permesso di gestione, quindi aggiorna le associazioni e approva la richiesta.

**Punto di verifica prioritario:** nei precedenti cataloghi di privilegi risultava EXECUTE concesso a `authenticated` su routine dello schema `private`. Questo, da solo, non prova che la funzione sia invocabile tramite API: occorre verificare anche l'esposizione dello schema `private`, USAGE e ACL effettivi. Se la routine privata è raggiungibile direttamente da client autenticati, il percorso privato può eludere i controlli aggiuntivi della funzione pubblica. Non modificare i grant prima di aver verificato configurazione API e chiamate client.

## Subentro / trasferimento

- `public.confirm_condominium_member_transfer(...)` rifiuta un `p_incoming_user_id` non nullo con `INCOMING_IDENTITY_REQUIRES_VERIFICATION`, poi delega alla routine privata passando `null` per l'identità entrante.
- `private.confirm_condominium_member_transfer(...)` controlla autenticazione e autorizzazione sul workspace, blocca la riga dell'unità, verifica che il cedente sia proprietario attivo dell'unità e impedisce duplicati nella stessa data e un altro proprietario attivo. Registra uno snapshot contabile, mette il cedente “In chiusura”, disattiva il suo accesso portale, crea il nuovo proprietario e registra il trasferimento come “Confermato”.
- `public.close_condominium_member_transfer(uuid)` delega alla routine privata.
- `private.close_condominium_member_transfer(uuid)` richiede che il trasferimento sia “Confermato” e che non restino rate, allocazioni o riporti con saldo aperto; solo allora archivia il cedente e marca il trasferimento “Chiuso”.

**Punti di riconciliazione:** verificare i privilegi di accesso diretto alle routine private e la coerenza delle chiamate dal client; verificare inoltre che il blocco alla chiusura per qualsiasi saldo residuo sia coerente con la regola di continuità contabile concordata per il rogito. Lo snapshot preserva dati e residui, ma non effettua una riallocazione automatica dei debiti tra cedente e acquirente; la funzione segnala infatti che la verifica della responsabilità legale è richiesta.

## Stato dei branch Supabase

La lettura dei branch ha individuato:
- `bethag-continuity-qa`: stato `MIGRATIONS_FAILED`; registro leggibile con 16 migrazioni, dalla `20260928021707` alla `20260928043415`.
- `bethag-member-transfer-qa`: stato `MIGRATIONS_FAILED`; registro leggibile con 30 migrazioni, fino alla `20261002073340`.

Il registro restituito documenta le versioni registrate, ma non espone il messaggio SQL preciso che ha causato il fallimento; non è quindi corretto attribuire una causa senza recuperare il dettaglio del log/errore. I branch non sono stati resettati, ribasati o modificati.

## Evidenza dai log SQL

Nei log PostgreSQL di Production del 2026-10-03 alle 05:07 UTC compare un tentativo di modifica dinamica di `private.close_condominium_member_transfer` terminato con errore di sintassi (`SQLSTATE 42601`) durante l'esecuzione del blocco PL/pgSQL. Il testo registrato contiene sequenze di escape anomale nel corpo generato. L'errore indica che quel tentativo non è una correzione applicabile così com'è; non è stato riutilizzato né ripetuto. I log contengono anche query di ispezione fallite per riferimenti a colonne di catalogo inesistenti (`proisagg`, `file_size`, `routine_schema`), perciò quei tentativi non costituiscono prova sugli ACL o sulla configurazione API.

## Esito operativo
1. L'advisor conferma che le tre RPC pubbliche sono eseguibili da `authenticated`; questo richiede una verifica mirata dei controlli e dei casi negativi, non una revoca indiscriminata.
2. Prima di una migrazione correttiva occorre acquisire gli ACL/USAGE effettivi dello schema `private` e la configurazione degli schemi esposti dall'API, poi confrontare le chiamate client con i wrapper pubblici.
3. Le definizioni di produzione non sono ancora riconciliate con una catena di migrazioni completa in `main`; non vanno convertite in una migrazione incrementale senza controllare dipendenze, firme e stato delle installazioni.
4. I branch QA risultano con migrazioni fallite; recuperare il dettaglio del primo errore è il prossimo passo per correggere la catena in modo deterministico.
5. Nessuna modifica Production; collaudo integrale rinviato al termine della riconciliazione, come richiesto.


## Verifica diretta delle definizioni runtime — 2026-10-03

Una nuova interrogazione read-only di `pg_proc` e `pg_get_functiondef` ha restituito le definizioni effettivamente installate per le tre RPC pubbliche e le implementazioni private:

- Il wrapper pubblico `admin_approve_portal_registration(uuid, uuid)` è `SECURITY DEFINER`, usa `search_path TO ''` e verifica: sessione autenticata; richiesta pendente; autorizzazione sul workspace della richiesta; membro attivo nello stesso workspace e condominio non archiviato; email dell'account confermata e coincidente con la richiesta; corrispondenza dell'eventuale membro originariamente individuato; email del membro coincidente con quella verificata. Solo dopo delega alla funzione privata.
- La funzione privata di approvazione aggiorna associazioni, accesso portale, workspace member e profilo, quindi approva la richiesta. Non ripete i controlli email del wrapper. La verifica dei privilegi ha già accertato che `authenticated` non possiede EXECUTE diretto su questa funzione privata.
- Il wrapper pubblico `confirm_condominium_member_transfer(...)` rifiuta un'identità entrante non verificata e delega alla funzione privata con `p_incoming_user_id = null`. L'implementazione privata attuale include il lock dell'unità, i controlli di proprietario attivo, la prevenzione dei duplicati e lo snapshot contabile, e lascia il cedente attivo nello stato `In chiusura`.
- Il wrapper pubblico `close_condominium_member_transfer(uuid)` delega alla funzione privata. L'implementazione privata attuale include anche il controllo dei riporti contabili unitari non assegnati, oltre a rate, allocazioni e riporti del membro, prima di chiudere il trasferimento.
- Tutte e sei le definizioni restituite sono `SECURITY DEFINER` e impostano `search_path TO ''`; gli oggetti sono referenziati con nomi qualificati.

### Divergenze verificate con i file di migrazione in main

- `20260930320000_harden_portal_approval_rpc.sql` non corrisponde alla definizione pubblica runtime: il testo di migrazione consultato implementa direttamente l'approvazione senza i controlli email verificata/membro presenti nel wrapper corrente e non rappresenta da solo lo stato finale.
- `20261001104500_add_condominium_member_transfer.sql` contiene una prima versione della conferma trasferimento, priva dello snapshot contabile e dei controlli più recenti visibili nel runtime.
- `20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql` aggiunge il blocco sui riporti unitari non assegnati tramite riscrittura testuale della definizione privata. Il runtime contiene tale controllo, ma la migrazione usa sostituzioni fragili basate su frammenti testuali: deve essere verificata nel replay isolato prima di considerarla affidabile.

### Conclusione circoscritta

La verifica attuale non mostra un bypass diretto delle funzioni private da parte del ruolo `authenticated`; il warning dell'advisor riguarda le RPC pubbliche e va valutato sui rispettivi controlli server-side. La funzione pubblica di approvazione contiene i controlli di identità/email richiesti. Restano da verificare il contratto completo dei consumer delle RPC di trasferimento, gli ACL effettivi per ogni ruolo e la riproducibilità delle definizioni runtime dalla catena di migrazioni. Nessuna DDL o modifica ai dati è stata eseguita in Production.


### Controllo di vincoli e indici della tabella trasferimenti — 2026-10-03

Una lettura di sola consultazione del catalogo PostgreSQL Production ha rilevato ulteriori divergenze tra la migrazione iniziale `20261001104500_add_condominium_member_transfer.sql` e la tabella effettiva:

- Il vincolo di stato installato ammette `Bozza`, `Confermato`, `Chiuso` e `Annullato`; la migrazione iniziale dichiara invece soltanto `Bozza`, `Confermato` e `Annullato`. Lo stato `Chiuso` è utilizzato dalla routine di chiusura e deve quindi essere presente nella definizione canonica.
- La tabella installata include i vincoli FK `closed_by` verso `auth.users(id)`, mentre tale colonna/relazione non compare nella definizione della migrazione iniziale. La migrazione iniziale non è quindi un bootstrap fedele dello schema corrente.
- La routine runtime di conferma contiene il lock dell'unità, la verifica del ruolo proprietario e del flag `current_owner`, lo snapshot finanziario e la transizione del cedente a `In chiusura`; questi elementi non sono presenti nella funzione definita dalla migrazione iniziale.
- La migrazione del blocco dei riporti unitari ricostruisce la funzione tramite `pg_get_functiondef` e `replace` su frammenti testuali. Il controllo è presente nella funzione runtime letta, ma l'esito positivo nel catalogo non dimostra che lo script sia riproducibile su un database con una definizione iniziale differente.

**Azione di riconciliazione:** trattare la migrazione iniziale come storica, non come schema di riferimento per una nuova installazione; ricostruire una sequenza versionata coerente con colonne, FK, vincoli di stato, routine e grants. La migrazione di patch testuale resta da sostituire con una definizione deterministica dopo aver consolidato la sequenza completa e verificato le dipendenze in un ambiente isolato. Nessuna modifica a Production è stata eseguita.


### Verifica della catena di migrazioni per il subentro — approfondimento

È stato letto l'elenco completo delle 177 versioni registrate in Production e confrontato con i file SQL presenti in `main` (136 file). La catena di Production include più passaggi sul ciclo di trasferimento: lifecycle proprietario/portale, colonne di chiusura, snapshot contabile, mantenimento attivo del cedente, serializzazione per unità, validazione del proprietario uscente, protezione dell'identità entrante e progressivi ampliamenti dello snapshot.

Il controllo dei file in `main` conferma che non tutte le patch sono definizioni SQL autonome: almeno `20261002110000_serialize_member_transfer_by_unit.sql`, `20261002110808_validate_transfer_outgoing_owner.sql`, `20261003050000_preserve_transfer_extraordinary_allocations.sql` e `20261003064000_block_transfer_close_with_unresolved_unit_carryovers.sql` ricostruiscono una funzione già installata e ne sostituiscono frammenti testuali. Alcune verificano la presenza/occorrenza del frammento, ma il loro successo dipende dalla forma esatta della funzione antecedente. Questo rende il replay sensibile a differenze di formattazione o a uno stato iniziale diverso.

La definizione installata di `private.confirm_condominium_member_transfer` contiene effettivamente il lock dell'unità, la validazione del proprietario uscente, il controllo dei trasferimenti duplicati, lo snapshot contabile e la transizione del cedente a `In chiusura`. La definizione installata di `private.close_condominium_member_transfer` comprende il blocco sui riporti unitari non assegnati. Questi sono riscontri sullo stato runtime, non una prova che l'intera catena SQL di `main` ricrei lo stesso stato su database vuoto.

**Decisione tecnica:** non produrre una migrazione sostitutiva della sola ultima patch: per farlo in modo affidabile serve consolidare l'intera definizione finale delle due routine, tutte le relative colonne/constraint/grants e le dipendenze di tabelle e funzioni. La correzione dovrà essere una migrazione versionata deterministica e accompagnata da verifica di replay isolato; il replay QA resta rinviato al termine della risoluzione delle anomalie, come richiesto. Non sono state eseguite scritture su Production o sui branch QA.


### Difetto puntuale individuato nella sequenza del vincolo di stato — 2026-10-03

Il confronto del testo SQL ha evidenziato un'incompatibilità riproducibile nella catena relativa a `condominium_member_transfers`:

- La migrazione `20261001104500_add_condominium_member_transfer.sql` crea il check `condominium_member_transfers_status_ck`, che ammette solo `Bozza`, `Confermato` e `Annullato`.
- La migrazione `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` tenta di rimuovere `condominium_member_transfers_status_check` (nome diverso) e crea un check con quel secondo nome che include anche `Chiuso`.
- Su un database vuoto in cui entrambe le migrazioni vengono applicate in sequenza, il primo check `status_ck` rimane attivo: il nuovo check non lo sostituisce. La chiusura con stato `Chiuso` può quindi essere respinta dal vincolo iniziale.

Il catalogo Production interrogato in sola lettura mostra attualmente soltanto `condominium_member_transfers_status_check` con i quattro stati e `condominium_member_transfers_type_ck`; il difetto è dunque una criticità di riproducibilità della sequenza in `main`, non un vincolo duplicato osservato nello schema live.

**Correzione da applicare nella catena versionata:** rendere coerente il nome del vincolo rimosso con quello effettivamente creato dalla migrazione iniziale (oppure assegnare fin dall'origine un nome canonico e usare quel nome in tutti i passaggi). Prima di applicare una correzione a Production occorre rispettare la versione già registrata e non modificare migrazioni storiche già distribuite; la rettifica va inserita come nuova migrazione idempotente, verificandone il comportamento sullo stato già installato e su un replay isolato. Nessuna DDL è stata eseguita.


### Ulteriore incompatibilità d'ordine nelle migrazioni del subentro — 2026-10-03

Il controllo dei file effettivi in `supabase/migrations` rileva un problema precedente al vincolo di stato:

- `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` esegue `CREATE INDEX ... ON public.condominium_member_transfers(closed_by)` e ridefinisce la RPC privata di conferma.
- La tabella `public.condominium_member_transfers` viene creata dal file `20261001104500_add_condominium_member_transfer.sql`, ordinato successivamente per timestamp nel nome.
- La colonna `closed_by` è introdotta da `20261001120000_transfer_lifecycle_keep_outgoing_active.sql`, anch'essa successiva.

Di conseguenza, il replay cronologico dei file di `main` su un database vuoto non è autosufficiente: la migrazione `01093000` tenta di indicizzare una tabella non ancora creata e, anche anticipando la creazione della tabella, la colonna `closed_by` non esiste ancora. La routine iniziale inoltre assume che esista già `private.close_condominium_member_transfer(uuid)`.

**Azione:** non alterare le migrazioni storiche già distribuite. La sequenza canonica per installazioni nuove deve essere ricostruita in ordine di dipendenze: prima tabelle e colonne necessarie (inclusi `closed_at/closed_by`), poi funzioni e indici, quindi grants/policy e successive evoluzioni. La correzione del solo check di stato non risolve questo blocco precedente. Il replay QA rimane da eseguire solo dopo aver completato la ricostruzione, senza scritture su Production.


### Verifica puntuale della migrazione d'indice e delle routine dipendenti

La lettura integrale dei file conferma inoltre che `20261001094000_index_transfer_closed_by.sql` ripete la creazione dell'indice su `closed_by` senza introdurre la colonna; `IF NOT EXISTS` protegge soltanto dalla duplicazione dell'indice, non dall'assenza della tabella o della colonna. La prima migrazione `20261001093000` ridefinisce anche `private.confirm_condominium_member_transfer` e altera `private.close_condominium_member_transfer`, presupponendo che entrambe le routine siano già presenti. La creazione della tabella e la definizione iniziale di conferma compaiono invece in `20261001104500`, successiva nell'ordinamento dei nomi.

Questa dipendenza è quindi tripla: tabella, colonna `closed_by` e routine preesistenti. Non è correggibile rendendo idempotente il solo `CREATE INDEX`.

**Intervento di riconciliazione registrato:** la futura sequenza canonica dovrà avere un bootstrap autosufficiente per la tabella trasferimenti (colonne, FK e check finali, incluso `Chiuso`), seguito dalle definizioni complete delle routine e dagli indici. Le migrazioni storiche già distribuite non vanno riscritte retroattivamente: per il percorso esistente occorre una nuova migrazione di riparazione compatibile con lo stato registrato; per installazioni nuove va preparato un percorso baseline coerente, senza eseguire in ordine file che dipendono da oggetti non ancora creati. Nessuna scrittura è stata effettuata sul database.


### Riscontro catalogo Production: tabella dei subentri

La verifica read-only del catalogo Production conferma che `public.condominium_member_transfers` contiene le 16 colonne attese dalla sequenza esaminata, incluse `closed_at` e `closed_by`. Sono presenti la FK `closed_by` verso `auth.users(id)`, il vincolo di stato finale con `Bozza`, `Confermato`, `Chiuso`, `Annullato` e gli indici attesi, incluso quello su `closed_by` e l'indice univoco parziale per unità/data sugli stati confermati o chiusi.

Non risultano nel catalogo live né la constraint duplicata `condominium_member_transfers_status_ck` né una colonna mancante tra quelle elencate. Il difetto precedentemente individuato riguarda quindi la riproducibilità della catena storica da database vuoto, non la definizione attualmente osservata in Production. Questo riscontro non certifica da solo la correttezza di RLS, trigger, routine o dati preesistenti.
