# 2026-11-26 — Workspace backup localStorage allowlist

## Finding
The restore path accepted arbitrary keys from `backup.localStorageData`, excluding only the two BETHAG session keys. A modified backup could therefore overwrite same-origin browser storage outside BETHAG's own key namespace, including Supabase Auth token storage.

## Correction
- Restore only keys declared by the application's `KEYS` registry.
- Continue excluding `KEYS.session` and `KEYS.sessionEmail`.
- Keep per-key failure isolation and report counts from the helper.
- Treat malformed or non-object payloads as empty input.

## Regression coverage
The test verifies accepted BETHAG keys, excluded session keys, injected Supabase Auth and unknown keys, malformed payloads, and per-key storage failures. It also asserts that the helper is wired into the restore path and registered in `npm test`.

## Scope and safety
Reconstructed on current main after PR #518. No database schema or migration changes. No QA/Production access or writes, deploy, restore, reset, or manual workflow dispatch.
