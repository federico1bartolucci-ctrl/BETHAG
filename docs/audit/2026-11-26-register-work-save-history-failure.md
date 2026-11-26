# Register work-save history failure — 26 November 2026

## Reproduced defect

`saveWork()` persisted a new `condominium_works` row and then awaited `logWorkEvent()`. If the history insert failed, control entered the catch block before `setShowWorkForm(false)` ran. The database row remained committed while the form stayed open and the UI reported a generic save failure. Retrying the form could insert a second work row.

This is distinct from open PR #368, which addresses the separate close-work status/history ordering in `closeWork()`.

## Correction

- Treat the work row write as the primary persistence operation.
- Attempt the history write through `recordWorkHistoryAfterSave()` only after persistence succeeds.
- Convert a history-write exception into an explicit partial-success warning.
- Close the work form after the primary row is persisted, even when history recording fails.
- Keep the audit write after the form is closed; if it fails, report that the work was already saved and must not be resubmitted.
- Do not automatically retry or compensate by deleting a work row after a post-commit history failure.

## Runtime regression

`scripts/test-register-work-save-history.mjs` is wired into `npm test`. It exercises successful and failed history writes, one-attempt semantics, persistence-before-history ordering, form closure before the audit write, and the explicit no-resubmit warning.

## Limitations

The regression exercises the extracted post-save failure boundary and verifies the component wiring. It does not call a live Supabase backend. The history/audit records remain separately persisted; a failed history write is reported to the user rather than silently treated as complete.

## Safety

- Isolated branch from main at `f524b9c7fc9d9cff59a3fea9c31ea85feeb2c427`.
- No schema or migration changes.
- No QA/Production access or writes.
- No merge, deployment, reset, backup/restore, or manual workflow dispatch.
