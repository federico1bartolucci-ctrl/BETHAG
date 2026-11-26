import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertRestoreTargetEmpty } from "./storage-restore-target-empty.mjs";

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


class FakeListObjectsV2Command {
  constructor(input) {
    this.input = input;
  }
}

function fakeListingClient(page) {
  const requests = [];
  return {
    requests,
    async send(command) {
      requests.push(command.input);
      return page;
    },
  };
}

// Reproduce the previous bug: folder-marker keys were filtered out and the
// restore target was incorrectly treated as empty.
const legacyFolderMarkerInventory = [{ Key: "empty-folder/" }]
  .filter((item) => item.Key && !item.Key.endsWith("/"));
assert.deepEqual(legacyFolderMarkerInventory, [],
  "the previous target listing incorrectly ignored an S3 folder-marker object");

const emptyTargetClient = fakeListingClient({ IsTruncated: false, Contents: [] });
assert.equal(
  await assertRestoreTargetEmpty(emptyTargetClient, "recovery-bucket", FakeListObjectsV2Command),
  true,
);
assert.deepEqual(emptyTargetClient.requests, [{ Bucket: "recovery-bucket", MaxKeys: 1 }]);

for (const existingObject of [
  { Key: "documents/invoice.pdf" },
  { Key: "empty-folder/" },
]) {
  const client = fakeListingClient({ IsTruncated: false, Contents: [existingObject] });
  await assert.rejects(
    () => assertRestoreTargetEmpty(client, "recovery-bucket", FakeListObjectsV2Command),
    /Restore target bucket is not empty/,
    "any object key, including a folder marker, must block restore",
  );
}

for (const malformedPage of [
  null,
  { Contents: [] },
  { IsTruncated: false },
  { IsTruncated: true, Contents: [] },
  { IsTruncated: false, Contents: [], KeyCount: 1 },
  { IsTruncated: false, Contents: "not-an-array" },
  { IsTruncated: false, Contents: [{}] },
]) {
  await assert.rejects(
    () => assertRestoreTargetEmpty(fakeListingClient(malformedPage), "recovery-bucket", FakeListObjectsV2Command),
    /not empty|malformed|valid key|inconsistent KeyCount/,
  );
}

assert.match(script, /assertRestoreTargetEmpty\(supabase, targetBucket, ListObjectsV2Command\)/);
assert.doesNotMatch(script, /return items\.filter\(\(item\) => item\.Key && !item\.Key\.endsWith\("\/"\)\)/);

console.log("PASS: R2 restore target emptiness preflight counts folder-marker objects.");
console.log("PASS: restore refuses malformed or truncated target listings instead of assuming emptiness.");
