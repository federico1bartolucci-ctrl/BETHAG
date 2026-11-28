# Validate insurance policy data in the active component

Date: 2026-11-28

## Finding

The validation helper introduced by the insurance-policy validation work was used by the standalone `src/InsurancePoliciesSection.tsx` component. The application entry point, however, defines a later local `InsurancePoliciesSection` in `src/main.tsx`; that local declaration shadows the imported component and is the active implementation rendered by the application.

Its `savePolicy()` handler checked only company and policy number before resolving the condominium and issuing insert/update operations. It did not call `validateInsurancePolicyForm()`. Consequently, reversed or impossible dates and negative/non-finite amounts were not rejected by the active component before persistence. Database CHECK constraints might reject some values, but that is not equivalent to client-side pre-persistence validation and gives a different error path.

## Correction

- Import the existing `validateInsurancePolicyForm()` helper into `src/main.tsx`.
- Invoke it in the active inline `savePolicy()` before workspace/condominium lookup and before any insert/update.
- Surface the helper's actionable validation message and stop without changing the form.
- Preserve the existing validation helper and standalone-component validation; no duplicated validation rules.

## Runtime regression

Added `scripts/test-active-insurance-policy-date-validation.mjs`, registered exactly once in `npm test`.

It checks valid values, reversed dates, impossible dates, negative premium, non-finite deductible, optional empty values, and—critically—that the active inline component imports and calls the helper before persistence operations.

## Safety

- Stacked on PR #683, whose base is PR #682.
- No schema or migration changes.
- No QA or Production database/Storage access or writes.
- No merge, deploy, reset or manual workflow dispatch.
