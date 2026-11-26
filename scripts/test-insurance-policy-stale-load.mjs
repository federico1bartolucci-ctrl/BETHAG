import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createLatestRequestGuard } from "../src/lib/latestRequestGuard.mjs";

const guard = createLatestRequestGuard();
const applied = [];
let finishOlder;
const olderRequest = guard.begin();
const olderCompletion = new Promise((resolve) => { finishOlder = resolve; })
  .then(() => {
    if (olderRequest.isCurrent()) applied.push("older");
  });

const newerRequest = guard.begin();
if (newerRequest.isCurrent()) applied.push("newer");
finishOlder();
await olderCompletion;

assert.deepEqual(applied, ["newer"], "an older response finishing last must not overwrite the latest condominium state");

const pendingRequest = guard.begin();
guard.invalidate();
assert.equal(pendingRequest.isCurrent(), false, "effect cleanup must invalidate an outstanding request");

const nextRequest = guard.begin();
assert.equal(nextRequest.isCurrent(), true, "a subsequent load must become the current request");

for (const [path, expectedEffect] of [
  ["../src/main.tsx", /void loadPolicies\(true\)[\s\S]*?return \(\) => loadGuardRef\.current\.invalidate\(\)/],
  ["../src/InsurancePoliciesSection.tsx", /void load\(true\)[\s\S]*?return \(\) => loadGuardRef\.current\.invalidate\(\)/],
]) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  assert.match(source, /createLatestRequestGuard/);
  assert.match(source, /const loadGuardRef = useRef\(createLatestRequestGuard\(\)\)/);
  assert.match(source, /const currentCondominiumIdRef = useRef\(condominiumId\)/);
  assert.match(source, expectedEffect, `${path} must invalidate in-flight loads when condominium context changes`);
  assert.match(source, /const isCurrent = \(\) => request\.isCurrent\(\) && currentCondominiumIdRef\.current === condominiumId/);
  assert.match(source, /if \(!isCurrent\(\)\) return;/, "stale responses must be discarded before state writes");
}

console.log("Insurance policy stale-load runtime regression: PASS (out-of-order response rejected; effect cleanup invalidates pending work; both components wired).");
