import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("supabase/functions/bethag-invite-collaborator/index.ts", "utf8");
assert.match(source, /\.select\("user_id, role"\)/, "Existing workspace membership must load the role.");
assert.match(source, /existing\?\.role === "admin"/, "Admin memberships must be explicitly guarded.");
const guard = source.indexOf('existing?.role === "admin"');
const invite = source.indexOf('inviteUserByEmail');
const upsert = source.indexOf('.upsert({', source.indexOf('workspace_members'));
assert.ok(guard >= 0 && invite > guard && upsert > guard, "Admin downgrade guard must precede invitation and membership upsert.");
assert.match(source, /Operazione riservata all'Amministratore del workspace/, "The endpoint must still restrict invite callers to admins.");
console.log("PASS: collaborator invitation cannot downgrade a workspace-admin membership.");
