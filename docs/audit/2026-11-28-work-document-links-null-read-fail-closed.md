# Fail closed on malformed successful work-document link reads

Date: 2026-11-28

## Finding

Both `openWorkDocuments()` and the re-read performed by `saveWorkDocuments()` treated a successful-shaped Supabase response with `data: null, error: null` as an empty array by using `(data ?? [])`.

A valid empty SELECT is `[]`. A null collection is not a successful empty result.

The false-empty path could:
- open the document-link modal with no existing links shown;
- let a user save an empty selection while the save-time reconciliation also interpreted the current set as empty;
- close the modal as successful even though the persisted links were never read and therefore were not reconciled.

For a non-empty desired selection, the same path could attempt duplicate inserts instead of determining the actual existing set.

## Correction

- Add `mapWorkDocumentLinkIds()` to require an array response and validate/normalize every persisted document ID.
- Use it before opening the modal so malformed reads leave the modal closed and surface an error.
- Use it again in the authoritative save-time re-read so no insert/delete operation starts after an unreadable collection.
- Preserve a legitimate empty `[]` response and existing deduplication behavior.

## Regression

Extended `scripts/test-work-document-delete-error.mjs`, already registered exactly once in `npm test`.

Coverage includes:
- valid empty arrays;
- valid numeric/string IDs and deduplication;
- null, undefined and non-array successful responses;
- reproduction of the old null-to-empty false-success plan;
- proof that malformed reads stop before insert/delete;
- production wiring in both modal-open and save-time reads;
- preservation of existing insert-failure, delete-failure and retry regressions.

## Safety

- Isolated branch from current `main` at `fb2ecfc3d402be2ccc57e3955651223eed213040`.
- No schema or migration changes.
- No QA or Production database/Storage access or writes.
- No merge, deploy, reset or manual workflow dispatch.
