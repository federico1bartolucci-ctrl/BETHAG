import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("supabase/functions/bethag-invite-resident/index.ts", "utf8");
const start = source.indexOf("let metadataWarning: string | null = null;");
const end = source.indexOf("\n    return json({", start);
assert.ok(start >= 0 && end > start, "resident invite handles post-invite metadata result");
const block = source.slice(start, end);
assert.match(block, /const \{ error: metadataError \}/, "metadata update captures errors");
assert.match(block, /if \(metadataError\)/, "metadata failures are checked");
assert.match(block, /metadataWarning = metadataError\.message/, "metadata failure warning preserves provider message");
assert.match(block, /console\.error\("bethag-invite-resident metadata update failed after portal access was saved"/, "partial success is logged");
assert.match(source, /metadataWarning,/, "API response exposes partial-success warning");
console.log("Resident invitation metadata error checks passed.");
