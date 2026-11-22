import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = [
  "supabase/functions/bethag-invite-resident/index.ts",
  "supabase/functions/bethag-invite-collaborator/index.ts",
];
for (const path of paths) {
  const source = await readFile(path, "utf8");
  assert.match(source, /async function findAuthUserByEmail\(/, path + " must define paginated email lookup");
  assert.match(source, /let page = 1;/, path + " must start pagination at page 1");
  assert.match(source, /perPage = 1000;/, path + " must use bounded page size");
  assert.match(source, /page\s*\+=\s*1;/, path + " must advance through pages");
  assert.match(source, /data\.users\.length < perPage/, path + " must stop when the final page is reached");
  assert.match(source, /findAuthUserByEmail\(adminClient, email\)/, path + " must use paginated lookup for duplicate-email fallback");
  assert.doesNotMatch(source, /listUsers\(\{\s*page:\s*1,\s*perPage:\s*1000\s*\}\)/, path + " must not use a single-page lookup");
}
console.log("PASS: existing Auth-user email fallback is paginated in both invite Edge Functions.");
