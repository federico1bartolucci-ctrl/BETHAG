# Revisione mirata — autorizzazioni portale e ciclo di vita unità/trasferimenti

**Branch:** `bethag-migration-repair`  
**Tipo:** revisione statica selettiva delle migrazioni SQL. Documento di audit, non migrazione eseguibile.

## Autorizzazioni e portale

| Migrazione | Evidenza rilevata | Conseguenza per il collaudo |
|---|---|---|
| `20260930320000_harden_portal_approval_rpc.sql` | Sostituisce la RPC di approvazione; aggiorna membri, profili e richieste | Testare associazione coerente tra identità, membro, condominio e workspace. |
| `20260930360000_harden_resident_document_visibility.sql` | Sostituisce la policy di lettura documenti | Provare visibilità per ruolo, pubblicazione, condominio e workspace; distinguere tabella e storage. |
| `20260930390000_harden_portal_registration_response.sql` | Sostituisce la RPC di completamento registrazione e aggiorna membro/profilo/richiesta | Provare email normalizzate, utente già esistente, richiesta ripetuta, mismatch e rollback atomico. |
| `20260930400000_harden_portal_access_visibility.sql` | Sostituisce la policy di lettura del registro accessi | Verificare accesso alla sola identità autorizzata e nessuna esposizione cross-workspace. |
| `20260930410000_portal_publication_visibility.sql` | Sostituisce policy di lettura per assemblee e comunicazioni | Testare contenuti pubblicati/non pubblicati, ruoli e appartenenza effettiva. |
| `20260930430000_optimize_portal_rls_auth_initplan.sql` | Sostituisce policy residenti su accessi e unità | La modifica di performance va confrontata anche semanticamente con la policy precedente. |
| `20260930440000_optimize_portal_authorization_helpers.sql` | Sostituisce helper di accesso a moduli workspace/condominio | Verificare che l'ottimizzazione non allarghi il perimetro autorizzativo. |
| `20260930450000_harden_resident_request_member_scope.sql` | Sostituisce policy di creazione richieste residenti | Impedire richieste per membro, unità o condominio non collegati all'identità. |
| `20260930460000_harden_condominium_member_visibility.sql` | Sostituisce policy di lettura membri | Verificare distinzione fra amministratore, collaboratore, proprietario, inquilino e utente non associato. |
| `20260930480000_scope_condominium_delete_portal_requests.sql` | Sostituisce la RPC di hard-delete e circoscrive eliminazioni per workspace/condominio | Verificare l'intero grafo di cancellazione e impedire cancellazioni di richieste o dati appartenenti ad altri tenant. |
| `20260930500000_harden_condominium_visibility.sql` | Sostituisce policy di lettura condomini | Provare accesso manager e membri workspace con stati attivi/archiviati. |
| `20260930510000_harden_unit_workspace_scope.sql` | Sostituisce funzione e trigger di validazione workspace sulle unità | Provare insert/update e cambi di condominio/workspace, anche con riferimenti validi ma di tenant differente. |
| `20260930520000_harden_portal_email_uniqueness.sql` | Introduce indice univoco case-insensitive e rimuove indice precedente | Riconciliare dati duplicati e comportamento con la normalizzazione usata dalle RPC. |

### Dipendenze da chiarire
- Le policy dipendono dagli helper di autorizzazione, dal collegamento identità-membro, dallo stato del portale e dalle relazioni workspace/condominio/unità.
- Le RPC di registrazione e approvazione mutano più tabelle: occorre provare atomicità, ripetizione, mismatch email, identità già collegata e conflitti di unicità.
- Le migrazioni di ottimizzazione RLS non possono essere considerate equivalenti solo perché sostituiscono policy con lo stesso nome: serve confronto delle condizioni effettive e test con ruoli sintetici.
- L'indice email case-insensitive deve essere confrontato con l'indice precedente e con la chiave di upsert effettivamente utilizzata; la sola creazione dell'indice non certifica coerenza della normalizzazione.
- L'hard-delete include dati del portale e contabilità: testarlo solo con dati usa-e-getta e verifica esplicita di isolamento tenant.

## Trasferimenti e trasformazioni

| Migrazione | Evidenza rilevata | Conseguenza per il collaudo |
|---|---|---|
| `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` | Sostituisce conferma trasferimento; aggiorna membri, accesso portale e membri workspace | Verificare passaggio proprietario/accesso e separazione dalla conservazione della storia contabile. |
| `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` | Modifica il vincolo di stato e sostituisce conferma/chiusura; consente posizione uscente attiva in chiusura e successiva archiviazione | Testare stati, accesso durante il periodo di chiusura, chiusura contabile e revoca finale. |
| `20261001130000_validate_unit_transformation_preview_inputs.sql` | Sostituisce RPC di anteprima trasformazione e ne limita EXECUTE | Provare input vuoti, unità duplicate, non attive, fuori ambito e preview non confermata. |
| `20261001133000_guard_confirmed_unit_transformation_integrity.sql` | Aggiunge vincolo d'integrità alle trasformazioni confermate | Preflight dati esistenti prima del replay; verificare tutti i campi obbligatori. |
| `20261001140000_lock_confirmed_unit_transformation_audit.sql` | Aggiunge funzioni e trigger di immutabilità per trasformazioni confermate e relativi elementi | Provare che record confermati non siano alterabili, mantenendo percorsi controllati per correzioni autorizzate. |
| `20261001150000_require_trusted_unit_transformation_confirmation.sql` | Aggiunge guardia/trigger per conferma attendibile; revoca EXECUTE esplicito | Verificare che la conferma avvenga solo tramite percorso autorizzato e che trigger/function privileges siano corretti. |
| `20261001153000_require_confirmed_genealogy_for_unit_lifecycle.sql` | Aggiunge guardia/trigger per richiedere genealogia confermata | Provare fusioni, frazionamenti, unità derivate e modifiche di stato senza genealogia valida. |
| `20261001160000_validate_confirmed_unit_transformation_genealogy.sql` | Aggiunge validazione della genealogia confermata | Provare coerenza padre/figlio, cardinalità, appartenenza al condominio e assenza di cicli. |

### Dipendenze e rischio funzionale
- Il ciclo di vita dei trasferimenti è composto da conferma e chiusura, non da un singolo cambio proprietario. Deve preservare la storia economica e distinguere titolarità corrente, accesso al portale e posizione contabile residua.
- Le trasformazioni dipendono da unità esistenti e attive, anteprima valida, conferma attendibile, genealogia e revisioni risolte. L'ordine cronologico dei file non basta a dimostrare che tutti i prerequisiti siano già presenti.
- Vincoli e trigger possono bloccare dati preesistenti durante il replay; prima servono query di preflight in QA per individuare righe non conformi.
- Le guardie immutabilità devono essere verificate insieme alle RPC autorizzate, altrimenti possono impedire operazioni lecite oppure lasciare percorsi alternativi non protetti.

## Gate QA proposto

1. Ricostruire la dipendenza effettiva di ciascuna policy/helper/RPC da tabelle, funzioni, trigger, grant e colonne preesistenti.
2. Confrontare la definizione finale di ogni helper/RPC/policy con la successiva migrazione che la sostituisce; annotare le semantiche cambiate.
3. Creare un ambiente QA usa-e-getta indipendente dalla produzione e replayare una baseline riconciliata, registrando il primo errore e il file che lo causa.
4. Eseguire test RLS con identità sintetiche: manager, collaboratore, proprietario, inquilino, utente disassociato e utente di altro workspace.
5. Eseguire workflow end-to-end di registrazione, approvazione, pubblicazione, trasferimento, chiusura, fusione e frazionamento, inclusi errori e rollback.
6. Confrontare il catalogo post-replay con gli snapshot di produzione e spiegare ogni differenza prima di considerare una correzione.

## Stato

Questa è una revisione statica mirata, non l'inventario semantico completo di tutte le migrazioni. Non sono stati eseguiti replay SQL o test runtime e non è certificata l'equivalenza con lo stato storico di produzione. Il baseline rimane **bloccato/non certificato**.

Nessuna scrittura, migrazione, reset o modifica della history è stata eseguita su Supabase produzione. Nessun merge su `main` e nessun deploy sono stati eseguiti.
