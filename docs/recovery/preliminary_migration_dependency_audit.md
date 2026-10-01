# BETHAG — Preliminary migration dependency audit

**Date:** 2026-10-01  
**Branch:** `bethag-migration-repair`  
**Scope:** static inspection of selected early migrations; documentation only.  
**Database safety:** production remains read-only; no migration or QA reset executed.

## Purpose

Identify dependency patterns that can explain why a clean QA replay is not yet reproducible. This is a preliminary, file-level audit, not a semantic certification of all migration SQL.

## Observed dependency clusters

### 1. Foundational schema is assumed, not established by the selected early files

The recovery branch starts its available migration sequence at `20260928050000_reconstruct_portal_access_registry.sql`. That file explicitly describes itself as a reconstructed fragment, not the full public-schema baseline. It creates `public.portal_access` while depending on existing workspace, condominium, member, profile, helper, and authentication structures.

Consequently, this file cannot independently bootstrap a clean database. Its successful application presupposes foundational objects and authorization helpers that must be supplied by a trustworthy earlier baseline.

### 2. Portal registry and registration workflow

The inspected registration sequence demonstrates direct dependencies:
- `20260928050000_reconstruct_portal_access_registry.sql` creates the portal registry fragment.
- `20260928153242_add_condomino_registration_workflow.sql` creates `portal_registration_requests` and refers to workspaces, profiles, and condominium members; it defines registration/approval functions.
- `20260928153246_add_portal_access_unique_identity.sql` adds an index on `portal_access`.
- Subsequent migrations replace registration functions, adjust the request status constraint, and revise portal permission/access helpers.

This is an ordering-sensitive cluster. The fragment's existence does not prove that its columns, keys, constraints, grants, policies, or supporting functions match every later migration's expectations.

### 3. RPC and workspace authorization

The inspected early RPC migrations expose or replace functions such as `claim_first_workspace_admin`, `save_condominium`, and `delete_condominium`. The collaborator permission migration defines `private.can_manage_workspace_module`. These function definitions assume the corresponding workspace, profile, condominium, membership, and private helper model already exists.

They therefore belong after the core schema and authorization primitives, not at the start of an empty database.

### 4. Units, millesimi, accounting, and portal RLS

Selected later migrations alter or harden existing unit, member, allocation, installment, and portal authorization objects. Examples include completing declared units, removing legacy member-level millesimi, hardening allocation integrity, synchronizing payment status, and revising resident/council access helpers.

Their names and SQL operations indicate that they are incremental changes to pre-existing application structures. They must be reconciled against the complete current schema before replay; applying them in timestamp order alone does not establish a valid baseline.

## Preliminary dependency gate

| Layer | Required evidence before isolated replay | Current disposition |
|---|---|---|
| Core schemas, tables, enums, sequences, extensions | Authoritative original migrations or reconciled schema source | **Blocked / incomplete** |
| Private helpers and authorization primitives | Definitions, dependencies, owners, grants, search paths | **Partially inventoried; not fully certified** |
| Portal registry and registration | Verified base table plus exact dependent function/index/policy definitions | **Fragment present; dependency-sensitive** |
| RPCs and workspace permissions | Core object map and function-by-function dependency order | **Not certified** |
| Units, millesimi, accounting | Schema and constraint reconciliation, then isolated replay | **Not certified** |
| RLS, grants, triggers, views | Complete definitions and role-based behavioral test plan | **Partially inventoried; runtime tests pending** |
| Application test harness | Reproducible build/typecheck/test commands and test fixtures | **Not established by the migrations audit** |

## What this audit does and does not establish

- It establishes concrete dependency patterns in the selected files by static inspection.
- It does not prove every dependency or classify all 132 migration files.
- It does not prove semantic equivalence between branch migrations and production migration history.
- It does not validate SQL against a clean PostgreSQL/Supabase instance.
- It does not certify runtime behavior, RLS boundaries, or accounting correctness.
- It does not authorize changes to production or `main`.

## Next safe step

Continue with a complete inventory of migration filenames and object operations, then reconcile each production migration-history record to an exact source or an explicitly unresolved item. Where SQL source is missing, do not fabricate it: derive a separately reviewed reconstruction candidate from verified catalog snapshots, mark assumptions, and test it only in a disposable isolated QA environment after the baseline dependencies are closed.

## Safety disposition

No production write, migration execution, QA reset, merge, or deployment was performed. This document is an audit note only.
