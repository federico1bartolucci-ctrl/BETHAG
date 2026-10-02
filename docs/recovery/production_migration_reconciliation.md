# Production migration reconciliation — recovery branch

Date checked: 2026-10-01  
Production project: `tctcgptrsmvgajqjgnev` (catalog/history read-only)  
Repository branch: `bethag-migration-repair`

## Observed counts
- Supabase production migration history: 153 entries.
- `supabase/migrations` files on the recovery branch: 132.
- Exact filename/version matches against production history: 10.

## Confirmed gaps requiring investigation
The following production migration versions are recorded in the production history but their exact version-prefixed filenames are not present in the recovery branch directory:
- `20260928021707_initial_bethag_backend`
- `20260928043547_restrict_data_api_table_grants`

The branch contains similarly themed or later recovery files, but these are not substitutes for the missing original migration contents. In particular, `20260928050000_reconstruct_portal_access_registry.sql` is a reconstructed artifact and has not been validated or executed.

## Interpretation and limitations
- Migration history versions and repository filenames do not align reliably; some branch filenames use different timestamps or descriptive names. Therefore, the count of exact matches is a strict filename/version comparison, not proof that every other migration is absent or that the SQL differs.
- Do not replay production migration history onto production or reset/rebase the failed QA branch as part of this reconciliation.
- No production DDL, DML, grants, or migration changes were executed for this report.
- The recovery branch remains a documentation/reconstruction workspace. Any executable baseline must be checked against schema snapshots, policies, function definitions, triggers, dependencies, and a clean isolated database before it can be considered replayable.
- This report does not certify launch readiness.

## Next safe steps
1. Recover or identify the original initial migration and grant-hardening migration from trustworthy repository history or project artifacts.
2. Build a version-to-file reconciliation using migration history plus semantic/name matching, marking each entry as exact, likely equivalent, missing, or unresolved.
3. Validate the baseline on a fresh isolated database only after the source set and dependencies are reconciled.
4. Keep production read-only until a separately reviewed, explicit deployment approval.
