# Register Closure Document Check Pagination — 2026-11-23

## Finding
Closing a work queried linked document IDs in one request. A large document-link set could be truncated and falsely appear incomplete.

## Fix
Paginate the workspace-scoped link query filtered by work_id, preserving fail-closed error handling and the existing confirmation when no documents are linked.

## Regression
Guard added and wired into npm test.

## Verification
Static re-fetch only; runtime/build/CI pending. No QA/Production actions.
