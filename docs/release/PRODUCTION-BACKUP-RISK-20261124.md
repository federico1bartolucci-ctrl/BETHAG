# BETHAG — evidenza backup Production e rischio residuo di ripristino

Data verifica: 2026-11-24  
Progetto Supabase: Production `tctcgptrsmvgajqjgnev`  
Branch documentale: `cap-consolidation-20261123`  
PR: #389 (Draft; non merged)

## 1. Evidenze osservate nel Dashboard Supabase

Durante la verifica guidata da dispositivo mobile, nella sezione **Database → Backups** del progetto BETHAG Production sono state osservate le seguenti informazioni:

- Scheduled backups: backup giornaliero del **24 novembre 2026 alle 03:09:56 UTC**, etichettato **PHYSICAL**.
- Nella stessa lista erano visibili anche backup fisici dei giorni precedenti.
- Nella scheda **Restore to new project**, il backup del 24 novembre 2026 alle 03:09:56 UTC risultava **COMPLETED** e presentava l'azione `Restore`.
- Il flusso informativo di restore specificava che la creazione sarebbe avvenuta sotto la stessa organizzazione e regione del progetto sorgente.

Queste evidenze attestano la presenza nel Dashboard di un backup fisico recente e il suo stato visualizzato `COMPLETED`. Non attestano che il ripristino sia stato effettivamente eseguito o che il database ripristinato sia stato validato.

## 2. Limiti dichiarati dal provider

La schermata di conferma del ripristino su nuovo progetto indicava come trasferiti:

- schema del database (tabelle, viste e procedure);
- dati e indici;
- ruoli, permessi e utenti del database.

Indicava invece come soggetti a riconfigurazione manuale:

- oggetti e impostazioni Storage;
- Edge Functions;
- impostazioni Auth e chiavi API;
- estensioni e impostazioni del database;
- read replicas.

La schermata Scheduled backups avvertiva inoltre che gli oggetti memorizzati tramite Storage API non sono inclusi nei backup del database. Il ripristino di un backup precedente non recupera gli oggetti Storage eliminati successivamente.

## 3. Point in Time Recovery

La scheda **Point in time** mostrava che Point in Time Recovery è disponibile come add-on e richiede l'attivazione del componente aggiuntivo.

Alla data della verifica, PITR non risultava attivo nella schermata consultata. Non è stata richiesta né effettuata l'attivazione e non è stato assunto alcun impegno di spesa.

Conseguenza: le evidenze raccolte documentano backup fisici programmati, ma non dimostrano la disponibilità di un recupero a un istante arbitrario tramite PITR.

## 4. Prova di ripristino: non eseguita

È stata aperta la schermata informativa relativa al ripristino del backup del 24 novembre 2026 su un nuovo progetto. La schermata descriveva la creazione di un progetto distinto e gli elementi trasferiti o da riconfigurare.

Per scelta del responsabile, non è stato premuto `Continue`: non è stato creato alcun progetto aggiuntivo e non è stata avviata alcuna operazione di restore. La scelta evita costi e risorse ulteriori in questa fase.

Pertanto:

- restore fisico su progetto isolato: **NOT RUN**;
- integrità e consistenza del database dopo restore: **NOT VERIFIED**;
- riconfigurazione e verifica di Storage, Auth, Edge Functions, chiavi API, estensioni e impostazioni: **NOT RUN**;
- prova end-to-end di ripristino dell'intera piattaforma BETHAG: **NOT RUN**.

Un precedente ripristino logico locale documentato nel runbook non sostituisce una prova di restore fisico del backup Supabase corrente.

## 5. Rischio residuo

Il backup fisico recente riduce il rischio di perdita totale dei dati del database, ma non elimina i seguenti rischi:

1. **Ripristinabilità non provata:** non è stato dimostrato che il backup selezionato possa essere ripristinato con successo e che il database risultante sia utilizzabile.
2. **Perimetro incompleto:** Storage e altri componenti elencati dal provider richiedono procedure separate di recupero o riconfigurazione.
3. **Perdita successiva del contenuto Storage:** il ripristino del database non recupera oggetti Storage cancellati dopo il backup.
4. **Granularità temporale:** PITR non risulta attivo; non è quindi documentata la possibilità di scegliere un istante arbitrario tra i backup programmati.
5. **Tempi e procedure di recupero:** non sono stati misurati RTO/RPO effettivi tramite una prova di restore.

## 6. Decisione e stato del gate

Decisione operativa registrata il 24 novembre 2026: **non sostenere in questa fase i costi e non creare un progetto temporaneo per la prova di restore**. Si conserva l'evidenza del backup fisico disponibile e si documenta esplicitamente il rischio residuo.

Questa decisione di non procedere con una prova a pagamento **non equivale, da sola, a un'accettazione formale del rischio per il rilascio**. L'accettazione formale deve essere confermata dal responsabile del rilascio, riferita allo specifico candidato (source SHA, execution SHA e fingerprint) e deve dichiarare di conoscere almeno i limiti indicati nelle sezioni 2–5.

Fino a tale conferma, il gate backup/restore o risk acceptance resta **OPEN** e Production resta **NO-GO**.

## 7. Operazioni non eseguite

Durante questa verifica non sono stati eseguiti:

- restore, creazione di un progetto Supabase o attivazione di add-on;
- modifiche a schema o dati Production;
- modifiche a QA;
- migrazioni, deploy o cutover;
- invii email.

La presente registrazione è documentale e non modifica manifest di migrazione, snapshot storici o configurazioni Supabase.
