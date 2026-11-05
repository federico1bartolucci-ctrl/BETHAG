# Live migration payload archive — 2026-11-05

## Purpose

This archive restores the exact SQL payloads recorded in the live Supabase migration registries but absent from the current `main` source tree. These files are historical evidence, not pending migrations. **Do not replay them manually or place them in `supabase/migrations/`.**

## Recovery method

Each payload was read read-only from `supabase_migrations.schema_migrations.statements[1]` in the corresponding live project, then written to this repository. The archived file was fetched back from GitHub and its PostgreSQL `md5()` was compared with the live registry payload. All three comparisons matched exactly.

| Environment | Version | Registry name | Archived path | Characters | MD5 |
|---|---:|---|---|---:|---|
| QA `jhuyhlzzydcgghrzeexn` | `20261104235514` | `fix_portal_registration_upsert_conflict_target` | `supabase/rebuild/qa-only/20261104235514_fix_portal_registration_upsert_conflict_target.sql` | 11247 | `b071801d3f70bf526acc08cb057ab066` |
| QA `jhuyhlzzydcgghrzeexn` | `20261105001928` | `align_qa_fund_availability_view_acl` | `supabase/rebuild/qa-only/20261105001928_align_qa_fund_availability_view_acl.sql` | 1610 | `3f3e7adb08512f542978a2f6ef6b473e` |
| Production `tctcgptrsmvgajqjgnev` | `20261104222229` | `reconcile_production_acl_least_privilege` | `supabase/rebuild/production-forward-migrations/20261104222229_reconcile_production_acl_least_privilege.sql` | 3843 | `578f19a683e993e3a1202bf2b08809b9` |

## Important classification

- The two QA files are QA-only payloads and must not be promoted to Production merely to equalize migration-ledger counts.
- The Production ACL payload is Production-only and must not be replayed in QA.
- The branch `fix/qa-view-acl-parity-20261105` also contains a later reviewed portal-registration reconciliation migration `20261105050000_reconcile_portal_registration_upsert.sql`. That is a subsequent forward repair/reconciliation artifact, not the original `20261104235514` payload. The original payload is now preserved separately above.
- The exact payloads are archived for audit/reconciliation only. This commit does not modify either Supabase database, migration registry, schema, ACL, or application data.

## Verification outcome

- Live registry rows found: 3/3.
- Exact live-payload to GitHub-archive MD5 comparisons: 3/3 PASS.
- Database writes or migration applications: none.
- Production changes: none.
- QA changes: none.
