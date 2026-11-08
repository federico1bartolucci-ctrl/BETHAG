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
 * The runner compares this projection with the QA-certified manifest. Only explicitly
 * enumerated owner/operations metadata is mutable after QA; migration sequence,
 * historical ledger snapshot, SQL hashes, review disposition and postflight contract
 * remain part of the immutable payload.
 */
export function frozenManifestPayload(manifest) {
  const payload = structuredClone(manifest);
  delete payload.status;
  delete payload.user_authorization;
  delete payload.safety;
  delete payload.no_go_gates;

  // Status wording is an execution-progress field; actual STOP conditions are
  // enforced by the runner's explicit checks and required environment gates.
  if (payload.critical_execution_constraint) {
    delete payload.critical_execution_constraint.status;
  }

  // These fields record owner-verified, time-specific Production Dashboard
  // evidence. They do not alter the frozen SQL, ledger, ACL target or postflight.
  const systemSchema = payload.live_catalog
    ?.supabase_admin_default_acl_disposition
    ?.qa_only_system_schema_default_acl;
  if (systemSchema) {
    delete systemSchema.exposure_status;
    delete systemSchema.note;
    delete systemSchema.exposure_evidence;
    if (systemSchema.role_level_override) {
      delete systemSchema.role_level_override.effective_dashboard_data_api_config;
    }
  }
  return payload;
}

/** Require a distinct, explicit owner authorization for Production DDL/DML.
 * A read-only preflight approval must never satisfy the Production apply gate.
 */
export function assertProductionApplyApproval(approval) {
  if (approval?.approval_scope !== "PRODUCTION_APPLY"
    || approval?.production_apply_authorized !== true
    || approval?.execution_approval_status !== "APPROVED_PRODUCTION_APPLY") {
    throw new Error("Blocked: manifest approval is limited to read-only preflight; explicit Production APPLY authorization is required.");
  }
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
