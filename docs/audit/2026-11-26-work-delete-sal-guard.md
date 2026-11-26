# Audit — protezione delle prove contabili SAL alla cancellazione dei lavori

**Stato:** proposta tecnica in bozza; non approvata e non applicata a QA o Production.

## Difetto riprodotto

La cancellazione di `condominium_works` usa una FK `condominium_work_progress.work_id ON DELETE CASCADE`. Le colonne `workspace_id` e `condominium_id` del record SAL hanno FK indipendenti e non compongono una relazione composita verso il lavoro. Il vecchio controllo filtrava anche per workspace e condominio del record padre. Se uno dei due valori del SAL era incoerente, il controllo non vedeva la riga e la cancellazione del lavoro poteva eliminare a cascata il SAL e la relativa prova contabile.

Il difetto è più grave quando RLS nasconde le righe SAL al chiamante: un controllo eseguito con i privilegi dell'utente non è sufficiente.

## Correzione proposta

Il trigger `BEFORE DELETE` verifica ogni record SAL tramite il solo legame effettivo `work_id = OLD.id`. L'helper:
- è `SECURITY DEFINER`;
- imposta `search_path TO ''` e `row_security TO off`;
- usa nomi di tabella pienamente qualificati;
- non concede EXECUTE diretto a PUBLIC, anon, authenticated o service_role;
- blocca la cancellazione se esiste qualunque SAL collegato, indipendentemente da workspace/condominio;
- consente la cancellazione di un lavoro privo di SAL.

Il candidato resta in `supabase/rebuild/drafts/`, non in `supabase/migrations/`.

## Regressione PostgreSQL 17

Il test in una transazione:
1. ricrea il vecchio trigger e riproduce la perdita a cascata per i SAL con workspace o condominio incoerente;
2. nasconde i SAL al ruolo authenticated tramite RLS;
3. applica la correzione proposta;
4. verifica che tutti i lavori con SAL restino non eliminabili, mentre un lavoro senza SAL sia eliminabile;
5. verifica le impostazioni SECURITY DEFINER, search_path, row_security e l'assenza di EXECUTE per i ruoli API;
6. termina con ROLLBACK, senza lasciare tabelle, ruoli o ACL nel database di prova.

La CI crea un database PostgreSQL 17 effimero e dedicato. Il wrapper rifiuta URL non loopback.

## Limiti

Questa integrazione contiene soltanto il candidato draft, la regressione isolata, il test wrapper e la documentazione. Non modifica la catena canonica, non esegue migrazioni e non tocca QA/Production. L'eventuale promozione richiede revisione e autorizzazione separate.
