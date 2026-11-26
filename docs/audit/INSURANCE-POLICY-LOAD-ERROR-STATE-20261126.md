# Insurance policy load errors and stale-scope visibility — 2026-11-26

## Finding

The active inline insurance-policy component logged load failures only to the browser console. Users could see an empty-state message instead of an actionable error. A refresh failure could also leave older policy rows visible. The standalone component had an error banner, but could retain stale rows after a same-condominium refresh failed.

## Correction

- Track the condominium scope associated with displayed policy rows.
- Hide rows and derived counts unless their scope matches the current condominium.
- On a current load failure, clear the rows, bind the error to the current condominium and show it in the UI.
- Ignore stale failures from superseded requests.
- Convert missing service/workspace/condominium context and malformed responses into explicit load errors.
- Apply the same visibility and failure behavior to the active inline component and standalone component.

## Verification

- Add deterministic helper tests for current and stale failures, stale-row visibility and fallback error text.
- Verify both components use the shared load-state helpers and npm test includes the regression.
- CI Build, PostgreSQL 17 bootstrap and Baseline Safety must pass on the exact PR head before merge.

## Safety

No QA or Production database access/writes, migrations, resets, Supabase deployment or paid service activation.
