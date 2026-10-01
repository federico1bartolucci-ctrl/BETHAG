# BETHAG — Migration branch delta review (2026-10-01)

## Scope and method
Compared the filenames returned by GitHub for `supabase/migrations` on `main` and `bethag-migration-repair`. This is a filename-level inventory only; it does not establish SQL equivalence, dependency correctness, successful replay, or runtime safety.

## Inventory
- `main`: 121 migration files.
- `bethag-migration-repair`: 132 migration files.
- The repair branch has no duplicate 14-digit migration versions in the inspected directory.
- `main` has four duplicate-version collisions:
  - `20260930110000_accounting_consumption_and_installment_percentages.sql` / `20260930110000_allocation_criteria_scope.sql`
  - `20260930200000_clean_deleted_member_owner_references.sql` / `20260930200000_harden_payment_movements_access.sql`
  - `20260930210000_complete_condominium_hard_delete.sql` / `20260930210000_validate_allocation_rule_scope.sql`
  - `20261001110000_add_member_transfer_accounting_snapshot.sql` / `20261001110000_harden_current_owner_installment_generation.sql`

## Differences
The repair branch uses unique timestamps for the four colliding migrations above:
- `allocation_criteria_scope`: `20260930110100`
- `harden_payment_movements_access`: `20260930200500`
- `validate_allocation_rule_scope`: `20260930210500`
- `harden_current_owner_installment_generation`: `20261001110500`

The repair branch also contains 11 files not present on `main`:
- `20260928050000_reconstruct_portal_access_registry.sql`
- `20261001130000_validate_unit_transformation_preview_inputs.sql`
- `20261001133000_guard_confirmed_unit_transformation_integrity.sql`
- `20261001140000_lock_confirmed_unit_transformation_audit.sql`
- `20261001145000_create_portal_access_registry.sql`
- `20261001150000_require_trusted_unit_transformation_confirmation.sql`
- `20261001153000_require_confirmed_genealogy_for_unit_lifecycle.sql`
- `20261001160000_validate_confirmed_unit_transformation_genealogy.sql`
- `20261001170000_require_active_units_for_transformation_confirmation.sql`
- `20261001173000_require_resolved_reviews_for_confirmed_unit_transformations.sql`
- `20261001180000_restore_condominium_units_base.sql`

The four former timestamp-collision filenames from `main` are absent under their old names in the repair branch; confirm the SQL contents are retained and review any ordering-sensitive behavior before integration.

## Assessment
- The timestamp collision cleanup is confirmed at the filename level on the repair branch.
- The branch delta includes additional portal-registry and unit-transformation integrity migrations. Their SQL must be reviewed for dependencies, idempotence, constraints, triggers, grants, and interaction with earlier migrations.
- The reconstructed portal registry file is explicitly a fragment, not a complete baseline. It must not be mistaken for the missing authoritative starting schema.
- This directory comparison is not a migration replay test. No database was changed and no migration was applied.

## Next gates
1. Diff the four renamed SQL files against their main-branch counterparts to prove content preservation.
2. Review each of the 11 additional SQL files and build a dependency/order matrix.
3. Recover the complete trusted baseline, then replay all migrations in a disposable isolated environment.
4. Run schema parity, runtime RLS, accounting, transfer, and frontend E2E tests before release approval.
