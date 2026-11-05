# Verifica Data API e ACL — 2026-11-05

## Ambito e fonti

Verifica del solo branch QA esistente `bethag-launch-qa` (project ref `jhuyhlzzydcgghrzeexn`) e confronto read-only con Production (`tctcgptrsmvgajqjgnev`). Nessuna modifica a Production, nessuna ricreazione/reset/replay del QA.

Le impostazioni della Data API sono state lette dalle schermate della Dashboard Supabase del branch QA fornite durante il collaudo il 2026-11-05. Le schermate mostrano il pannello **Integrations → Data API → Settings**.

## Configurazione Data API osservata in QA

| Impostazione | Evidenza |
|---|---|
| Schemi esposti | 2 di 3: `public`, `graphql_public` |
| Schema `private` | Non esposto |
| Tabelle esposte | 0 di 48 |
| Funzioni esposte | 0 di 173 |
| Automatically expose new tables | **ON** — da disabilitare |
| Extra search path | `public`, `extensions` |

La separazione dello schema `private` è corretta: la presenza di privilegi PostgreSQL USAGE per `authenticated` sullo schema non implica che esso sia esposto da PostgREST. La schermata Dashboard conferma che `private` non è nella lista degli schemi esposti.

### Azione residua obbligatoria

Disabilitare manualmente nella Dashboard QA **Automatically expose new tables**, quindi salvare. L'opzione concede automaticamente privilegi ai ruoli Data API sulle nuove tabelle; lasciarla attiva contraddice il principio di esposizione opt-in e può rendere raggiungibili nuove tabelle non ancora sottoposte a revisione. La documentazione Supabase raccomanda di disattivarla per controllare manualmente l'accesso.

Il connettore Supabase disponibile non espone un'azione per leggere/modificare questo specifico parametro della Data API. Le query PostgreSQL non restituiscono in modo affidabile la lista `db-schemas` di PostgREST. Non è stata quindi tentata alcuna modifica SQL sostitutiva o revoca di privilegi alla cieca.

Dopo il salvataggio occorre acquisire una nuova schermata che mostri l'interruttore OFF e ripetere il controllo che gli schemi esposti siano ancora solo `public` e `graphql_public`, con `private` escluso. Non è necessario modificare il numero di tabelle o funzioni esposte (devono restare 0/48 e 0/173, salvo successiva decisione esplicita).

## Verifiche PostgreSQL live — QA e Production

Le stesse query read-only sono state eseguite su entrambi gli ambienti il 2026-11-05.

| Controllo | QA | Production |
|---|---:|---:|
| Tabelle/partizioni pubbliche con RLS | 47 | 47 |
| Tabelle/partizioni pubbliche senza RLS | 0 | 0 |
| Oggetti pubblici con SELECT effettivo per `anon` | 0 | 0 |
| Oggetti pubblici con SELECT per `authenticated` | 48 | 48 |
| Oggetti pubblici con almeno un privilegio INSERT/UPDATE/DELETE per `authenticated` | 42 | 42 |
| `condominium_fund_availability`: SELECT per authenticated | sì | sì |
| `condominium_fund_availability`: INSERT/UPDATE/DELETE per authenticated | no | no |
| `private`: USAGE per anon | no | no |
| `private`: USAGE per authenticated | sì | sì |

Il conteggio di 48 oggetti SELECT include le viste; il conteggio RLS riguarda le 47 tabelle/partizioni. I privilegi CRUD concessi a `authenticated` sono intenzionali e restano subordinati alle policy RLS. La verifica non ha trovato tabelle pubbliche senza RLS né SELECT anonimo sugli oggetti pubblici.

I default privileges per le tabelle create dal ruolo `postgres` nello schema `public` sono identici nei due ambienti:
`{postgres=arwdDxtm/postgres,authenticated=arwd/postgres,service_role=arwdDxt/postgres}`.
Non sono stati modificati perché la loro semantica applicativa e le policy RLS sono già parte della baseline verificata; una modifica non circoscritta rischierebbe di rompere l'applicazione. L'opzione Dashboard per l'esposizione automatica resta comunque da disabilitare.

## Security Advisor

- QA: zero lint di sicurezza.
- Production: zero lint di sicurezza.

## Esito

**PASS** per la parità ACL osservata, copertura RLS, assenza di accesso SELECT anonimo, esclusione di `private` dagli schemi esposti e assenza di esposizione attuale di tabelle/funzioni nella Data API.

**OPEN** per un'unica azione manuale di hardening: disabilitare `Automatically expose new tables` nel pannello Data API del QA e fornire la schermata post-salvataggio. Il punto 4 non deve essere dichiarato definitivamente chiuso prima di questa conferma.

Riferimento documentazione Supabase: https://supabase.com/docs/guides/api/securing-your-api — sezione “Default privileges for new tables and functions”.
