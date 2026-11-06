# BETHAG — addendum operativo finale QA e finestra obiettivo

**Data:** 2026-11-06  
**PR:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Head aggiornato:** `efe20d2e90f2ee725d756f958365b454de252759`

## Evidenza CI sullo SHA esatto

- Final QA APP-01..APP-15: [run 42213933715](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42213933715) — **SUCCESS**.
- Build: [run 42213933748](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42213933748) — **SUCCESS**.
- Baseline Safety: [run 42213933711](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42213933711) — **SUCCESS**.
- Il collaudo copre i flussi autenticati UI, navigazione/sessione per ruolo, APP-12 con webhook firmato e probe sintetico Resend, e teardown QA.
- APP-14 resta il gate del cutover e del postflight Production, non un test applicativo QA mancante.

## Gate di sicurezza aggiornato

Il runner Production richiede `BETHAG_PRODUCTION_RESIDUAL_RISK_RECONFIRMED=YES` impostato localmente per questa specifica esecuzione se non è disponibile una verifica corrente del restore fisico provider-managed. La vecchia accettazione nel manifest, da sola, non basta. Il controllo è incluso nel test statico del runner.

## Finestra obiettivo

**Sabato 7 novembre 2026, inizio ore 22:00, Europe/Rome.**  
L'ora di fine non è specificata e non viene presunta. La finestra è un obiettivo concordato, non una prenotazione, un freeze attivo o un'autorizzazione al cutover.

## Stato

- QA APP-01..APP-15: **CHIUSO / PASS** sullo SHA sopra.
- Build, baseline safety e rehearsal automatizzate: **PASS** sullo SHA sopra.
- PR #57: aperta, non unita.
- Production: **NO-GO**.
- Nessuna migrazione, scrittura ledger, merge o deploy Production è stata eseguita.

## Gate ancora aperti

1. Revisione tecnica completa del diff della PR (61 file; 260 commit al controllo corrente). Non risultano review GitHub indipendenti registrate.
2. Preflight Production read-only sullo SHA finale esatto, dal checkout locale.
3. Evidenza di backup corrente, oppure riconferma esplicita del rischio residuo di restore fisico non testato.
4. Contatti effettivi di escalation/recovery e piano STOP/rollback.
5. Approvazione finale esplicita del proprietario riferita allo SHA completo, ai 19 hash SQL, al backup/rischio, alla finestra e ai criteri STOP.

**Nessuna istruzione in questo documento autorizza merge, deploy o apply.**