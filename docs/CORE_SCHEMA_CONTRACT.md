# BETHAG — contratto dello schema core (inventario read-only)

Data rilevazione: 11 ottobre 2026. Fonte: cataloghi PostgreSQL interrogati in sola lettura su Production e QA. Le quattro tabelle elencate hanno colonne, default, vincoli e policy equivalenti nei due ambienti. Questo documento è un contratto di verifica, **non SQL di bootstrap** e non sostituisce le migrazioni storiche mancanti.

## Tabelle core e dipendenze

### `workspaces` — 5 colonne

| Colonna | Tipo | NOT NULL | Default |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `name` | text | sì | — |
| `plan` | text | sì | `'free'::text` |
| `created_at` | timestamptz | sì | `now()` |
| `updated_at` | timestamptz | sì | `now()` |

Vincoli: PK `workspaces_pkey(id)`.

### `profiles` — 7 colonne

| Colonna | Tipo | NOT NULL | Default |
|---|---|---|---|
| `id` | uuid | sì | — |
| `full_name` | text | no | — |
| `email` | text | no | — |
| `role` | text | sì | `'resident'::text` |
| `active` | boolean | sì | `true` |
| `created_at` | timestamptz | sì | `now()` |
| `updated_at` | timestamptz | sì | `now()` |

Vincoli: PK `profiles_pkey(id)); FK `profiles_id_fkey(id) -> auth.users(id) ON DELETE CASCADE); check role in `admin`, `collaborator`, `resident`, `council`.

### `workspace_members` — 8 colonne

| Colonna | Tipo | NOT NULL | Default |
|---|---|---|---|
| `workspace_id` | uuid | sì | — |
| `user_id` | uuid | sì | — |
| `role` | text | sì | — |
| `active` | boolean | sì | `true` |
| `permissions` | jsonb | sì | `'{}'::jsonb` |
| `created_at` | timestamptz | sì | `now()` |
| `condominium_id` | uuid | no | — |
| `legacy_id` | bigint | no | — |

Vincoli: PK composta `(workspace_id,user_id)); FK `workspace_id -> workspaces(id) ON DELETE CASCADE`; FK `user_id -> profiles(id) ON DELETE CASCADE`; FK `condominium_id -> condominiums(id) ON DELETE CASCADE`; check role in `admin`, `collaborator`, `resident`, `council`.

### `condominiums` — 14 colonne

| Colonna | Tipo | NOT NULL | Default |
|---|---|---|---|
| `id` | uuid | sì | `gen_random_uuid()` |
| `workspace_id` | uuid | sì | — |
| `name` | text | sì | — |
| `address` | text | no | — |
| `city` | text | no | — |
| `postal_code` | text | no | — |
| `province` | text | no | — |
| `data` | jsonb | sì | `'{}'::jsonb` |
| `created_at` | timestamptz | sì | `now()` |
| `updated_at` | timestamptz | sì | `now()` |
| `legacy_id` | bigint | no | — |
| `archived_at` | timestamptz | no | — |
| `archived_by` | uuid | no | — |
| `archive_reason` | text | no | — |

Vincoli: PK `id`; FK `workspace_id -> workspaces(id) ON DELETE CASCADE`; FK `archived_by -> profiles(id)`; unique constraint `(workspace_id,legacy_id)`. Catalogo: anche gli indici `condominiums_active_workspace_idx`, `condominiums_archived_by_idx`, `idx_condominiums_workspace`, `condominiums_workspace_legacy_unique` e `uq_condominiums_workspace_legacy` sono presenti in entrambi. La doppia unicità apparente su legacy ID è osservata e non va rimossa senza una verifica specifica di compatibilità.

## Policy RLS core osservate in entrambi gli ambienti

Tutte e quattro le tabelle hanno RLS abilitata e non hanno FORCE ROW LEVEL SECURITY.

- `workspaces`: i membri possono leggere tramite `private.is_workspace_member(id)`; gli amministratori possono gestire tramite `private.is_workspace_admin(id)`.
- `profiles`: un utente autenticato può leggere e aggiornare il proprio profilo; la condizione è `id = (select auth.uid())`.
- `workspace_members`: gli amministratori gestiscono le appartenenze tramite `private.is_workspace_admin(workspace_id)`; i membri leggono la propria appartenenza o quelle del workspace amministrato.
- `condominiums`: gestione tramite `private.can_manage_workspace_module(workspace_id,'condomini')`; lettura dei condomini attivi tramite `private.can_access_workspace_module(workspace_id,'condomini')` o `private.can_access_resident_condominium(id)`.

Le policy vanno replicate con le relative funzioni e ACL prima di testare l'isolamento multi-workspace. Ricreare le sole tabelle non è sufficiente e può esporre dati.

## Dipendenze da rispettare in un bootstrap

1. Infrastruttura Supabase preesistente `auth.users` e funzioni auth necessarie.
2. `workspaces` e `profiles` (con la FK verso `auth.users`).
3. `condominiums` e i riferimenti di archiviazione.
4. `workspace_members` con FK a workspace, profilo e condominio; quindi funzioni helper RLS e policy.
5. Indici, trigger e grant verificati rispetto ai manifest dei cataloghi.

L'ordine è solo uno schema di dipendenze logiche: prima di trasformarlo in SQL eseguibile occorre risolvere la dipendenza circolare `workspace_members.condominium_id -> condominiums.id` e l'ordine reale delle funzioni/policy. Non usare `CREATE TABLE IF NOT EXISTS` come sostituto di un controllo di compatibilità.

## Limiti e prossimo gate

- Il contratto copre solo le quattro tabelle core, non l'intero schema applicativo né i dati.
- La parità di queste quattro tabelle è confermata per colonne, default, nullability, vincoli e policy; non è una prova di bootstrap da zero.
- La migrazione originale `20260928021707_initial_bethag_backend.sql` rimane non recuperata.
- Nessuna scrittura è stata eseguita su Production o QA durante questa rilevazione.


## Verifica riutilizzabile

È stato aggiunto `supabase/verification/core-schema-contract.sql`, una query di sola lettura che confronta le quattro tabelle con il contratto atteso e restituisce soltanto discrepanze di colonne, vincoli e stato RLS. Va eseguita separatamente in ciascun ambiente; il risultato atteso è zero righe. La query non è una migrazione e non deve essere spostata in `supabase/migrations`.

I confronti diretti già eseguiti sui cataloghi Production e QA hanno confermato le colonne, i vincoli e le policy descritti sopra. L'esecuzione del file SQL completo tramite il connettore non è stata completata in questa sessione; il file resta da eseguire nel SQL Editor read-only prima di considerarlo validato end-to-end.
