import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("supabase/functions/bethag-invite-collaborator/index.ts", "utf8");
const lookupStart = source.indexOf('const { data: existing, error: existingError }');
assert.ok(lookupStart >= 0, "existing membership lookup must exist");
const lookupEnd = source.indexOf("targetUserId = existing?.user_id || null;", lookupStart);
assert.ok(lookupEnd > lookupStart, "target user resolution must follow the membership guard");
const lookup = source.slice(lookupStart, lookupEnd);
assert.match(lookup, /\.select\("user_id, role"\)/, "existing workspace membership role must be loaded");
assert.match(lookup, /if \(existing\?\.role === "admin"\)/, "existing workspace admin must be rejected");
assert.match(lookup, /COLLABORATOR_INVITE_ADMIN_DOWNGRADE_BLOCKED/, "admin downgrade must return a stable error code");
assert.match(lookup, /\}, 409\)/, "admin downgrade must return HTTP 409");
assert.match(source, /Operazione riservata all'Amministratore del workspace/, "only an active workspace admin may invoke this endpoint");

const guardPosition = source.indexOf('if (existing?.role === "admin")');
const invitePosition = source.indexOf("inviteUserByEmail", lookupStart);
const membershipUpsertPosition = source.indexOf('.upsert({', source.indexOf('.from("workspace_members")', lookupEnd));
assert.ok(guardPosition > lookupStart && invitePosition > guardPosition, "admin downgrade guard must run before creating/inviting an Auth user");
assert.ok(membershipUpsertPosition > guardPosition, "admin downgrade guard must run before workspace membership upsert");
assert.doesNotMatch(lookup, /inviteUserByEmail|\.upsert\(/, "admin rejection must happen before side effects");
console.log("PASS: collaborator invitation rejects an existing workspace-admin membership before Auth invitation or membership upsert.");
