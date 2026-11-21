import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("supabase/functions/bethag-invite-collaborator/index.ts", "utf8");
assert.match(source, /for\s*\(let page\s*=\s*1;\s*!existingUser;\s*page\s*\+=\s*1\)/, "Existing-account lookup must paginate until the user is found.");
assert.match(source, /listUsers\(\{\s*page,\s*perPage:\s*1000\s*\}\)/, "Each page must use the current page index.");
assert.match(source, /users\.users\.length\s*<\s*1000/, "Pagination must stop when the last page is short.");
assert.match(source, /candidate\.email\?\.trim\(\)\.toLowerCase\(\)\s*===\s*email/, "Email matching must remain case-insensitive and trimmed.");
console.log("Collaborator invite pagination regression checks: PASS");
