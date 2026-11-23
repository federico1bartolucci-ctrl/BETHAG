import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync("src/main.tsx", "utf8");
const start = source.indexOf("function bethagInstallGlobalFieldRules()");
assert.notEqual(start, -1, "global field rules helper exists");
const end = source.indexOf("\nfunction ", start + 10);
const helper = source.slice(start, end > -1 ? end : undefined);

// CAP changes invalidate previous asynchronous responses, including in-flight fetches.
assert.match(helper, /capLookupSequence\.get\(input\)/, "lookup sequence is read");
assert.match(helper, /capLookupSequence\.set\(input, lookupSequence\)/, "lookup sequence is incremented and stored");
assert.match(helper, /input\.value !== requestedCap/, "response must match current CAP");
assert.match(helper, /capLookupSequence\.get\(input\) !== lookupSequence/, "older lookup responses are rejected");
assert.match(helper, /input\.isConnected/, "detached inputs cannot receive stale updates");

// Manual edits to Comune/Provincia made while the request is pending must survive.
assert.match(helper, /cityValueAtRequest/, "Comune value is captured before request");
assert.match(helper, /provinceValueAtRequest/, "Provincia value is captured before request");
assert.match(helper, /city\.value === cityValueAtRequest/, "Comune is only auto-filled if unchanged");
assert.match(helper, /province\.value === provinceValueAtRequest/, "Provincia is only auto-filled if unchanged");
assert.match(helper, /city\.isConnected/, "detached Comune cannot be updated");
assert.match(helper, /province\.isConnected/, "detached Provincia cannot be updated");

// Debounce is retained and the pending timer is cancelled when the CAP changes.
assert.match(helper, /window\.clearTimeout\(previous\)/, "previous debounce timer is cancelled");
assert.match(helper, /window\.setTimeout\(async \(\) =>/, "lookup remains debounced");
assert.match(helper, /place\["place name"\]/, "Comune is sourced from lookup result");
assert.match(helper, /place\["state abbreviation"\]/, "Provincia is sourced from lookup result");
console.log("CAP async stale-response regression guard: PASS");
