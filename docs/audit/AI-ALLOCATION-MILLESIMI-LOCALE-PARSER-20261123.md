# AI Allocation Millesimi Locale Parsing — 2026-11-23

## Finding
AI allocation intake parsed unit millesimi by replacing only the first comma with a decimal point. Italian grouped values such as `1.234,56` became invalid numeric strings and were silently converted to zero, corrupting the allocation proposal.

## Fix
- Reuse the locale-aware `parseBethagAmount` helper from PR #171.
- Parse each AI row's `millesimi` with fallback 0, preserving the existing invalid-value fallback.
- Add regression cases for Italian/US formatting, decimal values, grouped thousands, numeric inputs and invalid/missing inputs.
- Wire regression to `npm test`.

## Verification
GitHub source/test/package checks are pending final static re-fetch. Runtime tests/build/CI not run at creation. No QA/Production changes.
