import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const start = source.indexOf("const deletePortalMember = async");
const end = source.indexOf("const newDeadline =", start);
assert.ok(start >= 0 && end > start, "portal member delete handler boundaries exist");
const handler = source.slice(start, end);

assert.match(handler, /if \(!supabaseConfigured \|\| !supabase \|\| !profile\.workspaceId\)\s*\{\s*setPortalMembers\(\(current\) => current\.filter\(\(member\) => member\.id !== id\)\);\s*return;\s*\}/,
  "local-only mode may remove the local entry without a backend");
const backendDelete = handler.indexOf("await deletePortalMemberBackend(profile.workspaceId, id)");
assert.ok(backendDelete >= 0, "backend deletion must be attempted");
const successfulLocalCommit = handler.indexOf("setPortalMembers((current) => current.filter((member) => member.id !== id))", backendDelete);
const catchStart = handler.indexOf("} catch (error)", backendDelete);
assert.ok(successfulLocalCommit > backendDelete && successfulLocalCommit < catchStart,
  "with Supabase configured, remove the local row only after the backend confirms deletion");
assert.ok(handler.includes('window.dispatchEvent(new Event("bethag-backend-refresh"))'),
  "on failure, reload authoritative backend state to reconcile concurrent deletes/updates");
assert.ok(!handler.includes("previousPortalMembers"),
  "never restore a stale full-list snapshot after a failed delete");
assert.ok(!handler.includes("setPortalMembers(previousPortalMembers)"),
  "failed deletion must not overwrite concurrent portal member changes");

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.ok(packageJson.scripts.test.includes("test-portal-member-delete-rollback-race.mjs"),
  "portal member delete race regression must be wired into npm test");

console.log("Portal member deletion concurrency regression checks passed.");
