# BETHAG Storage backup — Cloudflare R2

Status: **implementation prepared; external service not activated; first backup NOT RUN**.

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
- The backup script verifies both lifecycle rules and the Bucket Lock rule before uploading; if any gate is missing, it exits without writing a backup.
- The workflow first reads the bucket metadata and obtains the authoritative `jurisdiction` field. It then queries Bucket Lock with that exact jurisdiction header (omitting the header for `default`). Bucket location labels such as `EEUR` are not used as jurisdiction values.
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

## Restore outline

To restore, select a manifest by timestamp, download each referenced blob, verify SHA-256 and size, then upload the bytes to the original object keys in a separately identified recovery Supabase project. Recreate or validate the bucket metadata and RLS policies separately. Never run a restore into Production or shared QA as part of routine backup validation. A future restore utility and isolated restore drill are required before marking Storage disaster recovery fully tested.

## Operational status

- Repository implementation: pending PR review and CI.
- Cloudflare bucket/account: not created by this change.
- Bucket Lock and lifecycle: not configured.
- GitHub Environment/secrets: not configured.
- Activation gate: Environment variable `STORAGE_BACKUP_ENABLED` must be set to `true` after cost approval; otherwise the backup job is skipped.
- First backup: NOT RUN.
- Restore drill: NOT RUN.
- Production and QA data/configuration: unchanged.
