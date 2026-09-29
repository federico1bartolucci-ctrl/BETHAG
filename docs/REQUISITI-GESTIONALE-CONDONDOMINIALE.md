# BETHAG — Requisiti di pre-produzione per gestionale condominiale

Questo documento guida il collaudo funzionale del progetto e traduce gli obblighi tipici dell'amministrazione condominiale in requisiti software.

## Aree da non trascurare

### 1. Anagrafe condominiale e patrimonio
- Registro dei proprietari e dei titolari di diritti reali/personali di godimento.
- Dati catastali delle singole unità.
- Condizioni e documentazione di sicurezza.
- Storico delle variazioni di titolarità.
- Distinzione tra persona, unità immobiliare e rapporto di proprietà.
- Più proprietari sulla stessa unità.
- Garage/cantine autonome anche senza collegamento a un'abitazione.
- Pertinenze autonome collegate a un'abitazione.
- Pertinenze catastalmente incorporate.
- Proprietari esterni al condominio per unità autonome.
- Millesimi riferiti alle unità/tabelle e non usati come semplice dato anagrafico della persona.

### 2. Contabilità e rendiconto
BETHAG deve arrivare a gestire:
- esercizio contabile;
- registro cronologico di entrate e uscite;
- causale e categoria;
- conto corrente condominiale;
- preventivo;
- consuntivo;
- situazione patrimoniale;
- riepilogo finanziario;
- fondi e riserve;
- documenti giustificativi;
- ripartizione delle spese;
- rate e scadenze;
- pagamenti e saldi;
- morosità;
- riconciliazione bancaria;
- esportazione e stampa del rendiconto;
- collegamento tra movimento contabile e documento giustificativo.

Le scritture e i documenti giustificativi devono essere conservati secondo i termini previsti dalla normativa.

### 3. Riparti e tabelle millesimali
Il modello deve poter rappresentare:
- tabella proprietà generale;
- tabelle differenziate per servizio;
- criteri di riparto;
- percentuali/millesimi;
- esclusioni;
- quote personalizzate;
- conguagli;
- rate ordinarie e straordinarie;
- fondo speciale per lavori straordinari;
- stato di pagamento per singola unità/persona.

Non assumere che ogni spesa debba essere ripartita automaticamente con la stessa tabella.

### 4. Assemblee
Devono essere verificabili:
- ordine del giorno;
- convocazione;
- destinatari;
- modalità e data di convocazione;
- presenti, assenti e deleghe;
- quorum;
- votazioni;
- esiti;
- testo delle deliberazioni;
- verbale;
- allegati;
- invio del verbale;
- tracciamento delle attività conseguenti alla delibera.

### 5. Lavori e manutenzioni
Ogni intervento importante deve poter avere:
- descrizione;
- urgenza;
- tecnico;
- fornitore;
- preventivi comparati;
- delibera;
- contratto;
- fondo speciale;
- SAL/pagamenti;
- fatture;
- documentazione tecnica;
- certificazioni;
- scadenze di manutenzione;
- garanzie;
- chiusura lavori.

Per la manutenzione ordinaria e straordinaria devono essere distinti stato, autorizzazione e documentazione.

### 6. Fornitori e contratti
Per ogni fornitore:
- anagrafica;
- dati fiscali;
- contatti;
- contratto;
- durata;
- rinnovo;
- documentazione;
- assicurazioni/certificazioni ove pertinenti;
- scadenze;
- interventi;
- fatture;
- pagamenti.

### 7. Adempimenti fiscali
Serve uno scadenziario dedicato, distinto dalle semplici attività:
- adempimento;
- periodo fiscale;
- scadenza;
- importo;
- stato;
- documento;
- responsabile;
- prova dell'invio/pagamento.

### 8. Morosità
La morosità deve essere gestita come processo:
- importo dovuto;
- rate scadute;
- solleciti;
- comunicazioni;
- stato della pratica;
- eventuale legale;
- azioni giudiziali;
- pagamenti parziali;
- saldo;
- storico.

Non esporre dati di morosità in aree accessibili a soggetti non autorizzati.

### 9. Contenzioso
Per ogni lite:
- controparte;
- oggetto;
- legale;
- numero pratica/procedimento;
- date;
- stato;
- costi;
- documenti;
- scadenze;
- esito.

### 10. Sicurezza e impianti
Il sistema deve poter censire:
- impianto;
- ubicazione;
- responsabile/fornitore;
- ultima verifica;
- prossima verifica;
- certificazioni;
- manutenzioni;
- anomalie;
- documentazione tecnica;
- scadenze.

Particolare attenzione a ascensori, impianti elettrici, antincendio, termici, gas e altri impianti presenti.

### 11. Document management
Ogni documento deve poter essere:
- collegato a condominio;
- collegato a unità;
- collegato a persona;
- collegato a fornitore;
- collegato a spesa/lavoro/assemblea/scadenza;
- versionato;
- classificato;
- con stato di pubblicazione;
- con permessi di accesso;
- ricercabile.

### 12. Privacy e sicurezza
BETHAG deve applicare il principio di minimizzazione:
- raccogliere solo dati necessari;
- separare dati amministrativi da dati pubblicabili;
- profilare gli accessi;
- impedire la divulgazione accidentale di morosità e dati personali;
- proteggere documenti e verbali;
- mantenere traccia degli accessi alle funzioni sensibili;
- predisporre gestione di informative, conservazione e richieste degli interessati.

### 13. Portale condomini
Il portale non deve essere una copia dell'area amministratore.
Deve rispettare:
- ruolo;
- unità;
- permessi;
- documenti effettivamente pubblicati;
- comunicazioni individuali;
- comunicazioni collettive;
- richieste/segnalazioni;
- pagamenti e situazione personale;
- assemblee e verbali.

### 14. Audit e affidabilità
Ogni operazione critica deve essere verificabile:
- chi ha creato;
- chi ha modificato;
- quando;
- cosa è cambiato;
- chi ha cancellato;
- perché;
- eventuale ripristino.

Le cancellazioni definitive devono essere protette da conferma e, per i dati contabili/documentali, valutate preferibilmente come archiviazione anziché eliminazione.

## Stato del collaudo

- [x] Persistenza condòmini su Supabase
- [x] Più condòmini sulla stessa unità
- [x] Unità immobiliari separate dai soggetti
- [x] Garage/cantine autonome
- [x] Pertinenze autonome senza collegamento
- [x] Proprietari esterni di unità autonome
- [x] Più proprietari della stessa unità
- [x] Protezione delle unità dalla sovrascrittura della sincronizzazione
- [x] Schema iniziale backend per contabilità, fondi, riparti, fiscalità e contenzioso
- [ ] Registro di contabilità completo nell'interfaccia
- [ ] Preventivo/consuntivo e rendiconto
- [ ] Tabelle millesimali e motore di riparto
- [ ] Rate e morosità
- [ ] Fondi speciali e SAL
- [ ] Registro anagrafe e sicurezza completo
- [ ] Scadenziario fiscale dedicato
- [ ] Gestione lavori/manutenzioni completa
- [ ] Contenzioso
- [ ] Audit log
- [ ] Backup/ripristino operativo
- [ ] Collaudo completo dei permessi del portale

## Riferimenti di lavoro

- Codice civile, artt. 1129, 1130, 1130-bis e 1135.
- Legge 11 dicembre 2012, n. 220.
- Provvedimenti e indicazioni del Garante per la protezione dei dati personali in materia condominiale.
- Manualistica professionale per amministratori e guide operative sulla gestione, contabilità, impianti, fiscalità e lavori condominiali.

Il documento non sostituisce una verifica legale/fiscale professionale e deve essere aggiornato quando cambiano norme, prassi o interpretazioni.
