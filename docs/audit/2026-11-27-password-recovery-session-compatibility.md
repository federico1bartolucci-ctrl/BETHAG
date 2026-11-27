# Audit — password recovery session compatibility

Date: 2026-11-27

## Finding
The public reset-password directory entry accepted PKCE query codes and any pre-existing local session, but did not establish a session from legacy implicit-flow recovery tokens in the URL fragment. The root `reset-password.html` entry already supported both flows, leaving the two public entry points inconsistent.

## Correction
- Centralize recovery-session establishment in `public/reset-password/recovery-session.js`.
- Exchange PKCE codes through `exchangeCodeForSession`.
- Establish legacy implicit-flow sessions only when both access and refresh tokens are present.
- Fail closed on partial token pairs or failed exchanges; do not fall through to an unrelated pre-existing session after an exchange failure.
- Retain support for an already established session.
- Wire the helper into the directory entry and add runtime regression coverage for PKCE, implicit flow, partial tokens, exchange failures, and both HTML entry points.

## Safety
No Supabase, QA, or Production access or writes. This is a static frontend correction; final authenticated QA remains deferred.
