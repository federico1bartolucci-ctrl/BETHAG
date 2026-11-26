# Register work closure state guard — 26 November 2026

## Finding

The Register rendered the `Chiudi lavoro` action whenever `status !== "Completato"`. The work editor explicitly supports `Annullato`, so an annulled intervention still displayed the closure action. The handler had no independent state guard and could overwrite `Annullato` with `Completato`.

The closure update also did not request a returned row. PostgREST can return no error when a conditional update affects zero rows. If the work became cancelled, completed, or inaccessible after the client loaded it, the old handler could continue as if closure had succeeded and attempt to write a closure event.

## Correction

- Define the closable states explicitly: `Da programmare`, `Approvato`, `In corso`, and `Sospeso`.
- Hide the UI action and reject the handler for `Annullato`, `Completato`, or unknown statuses.
- Insert the closure history event and retain its returned ID.
- Update only the same work, workspace and condominium, and only while its database status is in the closable-state allowlist.
- Require a returned work ID from the conditional update.
- If the update fails or affects zero rows, delete the newly inserted history event and require a returned event ID to confirm rollback.
- Report rollback failure explicitly rather than claiming that closure was completed.

## Runtime regression

`scripts/test-work-closure-state-guard.mjs` uses PGlite to reproduce the old cancelled-work transition and the zero-row update case. It verifies that the cancelled status remains unchanged, the speculative history event is removed, an active work closes successfully, and update/rollback failures do not produce a false success. The test is wired into `npm test`.

## Safety

- Isolated branch based on current main `ecd5ee0d44fa59bfae22630bc969742acbb0bac0`.
- No schema or migration changes.
- No QA or Production access or writes.
- No merge, deployment, reset, backup/restore, or manual workflow dispatch.
