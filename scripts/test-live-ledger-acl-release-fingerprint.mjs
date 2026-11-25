#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { computeLiveLedgerAclReleaseFingerprint } from "./lib/live-ledger-acl-release-fingerprint.mjs";

const sourceCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const expected = await computeLiveLedgerAclReleaseFingerprint({ root: resolve("."), sourceCommitSha });
assert.match(expected.fingerprint, /^[0-9a-f]{64}$/);
assert.equal(expected.criticalFileCount, 7);
assert.ok(expected.criticalPaths.includes("scripts/lib/live-ledger-acl-release-fingerprint.mjs"));
assert.ok(expected.criticalPaths.includes("scripts/apply-live-ledger-acl-production.mjs"));

const cli = spawnSync(process.execPath, ["scripts/print-live-ledger-acl-release-fingerprint.mjs", sourceCommitSha], {
  encoding: "utf8",
});
assert.equal(cli.status, 0, cli.stderr);
assert.match(cli.stdout, new RegExp("BETHAG_LIVE_LEDGER_ACL_RELEASE_FINGERPRINT=" + expected.fingerprint));
assert.match(cli.stdout, new RegExp("BETHAG_LIVE_LEDGER_ACL_SOURCE_SHA=" + sourceCommitSha));

const wrongSha = "f".repeat(40);
const mismatch = spawnSync(process.execPath, ["scripts/print-live-ledger-acl-release-fingerprint.mjs", wrongSha], {
  encoding: "utf8",
});
assert.notEqual(mismatch.status, 0);
assert.match(mismatch.stderr, /Fingerprint must be calculated from a clean checkout of the exact source SHA/);

console.log(JSON.stringify({
  status: "PASS",
  deterministic_shared_fingerprint: "PASS",
  exact_source_checkout_required: "PASS",
  runner_and_operator_cli_share_same_fingerprint_function: "PASS",
  critical_file_count: expected.criticalFileCount,
}, null, 2));
