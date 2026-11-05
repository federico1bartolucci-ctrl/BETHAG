# Verifica tecnica payload migrazioni e ACL — 2026-11-05

## Ambito e metodo
Verifica esclusivamente read-only sui registri live e sui cataloghi PostgreSQL dei due progetti già esistenti:
- Production: `tctcgptrsmvgajqjgnev`
- QA esistente `bethag-launch-qa`: `jhuyhlzzydcgghrzeexn`

Per ciascuna riga di `supabase_migrations.schema_migrations` è stato calcolato SHA-256 sul contenuto UTF-8 di `array_to_string(statements, E'\\n')`, senza modificare il registro.

## Esito payload live
| Controllo | Esito |
|---|---:|
| Righe Production | 248 |
| Righe QA | 283 |
| Coppie esatte versione/nome comuni | 247 |
| Payload SHA-256 identici tra tutte le coppie comuni | 247/247 |
| Payload SHA-256 differenti tra le coppie comuni | 0 |
| Righe QA-only | 36 |
| Righe Production-only | 1 |

Questa verifica dimostra che i payload SQL registrati nei due ambienti sono byte-identici per tutte le 247 coppie comuni, dopo la normalizzazione limitata alla concatenazione dell'array di statement con newline. Non dimostra, da sola, che ogni payload storico corrisponda al file canonico oggi presente nel repository. I 36 payload QA-only e il payload Production-only sono presenti nel registro live e hanno hash individuali; resta da completare la mappatura puntuale verso sorgenti repository/canonicali e la revisione degli effetti di ciascuna divergenza.

Il solo payload Production-only è `20261104222229_reconcile_production_acl_least_privilege`. La sua SQL live interviene sulla view `public.condominium_fund_availability`, sui due overload transfer-closure helper `check_condominium_member_transfer_closure` e sui default ACL di tabelle postgres-owned. Non revoca EXECUTE sulle funzioni trigger `normalize_zero_ownership_owner()` e `preserve_closing_condominium_member_history()`. La classificazione precedente che associava a questa migrazione la revoca dei due trigger helper era imprecisa e va letta alla luce del payload effettivo.

## Divergenze ACL live confermate

### EXECUTE sulle funzioni trigger pubbliche
Entrambi gli ambienti hanno le funzioni:
- `public.normalize_zero_ownership_owner()`
- `public.preserve_closing_condominium_member_history()`

Sono di proprietà `postgres` e **non** sono `SECURITY DEFINER`.

ACL esplicita in Production:
`{=X/postgres,postgres=X/postgres,service_role=X/postgres}`

ACL esplicita in QA:
`{postgres=X/postgres,service_role=X/postgres}`

Quindi Production conserva EXECUTE a PUBLIC (e dunque anche ai ruoli che lo ereditano), mentre QA lo ha revocato. Il payload QA `20261102044603_revoke_public_execute_from_public_trigger_functions` revoca PUBLIC, anon e authenticated per entrambe. L'esecuzione di trigger non richiede al chiamante EXECUTE sulla funzione trigger; resta da verificare l'esposizione RPC effettiva e decidere una migrazione forward-only specifica per Production. Nessuna modifica è stata eseguita.

### Default ACL di oggetti creati da postgres nello schema public
Valori live `pg_default_acl` per owner `postgres`, schema `public`:

| Tipo oggetto | Production | QA |
|---|---|---|
| Tabelle (`r`) | `{postgres=arwdDxtm/postgres,authenticated=arwd/postgres,service_role=arwdDxt/postgres}` | `{postgres=arwdDxtm/postgres,service_role=Dxt/postgres}` |
| Funzioni (`f`) | `{postgres=X/postgres,service_role=X/postgres}` | `{postgres=X/postgres}` |
| Sequenze (`S`) | `{postgres=rwU/postgres,service_role=rwU/postgres}` | `{postgres=rwU/postgres,service_role=w/postgres}` |

Le lettere ACL sono quelle native PostgreSQL. In particolare:
- Production assegna per default CRUD ad authenticated; QA non lo assegna.
- Production assegna per default CRUD e privilegi strutturali a service_role; QA mostra solo i privilegi strutturali Dxt.
- Production assegna EXECUTE sulle nuove funzioni a service_role; QA non lo assegna.
- Per le sequenze, i default di service_role differiscono.

Questa divergenza è sostanziale e non va pareggiata automaticamente. È inoltre da riconciliare con il payload QA `20261023000004_application_default_table_privileges`, che registra GRANT CRUD ad authenticated e service_role: il catalogo live QA attuale non mostra tali ACL nello schema public. Occorre determinare se un successivo intervento le abbia rimosse o se il ledger storico non descriva più lo stato effettivo.

## Verifiche di sicurezza
- Supabase Security Advisor: `lints: []` sia in Production sia in QA.
- L'assenza di lints non annulla le divergenze ACL rilevate direttamente da `pg_proc` e `pg_default_acl`.
- La verifica delle funzioni trigger conferma due EXECUTE PUBLIC in Production e zero in QA.
- Nessuna scrittura, ALTER, REVOKE, GRANT, reset, replay o pulizia dati è stata eseguita.

## CI sul commit documentale
Commit esaminato: `8ad26fadb2155e5255c2fc486bab191bab718dc0`.
- Baseline safety run `41946364010`: SUCCESS.
- Build run `41946364006`: al momento dell'ultima lettura ancora IN_PROGRESS; bootstrap PostgreSQL 17 completato e riuscito, 24 migrazioni clean-install e 15 migrazioni canoniche tramite guarded runner riuscite, rehearsal ACL Production riuscita, build e browser smoke/login riusciti. Era ancora in corso il diagnostic autenticato QA edit/archive. Non dichiarare la CI complessivamente verde finché il job non termina.

## Stato e prossimi controlli
Il punto 5 resta **APERTO**. Per chiuderlo occorre:
1. Completare il confronto puntuale dei 36 payload QA-only e del payload Production-only con i file SQL repository/canonici, distinguendo baseline, storia specifica QA e migrazioni forward-only.
2. Ricostruire la causa della differenza tra il payload QA `application_default_table_privileges` e i default ACL effettivi.
3. Definire le postcondition attese per default ACL di tabelle, funzioni e sequenze, senza alterare i default Supabase-managed di `supabase_admin`.
4. Preparare eventuali migrazioni forward-only e provarle solo su PostgreSQL isolato; nessuna applicazione remota in questa fase.

Production e QA sono rimasti invariati; il solo QA esistente e i suoi dati sono preservati.
