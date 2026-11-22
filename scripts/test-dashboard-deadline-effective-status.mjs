import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDeadlineEffectiveStatus } from "../src/deadlineStatus.mjs";

const today = "2026-11-22";
const make = (status, dueDate) => ({ status, dueDate });
assert.equal(getDeadlineEffectiveStatus(make("In scadenza", "2026-11-21"), today), "Scaduta");
assert.equal(getDeadlineEffectiveStatus(make("In scadenza", today), today), "In scadenza");
assert.equal(getDeadlineEffectiveStatus(make("In scadenza", "2026-11-23"), today), "In scadenza");
assert.equal(getDeadlineEffectiveStatus(make("Completata", "2026-11-21"), today), "Completata");

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(source, /const urgentDeadlines\s*=\s*activeDeadlines\.filter\(\s*\(d\) => getDeadlineEffectiveStatus\(d, localISODate\(\)\) === "In scadenza"/s,
  "Dashboard urgent-deadline KPI must exclude overdue items and use the same effective status as the deadline page.");
console.log("Dashboard effective-deadline KPI regression checks: PASS");
