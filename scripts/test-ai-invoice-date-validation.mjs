import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseBethagDate } from "../src/lib/bethagDateParser.mjs";

const source = await readFile(new URL("../src/lib/bethagBackend.ts", import.meta.url), "utf8");
assert.match(source, /import \{ parseBethagDate \} from "\.\/bethagDateParser\.mjs"/, "Backend must use the tested date parser module");
assert.match(source, /const invoiceDate = parseBethagDate\(payload\.extractedData\?\.documentDate \?\? payload\.extractedData\?\.invoiceDate\)/, "Invoice extraction must use the shared parser");
assert.match(source, /if \(!invoiceDate\)/, "Missing invoice dates must be rejected before confirmation");

assert.equal(parseBethagDate(null), "", "Absent date must not be silently replaced with today");
assert.equal(parseBethagDate(undefined), "", "Undefined date must not be silently replaced with today");
assert.equal(parseBethagDate("  "), "", "Whitespace date must be rejected");
assert.equal(parseBethagDate("31/02/2026"), "", "Invalid calendar date must be rejected");
assert.equal(parseBethagDate("29/02/2024"), "2024-02-29", "Leap date must be accepted");
assert.equal(parseBethagDate("01/12/2026"), "2026-12-01", "Italian date must be normalized");
assert.equal(parseBethagDate("2026-12-01"), "2026-12-01", "ISO date must be accepted");
assert.equal(parseBethagDate("2026-12-01T00:00:00Z"), "2026-12-01", "ISO timestamp must be normalized");
assert.equal(parseBethagDate("not a date"), "", "Unparseable date must be rejected");

console.log("AI invoice date validation regression checks: PASS");
