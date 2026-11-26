# Audit — coerenza esercizio del riparto da consumi

Data: 26 novembre 2026

## Difetto riprodotto

La funzione PostgreSQL `public.generate_consumption_allocations(p_workspace_id, p_condominium_id, p_ledger_entry_id, p_fiscal_year_id, p_service_type)` blocca la riga della spesa con `FOR UPDATE` e verifica che la spesa sia un'uscita valida, ma non confronta `v_expense.fiscal_year_id` con `p_fiscal_year_id`.

La UI controlla già che la spesa e i consumi appartengano allo stesso esercizio. L'RPC, tuttavia, è invocabile direttamente da un utente autorizzato e deve imporre autonomamente l'invariante.

Riproduzione PGlite con la funzione baseline:
- spesa di uscita associata all'esercizio A;
- letture del servizio Acqua associate all'esercizio B;
- ripartizione di consumo già presente sulla spesa;
- chiamata RPC con l'esercizio B.

La funzione precedente accettava la chiamata, cancellava la ripartizione esistente e la rigenerava usando le letture dell'esercizio B, pur mantenendo la spesa nell'esercizio A.

## Correzione proposta

La migrazione forward-only:
- confronta `v_expense.fiscal_year_id IS DISTINCT FROM p_fiscal_year_id` subito dopo il lock e il recupero della spesa;
- rifiuta anche spese senza esercizio associato;
- esegue il controllo prima di qualsiasi cancellazione;
- conserva la protezione già proposta per non sostituire ripartizioni manuali o non basate sullo stesso servizio;
- mantiene il lock `FOR UPDATE`;
- dichiara esplicitamente `SECURITY INVOKER` e `search_path` vuoto; tutti gli oggetti applicativi sono qualificati per schema.

Percorso: `supabase/rebuild/proposed-forward-migrations/20261126133000_guard_consumption_allocation_fiscal_year_and_replacement.sql`.

La migrazione resta proposta e non entra nella catena canonica in questo intervento.

## Regressione runtime

`scripts/test-consumption-allocation-integrity.mjs` è collegato a `npm test` ed esegue la funzione baseline e la funzione corretta in PGlite.

Verifica:
- il difetto precedente viene effettivamente riprodotto;
- l'esercizio discordante viene respinto prima della cancellazione;
- la ripartizione preesistente resta identica dopo il rifiuto;
- la protezione contro la sostituzione di ripartizioni manuali resta attiva;
- una generazione con esercizio coincidente continua a funzionare.

## Sicurezza

Branch isolato basato su main corrente. Nessuna modifica a QA o Production, nessuna migrazione applicata a database, nessun merge, deploy, reset o dispatch manuale.
