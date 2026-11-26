# Audit — refresh local date in member-transfer form

**Date:** 26 November 2026

## Reproducible finding

MemberTransferPanel initialized transferDate only once when the component mounted. If an administrator left the subentro panel open across local midnight, the default could remain on the previous calendar day. The stale value was also reused when calculating the accounting preview and submitting confirm_condominium_member_transfer, so the mismatch could affect both the displayed snapshot and the recorded transfer date.

The previous UTC-offset initializer produced the correct local date at mount; the defect was that it was not refreshed while the component remained mounted.

## Correction

- Introduce a local calendar-date helper using local year/month/day fields.
- Refresh the default when the date field receives focus, when unit/outgoing-owner context changes, and whenever preview or confirmation is requested.
- Track explicit user edits so a historical/future date selected by the administrator is never overwritten by automatic refresh.
- Invalidate and recompute the accounting preview when an untouched default advances to a new local day.
- Reject confirmation if the preview date does not match the effective transfer date.
- After a successful transfer, reset the next form to the current local date and clear the explicit-edit flag.

## Regression coverage

scripts/test-member-transfer-date-refresh.mjs verifies:
- local calendar conversion around November midnight in Europe/Rome;
- the local date across the March daylight-saving transition;
- date refresh wiring for focus, unit/member selection, preview and confirmation;
- preservation of explicitly edited dates;
- stale-preview rejection and successful-form reset;
- inclusion in npm test.

No database schema or migration registry changes are required; this is a frontend state/date-default correction.

## Safety

The change is isolated on audit-member-transfer-date-refresh-20261126, based on the already verified transfer-accounting chain at PR #456. No QA or Production data/configuration is modified. No merge, deploy, reset, or workflow dispatch is performed.
