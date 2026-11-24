# Audit — sicurezza del ripristino dei backup

**Data:** 24 novembre 2026

## Difetto riproducibile

Il ripristino accetta un JSON BETHAG modificabile dall'utente. Il controllo di formato e workspace non autentica il contenuto del file.

Il ramo precedente trattava le righe di autorizzazione come normali dati:

- workspace_members: filtrava soltanto il ruolo admin, poi eseguiva un upsert con chiave workspace_id,user_id. Una riga contraffatta con ruolo collaborator, active=true e permessi come contabilita o condomini poteva quindi creare una nuova membership per un profilo esistente. La policy RLS consente al manager del workspace di scrivere membership; can_access_workspace_module concede al collaboratore attivo i moduli presenti in permissions.
- portal_access: il percorso generico aggiungeva il workspace corrente e ripristinava user_id, email, active e permissions. La policy consente ai manager di gestire tali righe; il controllo di accesso residenti usa una riga portal_access attiva collegata a un membro per email o identità. Il trigger di scope verifica workspace e condominio, non l'approvazione dell'identità.

Un backup alterato poteva quindi assegnare accesso al workspace o al portale senza passare dagli inviti e dalla procedura di approvazione.

## Correzione

- workspace_members, portal_access e portal_registration_requests sono esportati come riferimento, ma non vengono più riprodotti dal restore. Le autorizzazioni devono essere ricreate tramite le procedure applicative.
- Per condominium_members, il restore legge prima le righe già presenti, in pagine e blocchi limitati.
- Per i membri esistenti preserva i campi che determinano identità e accesso: condominium_id, user_id, email, active, role, permissions e i metadati data.role, data.position_status, data.ownership_share usati dai trigger o dal calcolo delle autorizzazioni.
- Le nuove anagrafiche ripristinate restano senza collegamento Auth (user_id=null, email=null); non possono quindi acquisire un'identità portale dal file.
- Se la lettura delle righe esistenti fallisce, il restore dei membri si interrompe per quella tabella senza applicare dati non verificati.
- L'interfaccia segnala i record di autorizzazione/workflow ignorati.

## Regressione

npm test include scripts/test-backup-security-restore.mjs, che verifica:
- membership collaboratore e accessi portale contraffatti esclusi dal restore;
- richieste di registrazione non riprodotte;
- identità, email, stato attivo, ruolo e metadati di autorizzazione dei membri esistenti preservati;
- nuove anagrafiche senza identità Auth;
- righe collegate a condomini non inclusi o appartenenti a un altro workspace ignorate;
- wiring del controllo nel restore effettivo;
- policy RLS e funzioni SQL che rendono pericoloso il replay;
- esecuzione di npm test nella workflow CI.

## Limiti e sicurezza operativa

La verifica è basata sul codice e sulle policy della baseline SQL; non è stata eseguita su QA o Production. La PR è impilata sulla correzione di paginazione/scope dei membri (#400). Nessun merge, deploy, reset o modifica ai dati.
