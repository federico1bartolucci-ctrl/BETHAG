import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../supabase/functions/bethag-invite-resident/index.ts", import.meta.url),
  "utf8",
);
const updateBlock = source.match(
  /const \{ error: invitedUserMetadataError \} = await adminClient\.auth\.admin\.updateUserById[\s\S]*?if \(invitedUserMetadataError\) throw invitedUserMetadataError;/,
);
assert.ok(
  updateBlock,
  "Resident invite metadata update must check and propagate its error",
);
console.log("Resident invite metadata error regression guard: PASS");
