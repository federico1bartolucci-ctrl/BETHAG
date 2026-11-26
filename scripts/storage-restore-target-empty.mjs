/**
 * Verify a restore target bucket is genuinely empty.
 *
 * A one-object probe is sufficient: any returned object (including an S3
 * folder-marker key ending in "/") makes the target non-empty. A truncated
 * or malformed response is not evidence of emptiness and must fail closed.
 */
export async function assertRestoreTargetEmpty(client, bucket, ListObjectsV2Command) {
  if (!client || typeof client.send !== "function") {
    throw new TypeError("Restore target preflight requires an S3-compatible client");
  }
  if (typeof bucket !== "string" || bucket.trim().length === 0) {
    throw new TypeError("Restore target preflight requires a non-empty bucket name");
  }
  if (typeof ListObjectsV2Command !== "function") {
    throw new TypeError("Restore target preflight requires the ListObjectsV2 command constructor");
  }

  const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
  if (!page || typeof page !== "object" || Array.isArray(page) || typeof page.IsTruncated !== "boolean") {
    throw new Error("Restore target listing returned malformed metadata; refusing to assume the bucket is empty");
  }

  if (page.Contents === undefined && page.KeyCount === undefined) {
    throw new Error("Restore target listing omitted both Contents and KeyCount; refusing to assume the bucket is empty");
  }
  const contents = page.Contents ?? [];
  if (!Array.isArray(contents) || contents.length > 1) {
    throw new Error("Restore target listing returned malformed object contents; refusing to assume the bucket is empty");
  }
  if (
    page.KeyCount !== undefined &&
    (!Number.isSafeInteger(page.KeyCount) || page.KeyCount < 0 ||
      page.KeyCount > 1 || page.KeyCount !== contents.length)
  ) {
    throw new Error("Restore target listing returned inconsistent KeyCount metadata; refusing to assume the bucket is empty");
  }
  for (const item of contents) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        typeof item.Key !== "string" || item.Key.length === 0) {
      throw new Error("Restore target listing contains an object without a valid key; refusing to assume the bucket is empty");
    }
  }

  if (contents.length > 0 || page.IsTruncated) {
    throw new Error("Restore target bucket is not empty; refusing to overwrite or mix existing objects");
  }

  return true;
}
