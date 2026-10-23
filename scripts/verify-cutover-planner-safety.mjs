import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const planner = await readFile("scripts/plan-migration-cutover.mjs", "utf8");

// Generic --linked repair commands can target whichever project the CLI happens
// to be linked to, including Production. The planner must never print them.
assert.doesNotMatch(
  planner,
  /supabase migration repair --linked --status/,
  "Planner must not emit executable generic --linked migration repair commands.",
);
assert.match(planner, /BLOCKED: generic --linked repair commands are unsafe/);
assert.match(planner, /--print-review-checklist/);
assert.match(planner, /explicitly verified QA project/);
assert.match(planner, /fresh QA ledger capture/);
assert.match(planner, /Never run this plan while linked to Production|never use this plan while linked to Production/i);

console.log(JSON.stringify({
  cutover_planner_safety: "PASS",
  generic_linked_repair_commands_emitted: false,
  production_mutation: false,
}, null, 2));
