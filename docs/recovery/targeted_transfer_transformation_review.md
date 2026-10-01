# Targeted review: transfer and unit-transformation integrity

Date: 2026-10-01  
Scope: read-only inspection of production catalog plus source files on `bethag-migration-repair`. No writes, migrations, resets, or live workflow tests were performed.

## Confirmed finding — conflicting transfer status constraints

Production `public.condominium_member_transfers` has two validated CHECK constraints on `status`:

- `condominium_member_transfers_status_check`: allows `Bozza`, `Confermato`, `Chiuso`, `Annullato`.
- `condominium_member_transfers_status_ck`: allows `Bozza`, `Confermato`, `Annullato`, but excludes `Chiuso`.

Because both constraints are active, a row cannot satisfy a transition to `Chiuso`. This conflicts with the lifecycle represented by the close-transfer function/table fields. The read-only status aggregation returned no rows for either transfer or unit-transformation records at inspection time, so no existing record was identified as affected; this does not remove the functional defect.

**Required before launch:** review migration history and close-transfer function semantics, then prepare a single canonical status constraint that supports intended states. Validate the exact permitted lifecycle and the safe replacement in an isolated QA database first. Do not patch production directly.

## Reviewed elements

- The production transfer table has validated foreign keys for workspace, condominium, unit, outgoing member, incoming member, and closing user.
- The production unit-transformation table has validated checks for confirmation integrity and review resolution, including accounting and millesimal review statuses.
- The recovery-branch preview function checks condominium/type/source selection, duplicate IDs, active source units, and includes accounting and millesimal review indicators. It is `SECURITY INVOKER`; effective row visibility therefore depends on the underlying grants and RLS policies and still needs role-based runtime tests.
- The recovery-branch transfer function preserves the outgoing member row, changes its current-owner/position metadata, disables associated portal access and resident workspace membership, creates the incoming member, and records an accounting snapshot. These behaviors were reviewed statically only; concurrency, identity linkage, date-boundary accounting, reversals, and authorization require isolated tests.

## Validation status

- Production catalog inspection: completed, read-only.
- Static source review of selected branch migrations: completed.
- SQL execution / workflow simulation / role-based security testing: not performed.
- Launch certification: not granted.

## Next safe actions

1. Trace both conflicting constraints to their migration sources and establish intended transfer states.
2. Prepare a QA-only corrective migration after reconstructing the baseline; test both allowed and rejected status transitions.
3. Exercise transfer scenarios with synthetic data: same-day transfer, unpaid/part-paid installments, prior fiscal years, outgoing portal access, duplicate/concurrent confirmation, and cancellation/closure.
4. Exercise transformation preview/confirmation with manager, collaborator, resident, and unrelated workspace accounts; verify RLS and personal-data visibility.
5. Reconcile the resulting SQL against production definitions before any production change request.


## Source trace — conflicting status constraints

The recovery branch migration source confirms the origin of the production catalog conflict:

- `20261001104500_add_condominium_member_transfer.sql` creates `condominium_member_transfers_status_ck` with the allowed values `Bozza`, `Confermato`, and `Annullato`.
- `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` drops/recreates `condominium_member_transfers_status_check` to include `Chiuso`, but does not drop or replace the earlier `status_ck`.
- The production catalog independently shows both validated constraints active, matching this source-level explanation.

This establishes a concrete migration defect, not merely a filename mismatch. It remains a finding only: no SQL was executed to change the constraint. The correction must preserve the intended lifecycle and be validated on an isolated, reconstructed QA baseline before a production change is considered.


## Additional source finding — outgoing portal access during transfer

A static comparison of the transfer lifecycle migrations found a likely authorization regression in the recovery branch:

- `20261001093000_transfer_current_owner_and_portal_lifecycle.sql` explicitly deactivates `portal_access` for the outgoing member and disables that member's resident `workspace_members` record during transfer confirmation.
- `20261001101500_fix_member_portal_workspace_transfer.sql` defines a member-change trigger that deactivates portal/workspace access when a member is made inactive or loses its user link.
- The later `20261001120000_transfer_lifecycle_keep_outgoing_active.sql` replaces the confirmation function and keeps the outgoing member `active=true` with `position_status='In chiusura'`, but does not explicitly deactivate the outgoing member's `portal_access` or resident workspace membership. The trigger's inactive-member branch therefore is not activated by that update.

This means the later function source does not preserve the explicit access revocation present in the earlier implementation. Treat this as a **source-level regression risk requiring runtime confirmation**, not a claim that an unauthorized user has accessed production data. Before launch, the final confirmation workflow must explicitly define and enforce portal/workspace access for the outgoing member while retaining their financial history. Test with synthetic outgoing and incoming accounts, including existing active portal sessions/tokens, in isolated QA.

No production access records were changed and no runtime impersonation test was performed.
