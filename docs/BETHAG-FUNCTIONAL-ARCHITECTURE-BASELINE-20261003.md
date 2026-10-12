# BETHAG — Specifica funzionale e architettura applicativa

Data: 2026-10-03  
Ramo di lavoro: `architecture-functional-alignment-20261003`  
Scopo: riferimento funzionale e tecnico per riallineare frontend, servizi, database, sicurezza e distribuzione. Questo documento non autorizza modifiche allo schema Production.

## 1. Principi architetturali vincolanti

1. Un'unica fonte persistente: Supabase/PostgreSQL. `localStorage` è limitato a preferenze UI, bozze esplicitamente locali e cache non autorevole; non deve essere la fonte primaria di dati aziendali.
2. Multi-tenancy esplicita: ogni dato operativo appartiene a un `workspace_id` e, quando pertinente, a un `condominium_id`. Il server applica isolamento e autorizzazione tramite RLS e funzioni verificate; il filtro React non è un controllo di sicurezza.
3. Separazione dei concetti: persona, unità immobiliare, rapporto di titolarità/occupazione e identità di accesso sono entità diverse.
4. Le operazioni finanziarie e catastali rilevanti sono atomiche, validate lato server, tracciate e storicizzate. Niente aggiornamenti parziali di flussi composti.
5. I permessi derivano prima dal piano e poi dal ruolo e dall'ambito (workspace, condominio, unità, documento); il client può nascondere funzioni ma il backend deve sempre imporre i limiti.
6. L'AI produce proposte marcate “Da verificare”; la decisione e la pubblicazione restano in capo all'amministratore.
7. Nessuna migrazione incrementale deve fingere di essere un bootstrap pulito. Le procedure per database vuoti e per database esistenti devono essere distinte, versionate e verificate.
8. Nessuna migrazione o modifica dati su Production durante l'allineamento senza autorizzazione esplicita e piano di rollback verificato.

## 2. Ruoli, piani e ambiti di accesso

### Ruoli applicativi
- **admin/amministratore**: gestione del workspace e dei condomini secondo i moduli acquistati.
- **collaborator/collaboratore**: accesso delegato dall'amministratore, con permessi per modulo e condominio.
- **resident/condomino**: accesso esclusivamente ai dati personali e delle unità per cui è autorizzato.
- **council/consiglio**: consultazione delle informazioni espressamente abilitate, senza privilegi amministrativi impliciti.

I ruoli applicativi non vanno confusi con la qualifica condominiale (proprietario, comproprietario, usufruttuario, inquilino, delegato) né con il ruolo tecnico eventualmente presente in `portal_access`.

### Piani
- `free`: funzioni essenziali.
- `plus`: strumenti AI di acquisizione/assistenza.
- `professional`: automazioni, generazione documentale e gestione assembleare avanzata.
- `portal`: funzioni Professional e portale dedicato.

Le funzionalità acquistabili singolarmente vanno modellate come entitlement/add-on, senza alterare il ruolo dell'utente. Stato abbonamento e rinnovo sono dati server-side. Un piano non concede accesso ai dati di un altro workspace.

### Regola di autorizzazione
Ogni richiesta deve soddisfare tutte le condizioni applicabili: sessione valida, membership attiva, workspace coerente, accesso al condominio, ruolo/permesso modulo, entitlement del piano, ambito della risorsa e stato (es. condominio archiviato, documento non pubblicato). Le policy RLS devono riflettere la stessa regola in modo verificabile.

## 3. Mappa funzionale

### 3.1 Workspace, account e abbonamento
- Registrazione e autenticazione reali; recupero account e gestione sessione.
- Creazione workspace e primo amministratore; invito collaboratori e residenti.
- Membership, stato invito/attivazione, permessi per modulo e condominio.
- Piani, stato demo/attivo, rinnovo, limiti e add-on.
- Cambio workspace esplicito con ricaricamento isolato dei dati e gestione errori.

### 3.2 Anagrafe, immobili e titolarità
- Condomini, civici, palazzine, scale, unità, pertinenze, garage, cantine e posti auto.
- Distinzione fra unità autonoma, pertinenza collegata e pertinenza incorporata; ammesse unità autonome con titolari esterni.
- Persone e contatti separati dalle unità; più titolari o occupanti sulla stessa unità.
- Relazioni di proprietà/occupazione con quota, ruolo, validità temporale, documenti e stato.
- Dati catastali, sicurezza, certificazioni e storico.
- Millesimi associati a unità e tabelle, mai alla persona come dato autorevole.
- Fusione e frazionamento catastale come trasformazioni storicizzate: genealogia delle unità, snapshot pre/post, nuove tabelle millesimali approvate e collegamenti ai saldi/documenti.
- Archiviazione dei condomini; cancellazione definitiva solo con controllo esplicito delle dipendenze e delle retention.

### 3.3 Contabilità e rendiconto
- Esercizi, piano dei conti/categorie, movimenti cronologici, conti, preventivo, consuntivo, stato patrimoniale, riepilogo finanziario.
- Spese, giustificativi, fornitori, fondi/riserve, riparti, rate, scadenze, pagamenti, storni, insoluti e riconciliazione bancaria.
- Riparti con tabelle/criteri multipli, esclusioni, quote personalizzate, conguagli e rate ordinarie/straordinarie.
- Tracciabilità dal giustificativo al movimento, riparto, rata, pagamento e rendiconto.
- Chiusura esercizio e riapertura/saldi iniziali controllati; protezione dei periodi chiusi.
- Fondi speciali e SAL collegati a delibere, lavori, fatture e pagamenti.
- Morosità come pratica riservata con solleciti, pagamenti parziali, legale, stato e storico.
- Nessun saldo storico deve essere sovrascritto durante cambi titolarità o trasformazioni immobiliari.

### 3.4 Subentro e continuità contabile
- Pratica con unità, cedente, subentrante, data rogito, documenti e stato.
- Snapshot contabile alla data di efficacia, rate scadute/future, crediti, debiti, pagamenti parziali, delibere e spese straordinarie.
- Separazione della posizione del cedente e del subentrante, con collegamento alla stessa unità e alla storia.
- Distinzione fra registrazione gestionale e imputazione della responsabilità secondo la disciplina applicabile: il software conserva dati e documenti, non decide autonomamente la responsabilità giuridica.
- Chiusura del trasferimento solo dopo le verifiche contabili previste; storico cedente archiviato, non cancellato.
- Serializzazione delle operazioni concorrenti sulla medesima unità e idempotenza RPC.

### 3.5 Assemblee, delibere e lavori
- Convocazioni, ODG, destinatari, presenze, deleghe, quorum, votazioni, esiti, verbali, allegati e invio.
- Delibere collegate a spese, lavori, fondi e attività conseguenti.
- Lavori/manutenzioni con urgenza, tecnici, preventivi comparati, contratti, SAL, fatture, certificazioni, garanzie e chiusura.
- Fornitori e contratti con anagrafica, scadenze, documenti, interventi, fatture e pagamenti.

### 3.6 Documenti, comunicazioni e richieste
- Archivio documentale classificato, versionato, ricercabile e collegabile a condominio, unità, persona, fornitore, spesa, lavoro, assemblea o scadenza.
- Storage privato con policy su metadati e oggetti; pubblicazione esplicita, destinatari e revoca controllata.
- Comunicazioni individuali/collettive, tracciamento invio e stato.
- Richieste e segnalazioni dei residenti con assegnazione, stato, allegati e risposta.
- Scadenziario operativo e scadenziario fiscale distinti, con responsabile e prova di adempimento.

### 3.7 Portale residenti
- Vista limitata a documenti pubblicati, comunicazioni abilitate, assemblee/verbali, richieste e situazione personale.
- Accesso basato su account collegato a persona/unità e membership attiva.
- Proprietari, comproprietari, inquilini e consiglio con permessi distinti; l'inquilino non visualizza spese straordinarie o dati non autorizzati.
- Onboarding via invito oppure richiesta di registrazione con verifica dei dati e gestione mismatch senza esporre dati di terzi.
- Mai esporre morosità, documenti o dati di altre unità per semplice appartenenza allo stesso condominio.

### 3.8 AI e automazioni
- Acquisizione da PDF, Word, Excel, immagini e audio; OCR/estrazione/trascrizione secondo servizio abilitato.
- Output strutturato con fonte, stato, confidenza ove disponibile, errori e revisione umana.
- Bozze di verbali, classificazioni, proposte di riparto, estrazione scadenze e comunicazioni; nessuna scrittura finanziaria/pubblicazione automatica senza conferma.
- Edge Functions con JWT e autorizzazione lato server; segreti solo server-side, limiti di payload, logging minimizzato.

### 3.9 Privacy, audit e affidabilità
- Minimizzazione, finalità, conservazione, accessi per ruolo e protezione dei dati personali/finanziari.
- Audit per operazioni sensibili: attore, workspace, risorsa, timestamp, azione, motivazione e variazione essenziale.
- Archiviazione e soft-delete dove opportuno; retention e ripristino documentati.
- Backup e restore verificabili in ambiente isolato, con RPO/RTO definiti prima del lancio.

## 4. Architettura software di destinazione

### Frontend — React + TypeScript + Vite
```text
src/
  app/                 # bootstrap, routing, providers, error boundaries
  auth/                # sessione, registrazione, inviti, guardie di route
  shell/               # layout, navigazione, homepage, selettore workspace
  modules/
    condomini/
    anagrafe/
    unita/
    trasformazioni/
    subentri/
    contabilita/
    riparti/
    rate-pagamenti/
    morosita/
    assemblee/
    lavori/
    fornitori/
    documenti/
    comunicazioni/
    richieste/
    scadenze/
    portale/
    ai/
    report/
    impostazioni/
  components/          # componenti UI riusabili, non regole di dominio
  domain/              # tipi e regole pure condivise lato client
  services/            # interfacce e coordinamento casi d'uso
  infrastructure/
    supabase/           # client, adapter, mapping DTO
  state/               # stato UI/cache non autorevole
  lib/                 # utilità trasversali
  tests/               # test unitari e integrazione UI
```

Regole:
- Componenti UI non contengono query SQL-like duplicate né regole di autorizzazione autorevoli.
- Ogni modulo espone pagine, componenti, tipi e use-case separati.
- API/service restituiscono tipi espliciti; sostituire progressivamente `Record<string, any[]>` e `any` con DTO tipizzati e validazione runtime.
- Stati asincroni espliciti: loading, empty, success, error; non mostrare successo prima della conferma server.
- Mutazioni critiche usano RPC transazionali; operazioni semplici passano da repository dedicati con workspace/condominio espliciti.
- La cache viene invalidata al cambio workspace/sessione e non può mescolare dati fra contesti.

### Backend — Supabase
- PostgreSQL: schema normalizzato, chiavi/FK/check, indici mirati, vincoli di unicità con semantica documentata.
- Auth: identità utente; membership e ruoli applicativi separati dalle qualifiche condominiali.
- RLS: policy deny-by-default, funzioni helper con `SECURITY DEFINER` solo dove necessarie, `search_path` vuoto e oggetti schema-qualificati; grant EXECUTE minimo.
- RPC: transazioni per creazione/trasformazione unità, riparti, pagamenti, subentri e chiusure; controlli ripetuti lato server, idempotenza e locking.
- Storage: bucket privati, autorizzazione sia sul path che sui metadati, link firmati a scadenza.
- Edge Functions: inviti, email, AI e integrazioni; JWT/authorization, validazione input, rate limit, segreti lato server e log senza contenuti sensibili.
- Migrazioni: timestamp univoci, ordinate per dipendenze, idempotenza solo quando semanticamente corretta, nessuna sostituzione fragile di routine via testo.
- Schema baseline separato dalla catena incrementale; drift report tra migrazioni, schema remoto e funzioni effettive.

### Strumenti e responsabilità
- **GitHub**: repository sorgente, branch di correzione, PR revisionabili, commit piccoli e tracciati; nessuna modifica diretta a `main` durante la riconciliazione.
- **Lovable**: supporto alla costruzione UI; le modifiche generate vanno riportate e revisionate nel repository ufficiale, senza divergenze non tracciate.
- **Supabase**: Auth, PostgreSQL, RLS, Storage, RPC ed Edge Functions; ambienti isolati per sviluppo/preview/produzione.
- **Vite/TypeScript**: build riproducibile e controllo statico; aggiungere script separati per typecheck, lint e test.
- **CI GitHub Actions**: installazione da lockfile, typecheck, build, test automatici e verifica migrazioni su database temporaneo/preview.
- **Servizi esterni** (AI, email, pagamenti): adapter server-side, credenziali in secret store, timeout/retry/idempotenza e log tecnico minimizzato.

## 5. Modello dati concettuale

| Area | Entità principali | Relazioni/regole |
|---|---|---|
| Identità | profiles, workspaces, workspace_members, subscriptions, entitlements | utente può appartenere a più workspace; ruolo e permessi scoped |
| Condominio | condominiums, buildings, stairs, condominium_units | ogni risorsa scoped al workspace e al condominio |
| Persone | condominium_members, unit_memberships/ownerships | persona distinta da unità; rapporto con date di validità e quota |
| Catasto | unit_transformations, transformation_links, unit_snapshots | genealogia fusioni/frazionamenti immutabile |
| Millesimi | millesimal_tables, unit_millesimi, allocation_rules | valori per unità/tabella/versione |
| Contabilità | fiscal_years, ledger_entries, accounts, funds, expenses, allocations | collegamenti documentati e vincoli d'esercizio |
| Riscossione | installments, payments, payment_movements, reconciliations, carryovers | pagamenti parziali, storni auditabili, saldo derivato |
| Subentri | member_transfers, transfer_snapshots, transfer_allocations | data efficacia, lock unità, storico cedente/subentrante |
| Assemblee/lavori | assemblies, attendees, proxies, votes, resolutions, works, SAL | delibere legate a spese e attività |
| Operatività | suppliers, contracts, deadlines, tax_obligations, legal_cases, requests, activities | responsabili, stati, documenti e scadenze |
| Documenti | documents, document_versions, storage_objects, publication_grants | metadati e oggetti protetti da autorizzazione |
| Portale | portal_access, portal_registration_requests, communications, recipients | accesso minimo e ambito per unità/persona |
| Controllo | audit_logs, notifications, integration_jobs | tracciabilità, retry e monitoraggio |

Le entità sono concettuali: i nomi non impongono una nuova migrazione né autorizzano duplicare tabelle già esistenti. Prima di creare o rinominare oggetti occorre confrontare schema, RPC, policy, trigger, indici, grant e callsite effettivi.

## 6. Contratti di dominio fondamentali

- **Unità**: identificativo DB stabile; identificativo legacy solo per mapping/import. Non riutilizzare ID dopo fusione/frazionamento.
- **Titolarità**: intervallo `valid_from/valid_to`, quota e qualifica; le modifiche chiudono/creano relazioni, non sovrascrivono la storia.
- **Millesimi**: associati a unità + tabella + versione; ogni variazione conserva autore, data, motivazione e atto di approvazione.
- **Contabilità**: movimenti registrati una sola volta; correzioni con storno/rettifica collegata, non cancellazione silenziosa.
- **Subentro**: data rogito separa il periodo; snapshot registra esposizioni e pagamenti senza dichiarare autonomamente responsabilità legali.
- **Documento**: privato per default; la pubblicazione crea autorizzazione esplicita, revocabile e tracciata.
- **AI**: output è una bozza; approvazione umana richiesta prima di generare effetti contabili, invii ufficiali o pubblicazione.
- **Workspace**: nessun ID scelto dal client è prova di autorizzazione; ogni operazione viene verificata lato database.

## 7. Strategia per correggere la struttura attuale

1. **Inventario e baseline**: acquisire da `main` file, package/lockfile, servizi, migrazioni, funzioni, policy e callsite; catalogare schema Production in sola lettura. Distinguere fatti verificati, ipotesi e gap.
2. **Mappa dipendenze**: ordinare migrazioni per tabelle/colonne/funzioni che creano e usano; rilevare timestamp duplicati, nomi constraint divergenti, oggetti mancanti e routine sovrascritte per replace testuale.
3. **Contratti condivisi**: tipizzare DTO e risultati RPC; definire mapping legacy↔DB in un solo adapter; eliminare accessi diretti a storage locale come fonte dati.
4. **Riconciliazione DB**: preparare bootstrap riproducibile e migrazioni forward-only per ambienti esistenti; ogni modifica con precondizioni, controlli post-condizione e strategia di rollback/compensazione.
5. **Riallineamento frontend**: estrarre progressivamente i moduli dal monolite `main.tsx`, senza riscrittura big-bang; migrare prima sessione/workspace, poi anagrafe/unità, contabilità, documenti/portale e automazioni.
6. **Sicurezza e integrazioni**: allineare policy, RPC grants, Storage RLS, Edge Functions e interfaccia ai medesimi permessi.
7. **Verifica tecnica mirata durante le correzioni**: typecheck/build e test circoscritti solo quando il cambiamento li richiede; il collaudo end-to-end complessivo resta alla fine, dopo la risoluzione dei problemi.
8. **Rilascio**: PR revisionabile, preview isolata, migrazione testata da zero e da schema preesistente rappresentativo, piano di backup/restore provato, poi approvazione esplicita per Production.

## 8. Criteri di completamento

- Nessuna perdita o commistione dati al cambio workspace/condominio.
- Nessun accesso ottenibile solo modificando UI, ID o payload client.
- Anagrafe, unità, titolarità, trasformazioni e millesimi mantengono integrità e storia.
- Contabilità riconciliabile dal documento al rendiconto, con storni e periodi chiusi protetti.
- Subentro conserva posizioni separate e impedisce trasferimenti concorrenti incoerenti.
- Portale mostra solo risorse autorizzate e pubblicate per la persona/unità.
- Invii, AI e automazioni hanno conferma, esito e tracciabilità adeguati.
- Bootstrap e migrazioni incrementali si applicano in ambienti isolati e convergono allo stesso schema/permessi.
- Build, typecheck, test mirati e infine collaudo end-to-end superati; backup/restore verificato.

## 9. Stato di questa specifica

Questo documento è una baseline di progettazione ricavata dai requisiti BETHAG e dalla struttura osservata del repository. Non certifica che le funzioni siano già implementate, né che lo schema remoto coincida con il modello concettuale. Ogni implementazione va tracciata in PR e verificata prima del rilascio.
