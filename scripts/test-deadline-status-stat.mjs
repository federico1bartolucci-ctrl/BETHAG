import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getDeadlineEffectiveStatus } from "../src/deadlineStatus.mjs";

const today = "2026-11-22";
const deadline = (status, dueDate) => ({ status, dueDate });

assert.equal(getDeadlineEffectiveStatus(deadline("In scadenza", "2026-11-21"), today), "Scaduta");
assert.equal(getDeadlineEffectiveStatus(deadline("In scadenza", today), today), "In scadenza");
assert.equal(getDeadlineEffectiveStatus(deadline("In scadenza", "2026-11-30"), today), "In scadenza");
assert.equal(getDeadlineEffectiveStatus(deadline("Da fare", "2026-11-21"), today), "Scaduta");
assert.equal(getDeadlineEffectiveStatus(deadline("Completata", "2026-11-21"), today), "Completata");
assert.equal(getDeadlineEffectiveStatus(deadline("Da fare", ""), today), "Da fare");

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(source, /getDeadlineEffectiveStatus\(d, todayISO\) === "In scadenza"/, "Upcoming statistic must use effective status, not stored status.");
assert.match(source, /getDeadlineEffectiveStatus\(d, todayISO\) === "Scaduta"/, "Expired statistic must use the same effective status helper.");
assert.match(source, /d\.dueDate >= localISODate\(\)/, "Dashboard upcoming list must exclude past due dates.");
console.log("Deadline effective-status statistics regression checks: PASS");
