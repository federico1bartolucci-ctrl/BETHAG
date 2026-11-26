# Accounting member hydration workspace scope — 2026-11-23

## Finding
The Accounting page loaded condominium_members with no workspace_id filter, unlike surrounding workspace-scoped queries. This could hydrate members outside the current workspace into in-memory accounting data and selectors.

## Fix
Add workspace_id filtering to the members query. Preserve the existing select/order and UI behavior.

## Regression
Source guard added and wired to npm test.

## Verification
Static re-fetch only. Runtime/build/CI pending. No QA or Production data changes.
