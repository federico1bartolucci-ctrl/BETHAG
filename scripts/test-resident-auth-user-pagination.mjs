import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile("supabase/functions/bethag-invite-resident/index.ts", "utf8");
assert.match(source, /const perPage = 1000/);
assert.match(source, /while \(!?existingUser\)?/);
assert.match(source, /page, perPage/);
assert.match(source, /users\.users\.length < perPage/);
console.log("Resident Auth pagination regression guard: PASS");
