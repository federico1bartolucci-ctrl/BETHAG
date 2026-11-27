# Accounting edit zero-row and condominium-scope guard

Date: 2026-11-27

Five Accounting edit handlers could report success after a PostgREST UPDATE matched zero rows. Their predicates also omitted the current condominium, allowing stale forms to target another condominium in the same workspace.

Correction: require the updated row ID through `select("id").maybeSingle()`; fail closed on zero-row/malformed results; preserve DB errors and separate INSERT paths; add condominium scope to all five UPDATEs. Ledger edits remain under #641 and budget edits under #592. Allocation-intake confirmation remains a separate flow.

Regression: `scripts/test-accounting-edit-zero-row-guards.mjs` tests success, zero-row, malformed and DB-error responses, plus handler scope and form-close ordering. Included in `npm test`.

Rebased on current main `a87cb50928f296a2848ce289b2cf0645c5ee98f4`. No SQL migrations, QA/Production access or writes, resets, Supabase deployment, or paid services.
