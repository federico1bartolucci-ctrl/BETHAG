# SAL progress percentage remains database-trigger owned

## Finding

The active `RegisterPage.saveProgress()` inserted a new SAL row, then summed every existing SAL `percentage` with the new percentage and wrote that sum to `condominium_works.progress_percent`.

That conflicts with the canonical database trigger `public.sync_condominium_work_financial_summary()`, which sets `progress_percent` to the percentage of the latest SAL ordered by `progress_date DESC, progress_no DESC, created_at DESC`. The backend `saveCondominiumWorkProgress()` also treats SAL percentages as cumulative: it rejects a percentage lower than the previous SAL or higher than the next SAL.

Reproduction: existing SALs at 30% and 50%, followed by a new cumulative SAL at 70%. The trigger sets 70%; the former UI sum calculated 150% and clamped it to 100%, falsely showing the work as complete.

## Correction

- Extract the active Register insert into `insertWorkProgressRecord()`.
- Keep the existing amount/duplicate-number validations.
- Remove the client-side percentage sum and second `condominium_works.progress_percent` UPDATE.
- Leave the parent summary to the existing database trigger.

No SQL, migration, QA or Production changes.

## Runtime regression

`scripts/test-sal-progress-percent-trigger-authority.mjs` is wired into `npm test` immediately after the existing SAL trigger regression. It simulates the trigger's latest-SAL rule, reproduces the old 30% + 50% + 70% = 100% overwrite, verifies the new path preserves 70%, verifies only the SAL insert is issued, and checks insert-error propagation.
