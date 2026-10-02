# BETHAG — QA gates and migration replay readiness (2026-10-01)

## Scope
Read-only review of the repository's package scripts and the reconstructed portal registry migration. This note documents release gates; it does not apply SQL, alter Supabase projects, merge a pull request, or deploy.

## Confirmed repository evidence
- The inspected `package.json` defines `dev`, `build`, and `preview` scripts only.
- No test, lint, typecheck, or end-to-end script is defined in that manifest.
- `20260928050000_reconstruct_portal_access_registry.sql` explicitly identifies itself as a reconstructed fragment, not the complete public-schema baseline.
- The fragment references prerequisite objects including `workspaces`, `condominiums`, `condominium_members`, `profiles`, and `private.can_manage_workspace_module`. Their existence and compatible definitions must be established before replay.
- Production and development schema/RPC inventories differ materially; development must not be treated as a production-equivalent test target.

## Required gates before launch certification
1. **Recover authoritative migration sources:** locate original baseline and grant migrations, or establish a complete, reviewed baseline from a trusted source. Keep reconstructed SQL clearly marked as reconstructed.
2. **Dependency audit:** for each migration, inventory referenced tables, columns, types, extensions, schemas, functions, triggers, policies, grants, and seed data; order dependencies and identify destructive or data-transforming operations.
3. **Clean isolated replay:** replay the complete migration chain on a disposable isolated QA project/database, not production. Record exact commit, migration versions, failures, and resulting schema inventory.
4. **Schema parity:** compare resulting tables, views, indexes, constraints, functions/RPCs, triggers, RLS policies, grants, and storage policies against the intended production contract.
5. **Runtime authorization tests:** exercise anonymous, resident, council, collaborator, and administrator identities across condominium/workspace boundaries; include direct API calls, not only UI visibility.
6. **Critical workflow tests:** registration/invitation, condominium creation and persistence, unit/person associations, millesimi, allocations, installment generation/payment/reversal, fiscal-year closure/carryovers, document access, communications, archive/restore, and member transfer/rogito.
7. **Transfer integrity:** test all permitted statuses and ensure confirmation/closure is atomic, accounting history remains immutable, open balances are handled explicitly, and outgoing resident sessions/access are revoked without affecting unrelated managers.
8. **Frontend quality gates:** add and run typecheck, lint, unit/integration tests, and browser E2E for desktop and mobile; test refresh/deep links, persistence, validation, error states, and role-based navigation.
9. **Operational readiness:** verify backups/restore, monitoring, email delivery, storage limits, privacy/data-retention controls, incident response, and production rollback procedures.
10. **Release approval:** review the exact PR diff and CI evidence; only then explicitly authorize merge and deployment.

## Current disposition
**Not launch-certified.** Repository documentation and read-only inventory can continue without production impact. A full replay/runtime test still requires a complete trusted baseline and an isolated environment. No production SQL or deployment was performed as part of this review.
