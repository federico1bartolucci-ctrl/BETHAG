# BETHAG — test SQL e configurazione client Supabase — batch 17

**Branch:** `bethag-migration-repair`  
**Ambito:** lettura di `supabase/tests/rls_policies.test.sql`, `src/lib/supabase.ts`, `.env.example` e metadati del PR #1.  
**Tipo:** revisione statica. Nessun test eseguito, nessuna chiave utilizzata, nessuna chiamata Auth/Edge Function, nessuna modifica a Supabase.

## Riscontri

### T-01 — Il test pgTAP è di catalogo, non di comportamento utente

Il file `supabase/tests/rls_policies.test.sql` dichiara `plan(20)` e contiene asserzioni su privilegi EXECUTE, RLS abilitata, nomi e comandi delle policy, funzioni SECURITY DEFINER e presenza di indici. Sono controlli utili di struttura, ma non creano identità autenticate né simulano richieste con ruoli, JWT, workspace o condomini differenti. Non dimostrano che un collaboratore non legga dati altrui, che un residente non modifichi dati contabili o che un amministratore operi soltanto nel proprio workspace.

Il file termina con `rollback`; questo non equivale a un test di isolamento applicativo, né certifica che il test sia stato eseguito con successo. Il risultato di runtime resta non verificato.

### T-02 — Il conteggio delle funzioni deve considerare overload

Alcune asserzioni usano `count(*)` per funzioni identificate dal solo nome. PostgreSQL permette overload con la stessa denominazione e firme differenti. Il test deve distinguere le firme previste e verificare i privilegi per ogni specifica firma, altrimenti un risultato numerico atteso può non descrivere completamente la superficie RPC.

### T-03 — Chiave client

`src/lib/supabase.ts` legge `VITE_SUPABASE_PUBLISHABLE_KEY` e istanzia il client browser; il sorgente contiene anche un valore publishable di fallback. Una chiave publishable è destinata al client e non è equivalente a una chiave privilegiata `service_role`. Il sorgente esaminato non mostra una chiave `service_role` nel client.

La chiave publishable non è un controllo di accesso ai dati: l'isolamento dipende da RLS, grants, funzioni e autorizzazioni. Il fallback hardcoded rende inoltre più facile collegare una build a un progetto predefinito anche quando l'ambiente non è stato configurato intenzionalmente. Occorre un controllo esplicito di ambiente/progetto e verificare che nessun segreto privilegiato sia incluso negli asset pubblici o nei log.

### T-04 — Flag di attivazione e configurazione

`.env.example` imposta `VITE_SUPABASE_ENABLE=false`, mentre il client considera abilitato Supabase quando il flag è assente o vale esattamente `true`. Il comportamento va mantenuto esplicito nei diversi ambienti: sviluppo, preview, QA e produzione. L'assenza di `supabase/config.toml` nel percorso standard osservato impedisce di ricavare dal repository le impostazioni locali delle funzioni; non esclude configurazioni gestite altrove.

### T-05 — PR e rilascio

Il PR #1 è ancora draft/open nel dato GitHub consultato, con base `main`; non è stato integrato. Il suo stato mergeable non rappresenta un’approvazione tecnica né certifica migrazioni o runtime. Non sono stati avviati workflow in questo audit.

## Estensione di QA richiesta

| Identità sintetica | Verifica da eseguire in QA isolato |
|---|---|
| Admin workspace A | CRUD solo su workspace A e condomini associati |
| Collaboratore con modulo | Accesso consentito al modulo assegnato; negato agli altri moduli |
| Collaboratore senza modulo | Lettura/scrittura negate secondo matrice autorizzativa |
| Residente attivo | Lettura dei soli dati pubblicati del proprio condominio; nessuna scrittura contabile |
| Residente revocato/inattivo | Accesso revocato anche con sessione precedente |
| Utente workspace B | Nessuna lettura o modifica di record workspace A |
| Anon / token scaduto | RPC e tabelle non accessibili oltre le superfici pubbliche previste |
| Funzione privilegiata | Autorizzazione server-side, scope workspace, input ostili, errori e retry |

Per ciascun caso servono esiti attesi sia per SELECT sia per INSERT/UPDATE/DELETE e RPC, inclusi accessi tramite join, viste, storage e funzioni `SECURITY DEFINER`. Le prove vanno effettuate con identità sintetiche in un progetto usa-e-getta dopo aver certificato la baseline.

## Gate

1. Definire firme RPC e privilegi attesi per ogni overload.
2. Aggiungere test runtime role/JWT e casi negativi cross-workspace.
3. Validare configurazione per ambiente, chiavi pubbliche e assenza di segreti privilegiati negli asset compilati.
4. Eseguire test soltanto su QA isolato e conservare log, commit e risultato.
5. Rendere obbligatori i controlli prima del merge/deploy, una volta che i test esistono.

## Decisione

La presenza di un test pgTAP non è sufficiente per dichiarare superata la sicurezza applicativa. Il client esaminato usa una chiave publishable, ma ciò non certifica la corretta segregazione dei dati. **Nessun test è stato eseguito e nessuna configurazione, chiave, migrazione o dato di produzione è stato modificato.** Baseline QA e lancio restano non certificati.
