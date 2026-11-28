# Integrazione evidenze QA — 2026-10-03

## Errore di privilegio su `public.portal_access`

Le log PostgreSQL del branch QA `bethag-continuity-qa` riportano l'esecuzione di un comando `REVOKE` che include `public.portal_access`, seguita dall'errore `relation "public.portal_access" does not exist` (SQLSTATE 42P01). Lo stesso comando è visibile nei log del branch `bethag-member-transfer-qa`.

La cronologia `supabase_migrations.schema_migrations` del branch `bethag-continuity-qa` conserva lo SQL della migrazione `20260928021707 / initial_bethag_backend`. Il relativo bootstrap crea le tabelle fondamentali, ma non crea `public.portal_access`; la tabella viene introdotta in una fase successiva del modello applicativo. La migrazione storica registrata nel branch, quindi, non è equivalente a un bootstrap autonomo del modello attuale e non può essere ricostruita usando soltanto il file corrente `main`.

Il file `supabase/migrations/20261002113421_revoke_excess_public_table_privileges.sql` in `main` non contiene il comando fallito: revoca solo `TRUNCATE, REFERENCES, TRIGGER` da quattro tabelle di trasformazione/trasferimento. L'errore non va quindi corretto modificando arbitrariamente quel file.

## Errore di policy duplicata

Nel branch `bethag-member-transfer-qa` i log registrano anche `CREATE POLICY "managers read portal registration requests"` fallito con `policy already exists` (SQLSTATE 42710). La migrazione corrente `20260928153242_add_condomino_registration_workflow.sql` in `main` esegue già `DROP POLICY IF EXISTS` per le policy read e update prima della loro creazione. Il log è pertanto incompatibile con l'esecuzione letterale di quel file nella revisione corrente; è necessario identificare la revisione/SQL effettivamente eseguita o una seconda migrazione che ricrea la policy.

## Conseguenza operativa

- Non applicare patch a Production né dichiarare risolti gli errori sulla sola base dei nomi delle migrazioni.
- Conservare lo SQL effettivo registrato nei branch come evidenza e confrontarlo con l'intera sequenza/versione realmente eseguita.
- La correzione deve riallineare bootstrap, dipendenze e migrazioni incrementali, con un percorso distinto per installazioni nuove e database già migrati.
- I branch QA restano in stato `MIGRATIONS_FAILED`; non è stato eseguito un reset/replay né il collaudo complessivo.
