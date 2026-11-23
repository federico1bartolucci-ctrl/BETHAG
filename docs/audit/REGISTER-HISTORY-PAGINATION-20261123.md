# Register Work History Pagination — 2026-11-23

## Finding
Opening a work's event history used a single query. Older events could be omitted once the API row limit was reached.

## Correction
The history query now uses the shared workspace pagination loader, filtered to the selected work, ordered newest-first by event date, and propagates errors.

## Regression
Integration guard added and wired into npm test.

## Verification
Static re-fetch verification completed; runtime and CI pending. No QA/Production actions.
