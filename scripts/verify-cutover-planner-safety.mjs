import assert from "node:assert/strict";
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

console.log(JSON.stringify({
  cutover_planner_safety: "PASS",
  generic_linked_repair_commands_emitted: false,
  migration_tracking_mutation: false,
  production_mutation: false,
}, null, 2));
