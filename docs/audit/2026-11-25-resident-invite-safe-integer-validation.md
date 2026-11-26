# Audit — strict identifier validation for resident invitations

**Date:** 25 November 2026

## Finding

The resident invitation Edge Function converted `legacyId` and `condominiumId` with JavaScript `Number(...)` and checked only truthiness. This accepted values outside the intended positive-integer identifier contract: fractional numbers, booleans coerced to 1/0, scientific-notation strings and integers beyond JavaScript's safe range. Such inputs could select an unintended legacy record or fail later as a database error instead of being rejected as invalid input.

No open PR was found for this specific validation gap. Existing invitation PRs #136/#215 concern Auth metadata persistence, #141/#216/#266 concern paginated Auth-user lookup, and #448 guards zero-row member linking.

## Correction

- Add `parsePositiveSafeInteger` for numeric and digit-string inputs.
- Require both identifiers to be positive safe integers.
- Require a non-empty string workspace ID.
- Validate the condominium identifier before workspace membership or condominium database lookup.
- Return HTTP 400 for invalid identifiers.

## Regression coverage

Extend the existing mocked Deno Edge Function test `scripts/test-edge-function-invite-positive.mjs` with:
- fractional member ID;
- boolean member ID;
- scientific-notation condominium ID;
- unsafe integer condominium ID.

Each case asserts HTTP 400, no workspace membership lookup, no Auth invitation and no portal-access write. Existing positive owner/tenant, invalid qualification and zero-row member-link scenarios remain covered.

The Build workflow already executes this test; it uses mocked Auth/DB calls and does not access QA or Production.

## Dependency and safety

Stacked on PR #448 to retain its zero-row member-link guard. Draft only. No QA/Production changes, merge, deploy, reset or manual workflow dispatch.
