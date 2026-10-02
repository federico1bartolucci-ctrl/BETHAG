# BETHAG — Ulteriore verifica del baseline e delle fonti disponibili
**Data:** 2026-10-01  
**Ambito:** sola lettura di GitHub e ricerca semantica nella Library ChatGPT.

## Verifiche eseguite
- Confrontati i branch `main`, `backup/pre-rollback-20261001` e `bethag-migration-repair`.
- Consultati i contenuti di alcune migrazioni fondative presenti e i documenti di riconciliazione già nel branch di recupero.
- Eseguita ricerca nella Library per le due migrazioni mancanti e per un'esportazione dello schema Supabase.

## Evidenze
1. La directory migrazioni contiene 121 file in `main`, 129 in `backup/pre-rollback-20261001` e 132 in `bethag-migration-repair`.
2. Il confronto GitHub indica che il backup è avanti rispetto a `main` di 22 commit e non risulta indietro; il branch di riparazione e il backup sono divergenti (96 commit avanti e 14 indietro nel confronto richiesto). Il solo grafo commit non certifica quale insieme SQL sia corretto.
3. Nel backup e in `main` la sequenza visibile parte da `20260928060000_expose_first_admin_bootstrap.sql`; il branch di riparazione aggiunge `20260928050000_reconstruct_portal_access_registry.sql`, che dichiara espressamente di essere un frammento ricostruito, non il baseline completo.
4. Le migrazioni successive dipendono da workspace, condomini, membri, profili e helper preesistenti. Pertanto, la directory non è dimostrata autonoma per un replay da database vuoto.
5. La ricerca nella Library ha restituito versioni archiviate del frontend `main.tsx`, ma non ha individuato copie SQL delle due migrazioni mancanti o un'esportazione autorevole dello schema. L'esito della ricerca non esclude file non indicizzati o archivi esterni.

## Decisione tecnica per la fase corrente
Non costruire una falsa equivalenza rinominando migrazioni candidate né applicare l'intera directory su un progetto esistente. Mantenere le migrazioni originali mancanti come **fonte non recuperata**. Il prossimo lavoro consentito è completare una matrice di oggetti e dipendenze a partire dagli snapshot di catalogo già raccolti, con etichetta di provenienza per ogni oggetto; poi definire un baseline nuovo e isolato solo quando sia disponibile un ambiente di prova autorizzato.

## Gate per riprendere il replay
- [ ] Fonte SQL iniziale originale recuperata, oppure baseline ricostruito separato con assunzioni esplicite.
- [ ] Migrazione originale di restrizione dei grant recuperata, oppure nuova soluzione di privilegi progettata e revisionata separatamente.
- [ ] Dipendenze e ordine di creazione risolti, inclusa la tabella `condominium_units`.
- [ ] Test su database vuoto isolato con esito riproducibile.
- [ ] Test RLS runtime per ruoli e tenant distinti.
- [ ] Test di trasferimento, revoca accesso, trasformazione unità e continuità contabile.

## Salvaguardie
Questa ricognizione non ha eseguito SQL e non ha modificato schema, dati, grant o cronologia Supabase. Nessun reset, merge o deploy è stato effettuato. Il PR di riparazione resta separato da `main`.
