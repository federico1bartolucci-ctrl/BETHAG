# Local calendar date for work-expense fallback

## Finding
When the work-expense form left `entry_date` blank, `saveWorkExpense` used `new Date().toISOString().slice(0, 10)`. This derives the UTC date, not the local calendar date. In Europe/Rome just after midnight, the expense could be assigned to the previous day and potentially to the wrong fiscal year.

## Correction
Use the existing `localISODate()` helper for the blank-date fallback. Explicit dates entered by the user remain unchanged.

## Regression
`scripts/test-register-work-expense-local-date.mjs` verifies the handler wiring and executes the helper under `TZ=Europe/Rome` for a late-November midnight boundary and the March daylight-saving transition. The test is included in `npm test`.

## Safety
Frontend-only change. No migrations, QA/Production access or writes, Supabase deployment, reset or paid service activation.
