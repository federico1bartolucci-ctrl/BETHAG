# Insurance policy stale-load guard — 2026-11-26

## Finding

Both insurance-policy views start asynchronous loads when the selected condominium changes. A request for condominium A can remain in flight while the user switches to condominium B. The older A request can then finish after B and overwrite the visible policy list (and, in the standalone component, the cached workspace/condominium context). A later reload with a missing workspace/condominium can also leave stale rows visible.

## Reproduction

A deterministic deferred-promise runtime test starts request A, starts request B, resolves B first and A last. Without a generation guard, A is allowed to apply its result last. The same ordering exists in both the active inline component in `src/main.tsx` and the standalone `src/InsurancePoliciesSection.tsx`.

## Correction

- Add a small latest-request guard shared by both components.
- Invalidate outstanding requests in the condominium-change effect cleanup.
- Check both request generation and the current condominium prop before every state update.
- Clear policies and cached workspace/condominium context when a new condominium is selected.
- Clear the editing form on context changes so a policy from the previous condominium cannot remain open in the new context.
- Ensure an older request cannot clear the loading indicator or replace the error state of a newer request.

## Regression

`scripts/test-insurance-policy-stale-load.mjs` reproduces the out-of-order completion and verifies the guard is wired into both components and invalidated by effect cleanup. The test is added to `npm test`.

## Integration method

The prior PR #603 was based on an older main SHA. Its focused change has been re-applied on a clean branch based directly on current main (`c95d33ec6745c628158bd2afa1bc08cedc91787a`); no historical stacked branch commits were carried forward.

## Safety

No Supabase calls are made by the regression. No QA or Production access/writes, migrations, merge, deploy, reset, or workflow dispatch.
