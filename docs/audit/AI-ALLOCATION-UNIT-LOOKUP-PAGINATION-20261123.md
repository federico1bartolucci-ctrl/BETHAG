# AI Allocation Unit Lookup Pagination — 2026-11-23

## Finding
When converting AI-extracted allocation rows to condominium-unit IDs, the source queried `condominium_units` once by workspace and condominium. PostgREST's row cap can omit units beyond the first page; those units are then falsely reported as unmatched in the allocation proposal.

## Fix
- Paginate the scoped condominium-unit lookup in pages of up to 1,000.
- Keep both `workspace_id` and `condominium_id` filters on every page.
- Stable order by `unit_code` then `id`.
- Propagate errors rather than produce an incomplete unit-match list.
- Add regression coverage for 1,001 rows, scoped filters, ordering, range, empty results, invalid page size and page failure; wire into `npm test`.

## Verification
Source/test/package wiring is statically checked through GitHub. Runtime tests/build/CI are pending. No QA/Production changes, merge or deployment.
