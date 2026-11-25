#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { computeLiveLedgerAclReleaseFingerprint } from "./lib/live-ledger-acl-release-fingerprint.mjs";

const sourceCommitSha = (process.argv[2] || process.env.BETHAG_APPROVED_SOURCE_COMMIT_SHA || "").trim();
assert.match(sourceCommitSha, /^[0-9a-f]{40}$/,
  "Pass the exact QA-tested source SHA as the first argument or BETHAG_APPROVED_SOURCE_COMMIT_SHA.");
const checkedOutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.equal(checkedOutSha, sourceCommitSha,
  "Fingerprint must be calculated from a clean checkout of the exact source SHA to be approved.");
const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
const unexpectedDirty = dirty.split("\n").filter(Boolean).filter((entry) =>
  entry !== "?? node_modules/" && entry !== "?? package-lock.json");
assert.equal(unexpectedDirty.length, 0,
  "Fingerprint calculation requires a clean Git worktree; generated node_modules/package-lock artifacts are ignored.");

const result = await computeLiveLedgerAclReleaseFingerprint({
  root: resolve("."),
  sourceCommitSha,
});
console.log("BETHAG_LIVE_LEDGER_ACL_RELEASE_FINGERPRINT=" + result.fingerprint);
console.log("BETHAG_LIVE_LEDGER_ACL_SOURCE_SHA=" + sourceCommitSha);
console.log("BETHAG_LIVE_LEDGER_ACL_CHECKED_OUT_SHA=" + checkedOutSha);
console.log("BETHAG_LIVE_LEDGER_ACL_CRITICAL_FILE_COUNT=" + result.criticalFileCount);
