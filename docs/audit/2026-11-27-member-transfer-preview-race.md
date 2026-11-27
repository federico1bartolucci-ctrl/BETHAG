# Member-transfer preview race guard — 2026-11-27

## Finding

Concurrent preview RPCs could resolve out of order. A slower response for an earlier unit/member/date selection could overwrite the preview for the current selection. The previous freshness check also omitted transfer scope and the ownership share, allowing a preview calculated for a different transfer mode to appear current.

## Correction

- Assign every preview request a monotonically increasing generation; invalidate pending generations whenever workspace/condominium context or a preview-defining input changes.
- Ignore stale responses before aggregation, error publication, preview state commit, and busy-state cleanup.
- Capture transfer scope and ownership share at request start rather than reading potentially changed React state after asynchronous work.
- Store the captured scope/share in the preview fingerprint and require the complete fingerprint before opening or confirming the transfer.
- Pass the intended scope explicitly for the whole-property quick action, and refresh the untouched local-calendar transfer date before calculating its preview.

## Regression coverage

- Runtime tests cover request generation/invalidation and freshness across unit, outgoing member, transfer date, transfer scope, and ownership share.
- Existing local-date tests continue to verify Europe/Rome midnight/DST behavior, manual-date preservation, and final confirmation freshness.
- Tests are wired into the npm test chain.

## Safety

Frontend-only correction and local regression tests. No database schema/migrations, QA or Production writes, Supabase deployment, reset, or paid service activation.
