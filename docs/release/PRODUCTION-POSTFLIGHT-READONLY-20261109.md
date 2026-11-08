# BETHAG — Production post-cutover read-only verification

**Date:** 2026-11-09  
**Project:** `tctcgptrsmvgajqjgnev`  
**Method:** Supabase SQL connector, read-only SELECT/catalog inspection and a read-only DO postflight block. No Production writes were issued during this verification.

## Observed live state

- Migration ledger: **267 rows**, sorted head `20261105050000`.
- Frozen historical snapshot `production-ledger-20261105.json`: **248/248 exact version/name pairs preserved**, zero mismatches.
- Frozen canonical incremental sequence: **19/19 exact version/name pairs present** in the live ledger.
- `public.workspace_members.data`: present as JSONB; `public.condominium_units`: present.
- Public RLS policy count: 103.
- Production unit rows: 65 across the workspace.
- Condominio Aurora (legacy ID 1): **24 units associated** with its condominium database ID and workspace.
- The owner independently confirmed the iPhone UI displays all 24 Aurora units and no longer displays the temporary orange diagnostic panel.

## Read-only postflight

The reviewed SQL checks in `production-cutover-postflight-20261105.sql` were executed as a read-only DO block. The block completed without a SQL exception. Its assertions cover:

- 47 public relations and current/default table privileges;
- no MAINTAIN privileges for authenticated/service_role;
- no anon direct table privileges and no unexpected PUBLIC EXECUTE;
- transfer wrapper SECURITY INVOKER and private invocation grants;
- exact 267-row ledger head and all 19 canonical migration identities;
- `workspace_members.data` JSONB NOT NULL/default contract;
- portal-registration RLS policy and helper wiring;
- archive/restore authorization guards and preservation of archive metadata;
- co-owner incoming-transfer trigger and SECURITY INVOKER posture;
- collaborator permissions requiring explicit JSON boolean true;
- private RPC grants and provider-managed `supabase_admin` default ACL exception.

## Important limits / remaining release gate

This evidence establishes the **current live schema/ledger postconditions**, not the identity of the operator or the exact local guarded-runner invocation that produced the live state. The connector does not expose the operator's local runner transcript.

**APP-14 remains OPEN/PARTIAL:** authenticated Production smoke tests have not been performed by this verification. They must use existing approved administrator, collaborator and resident test identities and remain non-destructive. Verify login, workspace/condominium listing, role/module boundaries, resident-only portal scope, and absence of cross-workspace access. Do not create or alter real condominium records.

Production release remains **NO-GO for general launch** until APP-14 authenticated smoke tests and the remaining operational sign-offs are evidenced. No claim is made that provider-managed physical restore has been tested.


## Supabase Advisor review — 2026-11-09

Fresh Production Advisor calls after the postflight returned:

- **Security Advisor:** 0 lints.
- **Health Advisor:** 0 lints.
- **Performance Advisor:** informational/warning findings only: 59 unused-index notices, 21 multiple-permissive-policy notices, and 1 Auth connection-allocation information notice.

No performance finding was remediated in this pass. Unused-index notices are not sufficient evidence to drop indexes, and consolidating permissive RLS policies would change security-sensitive behavior; both require separate workload/policy analysis and isolated regression tests. These findings do not override the clean Security and Health Advisor results, but should be reviewed after launch-readiness or in a separately scoped optimization task.

## APP-14 execution boundary

The repository contains QA-only credentials/workflows and explicitly pins those workflows to the QA project. They were not repurposed against Production. No approved Production test identities or authentication method were available to this verification session. Therefore no Production sign-in was attempted and no real resident/workspace data was touched. APP-14 remains **PARTIAL / NO-GO** until the project owner supplies or operates approved Production test identities and records the non-destructive role smoke-test evidence.
