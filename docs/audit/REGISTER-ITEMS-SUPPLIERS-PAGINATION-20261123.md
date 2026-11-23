# Register Items and Suppliers Pagination — 2026-11-23

## Finding
Register items and suppliers were previously hydrated with single queries, risking truncation at the API row cap. The shared keyset paginator also rejected every non-date cursor value, so supplier pagination failed after the first full page because `business_name` is arbitrary text. Its cursor filter interpolated text without PostgREST quoting/escaping, making names with reserved characters unsafe in logical filters.

## Fix
- Paginate register items by expiry date and suppliers by business name.
- Allow validated scalar cursor values (string, finite number, boolean, or null).
- Keep date-like cursor strings in their existing raw form; quote other text and escape embedded backslashes and double quotes before constructing the logical OR cursor.
- Preserve workspace scope, stable ID tie-break, null tail, and fail-closed errors.

## Runtime regression
- Reproduces the legacy date-only validator rejecting a supplier business-name cursor.
- Executes the production pagination helper over four bounded pages with a supplier name containing comma, period, parentheses, quote, and backslash.
- Asserts exact PostgREST cursor quoting/escaping, workspace scope, ID tie-break, null tail, and no duplicate/missing rows.
- Adds the runtime regression and existing supplier/register source guard to `npm test`.

## Verification
The runtime regression was independently exercised in a local Node harness. Exact-SHA CI is required before this point can be closed.

No QA/Production changes, merge, deployment, reset, or manual workflow dispatch.
