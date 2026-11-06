# BETHAG — addendum operativo finale QA e finestra obiettivo

**Data:** 2026-11-06  
**PR:** [#57](https://github.com/federico1bartolucci-ctrl/BETHAG/pull/57)  
**Head verificato al momento della redazione:** `94d162cbe2bcec902c6ccd5cea715a0ce85928b8`

## Evidenza QA

- Final QA APP-01..APP-15: [run 42209092261](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42209092261) — **SUCCESS**.
- Build e PostgreSQL bootstrap: [run 42209092313](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42209092313) — **SUCCESS**.
- Baseline Safety: [run 42209092345](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42209092345) — **SUCCESS**.
- Il collaudo comprende i flussi autenticati UI, navigazione/sessione per ruolo, APP-12 con webhook firmato e probe sintetico Resend, nonché teardown QA.
- APP-14 rimane il gate relativo al cutover e al postflight Production, non un test applicativo QA non eseguito.

## Finestra obiettivo scelta

**Domenica 15 novembre 2026, 02:00–04:00, Europe/Rome** (notte tra sabato 14 e domenica 15).

Questa data prevale sulle precedenti proposte generiche riportate nelle sezioni storiche del runbook, incluse le formulazioni “sabato 22:00–domenica 02:00” e “data da concordare”. La finestra è un obiettivo pianificato: non è prenotata, non è autorizzata e non comporta freeze o avvisi già attivi.

Le 04:00 sono il limite della finestra prevista, non una promessa di riapertura. Se preflight, migrazioni, postflight o smoke test non terminano con esito conforme, prevalgono i criteri STOP e l'applicazione resta protetta.

## Stato e vincoli

- QA APP-01..APP-15: **CHIUSO / PASS** sul commit sopra.
- Production: **NO-GO**.
- PR #57: aperta e non unita.
- Nessuna migrazione, scrittura ledger, merge o deploy Production è stata eseguita.
- Il preflight Production precedente era sul commit applicativo `4b4ea1a...`; non è valido come evidenza per il nuovo head. Va ripetuto in sola lettura sul commit finale dopo la chiusura della documentazione.
- Restano necessari: nuova CI sul commit documentale finale, preflight read-only sullo SHA finale, verifica del backup corrente, riconferma esplicita del rischio di restore fisico non testato, contatti di recovery, freeze e comunicazioni approvate, approvazione finale del proprietario riferita a SHA e 19 hash esatti.

**Nessuna istruzione in questo documento autorizza merge, deploy o apply.**
