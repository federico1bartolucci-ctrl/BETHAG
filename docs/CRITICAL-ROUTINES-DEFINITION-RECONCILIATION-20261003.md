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
