# Audit — Register document picker PostgREST row mapping

**Date:** 26 November 2026

## Reproduced defect

RegisterPage queried public.documents and assigned raw PostgREST rows directly to a UI type that expects camelCase fields:

- Database condominium_id is a UUID, while the picker read condominiumId.
- Database legacy_id is the bigint referenced by condominium_work_documents.document_id, while the UI typed id as a number and the raw row id is a UUID.
- Database title was displayed through the UI field name.

The picker filtered raw rows by document.condominiumId === Number(selected). A real PostgREST row has no condominiumId, and its id is a UUID, so the selected document list was empty even when documents existed.

## Correction

- Map raw documents rows into the Register DocumentItem model before setting state.
- Use documents.legacy_id as the relation numeric document_id.
- Preserve the UUID condominium_id and compare it with the resolved dbId.
- Exclude rows with no usable positive safe-integer legacy ID or no condominium UUID, because they cannot be linked safely by this relation.
- Reject duplicate workspace legacy IDs and malformed response rows.

## Regression

scripts/test-register-document-row-mapping.mjs reproduces the old mismatch with a PostgREST-shaped row, verifies the mapped picker item, rejects invalid/unlinkable IDs, and checks the UI and npm test wiring.

This correction is distinct from open PRs #371 and #377, which address pagination of the document query; they do not map the raw PostgREST row shape or the UUID/legacy-ID mismatch.

## Safety

Draft only. No QA/Production access or writes, no Storage access, no merge, deploy, reset, or manual workflow dispatch.
