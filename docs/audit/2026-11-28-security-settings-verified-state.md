# Security settings must not display an unverified disabled state

Date: 2026-11-28

## Finding

The account security card ignored errors returned by `auth.getUser()`, `user_security_settings.maybeSingle()` and `auth.mfa.listFactors()`. A failed request could leave the initial `codeEnabled=false` and empty MFA-factor state visible as if both protections were disabled.

## Correction

- Surface loading and read-error states with an explicit retry.
- Treat user, settings and MFA read failures as unknown state, not disabled protections.
- Guard overlapping refreshes and unmount so stale responses cannot overwrite current state.
- Render protection labels and actions only after a complete successful refresh.
- Preserve the current main implementation of the personal-code disable RPC (`change_personal_security_code`).

## Runtime regression

`scripts/test-security-settings-load-errors.mjs` checks error propagation, stale-request guards, retry behavior, verified-only status rendering and test-chain preservation.

The test asserts that representative checks from the existing main `npm test` chain remain present and that this regression is appended exactly once.

## Reconciliation

This Draft branch is rebased onto current main `fb2ecfc3d402be2ccc57e3955651223eed213040`. The previous branch's reduced `npm test` command had replaced the repository's full test chain with only clean-bootstrap and this regression. The rebased branch starts from the current main package manifest and appends the regression without dropping existing checks.

## Safety

- Isolated Draft branch only.
- No database schema or migration changes.
- No QA or Production access or writes.
- No merge, deployment, reset or manual workflow dispatch.
