import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/main.tsx", "utf8");
assert.match(source, /const capLookups = new WeakMap<HTMLInputElement, \{ timer: number; controller: AbortController \}>\(\)/, "CAP lookups must retain their timer and abort controller.");
assert.match(source, /if \(input instanceof HTMLInputElement\) cancelCapLookup\(input\);/, "Every input normalization must cancel an older CAP lookup.");
assert.match(source, /signal:\s*controller\.signal/, "CAP fetches must be abortable.");
assert.match(source, /controller\.signal\.aborted \|\| !input\.isConnected \|\| input\.value !== value/, "Stale responses must not update fields after the CAP changes or the input is removed.");
assert.match(source, /current\?\.controller === controller/, "Lookup cleanup must not clear a newer request.");
assert.match(source, /for \(const input of activeCapLookups\) cancelCapLookup\(input\);/, "Unmount cleanup must cancel pending CAP lookups.");
assert.doesNotMatch(source, /timers\.get\(input\)/, "The old timer-only lookup path must not remain.");
console.log("CAP lookup stale-response regression checks: PASS");
