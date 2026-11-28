import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isCurrentRegisterLoad } from "../src/lib/registerLoadGeneration.mjs";

assert.equal(isCurrentRegisterLoad(1, 1), true, "the newest request may commit");
assert.equal(isCurrentRegisterLoad(1, 2), false, "an older request must be discarded");
assert.equal(isCurrentRegisterLoad(0, 0), false, "uninitialized request IDs are invalid");
assert.equal(isCurrentRegisterLoad(Number.NaN, 1), false, "non-finite request IDs are invalid");
assert.equal(isCurrentRegisterLoad(2, Number.NaN), false, "non-finite latest IDs are invalid");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

let latestRequestId = 0;
const committed = [];
async function completeLoad(label, wait) {
  const requestId = ++latestRequestId;
  await wait;
  if (isCurrentRegisterLoad(requestId, latestRequestId)) committed.push(label);
}
const oldResponse = deferred();
const newResponse = deferred();
const oldLoad = completeLoad("workspace-A", oldResponse.promise);
const newLoad = completeLoad("workspace-B", newResponse.promise);
newResponse.resolve();
await newLoad;
oldResponse.resolve();
await oldLoad;
assert.deepEqual(committed, ["workspace-B"], "a late response from the previous workspace must never overwrite the current workspace");

const source = await readFile("src/RegisterPage.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.match(source, /useEffect, useMemo, useRef, useState/, "RegisterPage must import useRef");
assert.match(source, /const loadRequestRef=useRef\(0\)/, "RegisterPage must maintain a request generation");
assert.match(source, /const requestId=\+\+loadRequestRef\.current/, "each load must receive a unique generation");
assert.match(source, /async function resolve\(requestId:number\)/, "condominium resolution must be tied to the load generation");
assert.match(source, /if\(isCurrentRegisterLoad\(requestId,loadRequestRef\.current\)\)setDbId/, "stale condominium resolutions must not replace the current DB condominium");
assert.match(source, /if\(!isCurrentRegisterLoad\(requestId,loadRequestRef\.current\)\)return;/, "stale list responses must be discarded before state writes");
assert.match(source, /if\(isCurrentRegisterLoad\(requestId,loadRequestRef\.current\)\)setError/, "stale load failures must not overwrite current errors");
assert.match(source, /if\(isCurrentRegisterLoad\(requestId,loadRequestRef\.current\)\)setLoading\(false\)/, "stale loads must not clear the current loading state");
assert.match(source, /return\(\)=>\{loadRequestRef\.current\+=1;\}/, "effect cleanup must invalidate outstanding requests");
assert.match(source, /const contextIsLoaded=loadedContextKey===currentContextKey/, "data must be keyed to the current workspace and condominium");
assert.match(source, /if\(supabase&&!contextIsLoaded\)/, "previous-context data must be hidden while the new context loads");
assert.equal((packageJson.scripts.test.match(/test-register-load-context-race\.mjs/g)||[]).length, 1, "the regression must be registered exactly once in npm test");

console.log("Register workspace/condominium stale-load isolation regression: PASS");
