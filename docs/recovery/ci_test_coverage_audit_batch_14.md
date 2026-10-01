# BETHAG — audit pipeline CI e copertura test — batch 14

**Branch:** `bethag-migration-repair`  
**Tipo:** revisione statica di `package.json`, workflow GitHub Actions e test SQL.  
**Nessun comando di build o test è stato eseguito in questo audit. Nessuna modifica a produzione.**

## Evidenze dal repository

### Script applicativi

Il `package.json` espone gli script `dev`, `build` e `preview`. Non risultano script `test`, `lint` o `typecheck`; le dipendenze di sviluppo sono vuote. Di conseguenza, la pipeline attuale non definisce un comando standard per test unitari, test di componenti, linting o controllo TypeScript autonomo.

### GitHub Actions

Sono presenti tre workflow:

- `.github/workflows/build.yml`: installa le dipendenze con `npm install` ed esegue `npm run build` su push a `main` e pull request.
- `.github/workflows/main.yml`: esegue nuovamente installazione e build su push a `main` e `workflow_dispatch`.
- `.github/workflows/deploy.yml`: su push a `main` o avvio manuale, installa dipendenze, costruisce e pubblica su GitHub Pages.

I workflow `build.yml` e `main.yml` hanno finalità in parte duplicate. La build e il deploy sono separati in workflow, ma la configurazione letta non definisce un gate esplicito che imponga il superamento dei test funzionali/RLS prima della pubblicazione. La protezione effettiva del branch e le regole di required checks non sono state verificate in questo controllo.

### Test SQL

È presente `supabase/tests/rls_policies.test.sql`, basato su pgTAP e con `plan(20)`. Le asserzioni controllano soprattutto proprietà del catalogo: privilegi EXECUTE, presenza di RLS, nomi e forme di policy, funzioni helper e alcuni indici.

Il file non crea identità sintetiche né esegue flussi applicativi sotto ruoli diversi. Non costituisce quindi, da solo, un test runtime completo di isolamento tra workspace/condomini, registrazione, subentro, trasformazioni, pagamenti, storni o concorrenza. Non è stato eseguito; non si afferma che il piano pgTAP passi sull'ambiente target.

## Azioni richieste prima della certificazione

1. Rendere riproducibile l'installazione delle dipendenze (lockfile e uso coerente di `npm ci`, dopo aver verificato la compatibilità del progetto).
2. Aggiungere un controllo TypeScript esplicito e lint, con configurazione e soglie definite.
3. Aggiungere test unitari/componenti per i percorsi critici e test di integrazione con Supabase in ambiente usa-e-getta.
4. Separare i test di catalogo pgTAP dai test runtime con identità e ruoli reali/sintetici; coprire almeno admin, collaboratore, condomino, consiglio, tenant e utenti non associati.
5. Aggiungere casi end-to-end per registrazione e approvazione, creazione/archiviazione, co-intestatari, subentro e continuità contabile, fusioni/frazionamenti, millesimi, pagamenti parziali, storni, carryover, idempotenza e concorrenza.
6. Stabilire required checks e una regola di pubblicazione che blocchi il deploy se build, controlli statici o suite QA obbligatorie falliscono.
7. Verificare i workflow e le branch protection reali prima di modificare la pipeline; non effettuare deploy nell'ambito di questo audit.

## Esito

- **Build CI configurata:** sì, dal file workflow; esito reale non verificato in questo controllo.
- **Test automatici applicativi definiti negli script:** non risultano nel `package.json`.
- **Test pgTAP:** presenti, orientati prevalentemente al catalogo; esecuzione non verificata.
- **Test runtime RLS e workflow:** non certificati.
- **Gate CI obbligatorio prima del deploy:** non dimostrato dalla configurazione ispezionata.
- **QA baseline e lancio:** ancora bloccati dai prerequisiti di ricostruzione/replay già registrati.

Questa nota documenta esclusivamente la configurazione statica osservata; non modifica codice, pipeline, database o ambiente di produzione.
