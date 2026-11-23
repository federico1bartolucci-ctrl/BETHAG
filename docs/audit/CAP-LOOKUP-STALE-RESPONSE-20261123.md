# CAP lookup stale-response audit — 2026-11-23

## Finding
The global CAP auto-lookup is asynchronous. A delayed response could overwrite Comune or Provincia after the CAP had changed, or overwrite values the user had edited manually while the lookup was in flight.

## Correction
- Track lookup sequence per input and reject stale responses.
- Require the CAP input to remain connected and retain the requested CAP.
- Preserve Comune/Provincia values that changed since the request began.
- Reject detached inputs and no-op for non-OK or empty responses.
- Keep CAP numeric input mode without forcing decimal mode.

## Regression coverage
`scripts/test-cap-lookup-stale-response.mjs` exercises stale requests, current responses, manual edits, detached inputs, non-OK responses, and empty-place responses using the production helper.

## Verification
The PR's GitHub Actions build run #4248 completed successfully. Its `npm test` step (“Test fresh PostgreSQL bootstrap”) passed; `package.json` includes the CAP regression test in the `test` script. Baseline safety checks also passed. Authenticated APP-01..APP-15 QA was skipped and is not claimed.

## Scope
Isolated branch and draft PR only. No QA/Production database writes, deployment, or merge performed.
