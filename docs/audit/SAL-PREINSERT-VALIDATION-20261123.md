# SAL save validation order — 2026-11-23

## Finding
`saveProgress()` inserted the new SAL row before checking whether the cumulative SAL amount exceeded the approved work amount. When the validation failed, the catch handler displayed an error but the already-inserted SAL remained persisted. This is a partial-write defect.

It also accepted a paid amount greater than the SAL amount, and ignored the error result from updating the parent work progress percentage.

## Correction
- Validate cumulative SAL amount and paid amount before inserting.
- Reject negative SAL/payment amounts and paid amount above SAL.
- Check and propagate errors from the parent-work progress update.
- Keep the existing progress percentage cap.

## Verification
Static regression guard is wired into `npm test`. Exact-head Build, PostgreSQL 17 bootstrap and Baseline Safety are required before closure.

## Safety
Draft only. No QA/Production changes, merge, deployment or reset.
