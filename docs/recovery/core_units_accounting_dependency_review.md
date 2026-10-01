# Core schema, unit lifecycle and accounting dependency review

**Scope:** static review of selected migration files on `bethag-migration-repair`. This is a review note, not executable SQL. No replay, database writes, QA reset, production changes, merge, or deployment were performed.

## Findings

### 1. Unit base schema is restored late in the available sequence
`20261001180000_restore_condominium_units_base.sql` creates `public.condominium_units` and adds `condominium_members.unit_id`. Earlier files in the branch already reference or modify these objects, including `20260929165000_complete_condominium_units.sql` (updates/inserts units), `20260929230350_harden_millesimal_allocation_integrity.sql` (allocation and millesimal constraints), and `20261001095000_add_unit_cadastral_transformations.sql` (transformation items reference units and add lifecycle columns). Unless the base objects are created by another earlier migration in the full sequence, a clean chronological replay can fail before reaching the late restoration. This is a strong dependency-order blocker to resolve by full-file semantic inventory and disposable replay, not by moving/rewriting migrations speculatively.

### 2. Unit identity has overlapping unique indexes
The restored base defines several unique indexes over condominium/unit code, including normalized unit code and building+unit code forms. Their exact overlap and intended uniqueness semantics need reconciliation. In particular, a global-per-condominium normalized unit-code unique index can conflict with a building-scoped identity design if identical unit labels are valid in separate buildings. Validate against the actual product data model and historical data before retaining or changing any index.

### 3. Unit population migration is data-changing
`20260929165000_complete_condominium_units.sql` infers unit counts, normalizes legacy unit labels, and inserts missing unit rows. It is designed not to delete existing units, but its effects depend on the accuracy of condominium `data->>'units'`, unit-code normalization, and whether garages/storage/parking spaces are represented independently. Requires isolated fixture tests for empty, partially populated, duplicate, multi-building, and independent-pertinence cases.

### 4. Millesimal/accounting constraints require preflight checks
`20260929230350_harden_millesimal_allocation_integrity.sql` adds uniqueness and nonnegative/paid-amount checks. `20260929230529_harden_accounting_delete_and_allocation_scope.sql` prevents deletion of paid installments/allocations and units with linked allocations or installments. These are relevant integrity protections, but a migration replay may fail if existing rows violate the new constraints. Run read-only preflight queries against a disposable copy or approved sanitized snapshot before any future migration execution.

### 5. Resident visibility relies on linked portal and member identity
`20260929201500_fix_resident_portal_rls.sql` broadens matching to explicit user links or email equality. `20261001180000_restore_condominium_units_base.sql` later introduces resident unit visibility by joining portal access, active members and unit IDs. Correct behavior depends on consistent `user_id`, normalized email, active flags, condominium scope and unit linkage. Runtime RLS tests with distinct admin, collaborator, resident, council, tenant and unrelated users are still required.

### 6. Hard delete is explicitly destructive, distinct from archive
`20260930210000_complete_condominium_hard_delete.sql` implements an authorized, optional security-code-protected hard delete and explicitly deletes accounting, millesimal, portal, operational and audit rows. It is not equivalent to archive and must remain a separate exceptional workflow. Its complete FK coverage, storage-object cleanup, retention obligations, audit expectations and recoverability are not certified by this static review. Normal condominium lifecycle should use archive/restore; hard delete needs separately approved policy and isolated tests.

## Next verification gate

- Produce a complete ordered inventory of all migration operations and object dependencies, distinguishing create/alter/drop/data update/function replacement/policy/grant/trigger/index.
- Resolve whether unit base schema exists before first reference; do not infer that a late restoration is harmless.
- Reconcile unique unit indexes with multi-building and autonomous pertinence rules.
- Validate all new checks against existing data in an isolated environment.
- Replay only after the complete baseline and prerequisites are recovered, recording the first failure without applying changes to production.
- Run role-based RLS and lifecycle tests in disposable QA; keep production read-only and `main` untouched pending review and explicit authorization.

**Disposition:** core schema / migration ordering not certified; QA baseline remains blocked.