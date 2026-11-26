import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const script = await readFile("scripts/restore-supabase-storage-from-r2.mjs", "utf8");
assert.match(script, /bethag-storage-backup\/v1/);
assert.match(script, /--dry-run/);
assert.match(script, /--apply/);
assert.match(script, /RESTORE_CONFIRM_TARGET/);
assert.match(script, /targetBucket === sourceBucket/);
assert.match(script, /SUPABASE_RESTORE_S3_ENDPOINT/);
assert.match(script, /const supabase = apply \? new S3Client/);
assert.match(script, /target_preflight: apply \? "EMPTY_TARGET_VERIFIED" : "NOT_RUN_DRY_RUN"/);
assert.match(script, /supabase\?\.destroy\(\)/);
assert.match(script, /SUPABASE_RESTORE_S3_ACCESS_KEY_ID/);
assert.match(script, /separate Supabase project/);
assert.match(script, /original Supabase Storage bucket/);
assert.match(script, /Restore target bucket is not empty/);
assert.match(script, /Blob integrity verification failed/);
assert.match(script, /createHash\("sha256"\)/);
assert.match(script, /item\.blob_key\.slice\(OBJECT_PREFIX\.length\)\.split\("\/"\)\[0\] !== item\.sha256/);
assert.match(script, /new PutObjectCommand/);
assert.match(script, /writes_performed: apply \? verified\.length : 0/);
assert.match(script, /if \(apply\)/);
assert.match(script, /sourceBucket\);/);
assert.doesNotMatch(script, /DeleteObjectCommand|DeleteObjectsCommand/);

console.log("PASS: BETHAG R2 Storage restore safety contract");
