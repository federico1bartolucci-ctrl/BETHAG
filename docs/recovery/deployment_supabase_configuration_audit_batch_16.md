# BETHAG — deployment e configurazione Supabase — batch 16

**Branch esaminato:** `bethag-migration-repair`  
**Ambito:** lettura di `package.json`, workflow GitHub Actions e contenuto della directory `supabase`.  
**Tipo:** audit statico del repository; nessuna esecuzione, deploy o modifica a Supabase.

## Riscontri

1. `package.json` espone solo `dev`, `build` e `preview`. Non sono dichiarati script dedicati a test, lint o typecheck e `devDependencies` è vuoto. La build non sostituisce test di comportamento, controllo tipi indipendente o lint.
2. `.github/workflows/build.yml` e `.github/workflows/main.yml` eseguono entrambi installazione dipendenze e `npm run build` su eventi che includono push a `main`; il primo si attiva anche su pull request. Sono quindi workflow di build sovrapposti, con possibili esecuzioni duplicate e senza gate QA applicativo.
3. `.github/workflows/deploy.yml` costruisce `dist` e lo pubblica su GitHub Pages a ogni push su `main` o dispatch manuale. Il file non contiene un passaggio esplicito che richieda test applicativi, replay DB o approvazione di release prima della pubblicazione.
4. Nel percorso `supabase/` presente sul branch sono visibili `functions/`, `migrations/` e `tests/`; il file `supabase/config.toml` non è presente al percorso standard verificato. Di conseguenza non è stato possibile certificare da questo file la configurazione locale delle funzioni, incluse le opzioni `verify_jwt`. La configurazione effettiva distribuita non è stata interrogata né modificata.
5. L'assenza di configurazione nel percorso standard non prova che non esistano impostazioni gestite nella dashboard o in altri ambienti; segnala soltanto che il repository non fornisce qui una fonte versionata da confrontare.

## Gate consigliati prima del rilascio

- Introdurre script espliciti e ripetibili per typecheck, lint e test unitari/integrati, scegliendo versioni Node e lockfile riproducibili.
- Unificare o differenziare chiaramente i workflow build per evitare doppioni; rendere obbligatori i controlli applicativi sul PR prima del merge.
- Separare build, test e deploy; il deploy deve dipendere dal completamento dei controlli richiesti e da un'approvazione di release.
- Ripristinare/definire una configurazione Supabase versionata e confrontarla con le impostazioni effettive, senza applicare modifiche in produzione.
- Aggiungere un workflow QA DB esclusivamente su progetto Supabase usa-e-getta, dopo aver ricostruito e riconciliato la baseline; mai eseguire reset o replay sul progetto produttivo.
- Per le Edge Functions, verificare configurazione JWT, segreti, autorizzazioni effettive, log e casi di errore nell'ambiente isolato.

## Decisione

Il repository offre una build automatizzata, ma i workflow esaminati non dimostrano una pipeline di collaudo completa né un gate che impedisca il deploy quando test e baseline database non sono certificati. La configurazione effettiva delle funzioni resta non verificata. **Nessun workflow è stato lanciato, nessun deploy è stato effettuato e la produzione è rimasta intatta.** La baseline QA e il lancio restano non certificati.
