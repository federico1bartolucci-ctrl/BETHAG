# SAL creation and payment atomicity audit — 26 November 2026

## Findings

- The Register page previously created SAL rows with a direct INSERT before validating the cumulative amount and before updating the parent work summary. A later validation or parent-update failure could leave a partial SAL record.
- Partial and full SAL payment flows wrote a ledger movement and then updated the SAL in a second request. Their compensating DELETE could itself fail, leaving an orphaned accounting movement.
- Client-side cumulative checks were based on a potentially stale list and could be bypassed by concurrent requests or direct table writes.
- A successful partial payment followed by a lost response could be retried as a second payment unless the request had a stable idempotency key.

## Correction

- Route SAL creation, partial payment and full payment through transactional PostgreSQL functions.
- Lock the parent work row before reading cumulative SAL totals; the trigger also locks the parent row and enforces the approved-amount cap for direct INSERT/UPDATE paths.
- Reject SAL rows whose workspace or condominium does not match the parent work, and reject attempts to move an existing SAL to another work.
- Keep ledger movement, SAL update and work-history event in one transaction.
- Add a workspace-scoped unique idempotency index for SAL payment events. Retries with the same payload/key return the original ledger movement; reusing a key for a different payload fails closed.
- Persist the partial-payment request key in session storage, bound to date, amount and notes; clear it only after the RPC succeeds. Full-payment requests use a stable per-SAL key.
- Use local calendar dates for SAL creation and payment defaults.

## Regression coverage

- PGlite runtime test reproduces the former partial-write flow, validates transactional payment creation/rollback, checks SAL creation caps, rejects direct over-budget inserts and cross-workspace SAL rows, and verifies retry idempotency for partial and full payments.
- PostgreSQL 17 workflow races two concurrent SAL creations against a €100 approved work with two €60 SALs. Exactly one may persist. It also checks the authenticated RPC grant and verifies the final total and work summary.
- Static contract tests verify the frontend uses RPCs, trigger locking/scope/cap checks, explicit ACLs, the unique idempotency index and the local-only database guard in the PostgreSQL workflow.

## Migration and environment status

- The migration is a proposed forward candidate under `supabase/rebuild/proposed-forward-migrations`.
- It has not been applied to QA or Production.
- No Supabase deployment, database reset, live Auth action or paid service activation was performed.
- Production promotion remains subject to the separate migration reconciliation and release gates.
