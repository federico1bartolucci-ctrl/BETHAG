# BETHAG — matrice consolidata di prontezza al collaudo

**Data di consolidamento:** 2026-10-01  
**Branch:** `bethag-migration-repair`  
**Ambito:** sintesi dei documenti di recupero e delle revisioni statiche già salvate.  
**Stato complessivo:** **NON CERTIFICATO — replay e collaudo runtime non autorizzati dal gate attuale.**

## 1. Quadro decisionale

| Area | Evidenza disponibile | Stato | Prova necessaria per uscire dal blocco |
|---|---|---|---|
| Riconciliazione migrazioni | 153 record nella history produzione; 132 file nel branch; 10 corrispondenze di prefisso versione | Bloccato | Mappatura semantica completa record-per-record, incluse migrazioni con timestamp/nome diversi |
| Migrazioni iniziali e grants | Sorgente esatta delle migrazioni iniziale backend e restrizione Data API non reperita nei percorsi GitHub verificati | Bloccato | Recuperare archivio/backup/deployment artifact, oppure documentare la sorgente come non disponibile e progettare una baseline sostitutiva separata |
| Schema core/workspace | Snapshot catalogo disponibili; alcune migrazioni fanno riferimento a oggetti core che non sono creati dai frammenti esaminati | Bloccato | Dipendenze complete e replay isolato dal database vuoto |
| Unità immobiliari | Migrazioni su unità/millesimi precedono il file che ricrea la tabella base nel branch esaminato | Bloccato | Stabilire il creatore effettivo nella sequenza completa e superare replay pulito; validare popolamento, unità indipendenti e multi-edificio |
| Contabilità | Inventari di funzioni, trigger, vincoli e RPC parziali; pagamento modifica rate e allocazioni | Da provare | Test transazionali, idempotenza, pagamenti parziali, storni, saldi e riconciliazione preflight |
| RLS e permessi | Policy e helper esaminati per portale, membri, unità, richieste e visibilità | Da provare | Test runtime con identità sintetiche e verifica cross-workspace; confronto semantico delle policy sostituite |
| Registrazione/approvazione | RPC sostituite più volte e aggiornamenti su membri, profili e richieste | Da provare | Percorsi positivi/negativi, mismatch email, conflitti, richieste ripetute e rollback atomico |
| Trasferimento proprietà | Conferma e chiusura separate; precedente titolare può restare attivo durante la chiusura; vincolo di stato storico duplicato era incoerente | Da correggere/verificare in QA | Applicare la correzione solo dopo baseline QA; testare accessi, residui contabili, chiusura e conservazione dello storico |
| Trasformazioni catastali | Anteprima, conferma attendibile, genealogia e immutabilità presidiate da migrazioni successive | Da provare | Test fusioni/frazionamenti, input invalidi, genealogia, cardinalità, audit e vincoli su dati preesistenti |
| Hard-delete e archivio | RPC di cancellazione elimina dati operativi/contabili/portale; distinta da archiviazione | Alto rischio, non certificato | Matrice FK completa, test su dati sintetici, conferma esplicita della semantica archivio vs cancellazione |
| Storage documenti | Policy storage separate dalle policy delle tabelle applicative | Da provare | Test isolamento per workspace/condominio, percorso, upload, lettura, sostituzione e revoca |
| Funzioni e trigger | Inventario di 164 funzioni, definizioni salvate solo in parte; snapshot trigger disponibili | Parziale | Completare inventario e dipendenze; esaminare privilegi e comportamento effettivo in QA |
| Test automatizzati | Test SQL disponibili prevalentemente orientati a controlli catalogo; non coprono l'intero runtime multi-ruolo | Insufficiente | Harness QA isolato, fixture sintetiche, test RLS reali e flussi end-to-end |
| Sicurezza di configurazione | Advisor aveva segnalato protezione password compromesse disabilitata e warning prestazionali | Da valutare | Verificare impostazioni effettive e impatto; definire remediation con test, senza assumere automaticamente una vulnerabilità sfruttabile |
| Deploy e rilascio | Nessuna certificazione di replay o collaudo completo | Non pronto | Baseline certificata, QA superata, revisione sicurezza, backup/rollback e autorizzazione esplicita al rilascio |

## 2. Evidenze di inventario già raccolte

- Catalogo produzione: 47 tabelle pubbliche, 192 indici non vincolo, 47 tabelle con RLS, 102 policy RLS pubbliche, 143 trigger, 164 funzioni pubbliche/private e una vista pubblica.
- I conteggi sono fotografie del catalogo rilevate durante l'audit, non una garanzia che non siano intervenuti cambiamenti successivi.
- Snapshot di schema, trigger, vista e una parte delle definizioni funzione sono salvati nel branch di recupero. Sono artefatti di ricognizione e non vanno eseguiti come migrazioni.
- L'assenza di righe di prova in alcune tabelle di trasferimento, trasformazione e movimenti contabili significa che i workflow non possono essere considerati testati su produzione; occorrono fixture sintetiche isolate.
- Il controllo dei nomi/versioni delle migrazioni è solo un primo criterio: nomi diversi possono contenere operazioni equivalenti e nomi simili non provano equivalenza semantica.

## 3. Gate obbligatori, nell'ordine

### Gate A — chiusura inventario e provenienza
- [ ] Riconciliare tutti i 153 record history con i 132 file e classificare: corrispondenza certa, equivalente candidato, assente, duplicato/obsoleto, non determinato.
- [ ] Ricercare eventuali copie esterne delle migrazioni iniziale e grants non reperite.
- [ ] Completare il grafo di dipendenze: schemi, estensioni, tabelle, colonne, funzioni, trigger, policy, grants, viste, storage e configurazioni esterne.
- [ ] Evidenziare migrazioni data-changing, destructive, non idempotenti o che presuppongono dati/oggetti esistenti.

### Gate B — baseline QA usa-e-getta
- [ ] Preparare un progetto/database QA isolato e sacrificabile, senza collegamento operativo alla produzione.
- [ ] Definire una baseline candidata riconciliata e sottoporla a revisione prima del replay.
- [ ] Eseguire replay da database vuoto e registrare il primo errore esatto, la migrazione, l'oggetto mancante e la dipendenza violata.
- [ ] Correggere una sola causa per volta, aggiornando mappa, changelog e prove; ripetere replay da ambiente pulito.
- [ ] Confrontare catalogo risultante con gli snapshot di produzione e giustificare ogni differenza.

### Gate C — collaudo funzionale e sicurezza
- [ ] Identità sintetiche: admin, collaboratore, proprietario, comproprietario, inquilino, consigliere, utente non associato e utente di altro workspace.
- [ ] Registrazione, invito, approvazione, mismatch email, accesso e revoca.
- [ ] Creazione/modifica unità, pertinenze autonome, assegnazione millesimi, fusione/frazionamento e genealogia.
- [ ] Trasferimento: data rogito, titolarità, accessi, rate/movimenti antecedenti e successivi, residui, storno e chiusura.
- [ ] Contabilità: generazione rate, allocazioni, pagamenti parziali, duplicati, storni, fondi, riporti e riconciliazione.
- [ ] Documenti e storage: pubblicazione, visibilità, upload/download e isolamento tenant.
- [ ] Archiviazione distinta da cancellazione definitiva; verificare retention e recuperabilità.
- [ ] Eseguire test di regressione e raccogliere log/prove riproducibili.

### Gate D — autorizzazione al rilascio
- [ ] Tutti i gate precedenti superati e risultati conservati.
- [ ] Revisione indipendente di SQL, RLS, grants, funzioni security-definer, trigger e operazioni distruttive.
- [ ] Piano backup/rollback e procedura di ripristino provati in QA.
- [ ] Approvazione esplicita prima di qualsiasi migrazione produzione, merge su `main` o deploy.

## 4. Regole di sicurezza operative

1. Produzione Supabase `tctcgptrsmvgajqjgnev` resta in sola lettura per questa attività.
2. Nessun reset, migrazione, modifica dei grants, modifica della history, merge o deploy senza revisione e autorizzazione esplicita.
3. Non ricostruire SQL storico per supposizione. Se la sorgente manca, segnalarla e trattare l'eventuale sostituzione come progetto distinto, revisionato e verificato in QA.
4. Non dichiarare superato un test se è stata svolta solo un'ispezione statica o una verifica di salvataggio del file.
5. I documenti di recovery sono audit e specifiche, non istruzioni da eseguire direttamente.

## 5. Esito e prossima azione

La raccolta delle evidenze è avanzata, ma non è ancora una baseline riproducibile. Il blocco principale non è la mancanza di un'altra correzione isolata: è l'assenza di una riconciliazione semantica completa e di un replay pulito certificato. La prossima attività tecnica deve quindi chiudere il Gate A con un inventario esaustivo, poi costruire il primo ambiente QA usa-e-getta; non applicare patch direttamente alla produzione.

**Esito attuale: NO-GO per migrazioni di produzione, merge e lancio tecnico certificato.** È un esito del processo di verifica, non una valutazione del valore commerciale del prodotto.
