# Audit: over-scheduled linked installments in unit Rendiconto — 2026-11-24

## Finding
The consolidated Rendiconto helper counted the full linked installment schedule even when it exceeded the unit allocation. Reproduction: allocation €100, paid €30, linked installments €120, paid €30. The previous helper reported residual €90; the linked schedule must not inflate the residual beyond the allocation's unpaid €70. The raw scheduled total remains visible as €120 so the discrepancy is not hidden.

## Correction
Calculate linked installment coverage per ledger-entry/unit allocation group and cap that coverage at the allocation. Keep standalone manual installments additive, separate from the linked-plan cap.

## Runtime regression
Extended the existing `scripts/test-accounting-rendiconto-unit-mixed-installments.mjs`, already included in `npm test`, with:
- linked over-schedule case (expected paid €30, residual €70);
- over-schedule plus an independent manual installment (expected residual €90, ensuring the manual €20 is not swallowed by the cap).

## Local verification
- Previous helper reproduction: PASS (reported residual €90 instead of €70).
- Revised runtime regression: PASS.
- 500 direct-unit valid linked-schedule differential scenarios against the previous helper: PASS.
- 500 member-linked valid schedule differential scenarios against the previous helper: PASS.
- Full repository `npm test` and build are not available locally without a checkout; CI on the updated PR SHA is required.

## Safety
Updated existing draft PR #388 only to avoid duplicating the Rendiconto consolidation. No QA/Production changes, merge, deploy, reset, or manual workflow dispatch.
