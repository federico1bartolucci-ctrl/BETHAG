# Dipendenza mancante portal_access in main — 2026-10-03

## Riscontro

L'albero corrente di `main` contiene migrazioni che presuppongono l'esistenza di `public.portal_access`, tra cui:
- `20260928153246_add_portal_access_unique_identity.sql`: crea un indice univoco su `public.portal_access`.
- `20260928153301_fix_portal_registration_upsert.sql`: le funzioni di registrazione inseriscono e aggiornano righe in `public.portal_access`.
- `20260928153422_normalize_portal_access_upsert_key.sql`: elimina e ricrea un indice sulla stessa tabella.
- `20260928183000_harden_resident_portal_access.sql`: le funzioni di autorizzazione leggono la tabella.

Nell'elenco delle migrazioni SQL correnti di `main` non è presente un file precedente che esegua `CREATE TABLE public.portal_access`. Il bootstrap storico `20260928021707_initial_bethag_backend` crea le tabelle fondamentali ma non `portal_access`. Questo spiega strutturalmente perché un replay pulito basato esclusivamente sulla sequenza corrente può incontrare la relazione mancante prima ancora dei successivi errori di privilegio.

## Evidenza dai branch QA

Nel branch `bethag-member-transfer-qa` è registrata la migrazione `20261002072254_restore_portal_access_schema_and_rls`, che introduce la tabella, indici, trigger, policy e routine collegate. Tale migrazione di ripristino non è presente in `main`. Il branch `bethag-continuity-qa` non registra quella migrazione nel proprio registro.

La migrazione di ripristino del branch QA è un'evidenza utile per ricostruire il modello, ma non va copiata automaticamente: deve essere confrontata con la definizione effettiva in Production, con i successivi cambi di schema, policy, trigger, indici e privilegi.

## Correzione necessaria

1. Ricostruire una definizione canonica di `portal_access` e delle dipendenze, confrontando il catalogo Production, gli SQL registrati nei branch e tutti i callsite correnti.
2. Inserire la creazione nel percorso di bootstrap/replay prima di qualsiasi migrazione che la utilizzi, con creazione idempotente solo dove compatibile e policy/trigger gestiti in modo esplicito.
3. Preparare una migrazione incrementale separata per ambienti già inizializzati, con controlli preliminari che non sovrascrivano dati né sostituiscano definizioni divergenti.
4. Verificare in un ambiente isolato la sequenza completa prima di proporre qualunque applicazione a Production.

## Limiti

Questa nota documenta una dipendenza mancante nell'albero corrente, non certifica che ogni oggetto QA/Production sia equivalente. Nessuna DDL è stata applicata a Production, nessun branch è stato resettato o riprodotto e il collaudo complessivo non è stato eseguito.
