import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const planner = await readFile("scripts/plan-migration-cutover.mjs", "utf8");
assert.doesNotMatch(
  planner,
  /supabase migration repair --linked --status/,
  "Planner must not emit executable generic --linked migration repair commands.",
);
assert.match(planner, /BLOCKED: generic linked migration-repair commands are unsafe/);
assert.match(planner, /--print-review-checklist/);
assert.match(planner, /Verified isolated backup restore/);
assert.match(planner, /PLAN_ONLY_NO_COMMANDS/);

const blocked = spawnSync(process.execPath, ["scripts/plan-migration-cutover.mjs", "--print-commands"], {
  encoding: "utf8",
});
assert.equal(blocked.status, 2, "--print-commands must exit blocked.");
assert.match(blocked.stderr, /BLOCKED: generic linked migration-repair commands are unsafe/);
assert.doesNotMatch(blocked.stdout + blocked.stderr, /supabase migration repair --linked --status/);

const checklist = spawnSync(process.execPath, ["scripts/plan-migration-cutover.mjs", "--print-review-checklist"], {
  encoding: "utf8",
});
assert.equal(checklist.status, 0, "--print-review-checklist should return a non-executable checklist.");
assert.match(checklist.stdout, /REVIEW CHECKLIST — NO COMMANDS EXECUTED/);
assert.doesNotMatch(checklist.stdout + checklist.stderr, /supabase migration repair --linked --status/);

console.log(JSON.stringify({
  cutover_planner_safety: "PASS",
  generic_linked_repair_commands_emitted: false,
  unsafe_command_output_blocked: blocked.status === 2,
  review_checklist_available: checklist.status === 0,
  migration_tracking_mutation: false,
  production_mutation: false,
}, null, 2));
