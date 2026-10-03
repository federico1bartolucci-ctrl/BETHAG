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
