# BETHAG — riconciliazione evidenze QA e gate release

Data: 2026-11-24  
QA source SHA verificato: `cb202da730000f5cbf631966841812c5bf8e662c`

## Evidenze exact-head registrate

Il file `supabase/rebuild/qa-final-collaudo-20261105.json` è stato riallineato ai tre workflow completati sul medesimo SHA:
- Final authenticated QA: run 45387686799 — SUCCESS.
- Build/PostgreSQL 17: run 45387686747 — SUCCESS.
- Baseline Safety: run 45387686644 — SUCCESS.

Il campo `reviewed_head_sha` e i tre `head_sha` ora identificano il commit QA effettivamente testato, `cb202da730000f5cbf631966841812c5bf8e662c`.

## APP-12: distinzione obbligatoria

Sul run QA exact-head:
- pubblicazione, preparazione destinatari e gestione webhook sintetici firmati: PASS;
- probe di invio live Resend: SKIPPED, esplicitamente escluso dal perimetro autorizzato;
- nessuna email esterna è stata inviata in questo run.

L'evidenza storica di consegna Resend presente nel precedente registro era riferita a un diverso SHA e non viene trasferita al run corrente. Il registro aggiornato mantiene APP-12 funzionale PASS, ma registra `provider_delivery: NOT_RUN`.

Il readiness checker richiede una prova provider delivery positiva e il runner guarded richiede l'attestazione esplicita `BETHAG_QA_APP12_PROVIDER_VERIFIED=YES`. Pertanto il gate provider resta intenzionalmente bloccato. Non va aggirato né sostituito con i webhook sintetici. Un eventuale probe reale richiede autorizzazione esplicita separata e destinatario di test controllato.

## Stato release

- Build, PostgreSQL 17, Baseline Safety e collaudo QA applicativo: PASS sullo SHA QA indicato.
- APP-14: non eseguito; richiede cutover, postflight e smoke autenticati Production.
- Provider delivery live exact-head: NOT RUN.
- Preflight guarded locale exact-execution-SHA: non attestato da questa registrazione.
- Backup/Data API, operatore, manutenzione e approvazione del candidato corrente: da riconfermare.
- Production: NO-GO.
- PR #389: resta Draft, non merged.

Questa riconciliazione modifica solo evidenza/documentazione del repository. Non invia email, non modifica QA o Production, non esegue migrazioni, deploy o merge.
