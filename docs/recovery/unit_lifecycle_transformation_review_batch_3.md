# Unit lifecycle and cadastral transformation review — batch 3

Branch: `bethag-migration-repair`  
Scope: static review of six transfer/transformation migrations fetched from `supabase/migrations`.  
Disposition: documentation only. No SQL replay, runtime QA, production write, reset, merge, or deploy.

## Files reviewed

- `20261001093000_transfer_current_owner_and_portal_lifecycle.sql`
- `20261001120000_transfer_lifecycle_keep_outgoing_active.sql`
- `20261001130000_validate_unit_transformation_preview_inputs.sql`
- `20261001133000_guard_confirmed_unit_transformation_integrity.sql`
- `20261001140000_lock_confirmed_unit_transformation_audit.sql`
- `20261001150000_require_trusted_unit_transformation_confirmation.sql`
- `20261001153000_require_confirmed_genealogy_for_unit_lifecycle.sql`
- `20261001160000_validate_confirmed_unit_transformation_genealogy.sql`
- `20261001170000_require_active_units_for_transformation_confirmation.sql`
- `20261001173000_require_resolved_reviews_for_confirmed_unit_transformations.sql`

## Findings

### Ownership transfer and accounting continuity

- The transfer confirmation routine validates the unit/workspace, module permission, condominium archive status and active outgoing member; it captures an accounting snapshot and creates an incoming member plus a transfer record.
- The first reviewed version deactivates the outgoing portal access and workspace membership while retaining the outgoing member row for financial history. The later lifecycle version instead leaves the outgoing position active with a closing marker and separates final closure from confirmation. This evolution must be assessed against the effective final function and portal access policies, not treated as two independent workflows.
- The confirmation routine accepts an incoming user ID and email, but the reviewed body does not independently establish that they represent a verified, unique identity. QA must test null/unverified IDs, duplicate emails, an incoming person already linked elsewhere, and authorization to link that identity.
- The snapshot records amounts due/paid/residual and allocations as of the transfer date. Confirm whether every relevant accounting object is covered (including schedules, carryovers, legal cases, manual adjustments and later payments), and verify date semantics, precision and consistency with the ledger.
- Final closure checks outstanding installments, allocations and carryovers, then archives the outgoing member and marks the transfer closed. These checks are not visibly date-limited in the reviewed closure function; confirm intended treatment of post-transfer items and prevent closure where later postings remain attributable to the outgoing position.
- Duplicate transfer protection is a read-before-insert check. Test concurrent confirmations for the same unit/date and require a database-level uniqueness or locking strategy if concurrent calls can pass the check together.
- The transfer status constraint remains a known cross-migration concern: production catalog review found two CHECK constraints with conflicting allowed values, one excluding `Chiuso`. This batch's lifecycle migration drops/recreates `condominium_member_transfers_status_check`, but does not remove the separately named `condominium_member_transfers_status_ck`. Clean QA replay and catalog inspection must establish whether closure remains blocked before any corrective migration is considered.

### Transformation preview and confirmation integrity

- The preview function checks condominium/type/source selection, duplicates, active source units, ownership summary, open accounting, millesimal values and review flags. It is a preview, not a reservation or lock: data may change between preview and confirmation, so confirmation must repeat authoritative checks transactionally.
- Confirmed transformation records require confirmer/timestamp and counts consistent with fusion or split. A further trigger validates actual genealogy links, their uniqueness and condominium/workspace scope.
- The subsequent active-unit guard requires all source and destination units to be active at confirmation. Check whether destination units are created and activated in the same trusted transaction and whether trigger ordering supports that workflow.
- Confirmed transformation headers and genealogy items are made immutable. The trusted-confirmation trigger rejects direct client confirmation unless the effective database role is `postgres`; verify the actual owner and execution context of the intended SECURITY DEFINER confirmation RPC in QA, including service-role calls and function grants.
- Unit lifecycle changes are constrained to genealogy-backed transitions and require a matching effective date. Reactivation is reserved to a trusted routine. Confirm every legitimate lifecycle operation has a supported authorized RPC and that direct updates cannot bypass workspace scoping.
- Confirmation is blocked until accounting review is `Non necessaria` or `Risolta`, and millesimal review is `Confermata invariata` or `Nuove tabelle`. Verify these values are produced only by authorized review flows and that invalid legacy rows do not prevent constraint validation.

## Required QA matrix

1. Transfer: same-day duplicate, concurrent duplicate, sale/date boundary, owner plus co-owner, tenant present, archived condominium, unauthorized collaborator, null/unverified/duplicate incoming identity.
2. Accounting: unpaid and partially paid installments, allocations, carryovers, payments after transfer date, storno/reversal, new charges after confirmation, closure with residual balances, idempotent retries and rollback on injected failure.
3. Portal: outgoing access revocation timing, incoming access creation, stale sessions, same email on another condominium, multiple owners per unit, and no unintended access to prior owner's records.
4. Transformations: fusion of two/many units, split into two/many units, duplicate source IDs, cross-condominium/workspace IDs, inactive/stale units, changed data after preview, missing/duplicate genealogy rows, wrong direction/counts, and failed atomic confirmation.
5. Lifecycle: source retirement on effective date, unauthorized status/date edits, reactivation, deletion of historical units, immutable confirmed header/items, and review status tampering.
6. Schema: inspect every CHECK constraint on transfer status, trigger names/order, RPC owner/search_path/execute grants, FK/index coverage and clean replay dependencies.

## Conclusion

The reviewed SQL encodes important safeguards for accounting continuity, portal access, transformation genealogy and immutability. Static inspection also identifies unresolved verification points, especially transfer-status constraint overlap, identity validation, concurrent duplicate prevention, accounting coverage/date boundaries, and trusted-RPC execution context. None is runtime-certified by this review. The migration baseline remains blocked pending complete semantic reconciliation and isolated QA replay; this document is not an executable migration.
