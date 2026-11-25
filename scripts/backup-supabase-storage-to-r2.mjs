import { createHash } from "node:crypto";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadBucketCommand, HeadObjectCommand, GetBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";

const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const BLOB_REFRESH_SECONDS = 25 * 24 * 60 * 60;
const SOURCE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "bethag-documents";
const DESTINATION_PREFIX = "backups/";
let currentStage = "initialization";

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error("Missing required environment variable: " + name);
  return value.trim();
}

function safeEndpoint(value, label) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(label + " must use HTTPS");
  return url.toString().replace(/\/$/, "");
}

async function assertBucketLock(accountId, bucketName, token) {
  const baseUrl = "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(accountId) + "/r2/buckets/" + encodeURIComponent(bucketName);
  const headers = { Authorization: "Bearer " + token, Accept: "application/json" };

  // Read the bucket's authoritative jurisdiction; location labels such as EEUR are not jurisdiction values.
  const bucketResponse = await fetch(baseUrl, { headers });
  if (!bucketResponse.ok) {
    throw new Error("Cannot read R2 bucket metadata (HTTP " + bucketResponse.status +
      "). Check the Cloudflare API token's R2 read permission and bucket/account identifiers.");
  }
  const bucketPayload = await bucketResponse.json();
  if (bucketPayload.success !== true || !bucketPayload.result?.jurisdiction) {
    throw new Error("Cloudflare did not return the R2 bucket jurisdiction; refusing to guess it.");
  }
  const jurisdiction = bucketPayload.result.jurisdiction;
  const lockHeaders = { ...headers };
  if (jurisdiction !== "default") lockHeaders["cf-r2-jurisdiction"] = jurisdiction;

  const response = await fetch(baseUrl + "/lock", { headers: lockHeaders });
  if (!response.ok) {
    throw new Error("Cannot verify R2 Bucket Lock rules for jurisdiction '" + jurisdiction +
      "' (HTTP " + response.status + "). Check the Cloudflare API token's R2 read permission.");
  }
  const payload = await response.json();
  if (payload.success !== true) throw new Error("Cloudflare did not confirm Bucket Lock configuration");
  const rules = payload.result?.rules || [];
  const protectedRule = rules.some((rule) =>
    rule.enabled === true &&
    (rule.prefix || "") === DESTINATION_PREFIX &&
    rule.condition?.type === "Age" &&
    Number(rule.condition.maxAgeSeconds) >= RETENTION_SECONDS
  );
  if (!protectedRule) {
    throw new Error("R2 retention gate failed: enable an active Bucket Lock rule for prefix '" +
      DESTINATION_PREFIX + "' with at least 30 days (2592000 seconds). No backup was written.");
  }
  return jurisdiction;
}

async function listAll(client, bucket, prefix) {
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken
    }));
    objects.push(...(page.Contents || []));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

async function main() {
  const sourceEndpoint = safeEndpoint(required("SUPABASE_S3_ENDPOINT"), "SUPABASE_S3_ENDPOINT");
  if (!sourceEndpoint.endsWith("/storage/v1/s3")) {
    throw new Error("SUPABASE_S3_ENDPOINT must end exactly with /storage/v1/s3");
  }
  const sourceRegion = required("SUPABASE_S3_REGION");
  const sourceAccessKey = required("SUPABASE_S3_ACCESS_KEY_ID");
  const sourceSecret = required("SUPABASE_S3_SECRET_ACCESS_KEY");
  const accountId = required("R2_ACCOUNT_ID");
  const destinationBucket = required("R2_BUCKET");
  const destinationAccessKey = required("R2_ACCESS_KEY_ID");
  const destinationSecret = required("R2_SECRET_ACCESS_KEY");
  const cloudflareReadToken = required("CLOUDFLARE_R2_READ_TOKEN");

  currentStage = "Cloudflare bucket metadata and Bucket Lock preflight";
  const jurisdiction = await assertBucketLock(accountId, destinationBucket, cloudflareReadToken);

  const source = new S3Client({
    endpoint: sourceEndpoint, region: sourceRegion, forcePathStyle: true,
    credentials: { accessKeyId: sourceAccessKey, secretAccessKey: sourceSecret }
  });
  const destination = new S3Client({
    endpoint: "https://" + accountId + (jurisdiction === "default" ? "" : "." + jurisdiction) + ".r2.cloudflarestorage.com",
    region: "auto", forcePathStyle: true,
    credentials: { accessKeyId: destinationAccessKey, secretAccessKey: destinationSecret }
  });

  currentStage = "R2 destination bucket access";
  await destination.send(new HeadBucketCommand({ Bucket: destinationBucket }));
  currentStage = "R2 lifecycle configuration";
  const lifecycle = await destination.send(new GetBucketLifecycleConfigurationCommand({ Bucket: destinationBucket }));
  const lifecycleRules = lifecycle.Rules || [];
  const hasSnapshotsExpiry = lifecycleRules.some((rule) =>
    rule.Status === "Enabled" &&
    rule.Filter?.Prefix === DESTINATION_PREFIX + "snapshots/" &&
    Number(rule.Expiration?.Days) >= 31
  );
  const hasBlobsExpiry = lifecycleRules.some((rule) =>
    rule.Status === "Enabled" &&
    rule.Filter?.Prefix === DESTINATION_PREFIX + "objects/" &&
    Number(rule.Expiration?.Days) >= 60
  );
  if (!hasSnapshotsExpiry || !hasBlobsExpiry) {
    throw new Error("R2 lifecycle gate failed: require snapshots expiration >=31 days and objects expiration >=60 days. No backup was written.");
  }
  currentStage = "Supabase Storage source listing";
  const sourceObjects = await listAll(source, SOURCE_BUCKET);
  currentStage = "R2 existing blob inventory";
  const existingBlobObjects = await listAll(destination, destinationBucket, DESTINATION_PREFIX + "objects/");
  const blobsByHash = new Map();
  for (const item of existingBlobObjects) {
    const match = item.Key?.match(/^backups\/objects\/([a-f0-9]{64})\//);
    if (!match) continue;
    const group = blobsByHash.get(match[1]) || [];
    group.push(item);
    blobsByHash.set(match[1], group);
  }
  const snapshotId = new Date().toISOString().replace(/[-:.]/g, "").replace("T", "-").replace("Z", "Z");
  const now = Date.now();
  const manifestObjects = [];
  let copied = 0;
  let reused = 0;

  for (const listed of sourceObjects) {
    currentStage = "Supabase object read / R2 blob write and verification";
    if (!listed.Key || listed.Key.endsWith("/")) continue;
    const result = await source.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: listed.Key }));
    const bytes = Buffer.from(await result.Body.transformToByteArray());
    if (bytes.length !== Number(listed.Size)) {
      throw new Error("Source size mismatch for object key " + JSON.stringify(listed.Key));
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const blobPrefix = DESTINATION_PREFIX + "objects/" + sha256 + "/";
    const candidates = blobsByHash.get(sha256) || [];
    const recent = candidates
      .filter((item) => item.Key && item.LastModified &&
        now - new Date(item.LastModified).getTime() < BLOB_REFRESH_SECONDS)
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))[0];

    let blobKey;
    if (recent) {
      blobKey = recent.Key;
      const head = await destination.send(new HeadObjectCommand({ Bucket: destinationBucket, Key: blobKey }));
      if (head.Metadata?.sha256 !== sha256 || Number(head.ContentLength) !== bytes.length) {
        throw new Error("Existing R2 blob failed SHA-256/size metadata verification for " + blobKey);
      }
      reused += 1;
    } else {
      blobKey = blobPrefix + snapshotId;
      await destination.send(new PutObjectCommand({
        Bucket: destinationBucket, Key: blobKey, Body: bytes,
        ContentLength: bytes.length,
        ContentType: result.ContentType || "application/octet-stream",
        Metadata: { sha256 }
      }));
      const head = await destination.send(new HeadObjectCommand({ Bucket: destinationBucket, Key: blobKey }));
      if (head.Metadata?.sha256 !== sha256 || Number(head.ContentLength) !== bytes.length) {
        throw new Error("New R2 blob failed SHA-256/size metadata verification for " + blobKey);
      }
      copied += 1;
      const group = blobsByHash.get(sha256) || [];
      group.push({ Key: blobKey, LastModified: new Date() });
      blobsByHash.set(sha256, group);
    }

    manifestObjects.push({
      key: listed.Key,
      blob_key: blobKey,
      size: bytes.length,
      sha256,
      etag: listed.ETag || null,
      last_modified: listed.LastModified?.toISOString?.() || null,
      content_type: result.ContentType || null,
      cache_control: result.CacheControl || null,
      content_disposition: result.ContentDisposition || null,
      content_encoding: result.ContentEncoding || null,
      content_language: result.ContentLanguage || null,
      expires: result.Expires?.toISOString?.() || null,
      metadata: result.Metadata || {}
    });
  }

  currentStage = "Supabase source consistency recheck";
  const sourceObjectsAfter = await listAll(source, SOURCE_BUCKET);
  const sourceSignature = (items) => items
    .filter((item) => item.Key && !item.Key.endsWith("/"))
    .map((item) => [item.Key, item.Size, item.ETag || null])
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (JSON.stringify(sourceSignature(sourceObjects)) !== JSON.stringify(sourceSignature(sourceObjectsAfter))) {
    throw new Error("Source bucket changed during backup; no snapshot manifest was written. Retry on the next scheduled run.");
  }

  const manifest = {
    format: "bethag-storage-backup/v1",
    snapshot_id: snapshotId,
    created_at: new Date().toISOString(),
    source_bucket: SOURCE_BUCKET,
    object_count: manifestObjects.length,
    objects: manifestObjects
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  const manifestKey = DESTINATION_PREFIX + "snapshots/" + snapshotId + ".json";
  currentStage = "R2 snapshot manifest write";
  await destination.send(new PutObjectCommand({
    Bucket: destinationBucket, Key: manifestKey, Body: manifestBytes,
    ContentLength: manifestBytes.length, ContentType: "application/json",
    Metadata: {
      format: "bethag-storage-backup-v1",
      sha256: createHash("sha256").update(manifestBytes).digest("hex")
    }
  }));

  currentStage = "R2 manifest read-after-write verification";
  const verified = await destination.send(new GetObjectCommand({ Bucket: destinationBucket, Key: manifestKey }));
  const verifiedBytes = Buffer.from(await verified.Body.transformToByteArray());
  if (!verifiedBytes.equals(manifestBytes)) throw new Error("R2 manifest read-after-write verification failed");

  console.log(JSON.stringify({
    status: "PASS",
    snapshot_id: snapshotId,
    source_bucket: SOURCE_BUCKET,
    destination_bucket: destinationBucket,
    manifest_key: manifestKey,
    source_object_count: manifestObjects.length,
    blobs_uploaded: copied,
    blobs_reused: reused,
    manifest_sha256: createHash("sha256").update(manifestBytes).digest("hex"),
    retention_lock_seconds: RETENTION_SECONDS
  }, null, 2));
  source.destroy();
  destination.destroy();
}

main().catch((error) => {
  const details = [error?.name, error?.Code || error?.code, error?.$metadata?.httpStatusCode ? "HTTP " + error.$metadata.httpStatusCode : null, error?.message || String(error)].filter(Boolean).join(" | ");
  console.error("BETHAG Storage backup failed at [" + currentStage + "]:", details);
  process.exitCode = 1;
});
