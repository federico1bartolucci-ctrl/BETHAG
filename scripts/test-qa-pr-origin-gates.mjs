import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const build = await readFile(".github/workflows/build.yml", "utf8");
const finalQa = await readFile(".github/workflows/qa-final-collaudo.yml", "utf8");
const navigation = await readFile(".github/workflows/qa-navigation.yml", "utf8");

assert.match(build, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
assert.match(finalQa, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
assert.match(navigation, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
assert.match(finalQa, /github\.event_name != 'workflow_dispatch' \|\| github\.ref == 'refs\/heads\/main'/);
assert.match(navigation, /github\.event_name != 'workflow_dispatch' \|\| github\.ref == 'refs\/heads\/main'/);

console.log("QA secret-bearing workflow PR-origin gates: PASS");
