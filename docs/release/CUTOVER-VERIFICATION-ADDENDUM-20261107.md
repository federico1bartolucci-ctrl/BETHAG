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
