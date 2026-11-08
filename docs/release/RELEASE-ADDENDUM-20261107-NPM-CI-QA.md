# BETHAG — addendum release readiness 2026-11-07

**Candidate SHA verificato:** `f3b99354f995bd50877f968f5852f0b28dadf5b7`  
**PR:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Branch:** `fix/qa-view-acl-parity-20261105`  
**Production:** `tctcgptrsmvgajqjgnev`  
**QA:** `jhuyhlzzydcgghrzeexn`

## 1. CI sul candidato

Tutti i workflow associati allo SHA esatto `f3b99354f995bd50877f968f5852f0b28dadf5b7` risultano `completed / success`:

- [Build — run 42317982320](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42317982320): PASS. Il job ha eseguito **Install dependencies from the committed lockfile** con `npm ci`, audit dipendenze, controlli migrazioni, baseline, security/ACL parity, build e browser smoke.
- [PostgreSQL bootstrap — run 42317982320](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42317982320): PASS. Bootstrap PostgreSQL 17, clean-install delle 28 migrazioni, rehearsal delle 19 migrazioni canoniche tramite runner guarded su database isolato, ACL/default ACL, RLS e rollback.
- [Baseline Safety — run 42317982329](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42317982329): PASS.
- [Final QA APP-01..APP-15 — run 42317982310](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42317982310): PASS. Tutti gli step sono conclusi con successo, inclusi i flussi browser autenticati, APP-12 (preparazione comunicazioni, webhook firmati e probe provider Resend con destinatario di test) e APP-15 (navigazione per ruolo e persistenza sessione).

La prova Resend è un probe con destinatario di test e non certifica la deliverability su volumi Production.

## 2. Verifica Production read-only del 2026-11-07

Il progetto Supabase Production risulta `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.166`, regione `eu-central-1`.

Una query SQL esclusivamente read-only eseguita tramite il connettore Supabase ha restituito:

| Controllo | Risultato |
|---|---:|
| Righe ledger migrazioni | 248 |
| Head ledger | `20261104222229` |
| 19 versioni pendenti già registrate | 0 |
| Tabelle/partizioni public con RLS abilitato | 47 |
| Colonna `workspace_members.data` | assente |

Security Advisor: zero lint. Health Advisor: zero lint.

Questa verifica read-only conferma che il ledger Production non è stato modificato e che le 19 versioni previste risultano ancora pendenti. L'assenza di `workspace_members.data` è una divergenza nota, coperta dal payload congelato previsto.

**Limite:** la query tramite connettore non equivale all'esecuzione del runner guarded da un checkout locale con `DATABASE_URL` PostgreSQL Direct/Session Pooler. Il gate del runner locale resta aperto.

## 3. Stato APP-14 e gate operativi

- APP-01..APP-13 e APP-15 in QA: **PASS / CHIUSI** sul candidato sopra.
- APP-14 Production: **PARTIAL / NO-GO**.
- Rehearsal delle 19 migrazioni su PostgreSQL isolato: **PASS**.
- Freeze dei 19 payload SQL: da preservare; nessuna migrazione deve essere modificata o aggiunta in questo passaggio.
- Preflight diretto del runner locale sullo SHA finale: **NON ESEGUITO**; richiede `DATABASE_URL` configurata localmente dall'operatore, senza condividere password o URI in chat o repository.
- Operatore umano locale: **da confermare esplicitamente**.
- Approvatore finale: proprietario del progetto; approvazione puntuale del cutover non ricevuta.
- Revisore indipendente: non nominato; la verifica del proprietario non equivale a revisione indipendente a quattro occhi.
- Finestra preferita/concordata come obiettivo: 7 novembre 2026 dalle 22:00, `Europe/Rome`; ora di fine non specificata. Non è un'autorizzazione né un freeze attivato.
- Avviso agli amministratori: non inviato.
- Freeze operativo: non attivato.
- Rischio residuo restore fisico provider-managed non testato: permane; il restore logico locale è stato verificato, ma il gate runner richiede la riconferma esplicita locale prevista dalla procedura.

## 4. Decisione

**QA e build riproducibile: PASS.**  
**APP-14 / Production cutover: NO-GO.**

Non è stato eseguito alcun merge della PR #57, deploy, DDL/DML, GRANT/REVOKE, applicazione di migrazioni o scrittura del ledger Production. Non avviare il runner in modalità apply e non dichiarare BETHAG pronto al lancio finché non risultano completati il preflight diretto, il piano operativo, la conferma dell'operatore e l'approvazione finale riferita allo SHA e ai 19 hash esatti.
