# Register Items Hydration Pagination — 2026-11-23

## Finding
RegisterPage loaded `condominium_register_items` with a single workspace-scoped PostgREST query. At the provider's default row cap (commonly 1,000), larger workspaces can silently omit later register items, so expiry/maintenance records are not fully hydrated.

## Correction
- Fetch register items in pages of up to 1,000.
- Retain workspace scoping on every page.
- Order by `expiry_date` then `id` for deterministic page boundaries.
- Propagate any page error and fail the hydration instead of accepting partial data.
- Add a regression test covering 1,001 records, page ranges, workspace filter, stable order, empty results, invalid page size and later-page failure.
- Wire the regression into `npm test`.

## Verification
GitHub source files were refetched and inspected. Runtime test/build/CI verification is pending. No QA or Production data was changed; this is a draft PR stacked on #251.
