# BETHAG — registro consolidato dei blocchi e piano di uscita dal gate QA

**Branch:** `bethag-migration-repair`  
**Tipo:** documento operativo di recupero; non contiene SQL da eseguire.  
**Stato:** baseline non certificata; nessun replay runtime completato.

## Scopo

Raccogliere i blocchi ricorrenti emersi dalle revisioni statiche in un ordine di lavoro verificabile. Evitare correzioni isolate alle funzioni applicative finché non è dimostrabile che lo schema di partenza e l'ordine delle migrazioni siano riproducibili.

## Registro dei blocchi

| ID | Priorità | Blocco | Evidenza disponibile | Criterio di chiusura |
|---|---|---|---|---|
| G-01 | P0 | Baseline iniziale incompleta | La migrazione iniziale e la migrazione originale di hardening grants non sono state reperite nei percorsi GitHub verificati; il registro include 153 record e il branch 132 file | Recupero da fonte attendibile oppure decisione esplicita di baseline sostitutiva, distinta dalle migrazioni storiche |
| G-02 | P0 | Riconciliazione semantica incompleta | Le corrispondenze di prefisso versione sono insufficienti a dimostrare equivalenza; esistono nomi e timestamp divergenti | Ogni record produzione associato a file sorgente, sostituto semanticamente equivalente, oppure gap dichiarato con impatto |
| G-03 | P0 | Dipendenze core e ordine replay | Frammento portale presuppone workspace, profili, condomìni, membri e helper; migrazioni unità/millesimi precedono il file che ricrea la tabella base nel branch esaminato | Grafo oggetti completo e replay riuscito da database vuoto in ambiente isolato, con log delle dipendenze |
| G-04 | P0 | Grants, RLS e privilegi effettivi | Sono presenti revoche, policy e funzioni SECURITY DEFINER; gli snapshot policy non sono completi come artefatto verificabile | Inventario grants per ruolo/firma/overload e test runtime positivo/negativo per ruoli e workspace |
| G-05 | P1 | Integrità del ciclo trasferimento/subentro | CHECK di stato potenzialmente duplicati e discordanti; conferma/chiusura, snapshot contabile e accesso portale hanno semantiche differenti | Migrazione correttiva validata in QA; test idempotenza, unicità, chiusura e conservazione storico |
| G-06 | P1 | Coerenza contabile e riporti | Possibili divergenze tra saldo libro mastro e riporti basati sulle rate; compensazioni e rigenerazioni richiedono quadratura | Riconciliazione indipendente al centesimo, storni/compensazioni inclusi, con casi di esercizio |
| G-07 | P1 | Pagamenti, storni e concorrenza | Possibile variabile di ritorno sovrascritta; storno e aggiornamento allocazioni richiedono prove atomiche e concorrenti | Contratto RPC confermato e test parziali/totali, retry, concorrenza, rollback e audit |
| G-08 | P1 | Unità, pertinenze, proprietari e millesimi | Coerenza tra member.unit_id, riferimenti owner e valori per unità non certificata; vincoli e trigger su trasformazioni | Matrice unità autonome/pertinenze, comproprietà, fusione/scissione, subentro e riconciliazione millesimale superata |
| G-09 | P1 | Cancellazione, archiviazione e Storage | RPC di hard-delete elimina dati collegati; copertura file e retention non certificata | Separazione UI/API tra archiviazione e cancellazione, inventario FK/Storage, conferme e rollback provati |
| G-10 | P2 | Intake e registrazione portale | RPC sostituite in più migrazioni; matching identità e conferma intake presentano casi ambigui da provare | Test duplicati, mismatch email, comproprietari, più workspace, retry e audit |
| G-11 | P2 | Riparti da consumo e scope | Chiavi con date nullable, quote escluse, codici fabbricato legacy e arrotondamenti richiedono test | Test di dati incompleti/duplicati e quadratura al centesimo per scope all/unità/fabbricato |
| G-12 | P2 | Copertura test e prova di rilascio | I test SQL esistenti esaminati sono prevalentemente controlli catalogo; non attestano tutti i flussi utente | Suite automatizzata catalogo + ruoli reali simulati + workflow UI/API e report ripetibile |

## Sequenza vincolante

### Fase A — Congelare e rendere osservabile la baseline
1. Conservare `main` e Supabase produzione senza modifiche.
2. Congelare il commit di riferimento del branch di recupero e registrare SHA/branch.
3. Completare l'elenco dei 153 record della history produzione e dei 132 file disponibili: per ciascuno, annotare oggetti creati/modificati/eliminati, dipendenze, effetti sui dati e corrispondenza proposta.
4. Marcare distintamente: fonte esatta, equivalente semanticamente dimostrato, frammento, assente, duplicato, o non ancora analizzato.
5. Non ricostruire a intuito la migrazione iniziale o i grants mancanti. Richiedere eventuali archivi locali, export, artifact CI/deploy o backup versionati; se non esistono, preparare una proposta di baseline sostitutiva con approvazione separata.

**Uscita Fase A:** inventario completo con nessun file/record senza stato esplicito e nessuna equivalenza basata solo sul nome.

### Fase B — Grafo dipendenze e replay isolato
1. Derivare dipendenze su schema, estensioni, tabelle, colonne, constraint, indici, funzioni, trigger, RLS, grants, viste, Storage e configurazione esterna.
2. Identificare dipendenze circolari, oggetti assunti come preesistenti, operazioni data-changing e passaggi distruttivi.
3. Preparare un progetto/database QA usa-e-getta separato dalla produzione; definire prima proprietario, credenziali, backup e criteri di reset.
4. Eseguire replay solo dopo autorizzazione esplicita e baseline revisionata. Registrare il primo errore, migrazione, oggetto e dipendenza mancante; correggere la fonte nel branch e ripetere sullo stesso processo riproducibile, non sul database produzione.
5. Confrontare catalogo post-replay con gli snapshot produzione, distinguendo differenze intenzionali e regressioni.

**Uscita Fase B:** replay pulito riuscito e differenze catalogo spiegate; altrimenti il gate resta chiuso.

### Fase C — Collaudo di sicurezza e flussi
1. Costruire identità sintetiche per amministratore, collaboratore, residente, consigliere, utente anonimo e utenti di workspace/condomini distinti.
2. Testare grants + RLS + RPC, compresi overload, SECURITY DEFINER, storage.objects e accesso diretto API.
3. Testare registrazione/invito/mismatch, associazione di più persone a unità, subentro, trasferimento, fusione/scissione e archiviazione.
4. Testare rate, pagamenti, storni, riporti, compensazioni, chiusura esercizio, riparti e millesimi con quadratura indipendente.
5. Eseguire prove concorrenti e retry su pagamenti, trasferimenti, intake e generazione rate; verificare idempotenza e rollback.
6. Eseguire test UI/API end-to-end e regressione sui dispositivi supportati, inclusi i flussi segnalati su mobile.

**Uscita Fase C:** tutti i casi P0/P1 superati, nessun accesso cross-tenant, nessuna perdita/duplicazione contabile e report con evidenze ripetibili.

### Fase D — Preparazione rilascio
1. Revisione manuale delle migrazioni finali e della strategia di rollback/forward-fix.
2. Approvazione esplicita di Federico per merge e deploy.
3. Deploy controllato con backup e verifica post-rilascio, soltanto dopo gate A–C.
4. Monitoraggio errori, accessi, audit, performance e procedure di ripristino.

## Decisione attuale

**NO-GO per certificazione QA e lancio.** Non significa che tutte le funzioni siano difettose; significa che la baseline riproducibile e i test runtime non sono ancora dimostrati. Le revisioni statiche identificano rischi e test, ma non sostituiscono il replay né le prove applicative.

## Limiti e protezioni

Questo registro consolida documenti statici esistenti e non afferma che l'intera history sia già stata analizzata semanticamente. Nessun SQL è stato eseguito, nessun database QA è stato resettato, nessuna scrittura o migrazione è stata eseguita in produzione, nessuna modifica è stata fatta a `main`, e non sono stati eseguiti merge o deploy. Il replay QA, eventuali correzioni SQL e il rilascio richiedono autorizzazione e revisione specifiche.
