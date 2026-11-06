# BETHAG — scaletta operativa aggiornata
**Aggiornata:** 2026-11-05  
**Riferimento:** branch `fix/qa-view-acl-parity-20261105`; ultima accettazione QA autenticata fissata al commit `ea32fc492757e5165b41580f082e42916bd54a8c`.

## Regole di esecuzione
- Procedere in ordine, un punto alla volta; non iniziare il successivo finché quello corrente non è chiuso con evidenze verificabili.
- Mantenere esclusivamente il branch QA esistente `bethag-launch-qa`; non crearne altri, non eliminarlo, non eseguire reset, replay o ricostruzioni distruttive.
- Nessuna modifica a Production prima del superamento dei gate e dell’approvazione finale esplicita. **L’autorizzazione al cutover Production non è stata ancora ricevuta**: l’istruzione «tu lavori io approvo» identifica il ruolo di approvatore, non autorizza merge, deploy o apply.
- Conservare i dati QA e gli storici dei registri di migrazione.
- Eseguire il collaudo APP completo APP-01–APP-15 solo nell'ultima fase prevista.

## Stato della scaletta

| Punto | Ambito | Stato |
|---|---|---|
| 1–3 | Fasi precedenti della scaletta concordata | CHIUSI secondo lo storico di progetto; non riaperti da questo aggiornamento. |
| 4 | Verifica autenticata del QA, permessi/RLS, parità ACL, configurazione Data API e documentazione | **CHIUSO — 2026-11-05** |
| 5 | Riconciliazione read-only della storia migrazioni Production con le sorgenti canoniche e classificazione degli effetti, quindi piano forward-only verificabile | **CHIUSO — 2026-11-05**: 247/247 payload comuni identici; 17/17 QA-only con file canonico identici; 19 QA-only non canonici classificati e payload esatti archiviati; Production-only confrontato semanticamente col draft; divergenze ACL e tre draft forward-only testati due volte su PostgreSQL 17 isolato; CI Build e Baseline SUCCESS sul commit 79311f06. Nessuna modifica remota. |
| 6 | Verifica finale della parità QA/Production e preparazione dei gate di rilascio, senza applicare modifiche a Production | **CHIUSO — 2026-11-05, NO-GO Production**: 48 relazioni, 103 policy, 257 indici, 305 vincoli allineati; divergenze applicative e ACL documentate nel report QA-PRODUCTION-PARITY. Branch QA FUNCTIONS_DEPLOYED/ACTIVE_HEALTHY. Nessuna scrittura remota. |
| 7 | Collaudo applicativo completo APP-01–APP-15 sul solo QA esistente e raccolta delle evidenze finali | **QA CHIUSO — 2026-11-06**: APP-01–APP-13 e APP-15 PASS sul commit `ea32fc49`; APP-14 resta il gate Production post-cutover. |

## Chiusura del punto 4 — evidenze
- Dashboard QA `bethag-launch-qa`: **Automatically expose new tables = OFF**, confermato dalla schermata aggiornata del 2026-11-05.
- QA/Production: 47/47 tabelle/partizioni pubbliche con RLS, zero tabelle senza RLS e zero SELECT effettivo per `anon`; confronto ACL/default ACL e Security Advisor documentati in `DATA-API-ACL-VERIFICATION-20261105.md`.
- CI sul commit `1612b46b727ebe018e545ab989df71d6df2957a6`: Build run [41943778380](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41943778380) **SUCCESS**; Baseline safety run [41943778409](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41943778409) **SUCCESS**.
- Job Build: tutti gli step completati con successo, incluso `Certify real QA authentication and session persistence` e `Run authenticated QA edit/archive diagnostic`.
- QA esistente preservato; nessun reset/replay/ricreazione; Production non modificata.
- PR 57 resta aperta e non unita: questo aggiornamento di scaletta non autorizza merge o rilascio.

## Punto 5 — criterio di chiusura
Il punto può chiudersi soltanto quando ogni voce rilevante della storia Production è classificata con riferimento alla sorgente SQL e agli effetti osservati, le equivalenze semantiche sono dimostrate (non dedotte dal solo nome/versione), le divergenze e le dipendenze sono documentate e il piano di eventuali migrazioni forward-only è riproducibile in ambiente isolato. Nessuna riga del ledger Production va modificata e nessuna migrazione va applicata a Production durante questo punto.

## Vincoli di rilascio
La chiusura del punto 4 non equivale ad autorizzazione al rilascio. Production resta NO-GO finché i gate di rilascio documentati non risultano tutti soddisfatti e non viene data una specifica autorizzazione.


## Registrazione nei documenti di progetto — 2026-11-05
La chiusura del punto 4 è stata riportata anche nei documenti di rilascio:
- `docs/release/APP-SMOKE-TEST-AND-CUTOVER-APPROVAL.md`, sezione 24;
- `docs/release/RELEASE-READINESS-20261027.md`, addendum del 2026-11-05.

La registrazione è circoscritta al punto 4. La matrice APP-01–APP-15 completa e i gate di rilascio Production restano distinti e non sono dichiarati chiusi.


## Avanzamento punto 5 — acquisizione live registri (2026-11-05)
Il punto 5 è **IN CORSO**, non chiuso. È stato acquisito in sola lettura lo snapshot completo dei registri live:
- Production: 248 righe, head `20261104222229_reconcile_production_acl_least_privilege`.
- QA esistente: 283 righe, head `20261105001928_align_qa_fund_availability_view_acl`.
- 247 coppie versione/nome esattamente comuni; 1 Production-only; 36 QA-only.
- Snapshot integrale: `supabase/rebuild/live-migration-ledgers-20261105.json`.
- Analisi: `docs/release/LIVE-MIGRATION-RECONCILIATION-20261105.md`.

I vecchi snapshot 247/47 del 3 novembre restano conservati come reperti storici, ma non sono più la fotografia live. Nessun tentativo di pareggiare i conteggi: le righe QA-only e Production-only richiedono classificazione semantica. La verifica hash/payload di tutti i 248/283 record e la revisione delle divergenze di schema restano aperte.


## Verifica tecnica aggiuntiva — 2026-11-05
- Payload SQL live: SHA-256 identico per tutte le 247 coppie comuni Production/QA; nessuna differenza rilevata.
- Divergenze ACL confermate: EXECUTE PUBLIC su due funzioni trigger in Production ma non in QA; default ACL di tabelle, funzioni e sequenze non allineati.
- La migrazione QA `20261023000004_application_default_table_privileges` registra GRANT CRUD ad authenticated e service_role, ma i default ACL live QA attuali non li mostrano: serve ricostruire la successiva causa/variazione prima di proporre correzioni.
- Report: `docs/release/LIVE-PAYLOAD-ACL-VERIFICATION-20261105.md`.
- CI sull'ultimo commit documentale `9ee9bb9023c64d02bb46021fa47e3216c474e047`: Baseline safety run `41946856398` SUCCESS; Build run `41946856406` in attesa/in esecuzione. Nessun esito complessivo dichiarato.


Aggiornamento 2026-11-05: la CI sul commit `047948b9917b38eddfb0953cecb2939980488d08` è terminata con Baseline safety e Build SUCCESS. Il confronto payload è stato completato per tutte le fonti repository disponibili. Il punto 5 resta aperto esclusivamente per la riconciliazione delle divergenze ACL/default ACL e per la provenienza dei 19 payload QA-only privi di file canonico attuale. Nessuna modifica remota è stata effettuata.


## Aggiornamento operativo — 2026-11-05, punto 5

Il punto 5 resta **IN CORSO** e Production resta **NO-GO**.

- I 19 payload QA-only senza file canonico corrente sono stati letti dal ledger live e classificati per effetto SQL nel report `LIVE-PAYLOAD-ACL-VERIFICATION-20261105.md`: ACL RPC, funzioni archivio, backfill dati archivio, trigger incoming co-owner, registrazione portale, ACL view e hardening. La classificazione semantica è documentata; la provenienza repository/autore originario dei 19 file non è attestabile e resta una limitazione esplicita.
- Il draft forward-only per default ACL tabelle è stato applicato due volte in transazione su PostgreSQL 17 isolato. Postcondition verificate, ACL sentinel `supabase_admin` invariata e rollback eseguito. Esito PASS: build run [41948820926](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41948820926), commit `1f26698d9ed39fb1c5658999b58e9a2a7c501bef`.
- In Production è stato verificato che le due funzioni trigger con EXECUTE PUBLIC restituiscono entrambe `trigger` e non sono SECURITY DEFINER; non sono normali funzioni invocabili via RPC. È stato predisposto un draft forward-only per revocare PUBLIC/anon/authenticated preservando owner e service_role, con test PostgreSQL 17 isolato e idempotenza. Non applicato agli ambienti remoti; CI dedicata in corso.
- Le differenze dei default ACL di funzioni e sequenze sono ancora da risolvere contrattualmente: non viene eseguito alcun pareggiamento automatico.
- Ultima baseline safety sul commit `0e9b4c5e1d39ca62b39586cb9a81a71e32b3d65d`: run [41949168139](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949168139) SUCCESS. Build run [41949168136](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949168136) in attesa al momento dell'aggiornamento.
- La build [41948515607](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41948515607) ha eseguito, per una condizione workflow non corretta, anche smoke applicativi poi risultati PASS per APP-05, APP-06, APP-08/11 e APP-12. Non sono considerati collaudo formale né chiusura di voci APP. Il cleanup è stato completato e verificato in sola lettura: zero record e zero utenti temporanei con il marker esatto del run. La condizione è stata corretta; sui commit successivi lo step è saltato. La matrice APP-01–APP-15 completa resta NON ESEGUITA e sarà svolta soltanto al punto 7.
- Nessuna scrittura su QA o Production; nessun reset/replay, merge o cutover. Il solo QA esistente e i dati preesistenti sono preservati.

### Criteri residui per chiudere il punto 5

1. Ottenere CI verde sul draft Production trigger ACL e testarne idempotenza/postcondition.
2. Definire e documentare il contratto atteso per default ACL di funzioni e sequenze (owner postgres, ruoli applicativi, privilegi minimi necessari), senza modificare default Supabase-managed.
3. Chiudere la classificazione degli effetti e delle dipendenze di tutte le divergenze ACL, distinguendo gli effetti storici dai payload canonici e dai draft non applicati.
4. Aggiornare report e scaletta con le evidenze della CI finale sul commit che contiene tutti gli interventi documentali e i test.

Solo dopo questi punti si potrà iniziare il punto 6. Il punto 7 resta riservato al collaudo completo APP-01–APP-15 sul QA esistente.


## Chiusura del punto 5 — 2026-11-05

Il punto 5 è chiuso come riconciliazione e piano di correzione forward-only, non come autorizzazione ad applicare migrazioni remote.

Evidenze:
- Ledger live riconciliati: Production 248 righe, QA 283; 247 coppie comuni e payload identici; 17 QA-only con file canonico identici; 19 QA-only non canonici classificati per effetti. Tutti i 19 array SQL originali sono conservati in `supabase/rebuild/qa-live-payloads-20261105.json`, archivio forense non rieseguibile. Tra i 18 file candidati d'archivio precedenti: 7 byte-identici, 9 semanticamente equivalenti, 2 non equivalenti; un payload non aveva un file candidato preesistente ed è stato recuperato dal ledger live.
- Payload Production-only `20261104222229_reconcile_production_acl_least_privilege`: equivalenza semantica col draft repository dimostrata.
- Divergenze ACL: trigger EXECUTE PUBLIC in Production; default ACL tabelle, funzioni e sequenze. Contratti e tre draft forward-only sono documentati. Tutti e tre sono stati applicati due volte in PostgreSQL 17 isolato, con postcondition, sentinel `supabase_admin` invariato e rollback.
- Build run [41949916052](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949916052): SUCCESS. Baseline safety run [41949916059](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41949916059): SUCCESS. Autenticazione reale QA e browser public smoke PASS; full APP diagnostic SKIPPED come previsto.
- Verifiche finali read-only dopo i test: Production ledger 248 righe e QA ledger 283; default ACL live invariati rispetto allo snapshot iniziale. Nessuna migrazione applicata, nessun reset/replay, nessun merge/cutover.

Limitazioni conservate nel report:
- I payload QA-only non canonici hanno contenuto SQL preservato e classificato, ma non è possibile ricostruire l'autore/commit originario dei payload privi di provenienza Git storica.
- Il test APP anticipato dal workflow precedente non costituisce collaudo formale; fixture sintetiche e utente temporaneo sono stati rimossi e verificati assenti. APP-01–APP-15 completi restano riservati al punto 7.

## Avvio del punto 6 — 2026-11-05

Il punto 6 è avviato. Ambito: confronto finale read-only tra QA e Production di schema, RLS/policy, ACL effettive e default ACL, funzioni/trigger, configurazione Data API e registri; produzione di matrice delle divergenze e gate GO/NO-GO. Nessun GRANT/REVOKE/ALTER, deploy o migrazione remota. Il punto 7 resta non avviato.


## Aggiornamento verifica punto 6 e rettifica CI — 2026-11-05

- Il confronto read-only è stato ripetuto sui due progetti esistenti. In entrambi: 48 relazioni public, 103 policy, 257 indici, 305 vincoli e 47 relazioni con RLS; resta una relazione senza RLS in ciascun ambiente, già inclusa nel confronto ACL/relkind e non va classificata automaticamente come tabella applicativa esposta.
- QA: 147 trigger public, 173 funzioni public/private, colonna workspace_members.data presente, pg_net presente.
- Production: 146 trigger public, 171 funzioni public/private, colonna workspace_members.data assente, pg_net assente.
- Le divergenze bloccanti restano quelle del report QA-PRODUCTION-PARITY-20261105.md: 19 implementazioni private con EXECUTE authenticated in QA ma non Production, sette definizioni private comuni differenti, trigger incoming co-owner QA-only, bug booleano nei permessi collaboratore Production e configurazione Data API auto-expose Production da verificare manualmente. Production resta NO-GO.
- Rettifica di trasparenza: il test default ACL tabelle aveva una chiamata psql commentata per un errore di newline; il precedente run 41948820926 non è prova valida per quel draft. La chiamata è stata corretta e la prova reale è passata nel run [41951011743](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41951011743), commit 81656e1c3bb0753c6f8ede97a29e57c1be2a40ec. Nel medesimo run sono PASS anche i draft trigger ACL e function/sequence ACL, clean-install 24 migrazioni, guarded runner 15 migrazioni, RLS collaborator, build, browser public smoke e autenticazione QA. Baseline [41951011690](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41951011690): SUCCESS.
- Il run 41951011743 ha saltato il diagnostic APP autenticato, come previsto. APP-01–APP-15 non avviato. Nessuna scrittura remota, nessun merge, deploy o cutover.

Il punto 6 resta IN CORSO finché non è completata la matrice finale di ogni divergenza con dipendenze, sorgente canonica/QA e piano forward-only, e finché non è documentato il controllo manuale Data API Production. Il gate di rilascio rimane NO-GO; il punto 7 resta non avviato.


## Chiusura del punto 6 — 2026-11-05

Il punto 6 è chiuso come verifica finale read-only e decisione di rilascio. Esito: **Production NO-GO**. Le evidenze complete sono in `docs/release/QA-PRODUCTION-PARITY-20261105.md`.

- Allineati: 48 relazioni public (nome/tipo/owner/ACL/RLS), 103 policy RLS, 257 indici, 305 vincoli; 7 Edge Functions con sorgenti `index.ts` identiche; Security Advisor zero lint.
- Divergenze bloccanti: Production manca `workspace_members.data`; trigger metadata comproprietari e due funzioni private presenti solo in QA; sette definizioni private differenti; 19 funzioni private senza EXECUTE authenticated rispetto a QA; bug Production nella valutazione dei permessi JSONB booleani (chiave false considerata autorizzata).
- Differenza estensione: pg_net solo QA, senza riferimenti nelle funzioni applicative public/private.
- Default ACL e trigger PUBLIC EXECUTE: draft forward-only testati in PostgreSQL 17 isolato, non applicati.
- Draft colonna `workspace_members.data`: test isolato PASS, esistente e nuovo record verificati, idempotenza PASS, rollback.
- QA branch provider status: `FUNCTIONS_DEPLOYED`, preview `ACTIVE_HEALTHY`; nessun altro branch QA creato.
- Data API auto-expose Production non verificato manualmente; rimane gate. Anche se OFF, i blocker applicativi mantengono Production NO-GO.
- Build run [41950916265](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41950916265) SUCCESS; Baseline safety [41950916285](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41950916285) SUCCESS.
- Nessuna modifica a Production o QA; nessun merge, deploy, migrazione remota, reset o replay.

## Avvio del punto 7 — collaudo finale QA

Il punto 7 è avviato sul solo QA esistente. I test vanno eseguiti in sequenza, non in parallelo, usando fixture con marker univoco e cleanup verificato. APP-12 non deve inviare email reali senza un destinatario di test esplicitamente autorizzato. Gli smoke APP eseguiti in precedenza per errore di condizione workflow non sono conteggiati come collaudo formale.


## Esito del collaudo finale punto 7 — 2026-11-05

GitHub Actions [final QA collaudo 41953312039](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41953312039), commit 152b455f0d357fc5c2ab797cb320609467ba6c99: SUCCESS. Build [41953312105](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41953312105) e baseline safety [41953312100](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41953312100): SUCCESS.

Risultati QA:
- APP-01–04 PASS: autenticazione reale, RLS per amministratore/collaboratore/condomino, permessi collaborator true/false/assenti e isolamento cross-workspace.
- APP-05–08 PASS: creazione/modifica/archiviazione/ripristino condominio e struttura, contabilità, guard esercizio chiuso, subentro valido e revoca portale cedente.
- APP-09 PASS: rata insoluta, debito riportato sul condòmino e credito riportato sull'unità bloccano la chiusura senza stato parziale.
- APP-10 PASS: chiamanti resident/cross-workspace non autorizzati respinti.
- APP-11 PARTIAL: rollback via RPC verificato; la UI ha coperto la chiusura valida, non ancora la visualizzazione dell'errore per una chiusura fallita.
- APP-12 PARTIAL: pubblicazione/ritiro, visibilità residente, preparazione destinatari e permessi di coda PASS. Simulazione transazionale del gestore eventi sent/delivered/bounced/complained PASS con rollback; nessuna email reale inviata. Restano da provare trasporto webhook firmato e ciclo provider reale con destinatari di test autorizzati.
- APP-13 PASS: upload collaboratore e download effettivo del file condiviso da parte del condomino.
- APP-15 PASS per il perimetro core: navigazione 12 destinazioni admin, restrizioni collaborator/resident, sign-in, landing e persistenza sessione.
- APP-14 resta parziale e Production resta NO-GO per le divergenze del punto 6 e la verifica manuale Data API auto-expose Production ancora mancante.

Pulizia:
- Il marker univoco del run 41953312039 è assente da condomini, comunicazioni, unità, membri, esercizi, movimenti e portale; utenti Auth temporanei, destinatari sintetici e comunicazioni della simulazione sono zero.
- Fixture preesistenti QA del 2026-11-02 preservate.
- Due condomini QA-only vuoti con un esercizio chiuso ciascuno, creati durante i tentativi iniziali APP-09, sono stati conservati perché la protezione applicativa impedisce di cancellare un esercizio chiuso. Non hanno unità, membri, trasferimenti o riporti; non sono usati dal test finale. Nessun trigger è stato disabilitato o aggirato.
- Il test APP-09 finale riutilizza il fixture preesistente BETHAG_QA_APP08_11_CARRYOVER_FIXTURE e rimuove solo le righe temporanee.

Il punto 7 è quindi **eseguito ma non chiuso integralmente**: APP-11 UI e APP-12 provider/webhook restano PARTIAL. Nessuna modifica Production, nessuna migrazione remota, nessun merge, deploy o cutover. Il rilascio rimane NO-GO.


## Aggiornamento punto 7 — APP-11 chiuso, APP-12 ancora parziale — 2026-11-05

Il successivo collaudo finale QA [run 41995210778](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/41995210778), commit `10bf397364448fc267e6b1a095f640051e4bb18b`, è **SUCCESS**:
- APP-11 ora PASS: errore di chiusura per rata insoluta visualizzato nella UI; trasferimento resta Confermato e cedente attivo/In chiusura, senza stato parziale.
- APP-12: pubblicazione/ritiro e visibilità residenti PASS; webhook Svix firmati sintetici sent/delivered/bounced/complained PASS, firma invalida respinta HTTP 401 senza mutazioni. Nessuna email reale inviata; APP-12 resta PARTIAL fino a prova di consegna provider con destinatario test autorizzato.
- APP-01–APP-11, APP-13 e APP-15 PASS. APP-14 resta PARTIAL perché Production non è ancora allineata e la configurazione Data API Production richiede verifica Dashboard.

Il punto 7 resta **IN CORSO**, senza riaprire i punti 5 e 6. Non è stata eseguita alcuna modifica remota a Production.


## Aggiornamento punto 7 e rehearsal cutover — 2026-11-05

Evidenze sul commit `ec19cda3734fd818e4005e9efa626b9401549df4`:
- Final QA collaudo [run 42017349896](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42017349896): **SUCCESS** sul solo QA esistente `jhuyhlzzydcgghrzeexn`.
- Build [run 42017349811](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42017349811): **SUCCESS**. PostgreSQL 17 ha completato clean install delle 28 migrazioni, rehearsal del guarded runner con 19 incrementi canonici sullo snapshot Production da 248 righe (ledger atteso 267), ACL draft, colonna workspace_members.data, rollback subentro, permessi collaboratore e ledger transaction.
- Baseline safety [run 42017349826](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42017349826): **SUCCESS**.

Matrice applicativa:
- APP-01–APP-11: PASS.
- APP-12: PARTIAL. Pubblicazione/ritiro, visibilità residente, preparazione destinatari, permessi di coda e test di webhook sintetici firmati PASS. La funzione email QA risponde HTTP 503 `Servizio e-mail non configurato`: manca almeno uno tra `RESEND_API_KEY` e `BETHAG_FROM_EMAIL`. Il destinatario sintetico era `delivered@resend.dev`; nessuna email è stata inviata, nessun destinatario è stato messo in coda e il marker del test risulta assente da condomini, unità, membri, comunicazioni e destinatari.
- APP-13: PASS.
- APP-14: PARTIAL; resta gate di postflight Production dopo il cutover e verifica Dashboard della Data API.
- APP-15: PASS.

Configurazione Resend osservata: dominio `bethag.it` verificato; webhook attivo per `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, ma l'unico endpoint attuale punta a Production. Non viene creato un secondo webhook account-wide che potrebbe ricevere anche eventi Production e confondere i due ambienti.

Rehearsal migration:
- 28/28 file clean-install e 19/19 incrementi canonici testati su PostgreSQL 17 isolato.
- Ledger Production storico 248 righe preservato nel rehearsal; 19 righe canoniche attese, totale 267.
- I tre draft ACL forward-only hanno superato i test isolati; nessuna migrazione è stata applicata a QA o Production.
- Evidenza machine-readable: `supabase/rebuild/qa-final-collaudo-20261105.json`.

Autorizzazione:
- Il 2026-11-05 l'utente ha autorizzato esplicitamente tutte le operazioni necessarie al rilascio, incluse le modifiche Production quando tecnicamente richieste.
- L'autorizzazione non elimina i gate tecnici. Il punto 7 resta IN CORSO finché APP-12 provider delivery non è verificato e APP-14 non è chiuso con il postflight Production.
- Nessuna modifica Production, nessun merge, deploy o cutover. Il QA esistente e i fixture preesistenti sono preservati.


## Aggiornamento collaudo finale QA n. 103 — 2026-11-05

Evidenza aggiornata sul commit `502d6753f7a950efbfc1c4bd91506e2fbb34db68`:
- Final QA workflow [run 42020941578](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42020941578), run number **103**: SUCCESS. Build [42020941543](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42020941543) e baseline safety [42020941519](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42020941519): SUCCESS.
- APP-01–APP-11, APP-13 e APP-15 risultano PASS nel workflow; il passo browser APP-12 è PASS per il percorso UI e la preparazione destinatari.
- APP-12 provider delivery **NON SUPERATO**: la prova esplicita del provider restituisce il blocker `The QA Edge Function lacks RESEND_API_KEY and/or BETHAG_FROM_EMAIL`. Il destinatario tecnico `delivered@resend.dev` non è stato messo in coda; nessuna chiamata provider e nessuna email sono avvenute. I webhook sintetici firmati restano PASS, ma non sostituiscono una consegna reale.
- Il log conferma inoltre che la comunicazione è rimasta soltanto preparata e che il cleanup service-role è stato verificato. Il run non include un postflight Production: APP-14 resta PARTIAL.
- Verifica account Resend in sola lettura: dominio `bethag.it` VERIFIED e sending enabled; esiste una sola webhook subscription attiva per gli eventi sent/delivered/bounced/complained e punta all'Edge Function Production. Non viene creato un secondo webhook account-wide né modificato quello Production.
- Il progetto QA non dispone attualmente di almeno una delle due configurazioni Edge Function necessarie (`RESEND_API_KEY`, `BETHAG_FROM_EMAIL`). Il connettore Supabase disponibile non espone una funzione per impostare i secrets Edge Function; nessun nuovo API key è stato creato e nessun segreto è stato mostrato o copiato. Per completare APP-12 occorre configurare entrambi i secrets sul solo progetto QA, poi ripetere la prova provider con destinatario di test autorizzato e verificare l'evento delivered tramite il webhook esistente senza modificarne il routing.
- PR [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57) resta aperta, non unita, base `main`, head `fix/qa-view-acl-parity-20261105`. La CI verde sul branch non autorizza il merge né il cutover. Production resta **NO-GO** per le divergenze del punto 6 e per la verifica Dashboard Data API ancora mancante.
- Nessuna modifica remota a QA o Production, nessuna email inviata, nessun merge, deploy, migrazione, reset o cutover.


## Rettifica evidenza email preesistente — 2026-11-05

La precedente formulazione secondo cui non risultava alcun controllo email era incompleta. La consultazione diretta dello storico Resend ha recuperato una prova reale precedente:
- Email BETHAG inviata il 2026-11-03 alle 06:53:53 UTC da `noreply@bethag.it` a un indirizzo di test dell'amministratore, oggetto `Prova`, contenuto `Prova`, stato provider **delivered**. Il dettaglio Resend conserva l'ID `01a1a02f-8e48-79cf-bbca-771101e435a4` e il Message-ID SES.
- Questo prova che il dominio mittente e il trasporto Resend hanno già effettuato una consegna reale con esito delivered. Non è corretto chiedere di ripetere un generico test di invio email.
- La prova non dimostra però che l'Edge Function del progetto QA abbia i secrets configurati né che il flusso APP-12 dell'applicazione QA abbia generato e tracciato quella consegna: il collaudo provider dedicato sul run 42017349896 e sul run 42020941578 ha verificato che il destinatario tecnico è rimasto pending, senza provider_message_id/sent_at, perché manca almeno uno tra `RESEND_API_KEY` e `BETHAG_FROM_EMAIL` nel runtime QA.
- Quindi la verifica generale Resend/email è **GIÀ SUPERATA**; resta soltanto la verifica d'integrazione specifica APP-12 dal progetto QA, non un nuovo test generico. Nessuna email è stata inviata in questa verifica documentale e nessuna configurazione remota è stata modificata.


## Aggiornamento collaudo finale QA n. 106 — 2026-11-05

Evidenza aggiornata:
- Final QA workflow [run 42026909921](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42026909921), run number **106**, commit `1835c261cbb4482ebd0b10725958306c18c8dbb4`: **SUCCESS**. Tutti gli step del job `final-qa-collaudo` sono completati.
- APP-01–APP-04, APP-05–APP-07, APP-08–APP-11, APP-13 e APP-15: PASS. In particolare APP-11 ora include il percorso UI di chiusura fallita per rata insoluta, messaggio di errore visibile e invarianti del trasferimento/cedente preservate.
- APP-12: pubblicazione/ritiro e UI PASS; test webhook firmati sintetici per sent/delivered/bounced/complained PASS, firma non valida respinta HTTP 401 senza mutazioni. La funzione QA ha inviato un solo messaggio al destinatario tecnico `delivered@resend.dev`; risposta HTTP 200, provider_message_id e sent_at persistiti. La cronologia Resend ha confermato `email.delivered` per il messaggio. Tuttavia l'unico webhook globale Resend è ancora configurato sull'endpoint Production: l'evento è arrivato a Production e ha risposto `recipient_not_found / ignored`. Non è quindi provato il callback provider→QA e APP-12 resta **PARTIAL**, pur essendo superati invio e consegna provider.
- APP-14: Security Advisor Production interrogato in sola lettura, risultato zero lint. Questo non risolve le divergenze applicative già documentate né sostituisce il controllo Dashboard Data API Production e il postflight successivo al cutover. APP-14 resta **PARTIAL** e Production **NO-GO**.
- La branch QA esistente `bethag-launch-qa` risulta `FUNCTIONS_DEPLOYED` con preview `ACTIVE_HEALTHY`; nessun ambiente QA aggiuntivo creato.
- PR [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57) resta aperta e non unita. Nessun merge, deploy, cutover, modifica schema/ACL o scrittura su Production.

### Stato conclusivo del punto 7

Il collaudo applicativo ha esito **PASS per APP-01–APP-11, APP-13 e APP-15**. APP-12 resta **PARTIAL** limitatamente alla prova del webhook provider instradato a QA; APP-14 resta **PARTIAL** perché i gate Production non sono superati. Il punto 7 non è chiuso integralmente e il rilascio non è autorizzabile tecnicamente. La prossima attività ammessa è predisporre un instradamento webhook QA isolato senza sostituire né disabilitare l'endpoint Production; in assenza di una configurazione sicura e verificabile, mantenere APP-12 aperto anziché alterare il webhook globale.


## Retest Build e autenticazione QA — 2026-11-05

Il retry del solo job Build fallito è terminato con **SUCCESS**, attempt 2 del workflow [run 42026909891](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42026909891), sul commit `1835c261cbb4482ebd0b10725958306c18c8dbb4`.
- Build: SUCCESS.
- Certify real QA authentication and session persistence: SUCCESS, inclusi i tre account reali amministratore, collaboratore e condomino.
- Public-login browser smoke test: SUCCESS.
- PostgreSQL bootstrap: SUCCESS, tutte le prove di bootstrap, migrazioni canoniche, ACL e RLS completate.
- Il diagnostic autenticato edit/archive risulta SKIPPED; non viene conteggiato come prova eseguita da questo workflow.
Il timeout dell'amministratore osservato al primo tentativo non si è riprodotto al retry. È quindi classificato come errore intermittente non riprodotto, non come difetto corretto. Il run finale QA collaudo `42026909921` resta SUCCESS.
Nessuna modifica a Production, nessun merge o deploy e nessun nuovo ambiente QA.


## Instradamento webhook QA isolato — 2026-11-05

- Creato in Resend un secondo webhook dedicato esclusivamente all'endpoint QA `https://jhuyhlzzydcgghrzeexn.supabase.co/functions/v1/bethag-resend-webhook`, sottoscritto a `email.sent`, `email.delivered`, `email.bounced`, `email.complained`.
- Verifica immediata Resend: due webhook attivi. Quello Production continua a puntare a `https://tctcgptrsmvgajqjgnev.supabase.co/functions/v1/bethag-resend-webhook`; endpoint e sottoscrizioni Production non sono stati modificati.
- Il nuovo webhook QA è stato creato, ma APP-12 non è ancora chiuso: il suo signing secret deve essere configurato come Edge Function secret `RESEND_WEBHOOK_SIGNING_SECRET` nel solo ambiente QA. Il connettore Supabase disponibile non espone un'operazione per impostare Edge Function secrets, quindi non è stato possibile automatizzare questo passaggio.
- Dopo la configurazione del secret si dovrà inviare un messaggio di test controllato dalla Edge Function QA, verificare su Resend l'evento e il tentativo verso l'endpoint QA, quindi verificare in QA l'aggiornamento dello stato comunicazione. Non effettuare replay di eventi Production.
- Nessuna modifica a Production, nessuna modifica al webhook Production, nessun merge, deploy, migrazione o cutover. APP-12 resta PARTIAL fino alla prova end-to-end QA.


## Verifica callback Resend QA dopo configurazione secret — 2026-11-05

- La schermata Supabase QA conferma la presenza del custom secret `RESEND_WEBHOOK_SIGNING_SECRET`; il valore non è stato letto né esposto.
- Il webhook QA dedicato ha ricevuto gli eventi reali `email.sent` e `email.delivered` per il messaggio di test già inviato a `delivered@resend.dev`. Gli eventi Resend risultano `success`; per `email.delivered` il replay conclusivo ha restituito HTTP 200 con `status=updated`, conteggio `delivered=1` e aggiornamento della comunicazione QA a `Consegnata`.
- Le risposte precedenti `recipient_not_found` erano coerenti con l'assenza, al momento dei primi tentativi, di una riga destinatario QA con il relativo `provider_message_id`. Non era un errore di firma né un errore di instradamento. È stato creato un fixture tecnico QA isolato, associato al message ID già consegnato; il callback firmato ha aggiornato correttamente il record.
- Il fixture temporaneo `BETHAG_QA_APP12_WEBHOOK_REPLAY_20261105` e il relativo destinatario sono stati eliminati dopo aver acquisito l'evidenza. Nessun dato QA preesistente è stato modificato.
- Il test dimostra la verifica della firma, la ricezione del callback Resend QA e l'aggiornamento DB per l'evento `email.delivered`. Non dimostra ancora il percorso completo APP-12 avviato dall'interfaccia/applicazione QA con creazione automatica del destinatario e invio provider nello stesso flusso; tale prova resta necessaria prima di dichiarare APP-12 integralmente PASS.
- Webhook Production, configurazione Production, schema Production e dati Production invariati. Nessun merge, deploy o cutover.


## APP-14 — preparazione cutover Production, aggiornamento 2026-11-05

La matrice QA è stata completata: APP-01–APP-13 e APP-15 risultano PASS sul progetto QA esistente. APP-14 resta **PARTIAL / NO-GO Production**.

Attività svolte in questa fase:
- Riesaminato il freeze `supabase/rebuild/production-migration-cutover-freeze-20261105.json`: preserva le 248 righe storiche Production e definisce 19 incrementi forward-only, con risultato atteso di 267 righe. Nessuna baseline QA viene copiata nel ledger Production.
- Verificata la sequenza e i postcondition del preflight/postflight. Il piano comprende permessi collaboratori booleani, colonna profilo, conservazione archivio, trigger metadati comproprietari, grants RPC, ACL di default, funzioni trigger e upsert registrazione portale.
- Individuata e corretta una divergenza documentale nel planner `scripts/plan-migration-cutover.mjs`: riportava ancora 16 migrazioni, mentre il freeze corrente e il runner ne prevedono 19. Il planner ora riporta 19 in entrambe le fasi (rehearsal e promozione).
- La baseline safety sul commit precedente ha confermato manifest e planner safety PASS, 248 righe storiche, 19 incrementi e ledger atteso 267; la CI applicativa/build/safety è verde.
- Nessun comando DDL è stato eseguito su Production o sul QA remoto. Nessun merge, deploy o cutover.

### Gate ancora bloccanti

1. **Rehearsal end-to-end sul target isolato:** eseguire il runner canonico con i 19 SQL reali, ricostruendo lo snapshot 248 e verificando postflight 267. Non confondere il test sintetico del ledger con l'esecuzione dei 19 SQL.
2. **Connettività:** il runner richiede una `DATABASE_URL` PostgreSQL diretta verso il progetto Production. Le funzioni Supabase MCP disponibili non sostituiscono questa connessione; `apply_migration` non è ammesso perché può generare timestamp/versioni non controllati. Nessuna URL diretta Production è stata usata o resa disponibile in questa fase.
3. **Data API Production:** attestazione manuale in Dashboard del valore `Automatically expose new tables` e degli schemi esposti; l'evidenza QA non è trasferibile a Production.
4. **Cutover approval:** fissare finestra, commit esatto, hash SQL, strategia di rollback e criteri di stop, con approvazione esplicita separata prima di qualsiasi DDL Production.

**Decisione operativa:** mantenere Production NO-GO. Non avviare `db push`, `apply_migration`, GRANT/REVOKE, ALTER, merge o deploy finché i gate 1–4 non sono chiusi e documentati.


## Chiusura collaudo punto 7 — run finale 42040560319 (2026-11-05)

Il workflow GitHub Actions [42040560319](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42040560319) è terminato **SUCCESS** sul commit `7e308fb976245228f693a9ce17be6d2b27cd8e1a`. Tutti gli step del job `final-qa-collaudo` risultano completati con conclusion `success`.

- APP-01..04 e APP-13 — autenticazione reale, RLS e Storage: PASS.
- APP-05..07 — gestione condominio, contabilità e protezione esercizio chiuso: PASS.
- APP-08..11 — subentro, posizioni insolute e invarianti rollback: PASS; il flusso UI autenticato incluso nel job è completato.
- APP-12 — pubblicazione, destinatari, webhook firmati e prova del provider email Resend con destinatario di test `delivered@resend.dev`: PASS. Entrambi gli step dedicati APP-12 sono conclusi SUCCESS.
- Flussi browser autenticati APP-05/06/08/11/12: PASS.
- APP-15 — navigazione per ruolo e persistenza sessione: PASS.
- Build contro il solo progetto QA esistente: PASS.

**Punto 7 CHIUSO** per il perimetro APP-01–APP-15 verificato dal workflow. Il precedente stato PARTIAL di APP-11 e APP-12 è superato da questa esecuzione completa. Non sono stati eseguiti merge, deploy, migrazioni o cutover Production. Il progetto QA esistente è stato mantenuto; Production resta NO-GO per i blocker del punto 6 e i gate APP-14.

### Stato complessivo aggiornato

| Punto | Stato |
|---|---|
| 1–7 | CHIUSI per gli ambiti documentati; punto 6 con decisione NO-GO Production |
| APP-01–APP-13, APP-15 | PASS sul QA esistente |
| APP-14 | PARTIAL / NO-GO Production |

Il completamento del collaudo QA non costituisce autorizzazione a promuovere il codice o applicare modifiche a Production.


## Rettifica e conferma collaudo punto 7 — 2026-11-05

La precedente chiusura del punto 7 è stata nuovamente verificata dopo la correzione del test di navigazione APP-15. Il run [42042864031](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42042864031), sul commit `1aba1720bd50794b19ec386a0e104962370e8b0f`, è terminato SUCCESS; tutti gli step del job, incluso APP-15 e teardown, sono `completed / success`.

È inoltre terminata con SUCCESS la nuova esecuzione sul commit aggiornato `93f23d95108cba8b4c791fc7a3c99b21cb27799e`:
- Final QA [run 42043452669](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452669): SUCCESS.
- Build [run 42043452826](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452826): SUCCESS.
- Baseline safety [run 42043452653](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42043452653): SUCCESS.

Nel run finale APP-01–APP-15 risultano PASS, inclusi i flussi browser autenticati, il ciclo provider Resend con callback firmato verso QA, navigazione per ruolo e persistenza sessione. Il difetto del test APP-15 era nel selettore dinamico che mutava lo stato del piano; è stato corretto evitando l'interazione non necessaria con il pulsante di attivazione. Il test corretto è stato eseguito nel run 42043452669.

**Punto 7 confermato CHIUSO** sul QA esistente. Nessuna modifica a Production, nessun merge, deploy o cutover. Il punto 6 resta chiuso con decisione NO-GO Production; APP-14 resta PARTIAL / NO-GO.



---

## Rettifica autoritativa della scaletta — 2026-11-06

Questo addendum prevale sugli stati storici riportati sopra. Le note precedenti restano conservate come cronologia e non devono essere usate per riaprire attività già concluse.

### Stato dei punti

| Punto | Stato aggiornato | Evidenza / decisione |
|---|---|---|
| 1–3 | CHIUSI | Fasi precedenti già accettate; non riaprire senza nuova evidenza di difetto. |
| 4 | CHIUSO | Verifica autenticata QA, permessi/RLS, parità ACL e Data API documentata. |
| 5 | CHIUSO | Riconciliazione dei registri Production/QA e classificazione dei payload completate; preservare tutte le identità storiche. |
| 6 | CHIUSO | Parità e divergenze QA/Production verificate in sola lettura; decisione Production NO-GO documentata. |
| 7 | CHIUSO — 2026-11-06 | Final QA APP-01..APP-15 run 42132736491 SUCCESS sul commit applicativo 6988383794995748436aaa691e8a08ed41eb8188. APP-01..APP-13 e APP-15 PASS; APP-14 resta PARTIAL perché la sua componente Production si chiude soltanto dopo cutover, postflight e smoke Production. |
| 8 | APERTO — NO-GO | Preparazione operativa e cutover Production controllato, subordinati ai gate elencati sotto. |

### Evidenze finali del punto 7

Sul commit applicativo `6988383794995748436aaa691e8a08ed41eb8188`:
- Final QA APP-01..APP-15 [run 42132736491](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736491): SUCCESS.
- Build + PostgreSQL bootstrap [run 42132736459](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736459): SUCCESS.
- Baseline Safety [run 42132736537](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42132736537): SUCCESS.
- APP-15: amministratore, collaboratore e condomino superano navigazione autorizzata, restrizioni di ruolo, autenticazione e persistenza sessione.
- APP-12: pubblicazione, webhook sintetici firmati, rifiuto firma invalida e probe/consegna Resend su destinatario di test PASS; non equivale a certificazione deliverability su volumi Production.
- Build: clean install 28 migrazioni e guarded runner 19 incrementi su PostgreSQL 17 isolato PASS.

Il punto 7 non va ripetuto. I relativi test si riaprono solo se cambia codice applicativo, migrazioni, configurazione QA rilevante o emerge un difetto documentato. Lo smoke autenticato Production appartiene al punto 8 dopo il cutover, non è un motivo per ripetere APP-01..APP-15 su QA.

### Punto 8 — stato e gate obbligatori

Verifica Production read-only del 2026-11-06: PostgreSQL 17.6, ledger 248 righe, head `20261104222229`; Security Advisor zero lint; Health Advisor zero lint. Il QA esistente conserva 283 righe di ledger. Non pareggiare i conteggi e non riscrivere le 248 righe storiche Production.

Il piano forward-only resta congelato in 19 migrazioni: rehearsal PostgreSQL 17 isolato PASS; ledger atteso dopo l'esecuzione 267. Il preflight read-only Production è documentato PASS. La verifica Data API è PASS sulla base delle schermate dell'operatore: `public` esposto, `private` e `supabase_functions` non esposti, auto-expose OFF; `graphql_public` aggiuntivo esposto.

Restano da completare, nell'ordine:
1. L'operatore configura localmente `DATABASE_URL` con connessione Direct o Session Pooler Production, ruolo `postgres` e privilegi DDL. Nessuna password o URI va inserita in chat, issue, PR o repository; non resettare la password per aggirare il gate.
2. Piano operativo compilato: operatore e approvatore nominati, finestra Europe/Rome, freeze schema, avviso agli utenti, criteri STOP, rollback/recovery e contatti.
3. Pin del commit approvato e degli hash dei 19 SQL; nuovo preflight read-only immediatamente prima del cutover.
4. Solo dopo gate e approvazione formale: runner guarded dal checkout pulito approvato.
5. Postflight: 267 righe, 248 storiche intatte, 19 migrazioni esatte e tutte le postcondizioni; quindi smoke autenticato Production e comunicazione finale.

Il restore logico locale è verificato; il restore fisico provider-managed non è stato eseguito. Il rischio residuo resta esplicito e non deve essere descritto come prova di restore fisico.

### Decisione

**Punti 1–7 chiusi. Punto 8 aperto. Production NO-GO.** PR #57 resta aperta e non unita. Nessuna migrazione, scrittura ledger, deploy o modifica Production è stata eseguita. Non ripetere il collaudo QA già superato e non eseguire merge/cutover per il solo fatto che la CI sia verde.

Documento di stato aggiornato: `docs/release/RELEASE-STATUS-20261106.md`.


## Addendum di chiusura QA e autorizzazioni — 2026-11-06

- Commit QA certificato: `ea32fc492757e5165b41580f082e42916bd54a8c`.
- Final QA APP-01..APP-15: run [42246244137](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246244137) — SUCCESS.
- Build e PostgreSQL 17 (28 migrazioni clean install, 19 canoniche, runner guarded e postflight isolato): run [42246243987](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246243987) — SUCCESS.
- Baseline Safety: run [42246243967](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42246243967) — SUCCESS.
- PR #57 contiene 65 file modificati ed è ancora aperta e non unita.
- La correzione del portale copre richieste ambigue tra workspace, visibilità RLS limitata ai gestori dei condomìni attivi corrispondenti, e-mail account verificata e corrispondenza dell'e-mail del condòmino; i test PostgreSQL 17 isolati sono PASS.
- **Production resta NO-GO.** Nessuna migrazione, merge, deploy, freeze o scrittura Production è stata eseguita.
- Non è registrata alcuna approvazione finale del cutover riferita allo SHA, ai 19 hash SQL, alla finestra, al rischio backup e ai criteri STOP/rollback. La finestra del 7 novembre alle 22:00 è un obiettivo, non un'autorizzazione.
- Non risultano review GitHub indipendenti. La revisione del proprietario è valida come approvazione del proprietario, ma non equivale a una verifica indipendente a quattro occhi.
