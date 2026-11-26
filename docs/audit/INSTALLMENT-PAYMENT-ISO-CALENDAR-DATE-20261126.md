# Installment payment ISO calendar-date guard — 2026-11-26

## Finding

The Accounting savePayment handler used an over-escaped regular expression:

/^\\d{4}-\\d{2}-\\d{2}$/

In JavaScript regex syntax this matches a literal backslash followed by d, not four decimal digits. A normal date such as 2026-11-26 therefore failed the guard, preventing installment payment registration through the Accounting form.

The issue is separate from PRs #444 and #446, which refresh local-calendar date defaults when forms are initialized or opened; those changes do not validate the date accepted by savePayment.

## Correction

- Extract strict ISO calendar-date validation into src/lib/isoCalendarDate.mjs.
- Require exact YYYY-MM-DD syntax.
- Validate the actual Gregorian calendar date, including leap years and month lengths.
- Reject year zero, malformed values, impossible dates, non-string values and date overflow.
- Use the helper in the installment payment save handler without changing payment amount, fiscal-year, workspace or RPC checks.

## Runtime regression

scripts/test-installment-payment-date-calendar.mjs is wired into npm test.

The test reproduces the old regex failure and verifies valid dates, leap-year rules, impossible dates, malformed strings, non-string values and the production handler's use of the helper.

## Safety

- Draft PR only.
- No QA or Production reads/writes.
- No database migration or schema change.
- No merge, deploy, reset or manual workflow dispatch.
- Final QA remains deferred.
