# BETHAG — piano di riproducibilità della baseline Supabase

Data verifica: 11 ottobre 2026  
Ambienti osservati: Production (sola lettura) e QA `bethag-migration-reconciliation-qa` (sola lettura per questa verifica).

## Scopo

Ottenere un percorso ripetibile per ricostruire lo schema senza fingere di conoscere il contenuto delle migrazioni originali mancanti. Questo documento è un piano e un registro di evidenze; **non è una baseline SQL pronta per essere applicata**.

## Evidenze catalogo

Le query di sola lettura hanno restituito questi conteggi:

| Inventario PostgreSQL | Production | QA | Differenza QA meno Production |
|---|---:|---:|---:|
| Estensioni installate | 6 | 7 | +1 |
| Schemi non di sistema | 10 | 12 | +2 |
| Tipi custom enumerati/domain | 106 | 114 | +8 |
| Viste e viste materializzate | 4 | 4 | 0 |
| Sequenze | 2 | 4 | +2 |
| Routine nei cataloghi non di sistema | 460 | 471 | +11 |
| Regole di default privileges | 24 | 27 | +3 |
| Event triggers | 6 | 6 | 0 |

Questi conteggi comprendono anche componenti gestiti da Supabase; non devono essere interpretati automaticamente come 8 tipi applicativi o 11 funzioni BETHAG mancanti/in più.

### Differenze piattaforma individuate

- Production ha 6 estensioni: `btree_gist`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.
- QA ha le stesse 6 più `pg_net` (versione osservata `0.20.4`).
- QA presenta inoltre gli schemi `net` e `supabase_functions`, con routine gestite/collegate a `pg_net` e alla relativa infrastruttura.
- Il repository interrogato non ha restituito riferimenti testuali a `pg_net`, `net.http_post` o `supabase_functions`; l'assenza dai risultati della ricerca GitHub non prova che l'estensione sia inutile. Prima di rimuoverla o aggiungerla a Production occorre verificare trigger, cron, webhook e configurazione della piattaforma.

Le 47 tabelle pubbliche e gli oggetti applicativi precedentemente confrontati sono risultati allineati nei controlli di parità già registrati nell'audit principale. Questo non annulla le differenze di provisioning appena rilevate.

## Procedura raccomandata per costruire la baseline

1. **Fissare il punto di riferimento:** registrare commit esatto dell'app, data/ora dei cataloghi, progetto e versione PostgreSQL/Supabase; mantenere i ledger di migrazione esistenti come evidenza immutata.
2. **Estrarre manifest separati per ambiente** da cataloghi in sola lettura: estensioni e versioni; schemi e proprietari; enum/domain/composite types; tabelle, colonne, default, identity, sequenze; PK/FK/unique/check; indici; viste e dipendenze; routine con firma, definizione, proprietario, `SECURITY DEFINER`, `search_path` e ACL; trigger e funzioni trigger; policy RLS e grants; default privileges; storage buckets/policies; pubblicazioni e configurazione API rilevante.
3. **Classificare ogni differenza** come applicativa, gestita dalla piattaforma, configurazione, oppure non spiegata. Non copiare indiscriminatamente oggetti interni `auth`, `storage`, `realtime`, `vault`, `net` o `supabase_functions` in una migrazione applicativa.
4. **Risolvere le fonti storiche mancanti** quando reperibili. Per `initial_bethag_backend` e altre sorgenti non recuperate, non ricostruire SQL a intuito. Se la fonte originale resta irrecuperabile, la baseline va esplicitamente denominata snapshot dello stato corrente, con checksum e cutoff, non ricostruzione storica.
5. **Provare il bootstrap da zero in un ambiente isolato autorizzato:** creare lo schema dal manifest/snapshot approvato, applicare solo le migrazioni successive al cutoff, verificare che non vi siano doppie applicazioni, poi confrontare i manifest catalogo. Non usare il progetto QA attuale come prova di replay pulito: il suo ledger contiene molte migrazioni replay e baseline specifiche QA.
6. **Testare l'applicazione con dati sintetici:** ruoli amministratore/collaboratore/condomino/consiglio, isolamento tra workspace, inviti e recupero password, CRUD e archivio, documenti/pagamenti per ruolo, trasferimento totale e quote di proprietà, comproprietari, residui contabili, refresh e deep link.
7. **Gate di rilascio:** review delle differenze non spiegate, esito test, verifica advisor, backup e piano di rollback. Solo dopo un'autorizzazione esplicita preparare un piano di cutover Production separato.

## Bloccanti non risolti

- Il ledger Production contiene 243 record, quello QA 159; le versioni comuni sono 84, quelle presenti solo in Production 159 e quelle solo in QA 75.
- La sorgente originale `20260928021707_initial_bethag_backend.sql` non è stata recuperata.
- Il progetto QA attuale non è un ambiente pulito per dimostrare la riproduzione dell'intera storia.
- Il repository non dispone ancora di una suite di test end-to-end e CI esegue il controllo della nomenclatura migrazioni più la build.
- Le differenze di estensioni/schemi gestiti richiedono una decisione documentata, non una correzione automatica.

## Vincoli di sicurezza

Durante la stesura del piano non sono state eseguite scritture SQL, modifiche alle ACL, `db push`, `migration repair`, reset, replay, merge o deploy. Production resta intatta. Nessuna nuova risorsa Supabase è stata creata.
