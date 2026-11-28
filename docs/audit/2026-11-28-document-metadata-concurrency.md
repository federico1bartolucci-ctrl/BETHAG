# Document metadata-only concurrent edit guard

Date: 2026-11-28

## Finding

The document compare-and-swap introduced by the storage-version guard compared the current `file_path` (or the legacy JSON `storagePath`) with the path observed by the editor. That protects a replacement from a stale form that would restore a deleted Storage pointer, but it does not protect metadata-only edits that leave the path unchanged.

Two administrator sessions can therefore:

1. Read the same document row and the same Storage path.
2. Edit different metadata values, such as the title or category.
3. Submit concurrently.
4. Both pass the old Storage-path-only predicate because `file_path` did not change.
5. Both update successfully; the later write silently overwrites the earlier edit.

The affected fields include the top-level title/category/status and the JSONB `data` payload.

## Reproduction

The existing runtime suite `scripts/test-document-save-concurrent-replacement.mjs` now reproduces the previous behavior with two concurrent metadata-only writes against the same Storage path. Both writes succeed under the old predicate and one edit is lost.

The same suite then verifies that the corrected compare-and-swap permits exactly one writer and rejects the stale writer with `DocumentEditConflictError`.

## Correction

- Extend the atomic update predicate to compare the observed top-level `title`, `category`, and `status`.
- Compare the complete observed JSONB `data` value using PostgREST JSON equality.
- Preserve the existing workspace, legacy ID, condominium ID, and Storage-path predicates.
- Preserve the legacy `file_path IS NULL` fallback and its `data->>storagePath` concurrency check.
- Keep the existing document-save compensation: a stale replacement still removes its newly uploaded object, while the winning database pointer remains unchanged.

No schema or migration change is required.

## Regression

The existing `scripts/test-document-save-concurrent-replacement.mjs` is already included in `npm test`. It now covers:
- the previous lost-update behavior for concurrent metadata-only edits;
- exactly one successful writer with the full-row compare-and-swap;
- unchanged Storage path during metadata conflict detection;
- top-level and JSONB metadata remaining aligned;
- existing concurrent replacement, stale pointer, compensation, legacy row, and condominium move cases.

## Safety

- Isolated draft branch stacked on PR #657's exact head.
- No QA or Production database/Storage access or writes.
- No schema/migration changes.
- No merge, deploy, reset, or manual workflow dispatch.
- Automatic PR CI is the only validation workflow expected to run.
