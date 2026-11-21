import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/main.tsx", "utf8");
const effectStart = source.indexOf('if (!supabaseConfigured || !supabase || sessionRole !== "admin" || !profile.workspaceId)');
assert.notEqual(effectStart, -1, "portal registration request effect exists");
const effectEnd = source.indexOf('}, [sessionRole, profile.workspaceId]);', effectStart);
assert.notEqual(effectEnd, -1, "portal registration request effect boundary exists");
const effect = source.slice(effectStart, effectEnd);
assert.match(effect, /setRegistrationRequests\(\[\]\);\s*let cancelled = false;/, "requests are cleared before workspace load");
assert.match(effect, /if \(!cancelled\) setRegistrationRequests\(\[\]\);/, "failed current load clears stale rows");
assert.match(effect, /if \(!cancelled\) setRegistrationRequests\(combined as PortalRegistrationRequest\[\]\);/, "cancelled request cannot update state");
assert.match(effect, /return \(\) => \{ cancelled = true; \};/, "cleanup invalidates old workspace request");
console.log("Portal registration request workspace-staleness regression checks passed.");
