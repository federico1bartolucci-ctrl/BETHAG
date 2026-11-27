# Local calendar dates for Register SAL and work operations

## Finding
The technical Register still used UTC ISO date strings for SAL payment defaults, SAL progress dates, work closure dates, form defaults, overdue/expiry comparisons and 30-day warning windows. Around local midnight these date-only values can be one day behind the user's local calendar.

## Correction
- Use the shared `localISODate()` helper for SAL payment and progress fallbacks, work closure dates, form defaults and local-today comparisons.
- Use `localISODateAfterDays(30)` for both 30-calendar-day warning horizons.
- Preserve explicit dates entered by the user and stored date-only values.
- The work-expense persistence fallback remains covered by #404 and is not duplicated.

## Regression
`scripts/test-register-sal-work-local-date.mjs` checks all affected call sites, ensures no UTC ISO conversion remains in the Register date-only flows, and executes Europe/Rome midnight and daylight-saving boundary cases. It is wired into `npm test`.

## Safety
Frontend-only change. No migrations, QA/Production access or writes, Supabase deployment, reset or paid service activation.
