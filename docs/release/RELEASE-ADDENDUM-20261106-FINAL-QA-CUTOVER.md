# BETHAG — addendum operativo finale QA e cutover

**Data:** 2026-11-06  
**PR:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Commit applicativo e migrazioni testato:** `62967275c6a528be031c26e2352caa39c7031af9`

## Evidenze CI sullo SHA esatto

- Final QA APP-01..APP-15: [run 42257477325](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42257477325) — **SUCCESS**.
- Build + PostgreSQL 17 bootstrap: [run 42257477464](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42257477464) — **SUCCESS**.
- Baseline Safety: [run 42257477318](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42257477318) — **SUCCESS**.
- **APP-01..APP-13 e APP-15: PASS. APP-14: PARTIAL**, perché richiede cutover, postflight e smoke autenticato su Production, non eseguiti.
- PostgreSQL 17 ha superato clean-install delle 28 migrazioni, rehearsal isolata delle 19 migrazioni canoniche, controlli ACL/default ACL, bootstrap, rollback subentro e test negativi dei gate Production.
- APP-12 ha verificato il flusso di pubblicazione, webhook firmato e invio sintetico tramite Resend al destinatario di test `delivered@resend.dev`.
- APP-15 ha verificato i tre ruoli, persistenza sessione e navigazione; il test ha impostato temporaneamente il workspace QA a Free, verificato il blocco di Documenti/Scadenze e degli altri moduli a pagamento, quindi ripristinato e verificato il piano originario `portal`.
- Il workspace QA è stato ricontrollato dopo il test: piano ripristinato a `portal`.

## Correzioni di sicurezza e regressioni

- Self-registration rifiuta il collegamento automatico se il residente seleziona un condominio diverso da quello del membro univocamente abbinato.
- Self-registration e approvazione amministrativa rifiutano i casi ambigui con più condomìni attivi omonimi nello stesso workspace.
- Entrambi i percorsi bloccano la riga del membro prima di verificare/aggiornare `user_id`, impedendo race condition e sovrascritture concorrenti dell'associazione account-condòmino.
- Le richieste di registrazione vengono aggiornate solo se corrispondono ad account, email, workspace, membro e condominio attesi; richieste relative ad altri condomìni restano pending.
- Migrazione canonica, draft e hash del manifest congelato sono allineati; le regressioni sono state eseguite su PostgreSQL 17 isolato.
- La pulizia del collaudo ritenta gli errori temporanei Supabase Auth (HTTP 5xx/521) e l'APP-15 individua l'utente admin tramite service role, senza un secondo login Auth.

## Verifiche read-only Supabase

- **Production**: ledger 248 righe, head `20261104222229_reconcile_production_acl_least_privilege`; 47 tabelle pubbliche con RLS; zero privilegi `MAINTAIN` per `authenticated/service_role`; Security Advisor e Health Advisor senza finding.
- **QA**: ledger 283 righe, head `20261105001928_align_qa_fund_availability_view_acl`; 47 tabelle pubbliche con RLS; zero privilegi `MAINTAIN` per `authenticated/service_role`; Security Advisor e Health Advisor senza finding.
- Le verifiche sono read-only. Nessuna migrazione o scrittura ledger è stata applicata a Production o QA.
- Il test della nuova migrazione portal-registration è stato eseguito su PostgreSQL 17 isolato; la migrazione non è stata applicata al ledger QA né a Production.

## Stato Production e gate ancora aperti

**Production resta NO-GO.** La PR #57 è aperta, con 66 file modificati. Non risulta una review indipendente registrata: una revisione del proprietario/autore non sostituisce il controllo a quattro occhi.

Restano obbligatori prima di qualsiasi cutover:

1. Revisione tecnica indipendente da parte di una seconda persona, con esito registrato su PR #57.
2. Preflight locale read-only del runner guarded sul checkout pulito, con `DATABASE_URL` PostgreSQL diretto e `BETHAG_EXPECTED_COMMIT_SHA` fissato allo SHA finale approvato: **non eseguito**.
3. Spot-check immediatamente prima del cutover delle impostazioni Data API Production. Le schermate del 2026-11-05 costituiscono evidenza storica, non una verifica aggiornata in questa sessione.
4. Identificativo del backup provider-managed corrente e verifica della retention; il restore fisico non è stato testato. Serve backup corrente verificato oppure riconferma esplicita del rischio residuo per questa specifica finestra.
5. Contatti reali di recovery/escalation, operatore locale, criteri STOP/rollback e avviso agli amministratori approvato e inviato.
6. Approvazione scritta finale del proprietario riferita allo SHA esatto, ai 19 hash SQL, al rischio backup, all'operatore e alla finestra.
7. Il lockfile npm è stato generato come artifact CI ma non è ancora versionato nel repository; prima del rilascio pubblico va consolidato e usato per installazioni riproducibili (`npm ci`).

**Finestra obiettivo:** sabato 7 novembre 2026, ore 22:00, `Europe/Rome`. L'ora di fine non è specificata. La finestra non equivale ad autorizzazione.

Nessun merge, deploy, freeze operativo, cutover, migrazione o scrittura ledger Production è stato eseguito. Nessuna azione Production è autorizzata da questo addendum.
