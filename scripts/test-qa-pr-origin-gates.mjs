import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = await readFile(".github/workflows/build.yml", "utf8");
const finalQa = await readFile(".github/workflows/qa-final-collaudo.yml", "utf8");
const navigation = await readFile(".github/workflows/qa-navigation.yml", "utf8");

const sameRepoPullRequest = "github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository";
const dispatchMainGate = "github.event_name != 'workflow_dispatch' || github.ref == 'refs/heads/main'";

assert.ok(build.includes(sameRepoPullRequest), "Build QA-secret steps must require same-repository PR origin");
assert.ok(finalQa.includes(sameRepoPullRequest), "Final QA must require same-repository PR origin");
assert.ok(navigation.includes(sameRepoPullRequest), "QA navigation must require same-repository PR origin");
assert.ok(finalQa.includes(dispatchMainGate), "Final QA manual dispatch must be main-only");
assert.ok(navigation.includes(dispatchMainGate), "QA navigation manual dispatch must be main-only");

console.log("QA secret-bearing workflow PR-origin gates: PASS");
