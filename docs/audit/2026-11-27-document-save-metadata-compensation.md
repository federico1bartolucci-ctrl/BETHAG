# Document save: verify metadata persistence and compensate Storage

Date: 2026-11-27

## Finding

The Documenti form uploaded a selected file to Supabase Storage, then only updated React state. The generic background synchronization persisted the `documents` row later, after a debounce. Its failure handler only wrote to the console. A user could therefore see the form close successfully while the metadata write failed, leaving an unreferenced Storage object and a document that disappeared after refresh.

Replacing a document file also overwrote the old `storagePath` in the next state without removing the previous object.

## Correction

- Save the document row explicitly before updating the in-memory document list.
- Serialize the explicit write with the existing backend synchronization queue.
- Read the row back after the upsert and verify workspace/legacy identity, condominium, title, category, publication status, file path and JSON data.
- If the write response is lost but read-back confirms the exact row, treat the operation as committed.
- If read-back itself fails or returns an unconfirmed state, mark persistence as uncertain and retain the new Storage object. Deleting it could break a row that may already reference it.
- On a definitive metadata failure, remove the newly uploaded object. If that compensation also fails, report the exact Storage path.
- On a successful replacement, remove the old object only after the new metadata row is confirmed. Report cleanup failure as a warning without rolling back the committed document.
- Update the background-sync snapshot after the explicit save so the debounced effect does not replay a duplicate write.

## Regression coverage

`scripts/test-document-save-storage-compensation.mjs` covers:
- normal metadata write and read-back;
- a lost write response with a matching committed read-back;
- definitive metadata rejection;
- unavailable/mismatched read-back (uncertain state);
- cleanup of a newly uploaded object after definite failure;
- retention of new and old objects while persistence is uncertain;
- replacement ordering (persist new pointer before deleting old object);
- warning when old-object cleanup fails;
- no metadata write when upload fails;
- failure of compensation itself;
- wiring from the Documenti form to the explicit persistence function.

The test is registered in `npm test`.

## Safety

Code, tests and documentation only. No QA or Production data, Storage buckets, database schema, migrations, deployment or reset are changed. The branch is based on the Draft upload-rollback PR #654 and remains Draft pending CI on its exact head.
