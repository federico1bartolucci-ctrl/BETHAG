# Register Funds Pagination — 2026-11-23

## Finding
Register funds were loaded with a single workspace-scoped query and could be truncated by API row limits, hiding funds from the UI and work selectors.

## Correction
Use the shared workspace pagination loader with deterministic name ordering and error propagation. Keep workspace scope and refuse partial results.

## Regression
Static integration guard added to the npm test chain. Shared pagination unit guard covers paging behavior.

## Verification
Changes statically re-fetched and inspected; runtime and CI pending. No QA or Production actions.
