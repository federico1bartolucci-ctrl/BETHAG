# Insurance policy date and amount validation

Date: 2026-11-28

## Finding

`InsurancePoliciesSection.save` required only company name and policy number. It accepted an expiry date earlier than the start date, impossible ISO calendar dates, and negative/non-finite premium or deductible values. The HTML `min=0` control is client-side only and does not protect the save path or future callers.

## Correction

- Validate non-empty dates as real `YYYY-MM-DD` calendar dates.
- Reject expiry before inception while allowing either date to remain optional.
- Reject negative and non-finite premium/deductible values; preserve optional null amounts.
- Run validation before enabling saving or issuing insert/update requests.

## Regression

`scripts/test-insurance-policy-date-validation.mjs` covers reversed dates, impossible dates, leap days, optional dates, negative/non-finite amounts, blank required fields and the pre-persistence validation wiring.

## Dependency and safety

- Stacked on PR #682 because both changes touch `InsurancePoliciesSection.tsx`; PR #682 remains the prerequisite.
- No schema or migration changes.
- No QA or Production database/Storage access or writes.
- No merge, deploy, reset or manual workflow dispatch.
