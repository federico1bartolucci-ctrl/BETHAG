# BETHAG — Differenze strutturali delle tabelle comuni

**Rilevazione:** 1 ottobre 2026. **Ambito:** sola lettura dei metadati verbose Supabase di Production e `bethag-develop`. Nessuna modifica ai database.

## Esito

Il confronto comprende le 20 tabelle pubbliche presenti in entrambi gli ambienti. Le colonne differiscono in sei tabelle; le FK osservabili differiscono in una tabella. Tutte le tabelle comuni hanno RLS abilitata in entrambi gli ambienti e conservano le stesse chiavi primarie, secondo i metadati restituiti.

## Differenze rilevate

| Tabella | Production | bethag-develop |
|---|---|---|
| `communications` | `email_status` include un vincolo CHECK che ammette solo gli stati previsti (inclusi `prepared`, `no_recipients`, `In elaborazione`, `Inviata`, `Parzialmente inviata`, `Errore`, `Consegnata`) o NULL. | La colonna esiste, ma il CHECK non risulta presente. |
| `condominium_creation_intakes` | Colonna nullable `created_condominium_id uuid` e FK verso `condominiums(id)`. | Colonna e FK assenti. |
| `condominium_insurance_policies` | `premium` e `deductible` hanno default 0 e CHECK per valori non negativi. | Colonne e default presenti, CHECK non rilevati. |
| `condominium_requests` | `title` ha CHECK che impedisce stringhe vuote/spazi; `status` ha CHECK sull'insieme degli stati ammessi. | Colonne presenti con default dello status, ma i due CHECK non risultano presenti. |
| `condominiums` | FK `archived_by` verso `profiles(id)`. | La FK non risulta presente. La colonna è presente. |
| `documents` | Colonna nullable `file_size_bytes bigint` con CHECK per valori non negativi. | Colonna assente. |

## Implicazioni

- I vincoli mancanti in sviluppo consentono valori che Production rifiuta: gli esiti di test in sviluppo potrebbero quindi non rappresentare il comportamento effettivo di Production.
- La colonna `created_condominium_id` assente in sviluppo può interrompere il flusso di conferma/importazione della creazione del condominio se il codice o una funzione la utilizza.
- `documents.file_size_bytes` è una differenza di schema concreta da risolvere o spiegare prima di considerare gli ambienti equivalenti.
- Le FK mostrate sono quelle esposte dal riepilogo verbose; non costituiscono un inventario di indici, trigger, funzioni, grants o di ogni tipo di constraint.

## Prossimi controlli

1. Risalire ai file di migrazione che dovrebbero introdurre ciascuna differenza e verificare che siano versionati una sola volta e nell'ordine corretto.
2. Preparare una migrazione correttiva esclusivamente per l'ambiente di sviluppo, dopo aver controllato i dati eventualmente presenti e la compatibilità con le funzioni dipendenti.
3. Verificare il risultato rileggendo i metadati e svolgendo test mirati sui flussi di creazione condominio, comunicazioni, richieste, polizze e documenti.
4. Non applicare automaticamente queste correzioni a Production: l'obiettivo immediato è rendere riproducibile e testabile lo schema di sviluppo.

## Limiti

Il confronto fotografa i metadati esposti dal servizio al momento della rilevazione. Non dimostra l'equivalenza completa degli ambienti e non è un test runtime dell'applicazione.