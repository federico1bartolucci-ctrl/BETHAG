# BETHAG — addendum finestra di manutenzione

**Data registrazione:** 2026-11-06  
**PR:** #57 — branch `fix/qa-view-acl-parity-20261105`  
**Stato:** finestra obiettivo concordata; cutover NON autorizzato.

## Finestra concordata

- **Domenica 15 novembre 2026**
- **Dalle 02:00 alle 04:00**
- **Fuso:** `Europe/Rome`
- Corrisponde alla notte tra sabato 14 e domenica 15 novembre.

La finestra è stata scelta dal proprietario del progetto per ridurre l'impatto sugli amministratori. La registrazione nel piano non equivale a prenotazione presso Supabase, attivazione del freeze, invio dell'avviso o autorizzazione all'esecuzione.

Le ore 04:00 costituiscono un limite temporale pianificato, non una garanzia di riapertura. Se un controllo preflight, una migrazione, un postflight o uno smoke test non termina con PASS, si applicano i criteri STOP del runbook; non si forza la riapertura per rispettare l'orario.

## Attività consentite prima della finestra

- Preparare l'avviso agli amministratori, lasciandolo in bozza.
- Verificare il backup corrente e registrarne timestamp, identificativo e disponibilità.
- Riconfermare esplicitamente il rischio residuo: il restore logico locale è stato verificato, mentre il restore fisico provider-managed non è stato testato.
- Verificare contatti di escalation e recovery.
- Fissare il commit completo finale e riconfermare gli hash dei 19 payload SQL.
- Eseguire CI e preflight Production esclusivamente read-only sullo SHA finale.
- Predisporre checklist e comandi locali senza eseguirli in modalità apply.

## Gate che restano chiusi

Fino all'approvazione finale esplicita del proprietario, riferita allo SHA completo, ai 19 hash SQL, al backup/rischio residuo, alla finestra e ai criteri STOP:

- nessun merge della PR #57;
- nessun deploy;
- nessuna migrazione o scrittura sul database Production;
- nessun freeze operativo;
- nessun avviso agli amministratori inviato.

## Ruoli

- ChatGPT: supporto tecnico, preparazione e verifica; non è operatore umano.
- Federico Bartolucci: operatore umano locale e approvatore/proprietario.
- Operatore e approvatore coincidono per scelta esplicita del proprietario; questa configurazione non costituisce revisione indipendente a quattro occhi.

## Stato

**Finestra concordata come obiettivo: SÌ.**  
**Avviso approvato/inviato: NO.**  
**Freeze attivato: NO.**  
**Approvazione finale del cutover: NO.**  
**Production: NO-GO.**
