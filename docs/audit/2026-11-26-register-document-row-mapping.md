# Audit — Register document picker PostgREST row mapping

**Date:** 26 November 2026

## Reproduced defect

RegisterPage assigned raw PostgREST rows from public.documents directly to a UI model that expected camelCase fields and a numeric document ID.

The database row uses:
- condominium_id (UUID), while the picker read condominiumId;
- legacy_id (bigint), which is the value referenced by condominium_work_documents.document_id;
- id (UUID primary key), which is not the value expected by the relation;
- title, while the UI displayed name.

The picker filtered raw rows by document.condominiumId === Number(selected). A real PostgREST row has no condominiumId, so documents were not displayed even when they existed.

## Correction

- Map raw documents rows into the Register DocumentItem model before setting state.
- Use documents.legacy_id as the relation's numeric document_id.
- Preserve condominium_id as a UUID and compare it with the resolved dbId.
- Exclude rows without a usable positive safe-integer legacy ID or condominium UUID.
- Reject duplicate workspace legacy IDs and malformed response rows.

## Regression

scripts/test-register-document-row-mapping.mjs reproduces the old mismatch with a PostgREST-shaped row, verifies the mapped picker item, rejects invalid/unlinkable IDs, and checks UI and npm test wiring.

This is distinct from open PRs #371 and #377: those address pagination, not the raw PostgREST row shape or UUID/legacy-ID mismatch.

## Safety

Draft only. No QA/Production access or writes, no Storage access, no merge, deploy, reset, or manual workflow dispatch.
