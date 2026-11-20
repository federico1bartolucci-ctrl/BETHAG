import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = await readFile(".github/workflows/build.yml", "utf8");
const finalQa = await readFile(".github/workflows/qa-final-collaudo.yml", "utf8");
const navigation = await readFile(".github/workflows/qa-navigation.yml", "utf8");

const sameRepoPullRequest = /github\\.event_name == 'pull_request' && github\\.event\\.pull_request\\.head\\.repo\\.full_name == github\\.repository/;
assert.match(build, sameRepoPullRequest, "Build QA-secret steps must require same-repository PR origin");
assert.match(finalQa, sameRepoPullRequest, "Final QA must require same-repository PR origin");
assert.match(navigation, sameRepoPullRequest, "QA navigation must require same-repository PR origin");
assert.match(finalQa, /github\\.event_name != 'workflow_dispatch' \\|\\| github\\.ref == 'refs\\/heads\\/main'/);
assert.match(navigation, /github\\.event_name != 'workflow_dispatch' \\|\\| github\\.ref == 'refs\\/heads\\/main'/);

console.log("QA secret-bearing workflow PR-origin gates: PASS");
