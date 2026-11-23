# Register Document Hydration Pagination — 2026-11-23

## Finding
The Register's workspace document hydration query used a single workspace-scoped select and could silently omit documents beyond the API row limit.

## Fix
Use the shared workspace pagination loader for the documents table hydration, preserving workspace scope and existing error handling.

## Regression
Source guard added and wired to npm test.

## Verification
Static re-fetch only. Runtime/build/CI pending. No QA or Production modifications.
