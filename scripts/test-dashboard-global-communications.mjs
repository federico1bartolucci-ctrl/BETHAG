import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/main.tsx", "utf8");
assert.match(source, /type Communication = \{[\s\S]*?condominiumId: number \| null;/,
  "Communications must support all-condominium records");
assert.match(source, /const activeCommunications = communications\.filter\(\(communication\) =>[\s\S]*?communication\.condominiumId === null \|\|[\s\S]*?activeCondominiumIds\.has\(communication\.condominiumId\)/,
  "Dashboard filtering must include global communications and active-condominium communications");
assert.match(source, /visibleCommunications[\s\S]*activeCommunications\.filter/,
  "Published-communications KPI must use the corrected active communications list");
assert.match(source, /communications\.slice\(0, 4\)/,
  "Dashboard communications list must use the corrected active communications list");
console.log("Dashboard all-condominiums communication guard: PASS");
