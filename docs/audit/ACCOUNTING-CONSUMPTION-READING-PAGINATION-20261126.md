# Audit — paginazione delle rilevazioni di consumo in Contabilità

Data: 26 novembre 2026

## Difetto riprodotto

`AccountingPage.load()` caricava `condominium_consumption_readings` con una singola richiesta PostgREST, filtrata soltanto per workspace e ordinata per `period_end`. Il limite REST (comunemente 1.000 righe) poteva troncare il risultato.

Il problema aveva un effetto funzionale ulteriore: prima di chiamare `generate_consumption_allocations`, la pagina verifica lato client che esistano rilevazioni per condominio, esercizio e servizio selezionati. Se l'unica rilevazione pertinente si trova oltre le prime 1.000 righe — ad esempio perché il workspace contiene letture più recenti di altri condomìni — il controllo restituisce falsamente "Non ci sono dati di consumo" e impedisce di generare il riparto.

La stessa risposta incompleta riduceva il numero e l'elenco delle rilevazioni mostrati nella pagina.

## Correzione

- Aggiunto `loadConsumptionReadings()` con pagine da 500 righe.
- Ordinamento stabile `period_end DESC NULLS LAST, id DESC`.
- Continuazione keyset sul binomio data/UUID; nessun offset crescente.
- Gestione esplicita dei periodi NULL.
- Conteggio esatto del set residuo su ogni pagina e controllo finale del totale.
- Interruzione fail-closed per conteggi mancanti o variati, pagine corte/incomplete, errori, ID duplicati, righe fuori workspace, date non valide o cursori non progressivi.
- `AccountingPage.load()` usa il loader prima del controllo client-side che verifica la presenza di letture per il riparto.

Nessuna modifica a schema o migrazioni.

## Regressione runtime

`scripts/test-accounting-consumption-reading-pagination.mjs` è collegato a `npm test`.

Il test:
- riproduce 1.000 righe più recenti di altri condomìni e una lettura pertinente alla riga 1.001;
- dimostra che la vecchia richiesta singola non vede la lettura pertinente;
- verifica il recupero completo con paginazione keyset;
- copre date duplicate, `period_end NULL`, isolamento workspace, limite server inferiore al richiesto, variazioni concorrenti del conteggio, duplicati ed errori di pagina;
- verifica il collegamento effettivo del loader in `AccountingPage`.

## Sicurezza e limiti

Intervento esclusivamente su branch isolato. Nessuna lettura o scrittura degli ambienti Supabase QA/Production, nessun accesso a dati reali, nessun merge, deploy, reset o dispatch manuale.

La regressione usa un client PostgREST simulato; la CI sullo SHA esatto deve certificare l'esecuzione runtime e il build. La paginazione non fornisce uno snapshot transazionale multi-richiesta: se il set cambia durante il caricamento e la variazione è rilevabile dai conteggi, l'operazione si interrompe invece di restituire un elenco parziale.
