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

function previousDryRunEntryAccepted(item) {
  return !!item && typeof item.key === "string" && !!item.key &&
    !item.key.startsWith("/") && !item.key.includes(String.fromCharCode(92)) &&
    typeof item.blob_key === "string" &&
    item.blob_key.startsWith("backups/objects/") &&
    /^[a-f0-9]{64}\/[A-Za-z0-9T._-]+$/.test(item.blob_key.slice("backups/objects/".length)) &&
    /^[a-f0-9]{64}$/.test(item.sha256) &&
    Number.isSafeInteger(item.size) && item.size >= 0 &&
    item.blob_key.slice("backups/objects/".length).split("/")[0] === item.sha256;
}

// Reproduce the old fail-open path: valid JSON was accepted when object metadata
// (and therefore the manifest digest) was absent.
assert.deepEqual(previousOptionalDigestParser(manifestBytes, undefined), manifest);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, undefined),
  /missing a valid SHA-256 metadata digest/,
  "a manifest without its backup-writer digest must not be restorable",
);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, {}),
  /missing a valid SHA-256 metadata digest/,
);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, { sha256: "not-a-digest" }),
  /missing a valid SHA-256 metadata digest/,
);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, { sha256: manifestSha256.toUpperCase() }),
  /missing a valid SHA-256 metadata digest/,
);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, { sha256: "c".repeat(64) }),
  /Manifest SHA-256 metadata mismatch/,
);
assert.deepEqual(parseAndVerifyStorageRestoreManifest(manifestBytes, validMetadata), manifest);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(Buffer.from("{"), {
    sha256: createHash("sha256").update("{").digest("hex")
  }),
  /Manifest is not valid JSON/,
);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(Buffer.from("null"), {
    sha256: createHash("sha256").update("null").digest("hex")
  }),
  /structurally invalid/,
);
const wrongMetadataFormat = { ...validMetadata, format: "other-format" };
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(manifestBytes, wrongMetadataFormat),
  /metadata format mismatch/,
);

// Reproduce the dry-run gap: the previous source-entry preflight accepted a
// folder-marker key, while the apply-only target inventory rejected it later.
const folderMarkerManifest = {
  ...manifest,
  object_count: 2,
  objects: [...manifest.objects, { ...manifest.objects[0], key: "empty-folder/" }],
};
const folderMarkerBytes = Buffer.from(JSON.stringify(folderMarkerManifest));
const folderMarkerMetadata = {
  format: "bethag-storage-backup-v1",
  sha256: createHash("sha256").update(folderMarkerBytes).digest("hex"),
};
assert.equal(previousDryRunEntryAccepted(folderMarkerManifest.objects[1]), true,
  "the previous dry-run source preflight accepted a folder-marker object key");
assert.deepEqual(previousOptionalDigestParser(folderMarkerBytes, folderMarkerMetadata), folderMarkerManifest);
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(folderMarkerBytes, folderMarkerMetadata),
  /invalid or unsafe object key/,
  "dry-run and apply must reject manifest keys that the target inventory cannot restore",
);

const duplicateManifest = {
  ...manifest,
  object_count: 2,
  objects: [...manifest.objects, { ...manifest.objects[0] }],
};
const duplicateBytes = Buffer.from(JSON.stringify(duplicateManifest));
assert.throws(
  () => parseAndVerifyStorageRestoreManifest(duplicateBytes, {
    format: "bethag-storage-backup-v1",
    sha256: createHash("sha256").update(duplicateBytes).digest("hex"),
  }),
  /duplicate source object keys/,
);

const script = await readFile("scripts/restore-supabase-storage-from-r2.mjs", "utf8");
const manifestHelper = await readFile("scripts/storage-restore-manifest.mjs", "utf8");
const targetPreflight = await readFile("scripts/storage-restore-target-empty.mjs", "utf8");
const targetInventory = await readFile("scripts/storage-restore-target-inventory.mjs", "utf8");
const backupScript = await readFile("scripts/backup-supabase-storage-to-r2.mjs", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(script.includes("parseAndVerifyStorageRestoreManifest(bytes, response.Metadata)"));
assert.ok(!script.includes("if (response.Metadata?.sha256)"));
assert.ok(script.includes('from "./storage-restore-manifest.mjs"'));
assert.ok(backupScript.includes('sha256: createHash("sha256").update(manifestBytes).digest("hex")'));
assert.equal(packageJson.scripts.test.split("test-storage-restore-r2-contract.mjs").length - 1, 1);

assert.ok(manifestHelper.includes("bethag-storage-backup/v1"));
assert.ok(manifestHelper.includes("Manifest is missing a valid SHA-256 metadata digest"));
assert.ok(manifestHelper.includes("assertStorageRestoreManifestObjectKeys(manifest.objects)"));
assert.ok(targetInventory.includes("assertStorageRestoreManifestObjectKeys(manifestObjects)"));
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
