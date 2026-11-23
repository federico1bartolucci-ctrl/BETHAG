# Register Works Pagination — 2026-11-23

## Finding
RegisterPage hydrates condominium works through one workspace-scoped query. Large work collections can be truncated at the API row limit, making interventions disappear from the works tab and related selectors.

## Correction
- Reuse the keyset workspace pagination helper from PR #328.
- Preserve workspace scope on each page and deterministic ordering by start date and ID.
- Propagate page errors and do not accept partial work collections.

## Regression
Static integration guard checks shared loader usage, page error propagation, and state wiring. Shared pagination runtime regression covers keyset behavior and edge cases.

## Verification
Source, test, package wiring and documentation statically re-fetched and inspected. Runtime/CI required before closure.

## Dependency
Draft stacked on PR #328.

## Safety
No merge, deployment, QA/Production changes or resets.
