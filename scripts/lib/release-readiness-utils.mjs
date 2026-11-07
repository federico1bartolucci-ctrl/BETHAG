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
 * Only approval/status metadata may change after the application QA SHA; review disposition remains frozen.
 */
export function frozenManifestPayload(manifest) {
  const { status, user_authorization, ...payload } = manifest;
  return payload;
}

/** Reject missing, stale, or implausibly future-dated live environment snapshots. */
export function isFreshSnapshot(capturedAt, now = Date.now(), maxAgeHours = 24) {
  const timestamp = Date.parse(capturedAt ?? "");
  if (!Number.isFinite(timestamp)) return false;
  const ageMs = now - timestamp;
  return ageMs >= -5 * 60 * 1000 && ageMs <= maxAgeHours * 60 * 60 * 1000;
}


/** Canonical JSON representation: object keys sorted recursively; array order preserved. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

/**
 * Fingerprint the executable release contract, not the Git commit that records
 * its approval. fileContents must contain every security/execution-critical
 * path, keyed by repository-relative path. The manifest's approval/review
 * metadata is deliberately excluded; its ordered migration payload is not.
 */
export function releaseFingerprint({ sourceCommitSha, manifest, fileContents }) {
  if (!/^[0-9a-f]{40}$/.test(sourceCommitSha ?? "")) {
    throw new TypeError("A full QA-tested source commit SHA is required.");
  }
  if (!manifest || !Array.isArray(manifest.sequence) || manifest.sequence.length !== 19) {
    throw new TypeError("The frozen manifest must contain exactly nineteen ordered migrations.");
  }
  if (!fileContents || typeof fileContents !== "object" || Array.isArray(fileContents)) {
    throw new TypeError("Critical release file contents are required.");
  }
  const paths = Object.keys(fileContents).sort();
  if (paths.length === 0 || paths.some((path) => typeof fileContents[path] !== "string")) {
    throw new TypeError("Critical release file contents must be non-empty text entries.");
  }
  const files = paths.map((path) => ({ path, git_blob_sha: gitBlobSha(fileContents[path]) }));
  const payload = {
    source_commit_sha: sourceCommitSha,
    frozen_manifest_payload: frozenManifestPayload(manifest),
    ordered_migrations: manifest.sequence.map(({ file, git_blob_sha }) => ({ file, git_blob_sha })),
    critical_files: files,
  };
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}
