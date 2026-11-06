# BETHAG — addendum operativo finale QA e cutover

**Data:** 2026-11-06  
**PR:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Commit applicativo testato:** `bc3c74a53eee8e7fd7c0d3ec67d6aa0074b46c02`

## Evidenze CI sullo SHA esatto

- Final QA APP-01..APP-15: [run 42222394817](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394817) — **SUCCESS**.
- Build + PostgreSQL bootstrap: [run 42222394795](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394795) — **SUCCESS**.
- Baseline Safety: [run 42222394790](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42222394790) — **SUCCESS**.
- PostgreSQL 17 ha superato clean-install 28 migrazioni, runner guarded 19 incrementi, ACL/default ACL, colonna profilo, rollback subentro e test negativo dei gate Production.
- APP-12 ha verificato l'invio di un solo messaggio sintetico a `delivered@resend.dev`, callback firmato verso QA e persistenza di `delivered/Consegnata`.
- APP-01..APP-15: **PASS** sul progetto QA esistente. APP-14 resta il gate di cutover/postflight Production, non un test QA applicativo mancante.

## Correzioni di sicurezza e tracciabilità

- Il test APP-12 fallisce se il provider è non configurato; non accetta più un risultato `PARTIAL` come workflow verde.
- Il readiness checker richiede SHA completo esplicito, esiti e SHA coerenti per Final QA/Build/Baseline, PASS per ogni APP e nessuna modifica applicativa/migrazione successiva al commit testato.
- L'accettazione del rischio restore del 27 ottobre è storica: non sostituisce una riconferma esplicita per la specifica esecuzione.
- Il runner Production richiede `BETHAG_EXPECTED_COMMIT_SHA` uguale al checkout pulito; rifiuta modifiche tracked e file untracked inattesi.
- I test negativi del runner usano un worktree isolato per verificare i gate senza confondere gli artefatti locali di `npm install`.
- Corrette due guardie URL dei test PostgreSQL e il conteggio della sezione C della classificazione QA-only (9 migrazioni).

## Stato Production

- Production resta **NO-GO**.
- Nessuna migrazione, scrittura ledger, merge, deploy o modifica Production è stata eseguita.
- Ledger Production precedentemente verificato read-only: 248 righe, head `20261104222229_reconcile_production_acl_least_privilege`.
- Il preflight Production read-only deve essere ripetuto sul checkout finale approvato; la prova storica su un commit precedente non è sufficiente.
- Restore fisico provider-managed: **NON VERIFICATO**. Restore logico locale verificato, ma non sostitutivo della prova fisica.

## Finestra e gate ancora aperti

**Inizio concordato:** sabato 7 novembre 2026, ore 22:00, `Europe/Rome`.  
**Ora di fine:** non specificata. La finestra non è prenotazione, freeze attivo o autorizzazione al cutover.

Restano obbligatori:
1. Revisione tecnica completa dei 61 file PR; nessuna review indipendente GitHub risulta registrata.
2. Verifica backup corrente oppure riconferma esplicita del rischio restore fisico non testato per questa esecuzione.
3. Contatti reali di recovery/escalation e piano STOP/rollback.
4. Freeze e avviso agli amministratori, da approvare e inviare.
5. Preflight Production read-only dal checkout pulito e pinned sullo SHA approvato.
6. Approvazione finale esplicita riferita a SHA, 19 hash SQL, backup/rischio, finestra e criteri STOP.

**Decisione: Production NO-GO.** Nessun merge, deploy, apply, freeze o invio di comunicazioni è autorizzato da questo addendum.
