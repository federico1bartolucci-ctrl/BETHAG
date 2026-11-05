# BETHAG — scaletta operativa aggiornata
**Aggiornata:** 2026-11-05  
**Riferimento:** branch `fix/qa-view-acl-parity-20261105`, commit di base `1612b46b727ebe018e545ab989df71d6df2957a6`.

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
| 5 | Riconciliazione read-only della storia migrazioni Production con le sorgenti canoniche e classificazione degli effetti, quindi piano forward-only verificabile | DA AVVIARE |
| 6 | Verifica finale della parità QA/Production e preparazione dei gate di rilascio, senza applicare modifiche a Production | DA PROGRAMMARE DOPO IL PUNTO 5 |
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
- 247 coppie versione/nome esattamente comuni; 1 Production-only; 35 QA-only.
- Snapshot integrale: `supabase/rebuild/live-migration-ledgers-20261105.json`.
- Analisi: `docs/release/LIVE-MIGRATION-RECONCILIATION-20261105.md`.

I vecchi snapshot 247/47 del 3 novembre restano conservati come reperti storici, ma non sono più la fotografia live. Nessun tentativo di pareggiare i conteggi: le righe QA-only e Production-only richiedono classificazione semantica. La verifica hash/payload di tutti i 248/283 record e la revisione delle divergenze di schema restano aperte.
