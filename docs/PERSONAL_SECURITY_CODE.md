# Codice personale di sicurezza

## Regole server-side

Il codice personale è una protezione aggiuntiva per operazioni sensibili. Le regole sono applicate nel database, non soltanto nell'interfaccia.

- Il primo codice può essere impostato con `set_personal_security_code` soltanto quando la protezione è disattivata.
- Se un codice è già attivo, il vecchio setter non può sostituirlo né disattivarlo.
- Cambio e disattivazione richiedono il codice corrente tramite `change_personal_security_code`.
- Verifica, cambio e disattivazione serializzano le operazioni sulla riga dell'utente con `SELECT ... FOR UPDATE`.
- Cinque tentativi errati bloccano le verifiche per 15 minuti.
- Durante il blocco anche il codice corretto viene respinto; alla scadenza il contatore riparte da zero e si apre una nuova finestra di cinque tentativi.
- Un cambio riuscito azzera sempre il contatore e il blocco.
- I codici restano memorizzati come hash pgcrypto; il codice in chiaro non viene persistito.

Per i nuovi codici il limite è di 6–32 caratteri e massimo 72 byte, coerente con bcrypt. I codici legacy già memorizzati continuano a essere verificati con la semantica di troncamento bcrypt preesistente, così la migrazione non blocca codici Unicode già configurati. La migrazione è forward-only in `supabase/rebuild/proposed-forward-migrations/`; non modifica la catena canonica storica.

## Verifica

La regressione `scripts/test-personal-security-code-lockout.mjs` usa PGlite e un sostituto deterministico di pgcrypto per testare il flusso di stato, il lockout, il cambio atomico, i permessi RPC e il collegamento dell'interfaccia. La prova aggiuntiva `scripts/test-personal-security-code-lockout-postgres.sh` applica la migrazione a un database PostgreSQL 17 isolato con pgcrypto reale e verifica hash bcrypt, tentativi concorrenti, lockout, cambio/disattivazione atomici e limiti UTF-8 di 72 byte. Nessuna delle due prove sostituisce il collaudo autenticato sul progetto Supabase QA.
