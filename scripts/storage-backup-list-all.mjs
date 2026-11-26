/**
 * Collect a complete S3 ListObjectsV2 inventory.
 *
 * A truncated page without a usable continuation token, a repeated token,
 * malformed page metadata, or duplicate keys is an incomplete/ambiguous
 * inventory and must abort the backup rather than publish a partial snapshot.
 */
export async function listAllStorageObjects(client, bucket, prefix, ListObjectsV2Command) {
  if (!client || typeof client.send !== "function") {
    throw new TypeError("Storage listing requires an S3-compatible client");
  }
  if (typeof bucket !== "string" || bucket.trim().length === 0) {
    throw new TypeError("Storage listing requires a non-empty bucket name");
  }
  if (prefix !== undefined && typeof prefix !== "string") {
    throw new TypeError("Storage listing prefix must be a string when supplied");
  }
  if (typeof ListObjectsV2Command !== "function") {
    throw new TypeError("Storage listing requires the ListObjectsV2 command constructor");
  }

  const objects = [];
  const seenKeys = new Set();
  const seenContinuationTokens = new Set();
  let continuationToken;

  while (true) {
    const input = {
      Bucket: bucket,
      MaxKeys: 1000,
      ...(prefix === undefined ? {} : { Prefix: prefix }),
      ...(continuationToken === undefined ? {} : { ContinuationToken: continuationToken }),
    };
    const page = await client.send(new ListObjectsV2Command(input));

    if (!page || typeof page !== "object" || Array.isArray(page)) {
      throw new Error("Storage listing returned a malformed ListObjectsV2 page");
    }
    if (typeof page.IsTruncated !== "boolean") {
      throw new Error("Storage listing page omitted the IsTruncated boolean; refusing an incomplete inventory");
    }

    const contents = page.Contents ?? [];
    if (!Array.isArray(contents)) {
      throw new Error("Storage listing page returned malformed Contents");
    }
    for (const item of contents) {
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          typeof item.Key !== "string" || item.Key.length === 0) {
        throw new Error("Storage listing page contains an object without a valid key");
      }
      if (seenKeys.has(item.Key)) {
        throw new Error("Storage listing returned duplicate object key " + JSON.stringify(item.Key));
      }
      seenKeys.add(item.Key);
      objects.push(item);
    }

    if (!page.IsTruncated) return objects;

    const nextToken = page.NextContinuationToken;
    if (typeof nextToken !== "string" || nextToken.length === 0) {
      throw new Error("Truncated Storage listing omitted NextContinuationToken; refusing a partial inventory");
    }
    if (nextToken === continuationToken || seenContinuationTokens.has(nextToken)) {
      throw new Error("Storage listing repeated a continuation token; refusing a pagination loop");
    }
    seenContinuationTokens.add(nextToken);
    continuationToken = nextToken;
  }
}
