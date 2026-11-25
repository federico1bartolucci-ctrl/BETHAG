import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { releaseFingerprint } from "./lib/release-readiness-utils.mjs";

const root = process.cwd();
const readJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const manifest = await readJson("supabase/rebuild/production-migration-cutover-freeze-20261105.json");
const frozenQaSourceSha = manifest.user_authorization?.approved_commit_sha;
if (!/^[0-9a-f]{40}$/.test(frozenQaSourceSha ?? "")) {
  throw new Error("Frozen QA source SHA is missing or invalid in the Production freeze manifest.");
}
const checkedOutCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(checkedOutCommitSha)) {
  throw new Error("Checked-out Git commit SHA is missing or invalid.");
}
const criticalPaths = [
  "scripts/apply-reviewed-production-migrations.mjs",
  "scripts/verify-canonical-cutover-runner.mjs",
  "scripts/lib/release-readiness-utils.mjs",
  "scripts/test-release-readiness-utils.mjs",
  "scripts/test-canonical-cutover-runner.mjs",
  "scripts/verify-release-readiness.mjs",
  ".github/workflows/build.yml",
  ".github/workflows/bethag-baseline-checks.yml",
  ".github/workflows/qa-final-collaudo.yml",
  ".github/workflows/qa-authenticated-rls.yml",
  ".github/workflows/qa-app05-07.yml",
  ".github/workflows/qa-app08-11.yml",
  ".github/workflows/qa-app12.yml",
  ".github/workflows/qa-navigation.yml",
  "supabase/rebuild/production-cutover-preflight-20261105.sql",
  "supabase/rebuild/production-cutover-postflight-20261105.sql",
  "supabase/rebuild/production-ledger-20261105.json",
  "supabase/rebuild/live-migration-ledgers-20261105.json",
  ...manifest.sequence.map(({ file }) => "supabase/migrations/" + file),
  ...manifest.live_ledger.forward_migrations_after_2026_11_02_freeze.map(({ file }) => "supabase/rebuild/production-forward-migrations/" + file),
  "supabase/rebuild/production-forward-migrations/" + manifest.live_ledger.production_only_migration.file,
];
const uniquePaths = [...new Set(criticalPaths)].sort();
const fileContents = Object.fromEntries(await Promise.all(uniquePaths.map(async (path) => [path, await readFile(join(root, path), "utf8")])));
const fingerprint = releaseFingerprint({ sourceCommitSha: frozenQaSourceSha, manifest, fileContents });
console.log("BETHAG_RELEASE_FINGERPRINT=" + fingerprint);
console.log("BETHAG_RELEASE_FROZEN_QA_SOURCE_SHA=" + frozenQaSourceSha);
console.log("BETHAG_RELEASE_CHECKED_OUT_SHA=" + checkedOutCommitSha);
console.log("BETHAG_RELEASE_CRITICAL_FILE_COUNT=" + uniquePaths.length);
