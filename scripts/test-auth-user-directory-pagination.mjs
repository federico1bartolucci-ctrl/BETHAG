import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { findAuthUserByEmail } from "../supabase/functions/_shared/auth-user-directory.js";

const target = { id: "user-on-page-two", email: "Target.User@example.invalid" };
const firstPage = Array.from({ length: 1000 }, (_, index) => ({
  id: `user-${index}`,
  email: `person-${index}@example.invalid`,
}));
const calls = [];
const found = await findAuthUserByEmail({
  auth: { admin: { async listUsers(options) {
    calls.push(options);
    if (options.page === 1) return { data: { users: firstPage }, error: null };
    if (options.page === 2) return { data: { users: [target] }, error: null };
    throw new Error("lookup should stop as soon as the target is found");
  } } },
}, "  target.user@EXAMPLE.invalid  ");
assert.equal(found, target);
assert.deepEqual(calls, [{ page: 1, perPage: 1000 }, { page: 2, perPage: 1000 }]);
console.log("PASS: Auth user beyond the first 1,000 entries is found using normalized email and bounded pages.");

const noMatchCalls = [];
const noMatch = await findAuthUserByEmail({
  auth: { admin: { async listUsers(options) {
    noMatchCalls.push(options);
    return { data: { users: options.page === 1 ? firstPage : [{ id: "last", email: "last@example.invalid" }] }, error: null };
  } } },
}, "missing@example.invalid");
assert.equal(noMatch, null);
assert.deepEqual(noMatchCalls, [{ page: 1, perPage: 1000 }, { page: 2, perPage: 1000 }]);
console.log("PASS: lookup stops on the first short page when the email is absent.");

await assert.rejects(
  findAuthUserByEmail({ auth: { admin: { async listUsers() { return { data: null, error: { message: "Auth unavailable" } }; } } } }, "x@example.invalid"),
  /Auth unavailable/,
);
await assert.rejects(
  findAuthUserByEmail({ auth: { admin: { async listUsers() { return { data: {}, error: null }; } } } }, "x@example.invalid"),
  /invalid user-directory page/,
);
await assert.rejects(
  findAuthUserByEmail({ auth: { admin: { async listUsers() { throw new Error("transport failed"); } } } }, "x@example.invalid"),
  /transport failed/,
);
await assert.rejects(
  findAuthUserByEmail({ auth: { admin: { async listUsers() { throw new Error("must not be called"); } } } }, "  "),
  /email address is required/,
);
console.log("PASS: Auth lookup errors, malformed pages, transport failures and empty emails fail explicitly.");

for (const path of [
  "supabase/functions/bethag-invite-resident/index.ts",
  "supabase/functions/bethag-invite-collaborator/index.ts",
]) {
  const source = await readFile(path, "utf8");
  assert.match(source, /import \{ findAuthUserByEmail \} from "\.\.\/_shared\/auth-user-directory\.js";/);
  assert.match(source, /findAuthUserByEmail\(adminClient, email\)/);
  assert.doesNotMatch(source, /listUsers\(\{\s*page:\s*1,\s*perPage:\s*1000\s*\}\)/);
}
console.log("PASS: resident and collaborator invitation Edge Functions both use the shared paginated Auth lookup.");
