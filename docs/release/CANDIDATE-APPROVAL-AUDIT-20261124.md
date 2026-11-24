# BETHAG — audit approvazione identità candidato release (Punto 10.7)

Data: 2026-11-24  
Repository: `federico1bartolucci-ctrl/BETHAG`  
Branch: `cap-consolidation-20261123`  
PR: #389 — Draft, non merged

## 1. Identità osservate

| Identità | SHA / valore | Significato |
|---|---|---|
| Ultimo head PR prima di questa registrazione | `ff0bf77925317386d2138ecbe5f300da95177d86` | Head documentale CAP osservato via GitHub |
| Commit QA exact-head con Build, Baseline e Final QA completati | `c684cc74d8dbac072239eef3aab4d4bab80b45dd` | Checkout verificato dal Final QA run 45401046145 |
| Tree del commit QA | `494fb394463eb353be29dcd50f939a9797739e42` | Identità Git tree del commit QA |
| Release source SHA stampato dal Final QA | `5d96342209be77e189012dec754bc764999e64e2` | Valore derivato dal campo storico `user_authorization.approved_commit_sha` del manifest congelato; non è il checkout SHA del run |
| Fingerprint osservato nel Final QA | `1dab15902dd7d44b0c66364bee093cc60752eb79689542819eb622099153b220` | Fingerprint calcolato dal run sul set di 41 file critici; non equivale a una nuova approvazione |
| Source SHA approvato nel manifest storico | `5d96342209be77e189012dec754bc764999e64e2` | Approvazione registrata nel freeze del 5 novembre e riconferme del 8 novembre |
| Execution SHA approvato nel manifest storico | `c4f1aced9ec8c27265c4c4ca8661410fba38faf0` | Approvazione storica per un'esecuzione Production del perimetro allora congelato |
| Fingerprint approvato nel manifest storico | `35018277d9d27c25538f40c9392536645762747d65f1d38f8154d2bf773a52ab` | Fingerprint storico approvato l'8 novembre |

Le identità sopra non sono intercambiabili. In particolare, il source SHA storico non deve essere presentato come checkout SHA del Final QA e il fingerprint osservato nel QA non deve essere presentato come fingerprint approvato dal responsabile.

## 2. Confronto tra checkout QA e head PR

Il confronto GitHub tra il commit QA `c684cc74d8dbac072239eef3aab4d4bab80b45dd` e l'head PR `ff0bf77925317386d2138ecbe5f300da95177d86` restituisce:

- 12 commit in avanti;
- 0 commit indietro;
- 5 percorsi modificati nel confronto aggregato:
  - `docs/release/PRODUCTION-BACKUP-RISK-20261124.md`;
  - `docs/release/RELEASE-GATE-RECONCILIATION-20261124.md`;
  - `supabase/rebuild/live-migration-ledgers-20261124.json`;
  - `supabase/rebuild/production-readonly-preflight-20261124.sql`;
  - `supabase/rebuild/qa-final-collaudo-20261105.json`.

I percorsi elencati sono documentazione, snapshot di evidenza, uno script SQL read-only e il registro QA; il confronto non mostra modifiche a codice applicativo o migrazioni applicative rispetto al commit QA indicato. Questo confronto non sostituisce una nuova approvazione del candidato né la verifica finale del fingerprint sul checkout eseguibile.

## 3. Workflow sul head PR corrente al momento della verifica

Per l'head `ff0bf77925317386d2138ecbe5f300da95177d86`, GitHub Actions ha restituito:

- Build run **45425834637**: SUCCESS.
- Baseline Safety run **45425834677**: SUCCESS.
- Final authenticated QA run **45425834821**: IN_PROGRESS al momento della rilevazione; non viene dichiarato PASS.

Il Final QA è un workflow automatico associato all'aggiornamento del PR. Non è stato avviato manualmente in questa verifica. Finché è in corso, non si trasferisce al nuovo head l'esito del Final QA del precedente SHA `c684cc74...`.

## 4. Approvazioni storiche e loro limiti

Il manifest congelato `supabase/rebuild/production-migration-cutover-freeze-20261105.json` contiene un'approvazione storica con source SHA `5d96342209be77e189012dec754bc764999e64e2`, execution SHA `c4f1aced9ec8c27265c4c4ca8661410fba38faf0`, fingerprint `35018277d9d27c25538f40c9392536645762747d65f1d38f8154d2bf773a52ab`, e una precisa sequenza ordinata di 19 hash SQL.

Quell'autorizzazione è riferita al perimetro e alla finestra operativa del novembre 2026 descritti nel manifest. Non viene trasferita automaticamente all'head CAP attuale, al fingerprint osservato nel QA del 24 novembre o a un nuovo execution SHA. Il manifest è congelato e non viene modificato retroattivamente.

## 5. Accettazione rischio backup

La nuova accettazione esplicita del responsabile, acquisita il 24 novembre 2026, è registrata nel documento `PRODUCTION-BACKUP-RISK-20261124.md`. È limitata alla preparazione al rilascio e non autorizza cutover o spese. L'accettazione del rischio backup non sostituisce l'approvazione source SHA, execution SHA e fingerprint.

## 6. Esito Punto 10.7

**OPEN — approvazione del candidato corrente non ancora registrata.**

Motivi:
1. il source SHA approvato nel freeze è storico e non è stato riconfermato per il candidato corrente;
2. l'execution SHA approvato nel freeze è storico e non è stato riconfermato;
3. il fingerprint QA osservato `1dab1590...` non coincide con il fingerprint storico approvato e non è stato approvato per il candidato corrente;
4. il Final QA sul head `ff0bf...` era ancora IN_PROGRESS al momento di questa rilevazione.

Per chiudere il punto occorre una nuova approvazione esplicita, riferita a source SHA, execution SHA, fingerprint e ai 19 hash SQL esatti, dopo il completamento e la verifica dei workflow sul candidato definitivo. Nessuna approvazione viene inferita da un generico “Procedi”.

## 7. Vincoli rispettati

Nessuna modifica a Production o QA è stata eseguita manualmente durante questo audit. Non sono state eseguite migrazioni, deploy, cutover, invii email, restore o merge. PR #389 resta Draft. Production resta **NO-GO**.

## Riconciliazione tecnica successiva — exact-head 78d9ec6 (24 novembre 2026)

Questa sezione aggiorna le rilevazioni precedenti, che riportavano head e run superati. Non modifica il manifest Production congelato e non registra una nuova approvazione owner.

### Identità e CI/QA corrente

- PR #389: aperta, Draft, non merged; head `78d9ec6c19ac9b7f5833609fff57fc522938af76`; base `main`; GitHub riporta `mergeable: true`.
- Build/PostgreSQL 17: run [45426235950](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45426235950), SUCCESS; job `build` e `postgres-bootstrap` entrambi SUCCESS.
- Baseline Safety: run [45426236122](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45426236122), SUCCESS.
- Authenticated Final QA: run [45426236232](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45426236232), SUCCESS; metadati run associati allo stesso head PR.
- APP-01..APP-13 e APP-15: PASS nel Final QA. APP-15 include navigazione, autenticazione Supabase e persistenza sessione per admin, collaborator e resident.
- APP-12: pubblicazione/ritiro comunicazioni, preparazione destinatari e webhook sintetici firmati PASS; provider live-send SKIPPED e `provider_delivery: NOT_RUN`. Nessuna email reale inviata.
- APP-14: PARTIAL/non eseguito in Production; resta il post-cutover/postflight.
- Il fixture temporaneo del piano Portal è stato ripristinato a `free` (log `RESTORED`); preview arrestata. Il fixture persistente APP-07 resta deliberatamente presente, come già registrato nelle evidenze precedenti.
- Artifact APP-15: [bethag-app15-diagnostics, ID 14936747962](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/45426236232/artifacts/14936747962).

Il registro `supabase/rebuild/qa-final-collaudo-20261105.json` è stato aggiornato nel commit `84b914baa4069eea83acb26eed7cb09572421f5b` per riportare il nuovo head, i tre run, gli stati APP e l'artifact. La registrazione mantiene esplicitamente APP-12 provider delivery NOT_RUN e APP-14 PARTIAL. La verifica dei log non ha trovato uno step separato denominato “Verify checked-out revision”; non viene quindi dichiarata una verifica indipendente dello SHA estratto oltre ai metadati del run.

### Separazione delle identità

| Campo | Valore osservato | Significato / stato |
|---|---|---|
| PR head / candidato QA | `78d9ec6c19ac9b7f5833609fff57fc522938af76` | Head identificato dai metadati GitHub dei tre workflow |
| Source SHA usato dal fingerprint | `5d96342209be77e189012dec754bc764999e64e2` | Valore letto da `manifest.user_authorization.approved_commit_sha`; approvazione storica, non riconfermata per questo candidato |
| Fingerprint osservato | `1dab15902dd7d44b0c66364bee093cc60752eb79689542819eb622099153b220` | Calcolato nel Final QA sui 41 file critici usando il Source SHA sopra; non è una nuova approvazione |
| Execution SHA per un futuro runner Production | NON SELEZIONATO | Dovrà essere il commit esatto del checkout pulito dal quale sarà eseguito il runner; il valore storico `c4f1aced...` non è trasferibile automaticamente |
| Fingerprint storico approvato | `35018277d9d27c25538f40c9392536645762747d65f1d38f8154d2bf773a52ab` | Approvazione dell'8 novembre, riferita alla precedente finestra e al precedente perimetro |

Il codice del runner distingue effettivamente:
- `BETHAG_QA_TESTED_COMMIT_SHA`: SHA per cui il registro QA deve riportare Build, Baseline e Final QA tutti SUCCESS;
- `BETHAG_EXPECTED_COMMIT_SHA`: SHA esatto del checkout pulito sul quale gira il runner;
- `BETHAG_APPROVED_SOURCE_COMMIT_SHA`: Source SHA approvato, che deve coincidere con `manifest.user_authorization.approved_commit_sha`;
- fingerprint: SHA-256 del contratto eseguibile, dei file critici, del manifest congelato e del Source SHA.

Il runner ammette che il checkout di esecuzione sia successivo al QA soltanto entro una lista ristretta di modifiche post-QA consentite e con il payload tecnico congelato invariato. Pertanto il futuro Execution SHA non va confuso né con il QA-tested SHA né con il Source SHA.

### Blocco tecnico rilevante

Il runner Production contiene un controllo esplicito che richiede APP-12 `provider_delivery_observed` con valore che inizi per `PASS`. Il registro QA aggiornato riporta correttamente `provider_delivery: NOT_RUN`, perché l'invio live Resend è escluso dall'autorizzazione attuale. Di conseguenza il runner deve bloccare l'applicazione Production: non è corretto aggirare il controllo o trasformare i webhook sintetici in prova di consegna provider. Per chiudere questo gate servirebbe un'autorizzazione separata e specifica per un probe live controllato; non è compresa nell'autorizzazione tecnica ricevuta in questa conversazione.

### Matrice aggiornata dei gate

| Gate | Stato verificato al 24 novembre |
|---|---|
| Build + PostgreSQL 17 sul head corrente | PASS |
| Baseline Safety sul head corrente | PASS |
| Final authenticated QA sul head corrente | PASS, con la limitazione di provenienza checkout sopra descritta |
| APP-01..APP-13 e APP-15 | PASS |
| APP-12 live provider delivery | NOT RUN — blocca il runner |
| APP-14 Production postflight | PARTIAL / da eseguire solo dopo cutover |
| Registry Production e 19 postcondizioni catalogate | Riconciliazione read-only precedente PASS nel perimetro interrogato |
| Provenienza temporale dell'applicazione delle 19 migrazioni | NON DIMOSTRATA dal ledger |
| Production read-only preflight SQL 24 novembre | PASS; non equivale al preflight locale exact-execution-SHA del runner |
| Data API exposed schemas | Ultima evidenza Dashboard owner 7 novembre; da riconfermare prima di un eventuale cutover |
| Backup/restore fisico | Non collaudato; accettazione rischio 24 novembre limitata alla preparazione, non al cutover |
| Source SHA e fingerprint correnti | Non approvati nuovamente |
| Execution SHA | Non selezionato né approvato |
| Operatore, finestra, piano rollback e approvazioni operative correnti | Da riconfermare |
| PR #389 | Draft, non merged |
| Production | **NO-GO** |

### Esito

La nuova evidenza chiude la verifica CI/QA applicativa sul head PR `78d9ec6...`, ma non chiude il Punto 10.7 (approvazione del candidato) né il Punto 10.8 (release gates). In particolare, il gate APP-12 provider delivery è intenzionalmente NOT RUN e il runner Production lo blocca. Non è stata eseguita alcuna modifica Production, migrazione, deploy, cutover, invio email o merge. Nessun valore storico di approvazione viene riutilizzato come approvazione corrente.

## Correzione in corso — origine del Source SHA nel fingerprint

Durante la prosecuzione dell'audit è stata rilevata una discrepanza tra il contratto documentato e il comportamento di `scripts/print-release-fingerprint.mjs`: lo script prendeva `manifest.user_authorization.approved_commit_sha`, cioè lo SHA approvato storicamente l'8 novembre, anziché lo SHA del Final QA corrente. Il modulo `releaseFingerprint` descrive invece il parametro come full QA-tested source commit SHA. Con i dati correnti i due valori sono diversi:
- QA-tested SHA registrato: `78d9ec6c19ac9b7f5833609fff57fc522938af76`;
- source SHA storico nel manifest: `5d96342209be77e189012dec754bc764999e64e2`.

Correzione applicata nel commit `fde213906b9d03ea5f531417b939d0ff6fa7b204`:
- il fingerprint script legge `reviewed_head_sha` dal registro QA;
- prima del calcolo verifica che Build, Baseline Safety e Final QA risultino tutti SUCCESS sul medesimo SHA;
- non modifica il manifest congelato né l'approvazione storica.

È stato poi individuato il secondo vincolo collegato: il runner confronta il diff successivo al QA con una allowlist esplicita. Per consentire il corretto uso del fingerprint script aggiornato come modifica post-QA, l'allowlist del runner è stata estesa con `scripts/print-release-fingerprint.mjs`, nel commit `2e44196718611636dba00a0ce808287b5ac2c699`.

**Verifica ancora necessaria:** questi due commit sono successivi all'ultimo QA eseguito (`78d9ec6...`). Il connettore GitHub non ha restituito workflow run associati al primo commit; quindi non dichiaro Build, Baseline, Final QA o i test del runner PASS sul nuovo stato. Occorre ottenere una nuova esecuzione CI/QA sul nuovo head prima di congelare fingerprint ed execution SHA. Il fingerprint aggiornato non è ancora stato calcolato e verificato da un workflow. L'approvazione del candidato resta OPEN.

Questa correzione è limitata alla coerenza tra QA evidence, fingerprint e allowlist. Non cambia le 19 migrazioni, il loro ordine o i rispettivi hash. APP-12 provider delivery resta NOT_RUN e continua a bloccare il runner Production. Nessuna operazione Production/QA, migrazione, deploy, cutover, invio email o merge è stata eseguita.
