# Supabase Support request — no-cost isolated physical-backup restore for BETHAG

**Status:** Draft for submission by the project owner; no support ticket has been submitted by this document.  
**Source project ref:** `tctcgptrsmvgajqjgnev`  
**Region:** `eu-central-1`  
**Postgres:** `17.6.1.166`  
**Organization:** `BETHAG` (`efijmwdhxilaxaahjbin`)

## Request

We need to prove that the scheduled Supabase-managed physical backup for the BETHAG production database can be restored successfully, without changing the live production project and without incurring additional recurring compute charges.

The Dashboard displays scheduled physical backups, including a backup shown at approximately `2026-10-27 03:04:50 UTC`. The built-in **Restore to a New Project** flow displays an additional monthly compute charge of `$9.68`; the project owner has explicitly declined that paid route.

Please advise whether Supabase can provide one of the following at no additional charge:

1. A temporary isolated restore target/credit for the selected scheduled physical backup, with the target deleted after validation; or
2. A provider-supported way to restore that exact physical backup into an isolated local environment, including the required artifact and tooling; or
3. Written confirmation of the exact backup integrity/restore validation evidence Supabase can provide when a customer cannot create a second billable project.

Please do not restore over or otherwise modify the live Production project.

## Why the existing local test does not satisfy this request

A separate local logical dump restore has been tested and key row counts matched (6 condominiums, 65 units, 20 members, 11 member transfers). That test is useful supplemental evidence, but it does not establish that the provider-managed physical backup is restorable, and it does not prove full owner/default-ACL parity for a physical restore.

The cutover is blocked until this provider-specific question is resolved. No Production schema, data, ACL, or migration-ledger changes are authorized as part of this request.

## Evidence to request / record

- Exact source project ref and selected backup timestamp/identifier.
- Whether the backup is complete and eligible for restore.
- Provider restore result, or an approved alternative validation procedure.
- If a temporary target is offered: target ref, region, start/end timestamps, cost confirmation of $0, and deletion confirmation.
- Any known limitations affecting database roles, extensions, Vault/encrypted columns, Storage objects, or other Supabase services.
- A support case ID and written response suitable for attaching to the BETHAG cutover evidence.

## Decision rule

If Supabase cannot offer a zero-cost provider restore or equivalent acceptable evidence, keep the physical-restore release gate **BLOCKED**. Do not reinterpret the logical dump restore as proof, create a paid project, or perform an in-place Production restore to clear the gate.
