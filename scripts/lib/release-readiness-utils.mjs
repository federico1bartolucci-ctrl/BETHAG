import { createHash } from "node:crypto";

/** Match Git's blob object ID for text files across LF/CRLF checkouts. */
export function gitBlobSha(content) {
  const canonicalContent = content.replace(/\r\n/g, "\n");
  const bytes = Buffer.from(canonicalContent, "utf8");
  return createHash("sha1").update(Buffer.concat([
    Buffer.from(`blob ${bytes.length}\0`),
    bytes,
  ])).digest("hex");
}

/** Parse git's changed-path output independent of checkout line endings. */
export function splitChangedPaths(output) {
  return output.split(/\r?\n/).filter(Boolean);
}

/** Match the guarded runner's accepted libpq connection configuration. */
export function hasPostgresConnectionConfig(env) {
  return Boolean(env.DATABASE_URL || (env.PGHOST && env.PGDATABASE && env.PGUSER));
}

/** Read an application test by its canonical APP-## key, with legacy alias fallback. */
export function getApplicationTest(applicationTests, id) {
  const canonicalKey = "APP-" + String(id).padStart(2, "0");
  const legacyKey = "APP" + String(id).padStart(2, "0");
  return applicationTests[canonicalKey] ?? applicationTests[legacyKey];
}

/** Return the immutable technical payload of the frozen Production cutover manifest.
 * Only review/approval metadata may change after the application QA SHA.
 */
export function frozenManifestPayload(manifest) {
  const { status, safety, user_authorization, review_disposition, ...payload } = manifest;
  return payload;
}

/** Reject missing, stale, or implausibly future-dated live environment snapshots. */
export function isFreshSnapshot(capturedAt, now = Date.now(), maxAgeHours = 24) {
  const timestamp = Date.parse(capturedAt ?? "");
  if (!Number.isFinite(timestamp)) return false;
  const ageMs = now - timestamp;
  return ageMs >= -5 * 60 * 1000 && ageMs <= maxAgeHours * 60 * 60 * 1000;
}
