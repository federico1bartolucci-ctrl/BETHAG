# Ricognizione delle migrazioni Supabase e dei branch — 2026-10-01

## Esito
È stata eseguita una ricognizione in sola lettura delle directory `supabase/migrations` nei branch disponibili del repository.

| Branch | File di migrazione rilevati |
|---|---:|
| `main` | 121 |
| `backup/pre-rollback-20261001` | 129 |
| `bethag-migration-repair` | 132 |

La ricognizione ha verificato anche la presenza delle due migrazioni già individuate come mancanti:
- `20260928021707_initial_bethag_backend.sql`
- `20260928043547_restrict_data_api_table_grants.sql`

Questi due file non risultano nelle directory di migrazione dei tre branch ispezionati. Le ricerche GitHub per i nomi esatti e per il frammento `initial_bethag_backend` non hanno restituito corrispondenze di codice.

## Implicazioni
- Il branch `backup/pre-rollback-20261001` contiene più migrazioni di `main`, ma non costituisce da solo il baseline completo: non contiene i due file sopra indicati.
- Il branch `bethag-migration-repair` include la migrazione ricostruita `20260928050000_reconstruct_portal_access_registry.sql`; questa è una ricostruzione, non una copia autenticata della migrazione iniziale mancante.
- I conteggi e la presenza dei file non dimostrano equivalenza semantica fra migrazioni e schema del database remoto. Non è quindi sicuro dedurre un ordine di replay o applicare l'intera cartella a un progetto esistente.

## Prossimo passaggio sicuro
Recuperare le due migrazioni originali da un backup/esportazione del progetto o da una copia locale affidabile; quindi confrontarne il contenuto con lo schema remoto e con la cronologia `supabase_migrations.schema_migrations`. In assenza degli originali, preparare un baseline ricostruito separato, marcato esplicitamente come ricostruzione, e validarlo su un progetto Supabase isolato prima di qualsiasi uso ulteriore.

## Limiti e salvaguardie
Questa attività è stata di sola lettura. Nessuna migrazione è stata applicata, nessun dato o schema remoto è stato modificato, e nessun branch o PR è stato unito o distribuito.
