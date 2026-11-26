# Codice personale di sicurezza

## Regole server-side

Il codice personale è una protezione aggiuntiva per operazioni sensibili. Le regole sono applicate nel database, non soltanto nell'interfaccia.

- Il primo codice può essere impostato con \`set_personal_security_code\` soltanto quando la protezione è disattivata.
- Se un codice è già attivo, il vecchio setter non può sostituirlo né disattivarlo.
- Cambio e disattivazione richiedono il codice corrente tramite \`change_personal_security_code\`.
- Verifica, cambio e disattivazione serializzano le operazioni sulla riga dell'utente con \`SELECT ... FOR UPDATE\`.
- Cinque tentativi errati bloccano le verifiche per 15 minuti.
- Durante il blocco anche il codice corretto viene respinto; dopo la scadenza un tentativo corretto azzera il contatore.
- Un cambio riuscito azzera sempre il contatore e il blocco.
- I codici restano memorizzati come hash pgcrypto; il codice in chiaro non viene persistito.

Il limite è di 6–32 caratteri e massimo 72 byte, coerente con il limite di input di bcrypt. La migrazione è forward-only in \`supabase/rebuild/proposed-forward-migrations/\`; non modifica la catena canonica storica.

## Verifica

La regressione \`scripts/test-personal-security-code-lockout.mjs\` usa PGlite e un sostituto deterministico di pgcrypto per testare il flusso di stato, il lockout, il cambio atomico, i permessi RPC e il collegamento dell'interfaccia. Non certifica l'implementazione bcrypt di produzione né sostituisce una prova autenticata Supabase.
