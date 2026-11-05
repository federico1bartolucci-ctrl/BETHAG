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
| Automatically expose new tables | **OFF** — verificato nella schermata aggiornata del 2026-11-05 |
| Extra search path | `public`, `extensions` |

La separazione dello schema `private` è corretta: la presenza di privilegi PostgreSQL USAGE per `authenticated` sullo schema non implica che esso sia esposto da PostgREST. La schermata Dashboard conferma che `private` non è nella lista degli schemi esposti.

### Conferma della modifica

La schermata aggiornata inviata il 2026-11-05 mostra il branch `bethag-launch-qa` e l'interruttore **Automatically expose new tables** in posizione OFF (controllo grigio, cursore a sinistra). La schermata mostra inoltre 0/173 funzioni esposte e l'extra search path `public`, `extensions`. La modifica richiesta è quindi confermata visivamente.

Il connettore Supabase non esponeva un'azione per modificare questo parametro; l'utente ha effettuato il salvataggio dalla Dashboard. Nessuna revoca SQL sostitutiva è stata eseguita.

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

**PASS** per la configurazione Data API: `Automatically expose new tables` risulta OFF nella schermata aggiornata del branch QA. Le verifiche ACL/RLS e Security Advisor sono positive. Non risultano azioni residue di configurazione Data API in questo perimetro.

Riferimento documentazione Supabase: https://supabase.com/docs/guides/api/securing-your-api — sezione “Default privileges for new tables and functions”.
