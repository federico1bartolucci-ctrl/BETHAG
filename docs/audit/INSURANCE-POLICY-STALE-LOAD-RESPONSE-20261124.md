# Insurance policy stale-list response race — 2026-11-24

## Finding (reproduced)
The active local `InsurancePoliciesSection` loaded policies asynchronously and unconditionally called `setPolicies(data || [])`. When the user changed from condominium A to B, the B request could complete first and then a slower A response overwrite B's list. The component also unconditionally cleared `loading` in every request's `finally`, so an older request could hide the loading state of a newer request.

## Reproduction
- Start request A for condominium A.
- Switch to B; request B completes and renders B policies.
- A completes later and the legacy handler overwrites B with A policies.
- Runtime regression asserts this legacy sequence and verifies the guard rejects A.

## Correction
- Track monotonically increasing load sequence in the active component.
- Maintain a ref for the currently rendered condominium, updated synchronously on render.
- Apply responses only when both request sequence and condominium context still match.
- Older request errors and `finally` blocks no longer log/clear state for the current request.
- Effect cleanup invalidates pending requests on condominium change/unmount.

## Runtime regression
Added `scripts/test-active-insurance-policy-load-race.mjs`, wired into `npm test`. It reproduces the legacy overwrite, tests stale/current responses, rejects a condominium prop change before the next effect, rejects malformed response data, accepts an empty array, and verifies the active component wiring.

## Local verification
Isolated Node runtime regression executed in the working container: PASS. The full repository test/build is not claimed locally because this execution has no repository checkout.

## CI
Draft PR stacked on #385, base branch `audit-insurance-policy-active-component-scope-20261123`. Exact-head CI pending.

## Safety
No QA or Production changes. No merge, deployment, reset, or manually dispatched workflow.
