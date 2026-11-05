# BETHAG — scaletta operativa aggiornata
**Aggiornata:** 2026-11-05  
**Riferimento:** branch `fix/qa-view-acl-parity-20261105`, ultimo avanzamento documentale `4271e96f2be8b77a4ad77c27014aeda35f6316b2` (successivo alla CI verde `e5a31109178f2b2e18c214dc5164fcb3f43d3fed`).

## Regole di esecuzione
- Procedere in ordine, un punto alla volta; non iniziare il successivo finché quello corrente non è chiuso con evidenze verificabili.
- Mantenere esclusivamente il branch QA esistente `bethag-launch-qa`; non crearne altri, non eliminarlo, non eseguire reset, replay o ricostruzioni distruttive.
- Nessuna modifica a Production senza autorizzazione esplicita separata.
- Conservare i dati QA e gli storici dei registri di migrazione.
- Eseguire il collaudo APP completo APP-01–APP-15 solo nell'ultima fase prevista.

## Stato della scaletta

| Punto | Ambito | Stato |
|---|---|---|
| 1–3 | Fasi precedenti della scaletta concordata | CHIUSI secondo lo storico di progetto; non riaperti da questo aggiornamento. |
| 4 | Verifica autenticata del QA, permessi/RLS, parità ACL, configurazione Data API e documentazione | **CHIUSO — 2026-11-05** |
| 5 | Riconciliazione read-only della storia migrazioni Production con le sorgenti canoniche e classificazione degli effetti, quindi piano forward-only verificabile | **CHIUSO — 2026-11-05**: 247/247 payload comuni identici; 17/17 QA-only con file canonico identici; 19 QA-only non canonici classificati e payload esatti archiviati; Production-only confrontato semanticamente col draft; divergenze ACL e tre draft forward-only testati due volte su PostgreSQL 17 isolato; CI Build e Baseline SUCCESS sul commit 79311f06. Nessuna modifica remota. |
| 6 | Verifica finale della parità QA/Production e preparazione dei gate di rilascio, senza applicare modifiche a Production | **IN CORSO** — avviata dopo la chiusura documentata del punto 5; solo verifiche read-only e gate, nessuna modifica remota |
| 7 | Collaudo applicativo completo APP-01–APP-15 sul solo QA esistente e raccolta delle evidenze finali | DA ESEGUIRE PER ULTIMO |

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
