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
