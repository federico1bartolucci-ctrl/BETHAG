# QA remediation proposal — transfer status constraint

Date: 2026-10-01  
Status: proposed, not applied

## Evidence
Production catalog inspection found two validated CHECK constraints on `public.condominium_member_transfers`:
- `condominium_member_transfers_status_check`: `Bozza`, `Confermato`, `Chiuso`, `Annullato`
- `condominium_member_transfers_status_ck`: `Bozza`, `Confermato`, `Annullato`

The intersection excludes `Chiuso`, so the close lifecycle operation can fail.

## Proposed migration
This SQL is a proposal only. It must not be applied to production or any incomplete preview branch. Apply first only to a clean, isolated QA database after its baseline is reconciled and replayed.

```sql
begin;

alter table public.condominium_member_transfers
  drop constraint if exists condominium_member_transfers_status_ck;

alter table public.condominium_member_transfers
  drop constraint if exists condominium_member_transfers_status_check;

alter table public.condominium_member_transfers
  add constraint condominium_member_transfers_status_check
  check (status in ('Bozza', 'Confermato', 'Chiuso', 'Annullato'))
  not valid;

alter table public.condominium_member_transfers
  validate constraint condominium_member_transfers_status_check;

commit;
```

Before applying, compare the actual table definition in the replayed QA database and check for any existing status values outside the allowed set. If invalid values exist, stop and resolve them explicitly; do not silently rewrite records.

## Required QA cases
1. Insert each allowed status and confirm it succeeds.
2. Attempt an unknown status and confirm the database rejects it.
3. Create a transfer and confirm it; verify the outgoing member is retained for accounting history and resident portal access is revoked.
4. Close a transfer with zero outstanding installments, allocations, and fiscal carryovers; verify status becomes `Chiuso` and closure metadata is persisted.
5. Attempt closure with any open financial position; verify it is rejected and no partial changes persist.
6. Verify an already-issued resident session cannot continue to read protected workspace data after access revocation.
7. Verify administrators and collaborators retain their unrelated workspace permissions.
8. Confirm failed closure rolls back all changes atomically.

## Release gate
Do not promote this migration until the baseline is replayable, the above cases pass in QA, the migration has been reviewed against current production catalog state, and production release is separately approved.
