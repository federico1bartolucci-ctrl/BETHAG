# Supabase Storage ambiguous upload errors must be compensated

Date: 2026-11-27

## Finding

The document upload rollback helper treated every resolved `response.error` as a definitive rejection and cleared the pending upload path before rollback. That assumption is incorrect for the repository's pinned `@supabase/supabase-js` version `2.117.1`.

In that SDK, `StorageFileApi.upload()` delegates to `uploadOrUpdate()`, which delegates to `handleOperation()`. The storage fetch layer converts transport failures into `StorageUnknownError`; `handleOperation()` returns those errors as `{ data: null, error }` when `shouldThrowOnError` is disabled. Therefore a request that reached Storage and committed an object before the response was lost can return a resolved error object rather than reject the promise. Clearing the pending path in that case can leave an orphaned object.

## Correction

- Keep the attempted object path pending for errors without a definitive HTTP rejection status.
- Treat 5xx responses and HTTP 408 as ambiguous and include the attempted path in compensating removal.
- Clear the attempted path only for definitive 4xx responses other than 408. This preserves an existing object on a 409 conflict with `upsert: false`.
- Keep the existing rollback error reporting so incomplete cleanup identifies paths that may remain orphaned.

The implementation is in `src/lib/documentStorageUpload.js`.

## Regression coverage

`scripts/test-document-upload-rollback.mjs` now models the Supabase SDK's resolved `StorageUnknownError` result with an object committed before the response is lost, plus a 503 after commit. Both cases require rollback of the attempted path. A 409 conflict test verifies that a pre-existing object at the conflicting path is not deleted.

The test remains part of `npm test`.

## Scope and safety

This is a client-code and test-only correction. No QA or Production database, Storage bucket, environment, deployment, or migration history is touched. The PR remains Draft pending CI on its final commit.
