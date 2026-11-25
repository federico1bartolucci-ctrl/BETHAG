import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const script = await readFile("scripts/backup-supabase-storage-to-r2.mjs", "utf8");
const workflow = await readFile(".github/workflows/storage-backup-r2.yml", "utf8");
const runbook = await readFile("docs/STORAGE_BACKUP_R2.md", "utf8");

assert.match(script, /SUPABASE_STORAGE_BUCKET \|\| "bethag-documents"/);
assert.match(script, /SUPABASE_S3_ENDPOINT/);
assert.match(script, /\/storage\/v1\/s3/);
assert.match(script, /assertBucketLock/);
assert.match(script, /GetBucketLifecycleConfigurationCommand/);
assert.match(script, /HeadObjectCommand/);
assert.match(script, /head\.Metadata\?\.sha256 !== sha256/);
assert.match(script, /hasSnapshotsExpiry/);
assert.match(script, /hasBlobsExpiry/);
assert.match(script, /maxAgeSeconds\) >= RETENTION_SECONDS/);
assert.match(script, /createHash\("sha256"\)/);
assert.match(script, /object_count: manifestObjects\.length/);
assert.match(script, /GetObjectCommand\(\{ Bucket: destinationBucket, Key: manifestKey \}\)/);
assert.match(script, /verifiedBytes\.equals\(manifestBytes\)/);
assert.match(script, /No backup was written/);
assert.doesNotMatch(script, /DeleteObjectCommand|DeleteObjectsCommand|PutBucketPolicyCommand/);

assert.match(workflow, /cron: "0 \*\/6 \* \* \*"/);
assert.match(workflow, /environment: storage-backup-production/);
assert.match(workflow, /vars\\.STORAGE_BACKUP_ENABLED == 'true'/);
assert.match(workflow, /permissions:\n  contents: read/);
assert.match(workflow, /github\.event_name != 'pull_request'/);
assert.match(workflow, /CLOUDFLARE_R2_READ_TOKEN/);
assert.match(workflow, /SUPABASE_S3_SECRET_ACCESS_KEY/);
assert.match(workflow, /R2_SECRET_ACCESS_KEY/);
assert.doesNotMatch(workflow, /supabase db reset|supabase migration|apply_migration/i);

assert.match(runbook, /30 days/);
assert.match(runbook, /25 days/);
assert.match(runbook, /No Production or QA writes/);
assert.match(runbook, /does not create a bucket/);

console.log("PASS: BETHAG Storage backup safety contract");
