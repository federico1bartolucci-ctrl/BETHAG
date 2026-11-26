import { createHash } from "node:crypto";
import {
  S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand
} from "@aws-sdk/client-s3";

const SOURCE_PREFIX = "backups/snapshots/";
const OBJECT_PREFIX = "backups/objects/";
let stage = "initialization";

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error("Missing required environment variable: " + name);
  return value.trim();
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function endpoint(value, label) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(label + " must use HTTPS");
  return url.toString().replace(/\/$/, "");
}

async function listAll(client, bucket) {
  const items = [];
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket, ContinuationToken: continuationToken
    }));
    items.push(...(page.Contents || []));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return items.filter((item) => item.Key && !item.Key.endsWith("/"));
}

async function bodyBytes(body) {
  return Buffer.from(await body.transformToByteArray());
}

async function readManifest(client, bucket, key) {
  stage = "R2 manifest read";
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await bodyBytes(response.Body);
  if (response.Metadata?.sha256) {
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== response.Metadata.sha256) throw new Error("Manifest SHA-256 metadata mismatch");
  }
  let manifest;
  try { manifest = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("Manifest is not valid JSON"); }
  if (manifest.format !== "bethag-storage-backup/v1" ||
      !Array.isArray(manifest.objects) ||
      manifest.object_count !== manifest.objects.length ||
      typeof manifest.snapshot_id !== "string" ||
      !manifest.snapshot_id) {
    throw new Error("Unsupported or structurally invalid BETHAG Storage manifest");
  }
  return manifest;
}

async function main() {
  const apply = hasFlag("--apply");
  if (hasFlag("--dry-run") && apply) throw new Error("Choose either --dry-run or --apply, not both");
  if (!apply && !hasFlag("--dry-run")) {
    throw new Error("Safe default is dry-run; pass --dry-run explicitly to validate or --apply for a guarded restore");
  }

  const manifestKey = arg("--manifest-key");
  const targetBucket = arg("--target-bucket");
  if (!manifestKey || !manifestKey.startsWith(SOURCE_PREFIX) || !manifestKey.endsWith(".json")) {
    throw new Error("--manifest-key must identify a JSON snapshot under " + SOURCE_PREFIX);
  }
  if (!targetBucket) throw new Error("--target-bucket is required");
  const sourceBucket = required("R2_BUCKET");
  if (targetBucket === sourceBucket) throw new Error("Restore target must not be the R2 backup bucket");
  if (apply && process.env.RESTORE_CONFIRM_TARGET !== targetBucket) {
    throw new Error("For --apply, set RESTORE_CONFIRM_TARGET to exactly the target bucket name");
  }
  const accountId = required("R2_ACCOUNT_ID");
  const r2AccessKey = required("R2_ACCESS_KEY_ID");
  const r2Secret = required("R2_SECRET_ACCESS_KEY");
  const cloudflareToken = required("CLOUDFLARE_R2_READ_TOKEN");
  const supabaseEndpoint = endpoint(required("SUPABASE_S3_ENDPOINT"), "SUPABASE_S3_ENDPOINT");
  if (!supabaseEndpoint.endsWith("/storage/v1/s3")) {
    throw new Error("SUPABASE_S3_ENDPOINT must end exactly with /storage/v1/s3");
  }

  stage = "R2 bucket jurisdiction lookup";
  const metadataUrl = "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(accountId) + "/r2/buckets/" + encodeURIComponent(sourceBucket);
  const metadataResponse = await fetch(metadataUrl, {
    headers: { Authorization: "Bearer " + cloudflareToken, Accept: "application/json }
  });
  const metadata = await metadataResponse.json().catch(() => null);
  if (!metadataResponse.ok || metadata?.success !== true || !metadata.result?.jurisdiction) {
    throw new Error("Unable to verify R2 bucket jurisdiction; refusing to guess endpoint");
  }
  const jurisdiction = metadata.result.jurisdiction;
  const r2 = new S3Client({
    endpoint: "https://" + accountId + (jurisdiction === "default" ? "" : "." + jurisdiction) + ".r2.cloudflarestorage.com",
    region: "auto",
    credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2Secret }
  });
  const supabase = new S3Client({
    endpoint: supabaseEndpoint,
    region: required("SUPABASE_S3_REGION"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: required("SUPABASE_S3_ACCESS_KEY_ID"),
      secretAccessKey: required("SUPABASE_S3_SECRET_ACCESS_KEY")
    }
  });

  try {
    const manifest = await readManifest(r2, sourceBucket, manifestKey);
    const seenKeys = new Set();
    const verified = [];
    for (const item of manifest.objects) {
      stage = "R2 blob integrity verification";
      if (!item || typeof item.key !== "string" || !item.key || item.key.startsWith("/") ||
          item.key.includes("\\") || typeof item.blob_key !== "string" ||
          !item.blob_key.startsWith(OBJECT_PREFIX) ||
          !/^[a-f0-9]{64}\/[A-Za-z0-9T._-]+$/.test(item.blob_key.slice(OBJECT_PREFIX.length)) ||
          !/^[a-f0-9]{64}$/.test(item.sha256) ||
          !Number.isSafeInteger(item.size) || item.size < 0 ||
          item.blob_key.slice(OBJECT_PREFIX.length).split("/")[0] !== item.sha256) {
        throw new Error("Manifest contains an invalid or unsafe object entry");
      }
      if (seenKeys.has(item.key)) throw new Error("Manifest contains duplicate source object keys");
      seenKeys.add(item.key);
      const response = await r2.send(new GetObjectCommand({ Bucket: sourceBucket, Key: item.blob_key }));
      const bytes = await bodyBytes(response.Body);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (bytes.length !== item.size || digest !== item.sha256) {
        throw new Error("Blob integrity verification failed for source key " + JSON.stringify(item.key));
      }
      verified.push({ item, bytes });
    }

    stage = "Supabase restore target preflight";
    const existing = await listAll(supabase, targetBucket);
    if (existing.length) {
      throw new Error("Restore target bucket is not empty; refusing to overwrite or mix existing objects");
    }

    if (apply) {
      for (const { item, bytes } of verified) {
        stage = "Supabase object restore write";
        await supabase.send(new PutObjectCommand({
          Bucket: targetBucket,
          Key: item.key,
          Body: bytes,
          ContentLength: item.size,
          ContentType: item.content_type || "application/octet-stream",
          ...(item.cache_control ? { CacheControl: item.cache_control } : {}),
          ...(item.content_disposition ? { ContentDisposition: item.content_disposition } : {}),
          ...(item.content_encoding ? { ContentEncoding: item.content_encoding } : {}),
          ...(item.content_language ? { ContentLanguage: item.content_language } : {}),
          ...(item.expires ? { Expires: new Date(item.expires) } : {}),
          ...(item.metadata && Object.keys(item.metadata).length ? { Metadata: item.metadata } : {})
        }));
      }
    }

    console.log(JSON.stringify({
      status: apply ? "RESTORE_WRITTEN" : "DRY_RUN_PASS",
      snapshot_id: manifest.snapshot_id,
      manifest_key: manifestKey,
      source_object_count: manifest.objects.length,
      blobs_integrity_verified: verified.length,
      target_bucket: targetBucket,
      writes_performed: apply ? verified.length : 0,
      target_was_empty: true
    }, null, 2));
  } finally {
    r2.destroy();
    supabase.destroy();
  }
}

main().catch((error) => {
  console.error("BETHAG Storage restore failed at [" + stage + "]:", error?.message || String(error));
  process.exitCode = 1;
});
