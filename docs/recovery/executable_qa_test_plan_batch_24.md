# Piano di collaudo eseguibile BETHAG — batch 24

## Scopo e stato

Questo documento traduce i blocker già rilevati in una sequenza di verifiche ripetibili. È un piano di test, non una certificazione: non sono stati eseguiti test runtime, replay SQL, invii e-mail o modifiche al database.

**Gate attuale: BLOCCATO.** Non iniziare test integrati finché non è disponibile un ambiente QA isolato con baseline SQL completa, riproducibile e riconciliata. Non usare produzione come ambiente di prova.

## Gate 0 — protezione dell'ambiente

- [ ] Identificare il progetto QA autorizzato e verificarne il riferimento prima di ogni operazione.
- [ ] Confermare che non contiene dati reali e che può essere eliminato senza impatto su produzione.
- [ ] Acquisire inventario iniziale di migrazioni, tabelle, funzioni, trigger, policy, grant, viste, storage e Edge Functions.
- [ ] Bloccare merge/deploy verso `main` e Supabase produzione durante il collaudo.
- [ ] Non eseguire reset/rebase del branch esistente: prima documentare e approvare un piano di ripristino.

**Uscita:** ambiente isolato identificato e autorizzato; snapshot iniziale conservato.

## Gate 1 — baseline e replay SQL

- [ ] Riconciliare semanticamente le migrazioni della cronologia produzione con tutti i file disponibili, non soltanto con i timestamp.
- [ ] Classificare ogni migrazione: sorgente recuperata, equivalente semantico verificato, frammento dipendente, mancante o non determinata.
- [ ] Ricostruire l'ordine delle dipendenze per schema, estensioni, tabelle, funzioni, trigger, RLS, grant, viste e storage.
- [ ] Eseguire il replay soltanto nell'ambiente QA isolato e registrare la prima istruzione che fallisce, l'errore integrale e la versione.
- [ ] Confrontare il catalogo QA risultante con gli snapshot di produzione, senza copiare dati personali o finanziari.
- [ ] Verificare esplicitamente le migrazioni data-changing con dataset sintetici: popolamento unità, rimozione di millesimi legacy, rigenerazione rate/riporti e cancellazioni.

**Uscita:** replay pulito e differenze di catalogo spiegate; nessuna differenza critica non classificata.

## Gate 2 — test automatici e qualità del frontend

- [ ] Aggiungere comandi distinti per typecheck, lint, unit test e build, senza modificare il comportamento applicativo.
- [ ] Testare validazione/normalizzazione dei campi: codice fiscale, IBAN, email, CAP, importi e valori numerici.
- [ ] Testare i contratti client per caricamento, salvataggio, errori, stato pending e recupero dopo refresh.
- [ ] Testare il mapping dell'identificativo locale rispetto al primary key database: non confondere `id` con `legacy_id`.
- [ ] Testare il composer e-mail appena creato: nessuna chiamata di invio senza un record persistito e un database ID valido.
- [ ] Rendere visibili gli errori di sincronizzazione; la UI non deve indicare “Inviata” se il backend non conferma l'esito.
- [ ] Eseguire build e test sul commit esatto candidato alla PR e conservare i log.

**Uscita:** tutti i comandi automatici superati sul commit candidato; errori gestiti e nessuna conferma UI anticipata.

## Gate 3 — test backend con identità sintetiche

Preparare identità distinte: amministratore workspace A, collaboratore autorizzato e non autorizzato, condomino attivo, condomino inattivo, inquilino, consigliere, utente senza associazione e amministratore workspace B.

- [ ] Verificare isolamento tra workspace e condomìni per SELECT/INSERT/UPDATE/DELETE.
- [ ] Verificare permessi per modulo, ruolo e piano; negare accessi diretti non autorizzati anche invocando le API senza UI.
- [ ] Verificare registrazione, corrispondenza per identità, email non coincidente, duplicati e approvazione amministrativa.
- [ ] Verificare che l'archiviazione non equivalga alla cancellazione definitiva e che la storia contabile rimanga consultabile.
- [ ] Verificare policy di documenti, verbali, comunicazioni, assemblee, pagamenti e polizze per condomino/inquilino/consigliere.
- [ ] Verificare che le funzioni SECURITY DEFINER convalidino identità, workspace, permessi e input; controllare EXECUTE per ruolo e overload.
- [ ] Verificare che Storage rispetti gli stessi confini di workspace e che URL/file non siano accessibili fuori ambito.

**Uscita:** matrice autorizzazioni attese/effettive senza accessi cross-workspace o escalation.

## Gate 4 — flussi contabili e ciclo di vita

Usare esclusivamente condomìni, unità, persone, importi e pagamenti sintetici.

- [ ] Creare unità e pertinenze, incluse pertinenze autonome e proprietari differenti; controllare associazioni e millesimi per unità.
- [ ] Verificare ripartizioni, arrotondamenti, rate, pagamenti parziali/totali, storni, rimborsi e concorrenza.
- [ ] Verificare riporto esercizio, fondi, saldi iniziali, compensazioni e riconciliazione tra rate, allocazioni e ledger.
- [ ] Verificare vendita/subentro: data rogito, snapshot contabile, uscente, entrante, continuità storica e revoca/attivazione accessi.
- [ ] Verificare chiusura del subentro soltanto dopo la riconciliazione dei residui, senza trasferimenti automatici di debiti.
- [ ] Verificare fusione/scissione catastale, anteprima, conferma, genealogia, millesimi e blocco delle operazioni incompatibili.
- [ ] Verificare doppio invio, retry, richieste concorrenti e idempotenza delle RPC finanziarie e di ciclo di vita.
- [ ] Verificare che lo stato `Chiuso` del subentro sia ammesso da tutti i vincoli CHECK effettivamente presenti.

**Uscita:** quadratura dei saldi, invarianti rispettati, operazioni ripetute senza duplicazioni e nessuna perdita di storico.

## Gate 5 — Edge Functions e comunicazioni

- [ ] Recuperare e riconciliare le sorgenti deployate delle sette funzioni attive con il repository; nessun deploy da sorgenti non autorevoli.
- [ ] Testare inviti collaboratore/condomino, invio email, AI documentale/condominiale e webhook Resend con mock o destinatari di prova.
- [ ] Verificare autenticazione, autorizzazione, limiti input, segreti server-side, CORS e gestione errori.
- [ ] Verificare il contratto effettivo client/backend per comunicazioni: identificativo persistito, destinatari, esito parziale, retry e idempotenza.
- [ ] Verificare che invio riuscito lato provider ma fallimento database non generi duplicati incontrollati.
- [ ] Verificare firma Svix del webhook e rifiuto di firme mancanti/non valide.
- [ ] Non inviare comunicazioni a destinatari reali durante QA.

**Uscita:** sorgenti approvate e allineate, contratti compatibili, invii di test controllati e tracciabili.

## Gate 6 — regressione, rilascio e rollback

- [ ] Eseguire regressione end-to-end su desktop e mobile, includendo refresh, sessione scaduta e connessione instabile.
- [ ] Verificare accessibilità di base, error states, caricamenti, moduli vuoti e doppio click.
- [ ] Confermare backup, piano di rollback e responsabilità operative per frontend, migrazioni, funzioni e segreti.
- [ ] Abilitare protezione branch e required checks prima di rendere la PR pronta.
- [ ] Ottenere review del diff completo e approvazione esplicita prima del merge/deploy.
- [ ] Eseguire smoke test post-rilascio con account autorizzati e senza dati reali non necessari.

**Uscita:** evidenze archiviate per ogni gate, zero blocker critici/aperti e approvazione esplicita del rilascio.

## Registro delle evidenze

Per ogni test registrare: ID, commit, versione schema/funzione, ambiente, identità sintetica, precondizioni, azione, risultato atteso, risultato osservato, log/evidenza, esito (PASS/FAIL/BLOCKED), issue collegata e responsabile.

Un test non eseguito è **NOT RUN**, non PASS. Un controllo statico non sostituisce un test runtime. Il superamento della build da solo non certifica sicurezza, correttezza contabile o prontezza al lancio.
