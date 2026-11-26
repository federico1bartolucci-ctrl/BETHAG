# BETHAG Storage backup — Cloudflare R2

Status: **Storage backup workflow completed a successful manifest write/read verification on 26 November 2026. Source bucket inventory was empty (0 objects). Guarded restore utility supports verified resume after an interrupted apply; an isolated non-empty restore drill remains pending.**

## Safety boundary

- Source: Supabase Storage bucket `bethag-documents` in Production, read-only through dedicated Supabase S3 access keys.
- Destination: a dedicated private Cloudflare R2 bucket, preferably created with EU jurisdiction.
- No database writes, migrations, Edge Function deployments, QA changes, or Production application changes are part of this backup.
- The workflow does not create or delete an R2 bucket and does not change bucket configuration.
- No paid service or resource is activated by this repository change. Obtain and review the Cloudflare quote/current pricing before creating the bucket or credentials.
- Do not add secrets to Git. Configure them only as GitHub Environment secrets in `storage-backup-production`.

## Backup design

The scheduled workflow runs every six hours and can also be manually dispatched from `main`. It is serialized and uses a protected GitHub Environment named `storage-backup-production`.

The script:
1. Reads the Supabase bucket through its S3-compatible endpoint.
2. Requires a Cloudflare API read token and verifies an enabled R2 Bucket Lock rule for prefix `backups/` with at least 2,592,000 seconds (30 days) of retention. If this gate is absent, it fails before writing any object.
3. Downloads each source object, computes SHA-256, and checks the downloaded byte count against the source listing.
4. Stores content-addressed blobs under `backups/objects/<sha256>/<generation>`. A recent copy is reused; a new generation is uploaded after 25 days so objects referenced by retained snapshots are renewed before the 30-day retention window expires.
5. Writes a timestamped JSON manifest under `backups/snapshots/`, preserving original object keys, sizes, hashes, timestamps, content headers and user metadata.
6. Reads the manifest back from R2 and compares the bytes to verify the write.

No source object is deleted or changed. The script does not call any delete API.

## Retention configuration required in Cloudflare

Before the first scheduled run, create the R2 bucket manually and configure:
- Bucket jurisdiction: EU, if available for the account.
- Public access: disabled.
- Bucket Lock rule: prefix `backups/`, type `Age`, at least 2,592,000 seconds.
- Lifecycle rule for `backups/snapshots/`: expire after 31 days.
- Lifecycle rule for `backups/objects/`: expire after 60 days.
- The backup script verifies both lifecycle rules and the Bucket Lock rule through the dedicated Cloudflare read token before uploading; if any gate is missing, it exits without writing a backup.
- The workflow first reads the bucket metadata and obtains the authoritative `jurisdiction` field. It then queries Bucket Lock with that exact jurisdiction header (omitting the header for `default`). Bucket location labels such as `EEUR` are not used as jurisdiction values. The same value selects the S3 endpoint: the standard account endpoint for `default`, or `https://<ACCOUNT_ID>.<jurisdiction>.r2.cloudflarestorage.com` for jurisdiction-scoped buckets (for example, `eu`).
- Abort incomplete multipart uploads after 1 day, if multipart uploads are enabled.

Bucket Lock is a minimum retention guard, not a deletion schedule. Lifecycle expiration is a separate configuration. The longer 60-day blob lifecycle gives manifests up to 30 days to reference a blob and leaves a safety margin. R2's S3-compatible Object Lock API is not supported; this design uses Cloudflare's separate Bucket Lock configuration API and verifies the configured rule before each backup. Confirm Cloudflare's current pricing and feature availability before applying these settings.

## GitHub Environment secrets

Create Environment `storage-backup-production` and add these secrets. Also add the Environment variable `STORAGE_BACKUP_ENABLED=true` only after the bucket, retention/lifecycle rules, secrets, and recurring cost have been reviewed and explicitly approved. Until that variable is set, scheduled and manual backup jobs are skipped.

| Secret | Value |
| --- | --- |
| `SUPABASE_S3_ENDPOINT` | `https://<production-project-ref>.supabase.co/storage/v1/s3` |
| `SUPABASE_S3_REGION` | `eu-central-1` (verified from Supabase Production project metadata) |
| `SUPABASE_S3_ACCESS_KEY_ID` | Dedicated Supabase Storage S3 access key |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | Matching Supabase Storage S3 secret |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET` | Dedicated R2 bucket name |
| `R2_ACCESS_KEY_ID` | R2 S3 token access key, scoped to this bucket |
| `R2_SECRET_ACCESS_KEY` | Matching R2 S3 token secret |
| `CLOUDFLARE_R2_READ_TOKEN` | Cloudflare API token with read-only R2 bucket/lock configuration permission |

Do not use Supabase `service_role` or publishable keys. Supabase S3 access keys are privileged Storage credentials: use a dedicated key, keep it only in the protected GitHub Environment, and rotate it if exposed.

## Cost control

Published R2 Standard rates (checked 25 November 2026): $0.015/GB-month; Class A $4.50/million requests; Class B $0.36/million requests; internet egress is free. Monthly Standard free allowance: 10 GB-month, 1 million Class A requests, and 10 million Class B requests. These allowances are account-wide and may already be consumed by other R2 usage. Above the free allowance, each additional GB-month is about $0.015/month (for example, 100 GB total with the full 10 GB allowance unused is about $1.35/month for storage, before request charges). The current Supabase Production and QA inventory contains zero Storage objects, so the initial snapshot is expected to be a small manifest only and likely remain within the free allowance if the Cloudflare account has unused quota. This is not a guaranteed quote: check the Cloudflare account's actual usage and billing before activation. The workflow itself does not create a bucket, enable billing, or purchase a plan. Do not proceed if the expected recurring cost has not been approved.

The current Production and QA inventory query returned zero objects in `bethag-documents`; this means the initial backup is expected to contain an empty manifest, but the workflow must still validate the source and destination when configured.

## Guarded restore utility

`scripts/restore-supabase-storage-from-r2.mjs` implements a fail-closed restore flow.

Safety properties:
- Dry-run is the only non-writing mode. The command requires an explicit `--dry-run` or `--apply` choice.
- The manifest must be under `backups/snapshots/` and match `bethag-storage-backup/v1`.
- Every referenced blob is downloaded from R2 and its byte length and SHA-256 are verified before any target write.
- On the first apply, the target bucket must be empty. If an earlier apply was interrupted, the utility may resume only when every existing target key belongs to the selected manifest and the stored bytes match that manifest entry's size and SHA-256.
- Existing matching objects are skipped; only missing objects are written. Every new write is read back and verified by byte length and SHA-256. A final paginated inventory must match the manifest's key set exactly.
- Folder markers and any other unexpected target keys are rejected. Malformed, truncated, repeated-token, duplicate-key, or inconsistent pagination responses fail closed.
- The utility never deletes or overwrites existing objects. A same-key object with mismatched bytes, an unknown key, or a folder marker requires operator investigation and a separately prepared empty recovery bucket.
- After an interrupted apply, rerun the exact same manifest against the same recovery target. Do not switch manifests or run two restores concurrently against one target bucket.
- `--apply` additionally requires `RESTORE_CONFIRM_TARGET` to equal the exact target bucket name.
- The target uses a separate set of `SUPABASE_RESTORE_S3_*` credentials and endpoint. Its Supabase project host must differ from the original source project's host; the original `bethag-documents` bucket is explicitly forbidden.
- The tool does not create buckets, alter policies, restore database rows, or change Production/QA configuration.

Dry-run example (requires only the existing R2 backup secrets; no Supabase recovery project or recovery credentials are contacted):

```sh
node scripts/restore-supabase-storage-from-r2.mjs --dry-run --manifest-key backups/snapshots/<snapshot-id>.json --target-bucket <empty-recovery-bucket>
```

Guarded apply example, only after a separate recovery bucket has been created and reviewed:

```sh
RESTORE_CONFIRM_TARGET=<empty-recovery-bucket> node scripts/restore-supabase-storage-from-r2.mjs --apply --manifest-key backups/snapshots/<snapshot-id>.json --target-bucket <empty-recovery-bucket>
```

If an apply fails after writing some objects, do not delete or manually alter the target. First inspect the failure. If the existing target objects are a byte-for-byte subset of the same selected manifest, rerun the exact same command to resume. If any key is unexpected or its bytes differ, the utility refuses to continue.

Never use the original Production project, `bethag-documents`, or shared QA as the target for a restore drill. Configure `SUPABASE_RESTORE_S3_ENDPOINT`, `SUPABASE_RESTORE_S3_REGION`, `SUPABASE_RESTORE_S3_ACCESS_KEY_ID`, and `SUPABASE_RESTORE_S3_SECRET_ACCESS_KEY` only for a separately provisioned recovery project. Recreate or validate bucket metadata and RLS policies separately. A successful dry-run proves manifest structure and blob integrity only. It deliberately does not contact or verify the target bucket; target emptiness is checked only in `--apply` mode immediately before writes. A dry-run does not prove that an upload or application-level recovery has succeeded.

The first successful snapshot on 26 November 2026 contains zero objects because the Production bucket `bethag-documents` was verified empty. Consequently, the current manifest can exercise validation and empty-target preflight only; it cannot demonstrate restoration of real file bytes. A representative non-empty isolated drill remains required before marking Storage disaster recovery fully tested.

## Operational status

- Repository implementation: restore-resume candidate reconstructed on current main with the folder-marker preflight from PR #511; merge only after exact-head CI passes.
- Cloudflare bucket `bethag-storage-backups`: created, private, EU jurisdiction.
- Bucket Lock and lifecycle: configured and read by the Cloudflare preflight; exact rules are checked at every run.
- GitHub Environment `storage-backup-production`: configured; nine required secrets and `STORAGE_BACKUP_ENABLED=true` are present.
- First successful backup: 26 November 2026; manifest write/read verification passed. `source_object_count=0`, `blobs_uploaded=0`, `blobs_reused=0` because the source bucket was empty.
- Guarded restore utility: dry-run default, source-blob SHA-256/size verification, empty-target first apply, verified same-manifest resume, read-after-write checks, exact final key inventory, and explicit confirmation gate for writes.
- Restore dry-run: supported using only existing R2 backup credentials; it verifies manifest and blob integrity without contacting Supabase.
- Non-empty isolated restore drill: NOT RUN; requires a separately provisioned recovery project and four dedicated `SUPABASE_RESTORE_S3_*` secrets.
- Production and QA data/configuration: unchanged.
