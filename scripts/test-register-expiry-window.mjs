import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("src/RegisterPage.tsx", "utf8");
assert.match(source, /x\.expiry_date\s*>=\s*today/, "Expiry summary must exclude past dates.");
assert.match(source, /x\.expiry_date\s*<=\s*expiryLimit/, "Expiry summary must include only the next 30 days.");
function isUpcoming(date, today, limit) { return Boolean(date && date >= today && date <= limit); }
assert.equal(isUpcoming("2026-11-21","2026-11-22","2026-12-22"), false);
assert.equal(isUpcoming("2026-11-22","2026-11-22","2026-12-22"), true);
assert.equal(isUpcoming("2026-12-22","2026-11-22","2026-12-22"), true);
assert.equal(isUpcoming("2026-12-23","2026-11-22","2026-12-22"), false);
console.log("Register expiry window regression checks passed.");
