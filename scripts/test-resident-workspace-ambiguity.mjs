import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveUniqueWorkspaceId } from "../src/lib/resolveUniquePortalWorkspace.mjs";

assert.equal(resolveUniqueWorkspaceId([]), null, "no portal access returns no workspace");
assert.equal(
  resolveUniqueWorkspaceId([
    { workspace_id: "workspace-a" },
    { workspace_id: " workspace-a " },
    { workspace_id: "workspace-a" },
  ]),
  "workspace-a",
  "multiple condominium access rows within one workspace resolve to the same workspace"
);
assert.throws(
  () => resolveUniqueWorkspaceId([
    { workspace_id: "workspace-a" },
    { workspace_id: "workspace-b" },
  ]),
  /associato a più workspace/,
  "cross-workspace resident access must fail closed rather than pick the first row"
);
assert.throws(
  () => resolveUniqueWorkspaceId([{ workspace_id: null }]),
  /non contiene il workspace/,
  "malformed portal rows must not silently disappear"
);

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const resolverStart = source.indexOf("const resolveSupabaseAccess = async");
const resolverEnd = source.indexOf("const handleLogin = async", resolverStart);
assert.ok(resolverStart >= 0 && resolverEnd > resolverStart, "workspace access resolver exists");
const resolver = source.slice(resolverStart, resolverEnd);
assert.match(resolver, /\.from\("workspace_members"\)[\s\S]*?\.select\("workspace_id, role, permissions"\)/, "membership lookup reads workspace role data directly");
assert.match(resolver, /\.eq\("user_id", userId\)[\s\S]*?\.eq\("active", true\)[\s\S]*?\.order\("workspace_id", \{ ascending: true \}\)[\s\S]*?\.range\(offset, offset \+ 999\)/, "membership rows are filtered to the active user and paginated");
assert.match(resolver, /resolveUniqueWorkspaceId\(membershipRows\)/, "membership login rejects ambiguous workspace scope");
assert.doesNotMatch(resolver, /\.rpc\("get_my_workspace_access"\)/, "resolver must not use the RPC that returns only one membership");
assert.match(resolver, /\.from\("portal_access"\)[\s\S]*?\.select\("id, workspace_id, role"\)/, "resident and council access roles are fetched");
assert.match(resolver, /\.eq\("active", true\)[\s\S]*?\.in\("role", \["resident", "council"\]\)[\s\S]*?\.ilike\("email", email\.trim\(\)\)/, "council access is included in the resident login fallback");
assert.match(resolver, /\.eq\("active", true\)[\s\S]*?\.eq\("role", "resident"\)[\s\S]*?\.ilike\("email", email\.trim\(\)\)/);
assert.match(resolver, /\.order\("workspace_id", \{ ascending: true \}\)[\s\S]*?\.order\("id", \{ ascending: true \}\)[\s\S]*?\.range\(offset, offset \+ 999\)/);
assert.match(resolver, /resolveUniqueWorkspaceId\(portalRows\)/);
assert.doesNotMatch(resolver, /\.limit\(1\)/, "resident fallback must not select an arbitrary portal row");

const setupStart = source.indexOf("const completePasswordSetup = async");
const setupEnd = source.indexOf("const logout = async", setupStart);
assert.ok(setupStart >= 0 && setupEnd > setupStart, "password setup handler exists");
const setup = source.slice(setupStart, setupEnd);
assert.match(setup, /catch \(accessError\) \{\s*await supabase\.auth\.signOut\(\);\s*throw accessError;\s*\}/, "ambiguous access after password setup signs out");
console.log("Resident workspace ambiguity regression checks passed.");
