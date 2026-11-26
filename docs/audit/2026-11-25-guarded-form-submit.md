# Guarded form submission audit — 25 November 2026

## Finding

Several React form handlers returned immediately when a module, role or plan guard denied an action, but called `event.preventDefault()` only after the guard. The browser therefore retained the form's native submit behavior on denied paths. For forms without an explicit method/action, this can navigate or reload the current page and discard the user's entered values; named controls may also be serialized by the default GET behavior.

The pattern affected deadline, document, assembly, supplier, activity, condominium-work, SAL, condominium-member, communication, collaborator and administrator-profile forms. Communication plan gating in the stacked communications entitlement change made the issue especially visible.

## Correction

- Introduced `runGuardedFormSubmit(event, guards)`.
- The helper prevents native submission before evaluating any guard.
- Guards remain ordered as before and stop at the first denial.
- Applied to all identified permission/plan/administrator-gated form handlers.
- Existing handlers that already prevented default before their guards remain unchanged.

## Regression

`scripts/test-guarded-form-submit.mjs` is wired into `npm test` and covers denied module and plan paths, allowed paths, short-circuit behavior, malformed events, and integration across all affected handlers.

## Verification status

- Source wiring and section boundaries: statically checked.
- Runtime regression: pending exact-head GitHub Actions.
- Build/PostgreSQL 17: pending exact-head GitHub Actions.
- Baseline Safety: not triggered for the stacked PR base; remains a separate gate on the parent communications PR.
- No QA or Production access/writes, merge, deployment, reset or manual workflow dispatch.
