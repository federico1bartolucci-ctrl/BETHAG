# BETHAG — Verifica della struttura attuale e piano di riallineamento

Data: 2026-10-03  
Riferimento sorgente: `main` al commit `75303030bbf98280829807c1ed04cff65174a069`.  
Questo documento registra osservazioni statiche sul repository; non equivale a build, typecheck, test o collaudo.

## Evidenze statiche verificate

- Il frontend principale è concentrato in `src/main.tsx` (circa 18.670 righe nel contenuto recuperato); contiene shell, schermate, tipi e logica di flusso.
- `src/lib/bethagBackend.ts` è un adapter ampio (circa 2.285 righe) con numerose query Supabase e uso esteso di `any`; `BackendState` è dichiarato come `Record<string, any[]>`.
- `src/lib/supabase.ts` crea client Supabase e include URL/chiave publishable di fallback. La chiave publishable non è un segreto, ma il fallback ambientale Production rende più facile puntare per errore l'ambiente sbagliato; la selezione ambiente deve essere esplicita per build e preview.
- `package.json` contiene `dev`, `build`, `preview`, ma non script autonomi per typecheck, lint o test. Il workflow `build.yml` esegue `npm install` e `npm run build`; esiste inoltre `main.yml` con build simile. Non risulta un lockfile fra i file elencati nel repository.
- Le migrazioni in `supabase/migrations` sono 136 file, con quattro timestamp ripetuti: `20260930110000`, `20260930200000`, `20260930210000`, `20261001110000`. La collisione può creare ambiguità in strumenti che usano il prefisso timestamp come versione.
- Il repository contiene un test SQL pgTAP per policy RLS, ma la sua esistenza non dimostra che venga eseguito in CI né che copra i dati e le combinazioni di ruolo reali.
- Il codice dichiara alcune integrazioni come predisposte e non complete: le funzionalità AI/OCR/trascrizione, pagamenti e integrazioni operative richiedono verifica dei servizi effettivamente collegati e degli esiti gestiti.

## Rischi strutturali prioritari

### P0 — Riproducibilità e schema
1. Ricostruire una baseline di database vuoto realmente applicabile; non confonderla con le migrazioni incrementali.
2. Ordinare dipendenze tabelle/colonne/funzioni/trigger/policy. Le routine e gli indici non devono precedere la creazione delle relazioni/colonne richieste.
3. Risolvere i quattro timestamp duplicati assegnando versioni univoche senza alterare retroattivamente migrazioni già applicate in ambienti esistenti. Preparare una strategia di convergenza per ogni registro.
4. Confrontare ogni funzione RPC e helper RLS con firma, SECURITY DEFINER, search_path, grant e callsite; vietare sostituzioni testuali fragili di definizioni SQL.

### P0 — Isolamento e autorizzazioni
1. Definire un contratto unico per workspace, condominio, ruolo, membership attiva, permesso modulo, entitlement e stato archivio.
2. Verificare RLS per SELECT/INSERT/UPDATE/DELETE, policy sovrapposte, grants e Storage policies. Il controllo frontend non è sufficiente.
3. Per `portal_access`, allineare baseline, colonne, vincoli, indici, trigger, policy, helper e flusso registrazione senza assumere che `CREATE TABLE IF NOT EXISTS` corregga una tabella parziale.
4. Tenere distinti i ruoli di accesso (`resident`, `council`) dalle qualifiche anagrafiche e dalle relazioni di proprietà/occupazione.

### P1 — Contratti frontend/backend
1. Introdurre tipi DTO per le entità persistenti e tipi specifici per gli argomenti/risultati RPC.
2. Centralizzare mapping legacy ID ↔ UUID e normalizzazione; rimuovere la duplicazione dei mapping dalle schermate.
3. Sostituire progressivamente `any` con `unknown` + validazione e tipi di dominio, iniziando da autenticazione/workspace, unità/persona, contabilità e portale.
4. Separare query e mutazioni dai componenti UI in repository/use-case per modulo.
5. Rendere espliciti loading, error, empty, retry e conferma server; invalidare cache al cambio workspace/sessione.

### P1 — Transazioni e continuità
1. Spostare le operazioni composte e critiche in RPC transazionali con locking e idempotenza: creazione condominio/unità, trasformazioni catastali, riparti, pagamenti, subentri e chiusure.
2. Conservare movimenti, titolarità, millesimi e snapshot come storia; rettifiche con storno o nuova versione, non sovrascrittura silenziosa.
3. Per il subentro, riconciliare rate scadute/future, insoluti, pagamenti parziali, quote straordinarie e carryover alla data di efficacia; chiusura bloccata se residuano elementi irrisolti secondo le regole di dominio approvate.

### P2 — CI e rilascio
1. Aggiungere lockfile e installazione deterministica; consolidare i workflow duplicati dopo aver verificato trigger e deploy.
2. Aggiungere typecheck e test automatici solo con configurazione coerente con le dipendenze effettivamente presenti; non introdurre controlli che falliscano per mancanza di tipi o configurazione.
3. Eseguire migrazioni su database effimeri da zero e su snapshot anonimo/strutturalmente rappresentativo; confrontare schema, funzioni, policy, trigger, indici e grants.
4. Il collaudo end-to-end resta una fase finale successiva alla risoluzione dei difetti strutturali.

## Sequenza d'implementazione proposta

1. Stabilizzare il flusso di schema e registrazione portale (baseline, dipendenze, policy, RPC).
2. Stabilizzare sessione/workspace e l'adapter `bethagBackend`, introducendo tipi senza cambiare i payload persistiti.
3. Estrarre moduli frontend per anagrafe/unità, poi contabilità, documenti/portale, assemblee/lavori e AI.
4. Portare ogni mutazione critica a un use-case con contratto RPC esplicito e gestione idempotente.
5. Stabilizzare CI, migrazioni riproducibili e ambienti preview.
6. Solo dopo completamento delle correzioni, eseguire il collaudo end-to-end e la verifica di backup/ripristino.

## Vincoli di esecuzione

- Nessuna scrittura o DDL su Supabase Production senza autorizzazione esplicita.
- Nessun merge automatico in `main`; modifiche tramite branch e PR revisionabili.
- Non eliminare dati o migrazioni già applicate; usare migrazioni forward-only e procedure di riconciliazione.
- Nessun esito di test va dichiarato senza esecuzione effettiva.
- La specifica funzionale in `docs/BETHAG-FUNCTIONAL-ARCHITECTURE-BASELINE-20261003.md` governa le scelte di implementazione.


## Verifica aggiuntiva — dipendenze della migrazione subentri

La lettura delle migrazioni `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` e `20261001094000_index_transfer_closed_by.sql` conferma che entrambe fanno riferimento a `public.condominium_member_transfers` e alla colonna `closed_by`, mentre la migrazione `20261001104500_add_condominium_member_transfer.sql` è quella che crea la tabella nel flusso di file presente in `main`. Una replay pulita in ordine cronologico può quindi fallire prima di raggiungere la creazione della tabella.

Non viene aggiunta una migrazione con timestamp retrodatato: potrebbe essere applicata fuori dall'ordine già registrato negli ambienti e non risolverebbe in modo sicuro la divergenza dei registri. La correzione richiede prima di determinare quali versioni siano effettivamente registrate in ciascun ambiente e poi mantenere due percorsi espliciti: bootstrap pulito ordinato e migrazioni forward-only per ambienti esistenti. Fino a tale confronto, la sequenza è segnalata come blocco di rilascio e non viene dichiarata corretta.


## Riscontro read-only sul database Production

È stata eseguita una consultazione esclusivamente in lettura del catalogo PostgreSQL e del registro `supabase_migrations.schema_migrations` del progetto Production (nessuna modifica allo schema o ai dati).

- La tabella `public.condominium_member_transfers` è presente e il catalogo espone le colonne `closed_at` e `closed_by`, oltre ai campi base del trasferimento.
- Sono presenti il vincolo canonico `condominium_member_transfers_status_check` e non compare il vincolo storico `condominium_member_transfers_status_ck`; il catalogo mostra inoltre la foreign key di `closed_by`.
- Sono presenti l'indice `condominium_member_transfers_closed_by_idx`, gli indici principali per unità/condominio e la policy `condominium_member_transfers_manager_all`.
- Nel registro Production, fra le versioni di questa famiglia controllate, risultano `20261002045106` e `20261002110808`; non risultano registrate le versioni `20261001093000`, `20261001094000`, `20261001104500` e `20261001120000`.

Quindi lo schema trasferimenti presente in Production è più completo di quanto suggerisca il registro delle migrazioni versionate. Questo è un segnale di divergenza fra stato effettivo e storia registrata, non una prova che le migrazioni mancanti non siano mai state eseguite: le modifiche possono essere state introdotte da interventi diretti o da un altro flusso. Non è sicuro marcare versioni come applicate o rieseguire quelle mancanti senza ricostruire le operazioni originarie e confrontare tutte le dipendenze. Il prossimo passo corretto è una matrice di convergenza per ambiente, separando schema osservato, versioni registrate e percorso di bootstrap.


### Dettaglio catalogo e RPC subentri

Un'ulteriore lettura del catalogo Production ha confermato:

- Il vincolo `status_check` ammette esattamente `Bozza`, `Confermato`, `Chiuso` e `Annullato`; il vincolo `type_ck` limita `transfer_type` a `Vendita`, `Acquisto`, `Donazione`, `Successione` e `Altro`.
- Sono presenti le foreign key per workspace, condominio, unità, membro uscente, membro entrante, creatore e utente che chiude il trasferimento. La policy RLS osservata è `condominium_member_transfers_manager_all`, assegnata ad `authenticated`, con `USING` e `WITH CHECK` basati su `private.can_manage_workspace_module(workspace_id, 'condomini')`.
- La RPC `private.confirm_condominium_member_transfer` esiste come `SECURITY DEFINER`, imposta `search_path TO ''` e controlla `auth.uid()` e il permesso di gestione prima di procedere. È stato osservato anche un lock `FOR UPDATE` sull'unità. Questo è un riscontro parziale sulla funzione, non una certificazione completa di grants, dipendenze e comportamento di tutti i rami.
- La query di raggruppamento degli stati non ha restituito righe: la tabella non presenta trasferimenti registrati al momento della verifica. Non sono quindi stati verificati casi reali di subentro già archiviati.

Questi riscontri descrivono lo stato osservato e non risolvono la divergenza del registro. Prima di eseguire migrazioni sul database va inoltre verificata la compatibilità dei dati, anche se la tabella risulta attualmente priva di righe.


### Verifica della sequenza e dei vincoli di stato trasferimento

La comparazione dei file conferma una seconda incongruenza nella famiglia subentri: la migrazione iniziale `20261001104500_add_condominium_member_transfer.sql` crea il vincolo `condominium_member_transfers_status_ck` ammettendo `Bozza`, `Confermato` e `Annullato`, mentre `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` sostituisce il vincolo `status_check` includendo anche `Chiuso`. La migrazione precedente `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` contiene già una funzione che usa la tabella trasferimenti prima della creazione della tabella nella sequenza nominale, quindi il replay cronologico da zero resta bloccato anche indipendentemente dal successivo riallineamento del vincolo.

La migrazione forward-only `20261003121000_reconcile_member_transfer_status_constraint.sql` normalizza i due possibili nomi del vincolo e reintroduce l'insieme canonico di quattro stati; è presente nel branch ma non è stata eseguita su Production. Prima di applicarla in qualsiasi ambiente va verificato che non esistano valori `status` fuori dall'insieme ammesso, perché il nuovo CHECK li rifiuterebbe. Questa correzione del vincolo non risolve la dipendenza d'ordine nel bootstrap: il percorso da database vuoto deve essere ricostruito separatamente, senza riscrivere le migrazioni storiche registrate.


### Verifica delle modifiche incrementali alle RPC di subentro

La lettura statica delle migrazioni successive mostra che alcune modificano le funzioni già installate tramite `pg_get_functiondef` e sostituzioni testuali. In particolare, `20261003062000_include_unit_unassigned_installments_in_transfer.sql` sostituisce l'ancora `where i.member_id=p_outgoing_member_id` nelle definizioni di anteprima e conferma con una condizione che include anche le rate con `member_id is null` e `unit_id=p_unit_id`. La modifica include correttamente tali rate negli elenchi di dettaglio, ma l'ancora è riutilizzata anche nelle sottoquery di aggregazione (ad esempio importi complessivi e residui): di conseguenza alcuni totali nominati come posizione del cedente possono comprendere anche poste non attribuite a un membro. Questo rende necessario separare esplicitamente i totali personali dai totali unitari non assegnati prima di considerare affidabile il riepilogo del subentro.

Le migrazioni `20261003050000`, `20261003052000`, `20261003060000`, `20261003061000`, `20261003063000` e `20261003064000` usano anch'esse ancore testuali per modificare definizioni RPC preesistenti. Sono presenti controlli di ancoraggio e alcuni controlli di idempotenza, ma questo metodo resta sensibile alle differenze di formattazione e alle versioni effettivamente installate. Non è prudente riscrivere le funzioni in Production sulla sola base del file storico: occorre confrontare la definizione live completa, i grants e le dipendenze, quindi consolidare le RPC in una definizione canonica verificata per gli ambienti di destinazione.

Azione di correzione individuata: mantenere distinti nel preview/snapshot (a) importi e rate attribuiti al cedente, (b) rate non assegnate ma collegate all'unità, (c) carryover unitari non assegnati; esporre totali separati per ciascuna categoria. Nessuna modifica al database Production è stata effettuata in questa verifica.


### Confronto con le RPC effettivamente installate su Production (lettura catalogo)

È stata acquisita la definizione completa live di `preview_condominium_member_transfer`, `private.confirm_condominium_member_transfer`, `private.close_condominium_member_transfer` e `get_member_transfer_accounting_snapshot`, oltre alle colonne di `condominium_installments`. La funzione live di conferma contiene già il lock della riga unità, il controllo che il cedente sia proprietario corrente, la disattivazione dell'accesso portale uscente e il blocco per trasferimenti duplicati. La chiusura live controlla rate, allocazioni e carryover attribuiti al cedente, oltre ai carryover unitari non assegnati.

La definizione live di anteprima e quella di conferma includono invece rate personali e rate con `member_id is null and unit_id=p_unit_id` negli stessi aggregati `outstanding_before`, `paid_before`, `installments_residual`, `outstanding_total` e `outstanding_due_after` (a seconda della funzione). Gli array di dettaglio marcano già `assignment_scope='unit_unassigned'`, ma i totali aggregati non separano queste poste. La definizione live di `get_member_transfer_accounting_snapshot` espone lo snapshot registrato e dati aggiornati, ma i riepiloghi live del cedente sono filtrati sul solo `member_id` e non forniscono un totale separato delle rate non assegnate.

La tabella `condominium_installments` conferma che `member_id` e `unit_id` sono entrambi nullable; quindi la distinzione è supportata dal modello dati. La correzione non viene applicata con una sostituzione testuale generica: la migrazione storica `20261003062000` dimostra che l'ancora del filtro compare in più sottoquery, comprese quelle di dettaglio e quelle aggregate, e una sostituzione indiscriminata rischierebbe di rimuovere le rate unitarie dagli elenchi o dal controllo di chiusura. Il prossimo cambiamento SQL deve intervenire per chiave JSON/aggregato in modo circoscritto, aggiungendo totali separati per le rate personali e quelle unit-level e mantenendo distinti i controlli di chiusura.

Questa verifica è stata di sola lettura. La discrepanza di conteggio e contenuto del registro migrazioni resta aperta; non è stato scritto alcun record nel registro né eseguito alcun DDL su Production.


### Ulteriore difetto rilevato nella chiusura del subentro

La definizione live di `private.close_condominium_member_transfer` controlla le rate aperte collegate al cedente tramite `member_id`, le allocazioni del cedente e i carryover del cedente. Controlla inoltre i carryover senza assegnatario associati all'unità. Non effettua però un controllo equivalente sulle rate aperte con `member_id IS NULL` associate alla stessa unità, pur essendo queste incluse nell'anteprima e nello snapshot del subentro. Di conseguenza, una chiusura potrebbe risultare consentita mentre rimangono rate unit-level non assegnate.

La correzione necessaria è aggiungere alla guardia di chiusura un controllo delle rate non saldate per la stessa workspace, condominio e unità, con `member_id IS NULL`, e impedire lo stato `Chiuso` finché il residuo supera la tolleranza contabile già usata (`0.005`). La migrazione sostitutiva proposta non è stata salvata nel branch: il tentativo di creazione del file è stato rifiutato dal controllo di sicurezza dello strumento GitHub. Non è stato eseguito alcun DDL su Production. Questo punto resta quindi un difetto identificato ma non corretto nel codice.


### Patch SQL circoscritta per la guardia di chiusura

Nel corpo di `private.close_condominium_member_transfer(p_transfer_id uuid)`, acquisire anche `t.unit_id` e `t.condominium_id` nella SELECT iniziale (insieme a workspace, cedente e stato). Dichiarare `v_unit uuid`, `v_condominium uuid` e `v_open_unit_installments numeric`. Dopo il controllo delle rate del cedente, inserire il controllo seguente:

```sql
select coalesce(sum(i.amount-i.paid_amount),0)
  into v_open_unit_installments
from public.condominium_installments i
where i.workspace_id=v_workspace
  and i.condominium_id=v_condominium
  and i.unit_id=v_unit
  and i.member_id is null
  and i.amount-i.paid_amount>0.005;
```

Aggiungere `or v_open_unit_installments>0.005` alla condizione che solleva `TRANSFER_FINANCIAL_POSITIONS_OPEN`. La query è intenzionalmente circoscritta a workspace, condominio e unità, esclude le rate assegnate a un membro e riusa la tolleranza già adottata dalla RPC. Il corpo live della funzione va mantenuto integralmente, inclusi `SECURITY DEFINER`, `search_path` vuoto, autorizzazione modulo, lock della riga trasferimento e aggiornamenti finali; evitare di sostituirlo con una versione parziale.

**Stato della patch:** correzione SQL definita e documentata, ma non ancora registrata come file di migrazione eseguibile. La creazione del file SQL tramite GitHub è stata bloccata dal controllo di sicurezza. Prima dell'applicazione in un ambiente, verificare il residuo delle rate non assegnate e il corpo effettivo della funzione in quell'ambiente; non applicare direttamente su Production senza autorizzazione esplicita.


### Regressione potenziale del flag current_owner nella sequenza delle RPC

Il confronto diretto tra `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` e la successiva definizione di `private.confirm_condominium_member_transfer` in `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` mostra una differenza funzionale: la prima imposta esplicitamente `current_owner=false` sul membro uscente; la seconda aggiorna `position_status='In chiusura'` ma non assegna `current_owner=false`. Poiché la seconda migrazione sostituisce integralmente la funzione, un replay cronologico che arrivi a questa definizione può perdere l'aggiornamento esplicito del flag. La condizione di conteggio del proprietario corrente presente in alcune versioni usa `coalesce(data->>'current_owner','true')='true'`; pertanto il solo `position_status` non è necessariamente equivalente al flag booleano atteso in tutti i percorsi applicativi.

Prima di correggere, va verificata la definizione live completa e l'uso di `current_owner` in frontend/backend e RPC collegate. La versione canonica della funzione deve preservare entrambi i segnali coerenti: `current_owner=false` e `position_status='In chiusura'` per il cedente, lasciandolo attivo fino alla chiusura contabile; il nuovo proprietario mantiene `current_owner=true` e `position_status='Attivo'`. Non sostituire la funzione live con una copia parziale né modificare migrazioni già applicate.

### Dipendenza di bootstrap fuori ordine

La migrazione `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` crea o sostituisce una funzione che interroga e aggiorna `public.condominium_member_transfers`, ma la migrazione che crea la tabella è `20261001104500_add_condominium_member_transfer.sql`, con timestamp successivo. Su un database vuoto, il replay in ordine lessicografico non può risolvere la dipendenza senza che la tabella sia già stata creata da una baseline precedente o da un'applicazione fuori registro. Non retrodatare né riscrivere la migrazione storica: il percorso di bootstrap va corretto in una baseline/installazione pulita separata e documentata, mentre gli ambienti esistenti richiedono riconciliazione catalogo/registro prima di ogni migrazione.


### Supabase advisors: RPC pubbliche e policy permissive

L'ultima lettura degli advisors Supabase (03/10/2026) segnala tre funzioni esposte nello schema `public` come `SECURITY DEFINER` ed eseguibili da `authenticated`:

- `public.admin_approve_portal_registration(uuid, uuid)`;
- `public.close_condominium_member_transfer(uuid)`;
- `public.confirm_condominium_member_transfer(uuid, uuid, text, text, uuid, date, text, text, jsonb)`.

Il warning non dimostra da solo un bypass: le RPC potrebbero essere endpoint intenzionali con controlli interni. Tuttavia, per le due RPC di subentro il risultato advisor diverge dalle migrazioni versionate che definiscono wrapper `SECURITY INVOKER`. Prima di modificare grant o sicurezza, acquisire da catalogo la definizione live completa, `prosecdef`, `proconfig`, privilegi EXECUTE per ruolo e chiamanti frontend/backend. Mantenere gli endpoint solo se il corpo privato applica autenticazione, autorizzazione sul workspace/modulo, coerenza unità/condominio e controlli anti-IDOR; in caso contrario preparare una correzione forward-only e test mirati. Nessun grant o funzione è stato modificato in Production.

Gli advisors performance segnalano inoltre 20 casi di policy RLS permissive multiple (principalmente policy di gestione `ALL` sovrapposte a policy di lettura specifiche) e 69 indici mai utilizzati nel periodo/statistiche osservate. Le policy permissive si combinano, quindi non vanno eliminate automaticamente: occorre verificare equivalenza delle espressioni `USING/WITH CHECK`, ruoli e operazioni, quindi consolidare soltanto dove preserva l'accesso previsto. Gli indici “unused” non sono prova di inutilità, soprattutto in ambienti con carico ridotto o statistiche recenti; non rimuoverli senza analisi delle query, vincoli e carichi reali.

Il file `supabase/tests/rls_policies.test.sql` contiene 22 asserzioni `is/ok`, coerenti con `plan(22)`; non è stata necessaria alcuna correzione del conteggio. La presenza del test nel repository non equivale a un'esecuzione superata.


### Esito verifica catalogo live delle RPC (03/10/2026)

La verifica read-only del catalogo conferma che le tre funzioni pubbliche segnalate sono `SECURITY DEFINER`, con `search_path` vuoto, e concedono `EXECUTE` ad `authenticated`; `anon` non dispone di EXECUTE. La configurazione `search_path=''` riduce il rischio di risoluzione malevola degli oggetti non qualificati, ma non sostituisce l'autorizzazione applicativa.

- `public.admin_approve_portal_registration` verifica `auth.uid()`, richiesta in stato ammesso, permesso di gestione del modulo Portale, appartenenza del condominio al workspace della richiesta, stato attivo/non archiviato del condominio, email dell'account confermata e corrispondenza email/condòmino; poi delega alla funzione privata. I controlli visibili coprono i principali confini d'accesso; resta da testare con ruoli e dati di fixture che le combinazioni cross-workspace, richieste già gestite e identità/email discordanti siano respinte.
- `public.confirm_condominium_member_transfer` rifiuta un `p_incoming_user_id` non nullo e delega alla funzione privata; quest'ultima verifica autenticazione, permesso modulo Condomini, unità/condominio, titolarità corrente, stato archiviato, duplicati e serializzazione tramite lock dell'unità. Il flag `current_owner=false` per il cedente e lo stato `In chiusura` sono entrambi presenti nella definizione live privata: la precedente discrepanza descritta per la migrazione storica non si riproduce nella funzione live osservata.
- `public.close_condominium_member_transfer` è un wrapper breve verso la funzione privata. Quest'ultima verifica autenticazione e permesso modulo Condomini, blocca la riga del trasferimento e impedisce la chiusura finché risultano aperte rate del cedente, allocazioni, riporti personali o riporti unitari non assegnati. Conferma però il difetto già rilevato: non calcola le rate aperte con `member_id IS NULL` della stessa unità, quindi tale situazione può non bloccare la chiusura.

Conclusione: il warning advisor è una segnalazione di superficie esposta, non prova autonoma di bypass. Le funzioni live mostrano controlli interni significativi e il wrapper di conferma ha una protezione esplicita sull'identità entrante. Non revocare `EXECUTE` indiscriminatamente: ciò potrebbe interrompere flussi applicativi previsti. Restano da confrontare ACL di funzioni private e migrazioni versionate, e da verificare il difetto sulle rate unit-level con una migrazione forward-only completa. Nessuna modifica al database è stata eseguita.


### Verifica ACL delle funzioni private delegate (lettura catalogo)

La consultazione di `pg_proc.proacl` e `aclexplode` sul database Production mostra che le tre funzioni private delegate (`private.admin_approve_portal_registration`, `private.confirm_condominium_member_transfer`, `private.close_condominium_member_transfer`) hanno EXECUTE assegnato al solo proprietario `postgres`; non risultano grant EXECUTE a `PUBLIC`, `anon`, `authenticated` o `service_role`. I wrapper pubblici, invece, restano eseguibili da `authenticated` (e i due wrapper di subentro anche da `service_role`, secondo la lettura ACL precedente). Questo conferma che il percorso previsto è attraverso i wrapper pubblici e che il codice privato non è direttamente invocabile dai ruoli applicativi osservati.

L'esito riduce il rischio di invocazione diretta degli helper privati, ma non sostituisce i test di autorizzazione dei wrapper e delle mutazioni. Il difetto delle rate unit-level non assegnate nella funzione di chiusura rimane aperto. Nessuna modifica a grant, funzioni o dati Production è stata eseguita.


### Correzione definita per la chiusura contabile del subentro

Lettura diretta della definizione live `private.close_condominium_member_transfer(uuid)` conferma che la funzione acquisisce `FOR UPDATE` sulla riga del trasferimento, ma non sulla unità; la query delle rate aperte considera esclusivamente `member_id=v_outgoing`. La tabella live `public.condominium_installments` contiene i campi `workspace_id`, `condominium_id`, `unit_id`, `member_id`, `amount` e `paid_amount`, quindi il controllo unit-level può essere circoscritto senza inferenze su JSON o join anagrafici.

La correzione forward-only da preparare deve:

1. Leggere e bloccare il trasferimento, poi validare stato e permessi come nella funzione live.
2. Ricavare dal trasferimento `workspace_id`, `condominium_id` e `unit_id` e verificarne la coerenza con l'unità effettiva.
3. Calcolare separatamente le rate aperte personali del cedente e quelle non assegnate dell'unità, senza sommare le due categorie in un'unica voce di preview:

   ```sql
   select coalesce(sum(i.amount - i.paid_amount), 0)
     into v_open_unit_installments
   from public.condominium_installments i
   where i.workspace_id = v_workspace
     and i.condominium_id = v_condominium
     and i.unit_id = v_unit
     and i.member_id is null
     and i.amount - i.paid_amount > 0.005;
   ```

4. Includere `v_open_unit_installments > 0.005` nella guardia che solleva `TRANSFER_FINANCIAL_POSITIONS_OPEN`, preservando i controlli esistenti su rate personali, allocazioni e riporti.
5. Rendere coerenti preview, snapshot e chiusura: indicare distintamente rate personali e rate unit-level non assegnate, evitando doppio conteggio e senza trasferire automaticamente debiti individuali al nuovo proprietario.
6. Verificare la serializzazione rispetto a inserimenti/aggiornamenti concorrenti delle rate: il lock del trasferimento da solo non protegge la tabella rate. Definire un protocollo di lock condiviso con le operazioni che modificano rate della stessa unità, oppure un controllo transazionale equivalente; documentare il comportamento in caso di scrittura concorrente.
7. Aggiungere test isolati per rate personali aperte/chiuse, rate unit-level aperte/chiuse, workspace o condominio non corrispondenti, unità nulla/inesistente, importi residui entro e oltre la tolleranza di 0,005 e tentativo concorrente di chiusura/modifica.

Questo è il requisito SQL e funzionale ricavato dallo schema live, non una migrazione già implementata o applicata. La scrittura di una migrazione eseguibile resta non effettuata; nessuna modifica a Production è stata eseguita.


### Disallineamento rilevato tra test RLS e ACL live (03/10/2026)

Il file versionato `supabase/tests/rls_policies.test.sql` contiene un'asserzione che richiede EXECUTE a `authenticated` per sette helper nello schema `private` (`can_access_condominium`, `can_access_workspace_module`, `can_access_resident_condominium`, `can_access_resident_condominium_module`, `is_workspace_admin`, `is_workspace_member`, `can_manage_workspace_module`). La lettura live precedente di `pg_proc.proacl/aclexplode` per gli helper privati delle procedure di subentro ha invece rilevato EXECUTE al solo proprietario `postgres`. Si tratta di insiemi di funzioni distinti: l'audit ACL specifico dei sette helper RLS deve essere ripetuto sul catalogo prima di concludere che il test contraddica Production.

Se il catalogo conferma assenza di EXECUTE per `authenticated`, verificare una sessione autenticata che legge le tabelle le cui policy chiamano tali helper: una funzione invocata direttamente dalla policy richiede il privilegio EXECUTE al ruolo invocante, anche se la funzione è `SECURITY DEFINER`. La correzione va quindi decisa in base alle dipendenze effettive e al modello di esposizione: concedere EXECUTE solo al ruolo applicativo strettamente necessario, mantenere `search_path` sicuro e validare che gli helper non espongano dati autonomamente; in alternativa rifattorizzare le policy in modo compatibile e testato. Non modificare il test per farlo passare semplicemente invertendo l'aspettativa e non applicare grant in Production senza revisione esplicita.

La migrazione di stato `20261003121000_reconcile_member_transfer_status_constraint.sql` è presente nella branch e rifiuta correttamente stati nulli o inattesi prima di sostituire i due possibili nomi del vincolo. Non risolve tuttavia l'ordine di bootstrap storico né dimostra che il replay pulito delle migrazioni sia eseguibile. Questi rimangono controlli separati e bloccanti per un rilascio sicuro.
