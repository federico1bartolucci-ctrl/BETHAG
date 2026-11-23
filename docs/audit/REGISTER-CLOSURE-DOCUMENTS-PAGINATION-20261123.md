# Register Closure Document Check Pagination — 2026-11-23

## Finding
The closure guard called the workspace pagination helper with `filters` and `columns`, but the helper ignored both options. It therefore fetched all work-document links for the workspace. Closing a work with no linked documents could incorrectly see documents belonging to another work and skip the documentless confirmation.

## Fix
- Extend the workspace pagination helper with validated, scalar equality filters applied on every page.
- Filter closure links by the selected `work_id`.
- Select `id,created_at` so the pagination cursor has the required sort value.
- Preserve workspace scope and fail-closed query errors.

## Runtime regression
- Reproduce the old false-positive when a different work has a link but the current work has none.
- Assert that the scoped query returns zero for the current work.
- Paginate 1,001 links for one work while excluding other work and workspace links.
- Verify the `work_id` filter is applied on every page and invalid filter values fail closed.
- Runtime test is wired into `npm test`.

## Verification
Local isolated Node runtime test passed. Full repository npm test/build/PostgreSQL CI must pass on the exact updated head. No QA or Production actions.
