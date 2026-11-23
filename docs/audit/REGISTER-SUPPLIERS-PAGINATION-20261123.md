# Register Supplier Hydration Pagination — 2026-11-23

## Finding
RegisterPage loaded all workspace suppliers in one PostgREST request. Workspaces above the API row cap can have suppliers omitted from the suppliers tab and supplier selectors, hiding existing entries.

## Fix
- Paginate suppliers in 1,000-row pages.
- Keep workspace scope in each request.
- Stable order by business name then ID.
- Propagate page errors rather than accept incomplete supplier data.
- Regression covers 1,002 rows, ranges, workspace scope, stable order, later-page errors, empty result and invalid page size; wired into `npm test`.

## Verification
Static source/helper/test/package/doc checks performed through GitHub. Runtime test/build/CI pending. No QA/Production changes.
