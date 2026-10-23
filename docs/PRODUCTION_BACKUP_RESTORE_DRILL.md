# BETHAG — Production backup and restore drill

Status: **not yet executed; release blocker**  
Production project: `tctcgptrsmvgajqjgnev`  
Scope: verify recoverability without modifying Production.

## Non-negotiable safety rules

- Do not run restore, reset, migration repair, `db push`, or schema/data writes against Production as part of this drill.
- Use a separate, explicitly identified recovery project or isolated PostgreSQL 17 instance. Confirm its project reference/host before connecting.
- A dashboard indication that backups exist, a backup timestamp, or a successful export is **not** proof of recoverability. The gate passes only after a restore has completed and post-restore checks have succeeded.
- Do not place database passwords, access tokens, connection strings, or unredacted secrets in GitHub, this repository, logs, or the evidence report.
- Do not set `BETHAG_PRODUCTION_BACKUP_VERIFIED=YES` until all required evidence below is recorded and reviewed.

## Procedure

### 1. Identify the recovery point

Record, using the Supabase dashboard or the actual backup mechanism enabled for this project:

- Production project reference and region.
- Backup/PITR mechanism and the exact recovery point timestamp, including timezone.
- Backup creation/completion status and the retention/availability window shown by the platform.
- Whether the chosen restore method restores into a new project or an isolated instance.
- Any required extensions, secrets, auth configuration, storage objects, and external dependencies that are not included in a database-only backup.

If no supported method is available to obtain or restore a recovery point into an isolated target, stop and record the blocker; do not improvise against Production.

### 2. Restore to an isolated target

- Create/select a dedicated non-Production recovery target.
- Verify the target project reference/host twice before starting.
- Restore the selected recovery point using the supported Supabase workflow for the project's backup type, or restore the downloaded backup into an isolated PostgreSQL 17 instance using the matching supported PostgreSQL restore tooling.
- Capture start/end timestamps, restore result, target identifier, and sanitized logs.
- Keep Production untouched throughout.

### 3. Validate the restored target

Run read-only checks against the restored target and record results:

- Database is reachable and expected schemas/extensions exist, including `public`, `private`, and `btree_gist` where required.
- Expected relation inventory: 48 public relation-like objects (47 tables plus one view), unless the selected recovery point predates a documented schema change.
- Expected application functions: compare the restored `public` and `private` function inventory and definitions against the captured recovery-point catalog; do not assume current counts apply to an older point without accounting for migrations.
- RLS enabled state, policies, triggers, constraints, indexes, owners, grants, and default ACLs are readable and internally consistent.
- Migration history can be read and reconciled to the recovery-point timestamp; preserve the historical ledger rather than rewriting it during the drill.
- Run non-destructive application smoke checks against the isolated target only. Never point the live application at the recovery target.
- Record any missing data/dependencies and whether they are in scope for the chosen recovery method.

A successful database restore alone does not prove that external storage files, auth configuration, edge functions, secrets, DNS, or third-party integrations are recoverable. Mark each dependency as restored, separately backed up, or an explicit residual risk.

### 4. Evidence required to close the gate

Attach or record in the release evidence (with secrets redacted):

- Recovery point timestamp and backup mechanism.
- Isolated target identifier (not credentials).
- Successful restore completion evidence and duration.
- Validation query output / object inventory and application smoke-test result.
- Differences found and their disposition.
- Reviewer and date/time of attestation.

The gate remains **FAIL / BLOCKED** if the restore was not actually performed, the target cannot be identified, core schema/security checks fail, or evidence is incomplete.

## Evidence record — fill only after execution

- Status: NOT RUN
- Production project reference: `tctcgptrsmvgajqjgnev`
- Recovery point timestamp:
- Backup/PITR mechanism:
- Isolated target reference/host:
- Restore started / completed (timezone):
- Restore result:
- Schema/security inventory result:
- Application smoke-test result:
- External dependencies checked:
- Differences / remediation:
- Evidence location (no secrets):
- Reviewer and attestation timestamp:

## Current disposition

This runbook defines the drill; it is not evidence that a backup has been restored. Until the fields above are completed from an actual successful isolated restore, Production release and migration-history cutover remain blocked.
