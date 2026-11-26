# Register activity legacy-ID collision — 26 November 2026

## Reproduced defect

The three Register actions that create an `activities` row used `legacy_id: Date.now()`. The baseline schema declares `UNIQUE (workspace_id, legacy_id)` as `activities_workspace_legacy_unique`. Two administrators creating an activity for the same workspace during the same millisecond can therefore submit the same legacy ID; the second insert is rejected with PostgreSQL `23505`.

This is not a data-corruption path, but it is a reproducible creation failure under concurrent same-millisecond requests. The open PR inventory contains no existing correction for this constraint/call-site combination.

## Correction

- Generate positive safe-integer IDs with 1,024 slots per millisecond and a monotonic per-tab floor.
- Keep the database uniqueness constraint authoritative across tabs/devices.
- Retry only PostgreSQL `23505` errors naming `activities_workspace_legacy_unique`, with a fresh ID, up to four attempts.
- Return all unrelated database errors unchanged; do not retry other unique constraints or network failures.
- Apply the helper to all three Register activity creation paths: work deadline, work activity, and register-item verification activity.

## Runtime regression

`scripts/test-register-activity-legacy-id.mjs` is wired into `npm test`. It reproduces the old same-millisecond identifier collision, verifies distinct monotonic IDs, simulates a cross-client unique collision and successful retry, verifies unrelated unique errors are not retried, and checks retry exhaustion.

## Limitations

The regression uses a deterministic Supabase insert mock. It does not write to QA or Production. The PostgreSQL unique constraint remains the final cross-client arbiter.

## Safety

- Isolated branch from main at `f524b9c7fc9d9cff59a3fea9c31ea85feeb2c427`.
- No schema or migration changes.
- No QA/Production access or writes.
- No merge, deployment, reset, backup/restore, or manual workflow dispatch.
