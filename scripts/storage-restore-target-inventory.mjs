import { createHash } from "node:crypto";

const DEFAULT_MAX_KEYS = 1000;
const MAX_LIST_PAGES = 10000;

function validateClient(client, bucket, ListObjectsV2Command) {
  if (!client || typeof client.send !== "function") {
    throw new TypeError("Restore target inventory requires an S3-compatible client");
  }
  if (typeof bucket !== "string" || bucket.trim().length === 0) {
    throw new TypeError("Restore target inventory requires a non-empty bucket name");
  }
  if (typeof ListObjectsV2Command !== "function") {
    throw new TypeError("Restore target inventory requires the ListObjectsV2 command constructor");
  }
}

function validateManifestObjects(manifestObjects) {
  if (!Array.isArray(manifestObjects)) {
    throw new TypeError("Restore target verification requires a manifest object array");
  }
  const expected = new Map();
  for (const item of manifestObjects) {
    if (!item || typeof item.key !== "string" || item.key.length === 0 ||
        item.key.startsWith("/") || item.key.endsWith("/") || item.key.includes("\\") ||
        !/^[a-f0-9]{64}$/.test(item.sha256) ||
        !Number.isSafeInteger(item.size) || item.size < 0) {
      throw new Error("Restore manifest contains an invalid object entry");
    }
    if (expected.has(item.key)) {
      throw new Error("Restore manifest contains duplicate source object keys");
    }
    expected.set(item.key, item);
  }
  return expected;
}

function normalizeOptionalHeader(value, label) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Restore object metadata contains an invalid " + label);
  }
  return value;
}

function normalizeExpires(value, label) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("Restore object metadata contains an invalid " + label);
  }
  return timestamp;
}

function normalizeUserMetadata(value, label) {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Restore object metadata contains an invalid " + label);
  }

  const entries = Object.entries(value).map(([key, entryValue]) => {
    if (!key.trim() || typeof entryValue !== "string") {
      throw new Error("Restore object metadata contains an invalid " + label + " entry");
    }
    return [key.toLowerCase(), entryValue];
  }).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);

  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1][0] === entries[index][0]) {
      throw new Error("Restore object metadata contains duplicate case-insensitive " + label + " keys");
    }
  }
  return entries;
}

function assertRestoreObjectMetadataMatches(item, response, key) {
  const fields = [
    ["ContentType", item.content_type || "application/octet-stream", response?.ContentType],
    ["CacheControl", item.cache_control || null, response?.CacheControl],
    ["ContentDisposition", item.content_disposition || null, response?.ContentDisposition],
    ["ContentEncoding", item.content_encoding || null, response?.ContentEncoding],
    ["ContentLanguage", item.content_language || null, response?.ContentLanguage],
  ];

  for (const [field, expectedValue, actualValue] of fields) {
    if (normalizeOptionalHeader(expectedValue, "manifest " + field) !==
        normalizeOptionalHeader(actualValue, "target " + field)) {
      throw new Error("Existing restore target object metadata does not match the selected snapshot (" +
        field + "): " + JSON.stringify(key));
    }
  }

  const expectedExpires = normalizeExpires(item.expires, "manifest Expires");
  const actualExpires = normalizeExpires(response?.Expires, "target Expires");
  if (expectedExpires !== actualExpires) {
    throw new Error("Existing restore target object metadata does not match the selected snapshot (Expires): " +
      JSON.stringify(key));
  }

  const expectedUserMetadata = normalizeUserMetadata(item.metadata, "manifest user metadata");
  const actualUserMetadata = normalizeUserMetadata(response?.Metadata, "target user metadata");
  if (JSON.stringify(expectedUserMetadata) !== JSON.stringify(actualUserMetadata)) {
    throw new Error("Existing restore target object metadata does not match the selected snapshot (Metadata): " +
      JSON.stringify(key));
  }
}

export async function listRestoreTargetObjects(
  client,
  bucket,
  ListObjectsV2Command,
  { maxKeys = DEFAULT_MAX_KEYS } = {},
) {
  validateClient(client, bucket, ListObjectsV2Command);
  if (!Number.isSafeInteger(maxKeys) || maxKeys < 1 || maxKeys > DEFAULT_MAX_KEYS) {
    throw new TypeError("Restore target inventory maxKeys must be an integer from 1 to 1000");
  }

  const objects = [];
  const seenKeys = new Set();
  const seenTokens = new Set();
  let continuationToken;
  let pageCount = 0;

  while (true) {
    pageCount += 1;
    if (pageCount > MAX_LIST_PAGES) {
      throw new Error("Restore target listing exceeded the maximum page count; refusing to assume completeness");
    }

    const input = { Bucket: bucket, MaxKeys: maxKeys };
    if (continuationToken !== undefined) input.ContinuationToken = continuationToken;
    const page = await client.send(new ListObjectsV2Command(input));

    if (!page || typeof page !== "object" || Array.isArray(page) ||
        typeof page.IsTruncated !== "boolean") {
      throw new Error("Restore target listing returned malformed pagination metadata");
    }
    if (page.Contents === undefined && page.KeyCount === undefined) {
      throw new Error("Restore target listing omitted both Contents and KeyCount");
    }

    const contents = page.Contents ?? [];
    if (!Array.isArray(contents) || contents.length > maxKeys) {
      throw new Error("Restore target listing returned malformed object contents");
    }
    if (page.KeyCount !== undefined &&
        (!Number.isSafeInteger(page.KeyCount) || page.KeyCount < 0 ||
          page.KeyCount > maxKeys || page.KeyCount !== contents.length)) {
      throw new Error("Restore target listing returned inconsistent KeyCount metadata");
    }

    for (const item of contents) {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          typeof item.Key !== "string" || item.Key.length === 0) {
        throw new Error("Restore target listing contains an object without a valid key");
      }
      if (seenKeys.has(item.Key)) {
        throw new Error("Restore target listing returned a duplicate object key");
      }
      seenKeys.add(item.Key);
      objects.push(item);
    }

    if (!page.IsTruncated) break;

    const nextToken = page.NextContinuationToken;
    if (typeof nextToken !== "string" || nextToken.trim().length === 0) {
      throw new Error("Restore target listing is truncated but omitted its continuation token");
    }
    if (seenTokens.has(nextToken)) {
      throw new Error("Restore target listing repeated a continuation token");
    }
    seenTokens.add(nextToken);
    continuationToken = nextToken;
  }

  return objects;
}

export async function inspectExistingRestoreTarget({
  client,
  bucket,
  ListObjectsV2Command,
  GetObjectCommand,
  manifestObjects,
  readBodyBytes,
  maxKeys = DEFAULT_MAX_KEYS,
}) {
  if (typeof GetObjectCommand !== "function" || typeof readBodyBytes !== "function") {
    throw new TypeError("Restore target verification requires GetObject and body-reader functions");
  }
  const expected = validateManifestObjects(manifestObjects);
  const targetObjects = await listRestoreTargetObjects(client, bucket, ListObjectsV2Command, { maxKeys });
  const existingKeys = new Set();

  for (const listed of targetObjects) {
    const item = expected.get(listed.Key);
    if (!item) {
      throw new Error("Restore target contains an unexpected object; refusing to mix snapshots: " +
        JSON.stringify(listed.Key));
    }

    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: listed.Key }));
    const bytes = await readBodyBytes(response?.Body);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== item.size || digest !== item.sha256) {
      throw new Error("Existing restore target object does not match the selected snapshot: " +
        JSON.stringify(listed.Key));
    }
    assertRestoreObjectMetadataMatches(item, response, listed.Key);
    existingKeys.add(listed.Key);
  }

  return { existingKeys, targetObjects };
}

export async function restoreMissingObjects({
  client,
  bucket,
  verifiedObjects,
  existingKeys,
  PutObjectCommand,
  GetObjectCommand,
  readBodyBytes,
}) {
  if (!client || typeof client.send !== "function" ||
      typeof PutObjectCommand !== "function" ||
      typeof GetObjectCommand !== "function" ||
      typeof readBodyBytes !== "function" ||
      !Array.isArray(verifiedObjects) ||
      !(existingKeys instanceof Set)) {
    throw new TypeError("Restore resume requires a client, commands, verified objects and existing-key set");
  }

  let written = 0;
  let resumed = 0;
  for (const { item, bytes } of verifiedObjects) {
    if (existingKeys.has(item.key)) {
      resumed += 1;
      continue;
    }

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: item.key,
      Body: bytes,
      ContentLength: item.size,
      ContentType: item.content_type || "application/octet-stream",
      ...(item.cache_control ? { CacheControl: item.cache_control } : {}),
      ...(item.content_disposition ? { ContentDisposition: item.content_disposition } : {}),
      ...(item.content_encoding ? { ContentEncoding: item.content_encoding } : {}),
      ...(item.content_language ? { ContentLanguage: item.content_language } : {}),
      ...(item.expires ? { Expires: new Date(item.expires) } : {}),
      ...(item.metadata && Object.keys(item.metadata).length ? { Metadata: item.metadata } : {}),
    }));

    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: item.key }));
    const restoredBytes = await readBodyBytes(response?.Body);
    const digest = createHash("sha256").update(restoredBytes).digest("hex");
    if (restoredBytes.length !== item.size || digest !== item.sha256) {
      throw new Error("Restored target object failed read-after-write SHA-256/size verification: " +
        JSON.stringify(item.key));
    }
    assertRestoreObjectMetadataMatches(item, response, item.key);
    written += 1;
    existingKeys.add(item.key);
  }

  return { written, resumed };
}

export async function assertRestoreTargetComplete({
  client,
  bucket,
  ListObjectsV2Command,
  manifestObjects,
  maxKeys = DEFAULT_MAX_KEYS,
}) {
  const expected = validateManifestObjects(manifestObjects);
  const targetObjects = await listRestoreTargetObjects(client, bucket, ListObjectsV2Command, { maxKeys });
  const targetKeys = new Set(targetObjects.map((item) => item.Key));

  if (targetKeys.size !== expected.size ||
      [...expected.keys()].some((key) => !targetKeys.has(key))) {
    throw new Error("Restore target inventory does not exactly match the selected manifest");
  }
  return targetObjects;
}
