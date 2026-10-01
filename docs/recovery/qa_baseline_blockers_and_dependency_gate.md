# BETHAG — QA baseline blockers and dependency gate

**Date:** 2026-10-01  
**Branch:** `bethag-migration-repair`  
**Scope:** read-only source inspection and QA planning  
**Production:** no schema, data, grant, or migration changes performed.

## Purpose

Record the evidence needed before a clean isolated QA database can be considered suitable for migration replay or workflow testing. This file is an audit note only; it is not executable SQL and must not be applied to a database.

## Findings

### 1. The original grant-hardening migration is not available on this branch

The production migration history includes `20260928043547_restrict_data_api_table_grants`, but the corresponding version-prefixed SQL file is absent from `supabase/migrations` on this recovery branch. A fetch by the exact path returns not found. The missing source must be recovered from trustworthy history or artifacts; it must not be recreated by guessing its grant statements.

### 2. The portal registry file is a reconstructed fragment, not a baseline

`20260928050000_reconstruct_portal_access_registry.sql` creates `public.portal_access` from catalog observations, but its own header identifies it as a fragment rather than a complete public-schema baseline. It depends on foundational objects already existing, including `public.workspaces`, `public.condominiums`, `public.condominium_members`, `public.profiles`, and `private.can_manage_workspace_module`. Its RLS policies also depend on the relevant condominium archive fields and authentication helpers. Consequently, it cannot independently repair a clean-database replay failure.

The production table snapshot includes the portal registry and its indexes, but the snapshot explicitly states it is not replay-safe. Catalog reconstruction is useful evidence, not a substitute for a reconciled chronological migration set.

### 3. The current SQL test file is primarily catalog-assertion coverage

`supabase/tests/rls_policies.test.sql` contains pgTAP assertions for function privileges, selected RLS enablement/policy names, and selected indexes. It does not create synthetic authenticated identities or exercise the transfer lifecycle, installment reconciliation, cancellation, concurrent confirmation, pre-existing sessions, or cross-workspace data access at runtime.

The file also asserts a fixed set of 15 named tables and selected policy names. Passing such assertions would not, by itself, establish comprehensive RLS isolation or application correctness.

## QA baseline gate — required before execution

- [ ] Recover original initial schema and grant-hardening migration content from a trustworthy source, or explicitly classify each as unavailable.
- [ ] Reconcile the full production migration history against repository files by version and semantic content; distinguish exact, equivalent, partial, missing, and unresolved entries.
- [ ] Order all prerequisites and dependencies, including schemas, extensions, tables, enums/domains, helper functions, triggers, RLS policies, grants, views, and storage/function configuration where applicable.
- [ ] Compare the proposed replay result with the read-only production catalog snapshots; investigate every unexplained difference.
- [ ] Review reconstructed fragments individually and mark them as reconstructed, verified, or unresolved; do not silently promote them to canonical migrations.
- [ ] Establish a disposable, isolated QA project/database with synthetic identities and data only.
- [ ] Replay the reconciled baseline there and capture the first failure with migration version, SQLSTATE, dependency, and reproducible steps.
- [ ] Run schema/catalog assertions and role-based runtime tests separately; record expected and actual outcomes.
- [ ] Only after the gate passes, prepare the transfer lifecycle correction as a separate QA-only migration and run its focused regression matrix.

## Explicit exclusions

- No SQL in this note is executable.
- Do not reset the existing failed QA branch/project as a shortcut.
- Do not replay migrations on production.
- Do not modify production schema, records, grants, or migration history.
- Do not merge recovery work into `main` or deploy it without separate review and explicit authorization.

## Current disposition

**Baseline status: blocked / not certified.** The known missing original migration and the reconstructed portal fragment prevent claiming a complete, replayable baseline. The next work item is source recovery and semantic reconciliation, not running migrations against production or attempting another broad rebuild.
