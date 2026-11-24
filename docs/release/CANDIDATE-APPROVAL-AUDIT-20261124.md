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
