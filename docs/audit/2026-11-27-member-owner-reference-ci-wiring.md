# Member owner-reference concurrency test: CI wiring and database safety

Date: 2026-11-27

## Finding

The PostgreSQL 17 rehearsal was invoked directly as a shell script from the workflow. The Node entry point already contained the disposable-database checks and generated fixture IDs, but CI bypassed it. The shell script itself had no `DATABASE_URL` allowlist and its cleanup trap deleted fixture rows by supplied IDs. Direct execution with a remote URL could therefore target a non-test database.

## Correction

- Route the workflow through `npm run test:member-owner-reference-concurrency`, which invokes the guarded Node entry point.
- Require the exact local CI DSN `postgresql://postgres:postgres@localhost:5432/bethag_clean_install_test` in both Node and shell entry points.
- Validate fixture UUIDs and numeric legacy IDs before SQL interpolation.
- Check every fixture identifier for pre-existing rows before installing the cleanup trap or writing data; abort on collisions.
- Add the PostgreSQL test contract and a static workflow-wiring regression to `npm test`.
- Keep the actual concurrent PostgreSQL rehearsal in the isolated PostgreSQL 17 job, after clean-install migrations.

## Safety

The rehearsal refuses remote, QA, Production, alternate-host, alternate-port, and alternate-database URLs. It only operates on the disposable local CI database. No QA or Production access or writes, no merge, and no deploy were performed.

## Verification

Exact-head Build and Baseline Safety results are required before closing this audit point.
