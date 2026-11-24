# Audit — acquisizioni di riparto escluse dal backup workspace

**Data:** 24 novembre 2026

## Difetto verificato

La tabella `public.condominium_allocation_intakes` è usata attivamente dalla pagina Contabilità:
- viene caricata con filtro `workspace_id`;
- riceve proposte create manualmente e tramite estrazione AI;
- le proposte possono essere modificate, collegate a una spesa contabile e confermate;
- conserva righe estratte, errori di validazione, collegamento al documento sorgente e collegamento al movimento contabile.

Alla base della PR #412 la tabella esisteva nella baseline PostgreSQL, ma era assente sia da `WORKSPACE_BACKUP_EXPORT_TABLES` sia da `WORKSPACE_BACKUP_RESTORE_ORDER`. Un backup poteva quindi omettere proposte di riparto ancora da verificare o già confermate.

La tabella ha `workspace_id NOT NULL` e riferimenti a condomini, documenti, movimenti contabili e tabelle millesimali. I campi `created_by` e `confirmed_by` puntano invece a `auth.users`, che non fanno parte del backup workspace.

## Correzione

- Aggiunta la tabella al manifest export e al restore order dopo i relativi record padre (documenti, tabelle millesimali e movimenti contabili).
- Il ripristino specializzato accetta soltanto righe il cui condominio è stato effettivamente ripristinato nel workspace corrente.
- Le righe esistenti possono essere aggiornate soltanto se l'ID appartiene già al workspace e al medesimo condominio.
- Per gli aggiornamenti si preservano le attribuzioni utente già presenti nella destinazione.
- Per le nuove righe si azzerano `created_by` e `confirmed_by`: gli ID di `auth.users` del backup non sono portabili e non devono essere riprodotti ciecamente. Stato, `confirmed_at`, dati estratti e collegamenti business restano conservati.
- Nessuna modifica a schema, RLS, logica AI o scritture contabili.

## Regressione runtime

`scripts/test-workspace-backup-allocation-intakes.mjs` è collegato a `npm test` e verifica:
- presenza unica nei manifest;
- ordine rispetto a condomini, documenti, tabelle millesimali e movimenti contabili;
- lettura export paginata e filtrata per workspace;
- esclusione di condomini non ripristinati;
- rifiuto di ID già appartenenti a un altro workspace;
- rifiuto di spostamenti tra condomini per un record esistente;
- conservazione delle attribuzioni utente locali sugli aggiornamenti;
- rimozione degli ID utente non portabili sugli inserimenti;
- collegamento al gestore reale di restore e alla pagina Contabilità;
- presenza di workspace e foreign key nella baseline.

## Dipendenza

Stacked sulla Draft PR #412, head `54312be3aecac0f4b4f79bbca89bb85c36dd8f1f`. La catena backup resta subordinata alla review e all'integrazione ordinata delle PR precedenti.

## Sicurezza

Draft soltanto. Nessun accesso o modifica a QA/Production, nessun merge, deploy, reset o workflow manualmente dispatchato.
