# SAL financial-summary trigger ownership — 2026-11-26

## Findings

1. `saveCondominiumWorkProgress` ignored the error from its existing-SAL lookup. A failed read could be interpreted as "no existing SAL", sending execution down the create path instead of stopping with the read error.
2. After upserting a SAL, the same client function wrote `progress_percent` and `actual_amount` back to `condominium_works` using values computed from an earlier client-side read. The database already owns these aggregates through `sync_condominium_work_financial_summary`, whose trigger recalculates them from the current progress rows under a row lock. A delayed client update could overwrite the trigger's newer aggregate with a stale value.

## Correction

- Propagate `existingProgressError` immediately; do not interpret a failed lookup as absence.
- Stop writing `progress_percent` and `actual_amount` from the client-side parent-work update. The database trigger remains the sole owner of these aggregate fields.
- Keep client-side `cumulativeActualAmount` for the budget warning/return value only.
- Preserve status and actual-end-date updates, which are not owned by the financial-summary trigger.

## Regression

- Assert existing-SAL lookup errors propagate.
- Assert the parent-work update no longer writes trigger-owned aggregates.
- Verify the baseline summary function locks the work row and its trigger invokes the summary function after progress changes.

## Safety

No migration or database change is made. No QA/Production data access or writes, Supabase deployment, reset or paid service activation.
