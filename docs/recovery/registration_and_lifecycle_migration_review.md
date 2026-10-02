# Follow-up migration dependency and behavior review

**Scope:** static review of selected migration files on `bethag-migration-repair`. Documentation only. No SQL replay, database writes, QA reset, production changes, merge, or deployment.

## Confirmed observations

1. **Portal registry is still a fragment.** `20260928050000_reconstruct_portal_access_registry.sql` creates `public.portal_access` with foreign keys to `workspaces`, `condominiums`, `condominium_members`, and `profiles`, and policies/functions that depend on private authorization helpers. The file itself states that it is not the complete public-schema baseline. It cannot safely stand alone as a foundational migration.

2. **Registration implementation changes across successive migrations.** `20260928153242_add_condomino_registration_workflow.sql` creates the request table and placeholder RPCs that deliberately raise exceptions pending replacement. `20260928153301_fix_portal_registration_upsert.sql` replaces the registration RPC but its portal insert uses `ON CONFLICT (id)`, while a separate unique identity index is defined on workspace, condominium and normalized email. `20260928153526_route_unmatched_registration_single_workspace.sql` changes the upsert target to `ON CONFLICT (workspace_id, condominium_id, email)`, relying on a matching unique constraint/index and the exact email representation.

3. **Email-mismatch behavior is not self-contained in the migration.** `20260928154000_handle_registration_email_mismatch.sql` adds `email_mismatch` to the request status constraint, but the remaining SQL is explanatory comments stating that the registration and approval functions were updated in the database. This migration file does not itself define those updated function bodies. The behavior therefore requires separate source recovery or database-to-repository semantic reconciliation; the comments alone are not executable evidence.

4. **Portal email identity has normalization sensitivity.** The migration sequence creates an index on `lower(trim(email))`, then drops it and creates a unique index on the raw `email` column. Earlier portal code uses lower/trim comparisons and normalized emails. This difference should be reconciled against actual stored values, all insert/update paths, and production constraints before certifying duplicate prevention. No data was modified or test attempted.

5. **The condominium delete RPC conflicts with the archive/history requirement unless intentionally restricted.** The early RPC deletes members, portal access, documents, deadlines, assemblies, suppliers, activities, communications, requests and the condominium itself. It should not be treated as the normal archive action. Any retained hard-delete path needs explicit authorization, dependency-aware retention rules, and isolated tests proving financial/audit history cannot be lost.

6. **Millesimal migration performs a data update.** `20260929170500_remove_member_millesimi.sql` removes the `millesimi` JSON key from condominium-member rows. This aligns with the intended unit-based model, but replay assessment must include a backup/rollback strategy and verify that unit-level millesimal allocations are present and reconciled before the legacy values are removed.

## Dependency/QA disposition

- This is a **targeted static review**, not an exhaustive semantic audit.
- No migration was replayed and no role-based registration flow was runtime-tested.
- Registration should be tested in an isolated disposable database for: one exact match; no match; multiple matches; mismatched email; repeat submission; case/whitespace variants; already-linked user; multiple condominiums/workspaces; and manager approval/rejection.
- Before baseline certification, recover or explicitly classify missing function bodies, reconcile email identity/index semantics, inventory every dependency of the core schema and private helpers, and verify the complete migration sequence against read-only production snapshots.
- Production remains read-only. Do not execute this review as SQL or promote it to `main` without separate review and explicit authorization.
