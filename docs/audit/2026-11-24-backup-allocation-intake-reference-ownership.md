# Audit — riferimenti esterni non verificati nel ripristino delle acquisizioni di riparto

**Data:** 24 novembre 2026

## Difetto riprodotto

La PR #414 proteggeva la proprietà del record principale di `condominium_allocation_intakes` e verificava che il condominio fosse stato ripristinato nel workspace di destinazione. Non verificava però la proprietà e la coerenza condominiale dei riferimenti contenuti nel record:

- `document_id`;
- `ledger_entry_id`;
- `allocation_table_id`;
- `rows[].unit_id`.

La baseline PostgreSQL conferma che le foreign key sono riferimenti globali per ID e non vincoli compositi workspace/condominio. Un backup modificato poteva quindi contenere un intake con `condominium_id` valido del workspace di destinazione ma collegato a un documento, movimento, tabella millesimale o unità appartenente a un altro workspace o condominio. Il controllo precedente accettava il record perché verificava soltanto l'intake e il condominio.

## Correzione

- Prima del restore vengono caricati i record referenziati per ID tramite il loader paginato esistente.
- Il helper verifica che ogni riferimento esista, appartenga al workspace di destinazione e, quando applicabile, allo stesso condominio.
- I documenti senza `condominium_id` sono ammessi soltanto se appartengono al workspace di destinazione.
- Le righe JSON con `unit_id` vengono verificate contro le unità del medesimo workspace e condominio.
- Riferimenti mancanti, malformati, cross-workspace o cross-condominium fanno scartare l'intero intake; il restore non crea collegamenti parziali o ambigui.
- Nessuna modifica a schema, RLS, dati QA/Production o logica contabile.

## Regressione runtime

Estende `scripts/test-workspace-backup-allocation-intakes.mjs`, già collegato a `npm test`, con casi per:
- documento di altro workspace;
- documento dello stesso workspace ma di altro condominio;
- movimento contabile di altro workspace;
- tabella millesimale di altro condominio;
- unità di altro condominio annidata in `rows`;
- riferimento documentale inesistente;
- documento workspace-level senza condominio, che deve restare ammesso.

## Dipendenza

Stacked sulla Draft PR #414, head `863c4d788611107799f1a8bcd1472f005032bbea`. Integrare soltanto dopo la revisione e l'integrazione ordinata della catena backup precedente.

## Sicurezza

Draft soltanto. Nessun accesso o modifica a QA/Production, nessun merge, deploy, reset o workflow manualmente dispatchato.
