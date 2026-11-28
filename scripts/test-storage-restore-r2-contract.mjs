import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertRestoreTargetEmpty } from "./storage-restore-target-empty.mjs";
import { createHash } from "node:crypto";
import { parseAndVerifyStorageRestoreManifest } from "./storage-restore-manifest.mjs";

const manifest = {
  format: "bethag-storage-backup/v1",
  snapshot_id: "20261128-025400000Z",
  created_at: "2026-11-28T02:54:00.000Z",
  source_bucket: "bethag-documents",
  object_count: 1,
  objects: [{ key: "documents/example.pdf", blob_key: "backups/objects/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/20261128-025400000Z", size: 1, sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }]
};
const manifestBytes = Buffer.from(JSON.stringify(manifest));
const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
const validMetadata = { format: "bethag-storage-backup-v1", sha256: manifestSha256 };

function previousOptionalDigestParser(bytes, metadata) {
  if (metadata?.sha256) {
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== metadata.sha256) throw new Error("Manifest SHA-256 metadata mismatch");
  }
  const parsed = JSON.parse(bytes.toString("utf8"));
  if (parsed.format !== "bethag-storage-backup/v1" ||
      !Array.isArray(parsed.objects) ||
      parsed.object_count !== parsed.objects.length ||
      typeof parsed.snapshot_id !== "string" ||
      !parsed.snapshot_id) {
    throw new Error("Unsupported or structurally invalid BETHAG Storage manifest");
  }
  return parsed;
}

// Reproduce the old fail-open path: valid JSON was accepted when object metadata
// (and therefore the manifest digest) was absent.
assert.deepEqual(previousOptionalDigestParser(manifestBytes, undefined), manifest);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, undefined),
  /missing a valid SHA-256 metadata digest/,
  "a manifest without its backup-writer digest must not be restorable",
);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, {}),
  /missing a valid SHA-256 metadata digest/,
);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, { sha256: "not-a-digest" }),
  /missing a valid SHA-256 metadata digest/,
);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, { sha256: manifestSha256.toUpperCase() }),
  /missing a valid SHA-256 metadata digest/,
);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, { sha256: "c".repeat(64) }),
  /Manifest SHA-256 metadata mismatch/,
);
assert.deepEqual(parseAndVerifyStorageRestoreManifest(manifestBytes, validMetadata), manifest);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(Buffer.from("{"), {
    sha256: createHash("sha256").update("{").digest("hex")
  }),
  /Manifest is not valid JSON/,
);
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(Buffer.from("null"), {
    sha256: createHash("sha256").update("null").digest("hex")
  }),
  /structurally invalid/,
);
const wrongMetadataFormat = { ...validMetadata, format: "other-format" };
await assert.rejects(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, wrongMetadataFormat),
  /metadata format mismatch/,
);

const script = await readFile("scripts/restore-supabase-storage-from-r2.mjs", "utf8");
const targetPreflight = await readFile("scripts/storage-restore-target-empty.mjs", "utf8");
const targetInventory = await readFile("scripts/storage-restore-target-inventory.mjs", "utf8");
assert.match(script, /bethag-storage-backup\/v1/);
assert.match(script, /--dry-run/);
assert.match(script, /--apply/);
assert.match(script, /RESTORE_CONFIRM_TARGET/);
assert.match(script, /targetBucket === sourceBucket/);
assert.match(script, /SUPABASE_RESTORE_S3_ENDPOINT/);
assert.match(script, /const supabase = apply \? new S3Client/);
assert.match(script, /target_preflight: apply/);
assert.match(script, /MATCHING_PARTIAL_RESTORE_VERIFIED/);
assert.match(script, /RESTORE_VERIFIED/);
assert.match(script, /supabase\?\.destroy\(\)/);
assert.match(script, /SUPABASE_RESTORE_S3_ACCESS_KEY_ID/);
assert.match(script, /separate Supabase project/);
assert.match(script, /original Supabase Storage bucket/);
assert.match(script, /inspectExistingRestoreTarget/);
assert.match(script, /restoreMissingObjects/);
assert.match(script, /assertRestoreTargetComplete/);
assert.match(targetPreflight, /Restore target bucket is not empty/);
assert.match(targetInventory, /NextContinuationToken/);
assert.match(targetInventory, /repeated a continuation token/);
assert.match(targetInventory, /truncated but omitted its continuation token/);
assert.match(targetInventory, /duplicate object key/);
assert.match(targetInventory, /unexpected object/);
assert.match(targetInventory, /read-after-write SHA-256\/size verification/);
assert.match(targetInventory, /item\.key\.endsWith\("\/"\)/);
assert.match(script, /Bucket: sourceBucket/);
assert.match(script, /Blob integrity verification failed/);
assert.match(script, /createHash\("sha256"\)/);
assert.match(script, /item\.blob_key\.slice\(OBJECT_PREFIX\.length\)\.split\("\/"\)\[0\] !== item\.sha256/);
assert.match(script, /PutObjectCommand/);
assert.match(targetInventory, /new PutObjectCommand/);
assert.match(script, /writes_performed: apply \? restoreStats\.written : 0/);
assert.match(script, /if \(apply\)/);
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
    "any object key, including a folder marker, must block an initial restore",
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
    /not empty|malformed|valid key|inconsistent KeyCount|omitted both Contents and KeyCount/,
  );
}

assert.doesNotMatch(script, /assertRestoreTargetEmpty\(supabase, targetBucket/);
assert.doesNotMatch(script, /return items\.filter\(\(item\) => item\.Key && !item\.Key\.endsWith\("\/"\)\)/);

console.log("PASS: R2 restore target folder markers remain non-empty and block unsafe restore.");
