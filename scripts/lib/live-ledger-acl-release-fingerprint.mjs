import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const CANDIDATE = "20261124234000_revoke_postgres_global_public_function_execute.sql";
const CRITICAL_PATHS = [
  "scripts/apply-live-ledger-acl-production.mjs",
  "scripts/lib/live-ledger-acl-approval-guard.mjs",
  "scripts/lib/live-ledger-acl-release-fingerprint.mjs",
  "supabase/rebuild/drafts/" + CANDIDATE,
  "supabase/rebuild/drafts/production-ledger-live-20261124.json",
  "supabase/rebuild/drafts/production-cutover-preflight-live-20261124.sql",
  "supabase/rebuild/drafts/production-cutover-postflight-live-20261124.sql",
].sort();

/**
 * Fingerprint the exact executable contract accepted by the live-ledger ACL runner.
 * Keep this function shared by the Production runner and the read-only operator CLI.
 */
export async function computeLiveLedgerAclReleaseFingerprint({ root, sourceCommitSha }) {
  if (!/^[0-9a-f]{40}$/.test(sourceCommitSha ?? "")) {
    throw new TypeError("A full source commit SHA is required for the live-ledger ACL fingerprint.");
  }
  if (!root) throw new TypeError("Repository root is required.");

  const pieces = [];
  for (const path of CRITICAL_PATHS) {
    const content = (await readFile(join(root, path), "utf8")).replace(/\r\n/g, "\n");
    pieces.push(path + "\0" + content + "\0");
  }
  const fingerprint = createHash("sha256")
    .update("BETHAG-LIVE-LEDGER-ACL-267-TO-268\0" + sourceCommitSha + "\0" + pieces.join(""))
    .digest("hex");

  return { fingerprint, criticalFileCount: CRITICAL_PATHS.length, criticalPaths: [...CRITICAL_PATHS] };
}
