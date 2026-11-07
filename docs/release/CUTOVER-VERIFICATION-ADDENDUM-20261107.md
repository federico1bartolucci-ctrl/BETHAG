# BETHAG — addendum verifica cutover 2026-11-07

## Identità e CI

- SHA applicativo verificato: `ad8c2386af1e3b5084202117c2e9130b69fac182`.
- Baseline Safety: [run 42330953653](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42330953653) — SUCCESS.
- Build/PostgreSQL 17: [run 42330953652](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42330953652) — SUCCESS.
- Final QA APP-01..APP-15: [run 42330953679](https://github.com/federico1bartolucci-ctrl/BETHAG/actions/runs/42330953679) — SUCCESS.
- APP-01..APP-13 e APP-15: PASS; APP-14 resta il gate post-cutover Production.
- Evidenza QA aggiornata in `supabase/rebuild/qa-final-collaudo-20261105.json` per puntare allo SHA effettivamente testato e ai tre run sopra indicati.

## Integrità delle 19 migrazioni

Verificati i 19 Git blob SHA del manifest congelato contro i file SQL presenti sul branch. Tutti e 19 coincidono; nessun payload SQL è stato modificato. L'ordine e lo stato `PENDING_NOT_APPLIED` restano invariati.

Il manifest `supabase/rebuild/production-migration-cutover-freeze-20261105.json` mantiene:
- stato `FROZEN_FOR_REVIEW_CUTOVER_APPROVAL_PENDING`;
- 248 righe storiche Production da preservare;
- 19 migrazioni incrementali in attesa;
- nessuna baseline da inserire e nessuna riga storica da riscrivere;
- nessuna approvazione finale registrata.

## Cutover e controlli ancora richiesti

La finestra concordata è 7 novembre 2026, 22:00 — 8 novembre 2026, 02:00, fuso `Europe/Rome`. L'orario non autorizza da solo l'esecuzione.

Prima di un eventuale apply sono ancora necessari:
1. preflight read-only locale dal checkout pulito sullo SHA eseguibile finale, con verifica delle 248 coppie ledger e dei 19 hash;
2. controllo immediatamente pre-cutover della configurazione Data API nella Dashboard Production;
3. verifica del backup corrente e riconferma esplicita del rischio residuo di restore fisico non testato;
4. conferma di disponibilità dell'operatore, del percorso recovery/escalation e dei criteri STOP;
5. approvazione scritta del proprietario riferita all'esatto SHA eseguibile e ai 19 hash ordinati;
6. solo dopo, esecuzione manuale locale del runner guarded, seguita da postflight a 267 righe e smoke autenticati Production.

In caso di errore su una migrazione: STOP immediato, nessuna correzione SQL manuale e nessun rerun alla cieca. Se gli smoke test Production falliscono, BETHAG resta fuori servizio fino alla risoluzione.

## Stato decisionale

**Production: NO-GO.** PR #57 resta aperta e non unita. Nessun merge, deploy, freeze operativo o comando apply è stato eseguito. Nessuna scrittura Production è stata effettuata.

L'autorizzazione già rilasciata per un precedente SHA non si estende automaticamente al nuovo SHA eseguibile. La decisione finale resta al proprietario e deve identificare il commit esatto dopo l'ultimo aggiornamento documentale.


## Rettifica operativa approvata — 2026-11-07 19:54 Europe/Rome

Questa rettifica prevale su ogni precedente finestra, SHA di esecuzione e stato decisionale riportato sopra.

- **Finestra confermata dal proprietario:** 8 novembre 2026, ore 00:00–04:00, fuso `Europe/Rome`.
- **Sorgente QA approvata:** `decc0dfda68f573f13e386beaa22d259f7f8b619`.
- **Release fingerprint approvato:** `f11960285adfe86b6382a4f03121640dbd61d357ceb08825cc4da3708583b62a`.
- **Migrazioni:** esattamente 19, nell'ordine e con i Git blob SHA già congelati nel manifest; nessun payload SQL o hash è stato modificato.
- **Storico Production:** 248 righe da preservare integralmente; nessun inserimento baseline, riscrittura o cancellazione.
- **SHA eseguibile finale:** NON ANCORA APPROVATO. Il precedente SHA di esecuzione è stato invalidato e non viene riutilizzato. Dopo gli aggiornamenti documentali e la CI occorrerà fissare il commit finale e ottenere una distinta approvazione esplicita su quello SHA.
- **Stato operativo:** Production **NO-GO** fino a CI sul commit finale, approvazione del suo SHA, preflight locale read-only con connessione PostgreSQL diretta, controllo Data API e backup/rischio residuo, oltre a tutti i gate del runner.

La conferma della finestra non costituisce autorizzazione a eseguire le migrazioni, né autorizza merge, deploy o scritture Production. APP-14 resta subordinato al postflight e agli smoke test autenticati successivi al cutover. Il restore fisico provider-managed non è stato testato e non viene dichiarato come tale.


## Aggiornamento successivo — 2026-11-07 20:44 UTC

La cattura read-only dei registri live è stata rinnovata da Supabase e registrata nei due snapshot:
- Production: 248 righe; QA: 283 righe.
- 247 coppie esatte comuni; una riga esclusiva Production; 36 righe esclusive QA.
- Timestamp UTC della cattura: `2026-11-07T20:40:05.822Z`.
- Confronto Production con il precedente snapshot: 248/248 coppie versione/nome invariate.
- Nessuna modifica ai database, nessun reset/replay, nessuna scrittura ai registri live.

La prima riesecuzione CI ha individuato due verificatori con data del 6 novembre codificata rigidamente. Sono stati aggiornati per verificare coerenza e formato dei timestamp UTC senza fissare un giorno di calendario. Il controllo Baseline Safety sul commit `6063d5e85dd906a04f79f1aec5f4aebaf9f81aa1` è SUCCESS; Build/PostgreSQL 17 e Final QA APP-01..APP-15 sono ancora in esecuzione/attesa al momento di questa nota.

**Nessuna approvazione del nuovo SHA eseguibile è implicita in questo aggiornamento.** La fingerprint approvata in precedenza non viene dichiarata valida per il nuovo head fino al ricalcolo e alla verifica automatica. PR #57 resta aperta; Production resta NO-GO.


## Esito conclusivo CI sul commit df886051844a2b075f28bf183b2944341cac319b

La riesecuzione completa sul commit indicato si è conclusa con esito **SUCCESS** per tutti e tre i workflow:
- Baseline Safety — run 42412484597.
- Build e bootstrap PostgreSQL 17 — run 42412484587.
- Collaudo finale APP-01..APP-15 — run 42412484715.

Il collaudo QA ha superato i test autenticati RLS/Storage, flussi di condomìni e contabilità, subentro e rollback con rate insolute, pubblicazione/revoca comunicazioni, webhook firmati, prova del provider email con destinatario di test, workflow browser autenticati e navigazione/persistenza sessione per amministratore, collaboratore e condomino. Il fixture del piano QA è stato ripristinato e l'anteprima QA arrestata.

La fingerprint ricalcolata dal workflow QA è `b06a4ef236f6225681892c29d3822e1b4e8c78950407044f01655b732aebfc82` su 41 file critici. **Non coincide** con la fingerprint precedentemente approvata (`f11960285adfe86b6382a4f03121640dbd61d357ceb08825cc4da3708583b62a`); pertanto non viene considerata approvata. Il manifest mantiene `approved_execution_commit_sha: null` e lo stato di approvazione finale dell'esecuzione resta pendente.

Verifica aggiuntiva read-only: tutti i 19 blob Git delle migrazioni canoniche coincidono con i 19 hash approvati nel manifest. Production risulta `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.166; Security Advisor e Health Advisor non restituiscono lint. Nessuna scrittura o migrazione è stata eseguita su Production.

PR #57 è stata aggiornata per riportare head, esiti CI, fingerprint candidata e gate residui. Resta aperta e non merged. Production resta **NO-GO** fino a riconciliazione e approvazione esplicita della fingerprint e dello SHA eseguibile corrente, preflight locale PostgreSQL read-only, verifica immediata backup/Data API e completamento degli altri gate operativi. APP-14 resta PARTIAL fino al postflight Production e agli smoke test autenticati.

## Correzione controllo manifest post-QA — 2026-11-07 21:35 UTC

La prima esecuzione locale del preflight read-only si è arrestata prima di qualsiasi connessione PostgreSQL: il confronto del payload congelato includeva campi operativi aggiornabili dopo QA (stato/approvazione, riepilogo di sicurezza, checklist NO-GO e prove Data API raccolte dal proprietario). Non è stata eseguita alcuna query né scrittura Production.

Nel branch è stata introdotta una proiezione esplicita dei soli campi metadata ammessi a variare:
- stato e record di approvazione;
- riepilogo operativo `safety` e checklist testuale `no_go_gates`;
- stato informativo dell'approvazione SHA;
- evidenze owner-verified della configurazione Data API per lo schema provider-managed.

Restano nel confronto immutabile la sequenza delle 19 migrazioni, tutti i relativi hash, lo snapshot e le coppie del ledger storico, il contratto postflight e la disposizione di revisione. I gate eseguibili del runner non sono rimossi né sostituiti da questa esclusione.

Sono stati aggiornati i test unitari per coprire le variazioni ammesse e continuare a respingere modifiche a review disposition, sequenza/hash, ledger e postflight. La modifica tocca un file incluso nel fingerprint: il fingerprint precedente non è riutilizzabile. In attesa di CI completa e ricalcolo del fingerprint sul nuovo head.

**Stato:** correzione implementata nel branch, non ancora certificata CI. Preflight Production da ripetere solo dopo CI e approvazione del nuovo fingerprint/SHA. Production resta **NO-GO**; nessuna migrazione, merge, deploy o scrittura Production è stata eseguita.
