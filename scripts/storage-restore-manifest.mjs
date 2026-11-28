import { createHash } from "node:crypto";

const MANIFEST_FORMAT = "bethag-storage-backup/v1";
const MANIFEST_METADATA_FORMAT = "bethag-storage-backup-v1";

export function assertStorageRestoreManifestObjectKeys(objects) {
  if (!Array.isArray(objects)) {
    throw new TypeError("Storage restore manifest objects must be an array");
  }

  const seenKeys = new Set();
  for (const item of objects) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        typeof item.key !== "string" || item.key.length === 0 ||
        item.key.startsWith("/") || item.key.endsWith("/") || item.key.includes("\\\\")) {
      throw new Error("Manifest contains an invalid or unsafe object key");
    }
    if (seenKeys.has(item.key)) {
      throw new Error("Manifest contains duplicate source object keys");
    }
    seenKeys.add(item.key);
  }
  return objects;
}

export function parseAndVerifyStorageRestoreManifest(bytes, metadata) {
  const normalizedBytes = Buffer.isBuffer(bytes)
    ? bytes
    : bytes instanceof Uint8Array
      ? Buffer.from(bytes)
      : null;
  if (!normalizedBytes) {
    throw new TypeError("Storage restore manifest verification requires readable bytes");
  }

  const expectedSha256 = metadata?.sha256;
  if (typeof expectedSha256 !== "string" || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error("Manifest is missing a valid SHA-256 metadata digest; refusing restore");
  }

  if (metadata?.format !== undefined && metadata.format !== MANIFEST_METADATA_FORMAT) {
    throw new Error("Manifest metadata format mismatch");
  }

  const actualSha256 = createHash("sha256").update(normalizedBytes).digest("hex");
  if (actualSha256 !== expectedSha256) {
    throw new Error("Manifest SHA-256 metadata mismatch");
  }

  let manifest;
  try {
    manifest = JSON.parse(normalizedBytes.toString("utf8"));
  } catch {
    throw new Error("Manifest is not valid JSON");
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest) ||
      manifest.format !== MANIFEST_FORMAT ||
      !Array.isArray(manifest.objects) ||
      !Number.isSafeInteger(manifest.object_count) ||
      manifest.object_count !== manifest.objects.length ||
      typeof manifest.snapshot_id !== "string" ||
      !manifest.snapshot_id.trim()) {
    throw new Error("Unsupported or structurally invalid BETHAG Storage manifest");
  }

  assertStorageRestoreManifestObjectKeys(manifest.objects);
  return manifest;
}
