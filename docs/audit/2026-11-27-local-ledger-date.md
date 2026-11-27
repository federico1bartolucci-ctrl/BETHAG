# Local calendar date for default ledger entries

## Finding
The ledger form default used `new Date().toISOString().slice(0, 10)`, which derives the date in UTC and can show the previous or next calendar day relative to the user's local date near midnight.

## Correction
A shared `localISODate` helper formats year, month and day using local calendar fields. The default ledger entry date now uses this helper.

## Regression
The test runs a Europe/Rome timezone-boundary case at 23:30 UTC and verifies that the local calendar date is selected. It also verifies the ledger form uses the helper and is included in `npm test`.

## Safety
Frontend helper, form default, test and documentation only. No migrations, QA/Production access or writes, Supabase deployment, reset or paid service activation.
