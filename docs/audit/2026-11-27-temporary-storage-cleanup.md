# Temporary Supabase Storage cleanup after AI document analysis

Date: 2026-11-27

## Finding

The workspace and condominium AI upload helpers used `finally` to delete temporary Supabase Storage objects, but each deletion failure was swallowed with `.catch(() => undefined)`. A successful AI response could therefore leave private source documents in the Storage bucket with no visible warning. The analysis-only condominium flow uses this temporary upload path.

## Correction

- Centralize temporary-object cleanup in `src/lib/temporaryStorageCleanup.mjs`.
- De-duplicate paths and remove them concurrently.
- Retry transient/unknown failures once; do not retry definitive 4xx failures.
- Treat Storage 404 as already absent in `deleteWorkspaceStoredFile`.
- Preserve the Storage HTTP status on cleanup errors so retry classification is possible.
- Keep a successful AI draft and attach `cleanupWarnings` when a temporary object remains.
- Surface those warnings in the condominium AI flow and persist them in the intake warnings.
- If AI analysis itself fails and cleanup also fails, preserve the analysis error while including the exact paths and cleanup failures in the surfaced message.

Both `analyzeWorkspaceDocumentsWithAI` and `analyzeCondominiumDocumentsWithAI` use the same cleanup helper.

## Regression coverage

`scripts/test-temporary-storage-cleanup.mjs` covers successful cleanup, duplicate paths, retry after transient errors, no retry for permanent 4xx, exhausted retries, preservation of successful AI output, and reporting of cleanup failures when analysis succeeds or fails. It also verifies both AI wrappers and the user-facing intake warning. The test is registered in `npm test`.

## Safety

Only application code, tests and audit documentation are changed. No QA/Production database or Storage object is accessed or modified. No migrations, deploy, merge or reset.
