import assert from "node:assert/strict";
import fs from "node:fs";
import { applyCapLookupResponse } from "../src/lib/capLookup.mjs";

const source = fs.readFileSync("src/main.tsx", "utf8");
const start = source.indexOf("function bethagInstallGlobalFieldRules()");
assert.notEqual(start, -1, "global field rules helper exists");
const end = source.indexOf("\nfunction ", start + 10);
const helper = source.slice(start, end > -1 ? end : undefined);
const capHelper = fs.readFileSync("src/lib/capLookup.mjs", "utf8");

// Wiring and stale-response invalidation must remain in the active input handler.
assert.match(helper, /capLookupSequence\.get\(input\)/, "lookup sequence is read");
assert.match(helper, /capLookupSequence\.set\(input, lookupSequence\)/, "lookup sequence is incremented");
assert.match(helper, /applyCapLookupResponse/, "active input handler calls the runtime helper");
assert.match(helper, /getCurrentLookupSequence/, "active handler passes current sequence");
assert.match(source, /if \(numeric && !isCap\) input\.inputMode = "decimal";/, "CAP is not overwritten with decimal input mode");
assert.match(capHelper, /input\.isConnected/, "detached CAP is rejected");
assert.match(capHelper, /input\.value !== requestedCap/, "response must match current CAP");
assert.match(capHelper, /getCurrentLookupSequence\(\) !== lookupSequence/, "older lookup response is rejected");
assert.match(capHelper, /city\.value === cityValueAtRequest/, "manual Comune edits are preserved");
assert.match(capHelper, /province\.value === provinceValueAtRequest/, "manual Provincia edits are preserved");
console.log("CAP async stale-response regression guard: PASS");

const fetchRequests = [];
const fetcher = (url) => new Promise((resolve) => { fetchRequests.push({ url, resolve }); });
const input = { value: "00100", isConnected: true };
const city = { value: "", isConnected: true };
const province = { value: "", isConnected: true };
let currentSequence = 1;
const response = (place, state) => ({ ok: true, json: async () => ({ places: [{ "place name": place, "state abbreviation": state }] }) });
const run = (requestedCap, lookupSequence, cityValueAtRequest = city.value, provinceValueAtRequest = province.value) =>
  applyCapLookupResponse({
    input, city, province, requestedCap, cityValueAtRequest, provinceValueAtRequest, lookupSequence,
    getCurrentLookupSequence: () => currentSequence,
    fetcher,
    setNativeInputValue: (field, value) => { field.value = value; },
    sentenceCase: (value) => { const text = String(value).trim(); return text ? text[0].toLocaleUpperCase("it-IT") + text.slice(1) : text; },
  });

// In-flight response for the previous CAP is discarded after a newer input.
const first = run("00100", 1, "", "");
assert.equal(fetchRequests.length, 1);
currentSequence = 2;
input.value = "00200";
fetchRequests[0].resolve(response("Old City", "AA"));
assert.equal(await first, false);
assert.equal(city.value, "");
assert.equal(province.value, "");

// Current response fills fields that have not been edited.
const second = run("00200", 2, "", "");
assert.equal(fetchRequests.length, 2);
fetchRequests[1].resolve(response("Current City", "BB"));
assert.equal(await second, true);
assert.equal(city.value, "Current City");
assert.equal(province.value, "BB");

// Manual edits after lookup starts are preserved.
currentSequence = 3;
input.value = "00300";
const cityBefore = city.value;
const provinceBefore = province.value;
const third = run("00300", 3, cityBefore, provinceBefore);
city.value = "Manual City";
province.value = "XY";
fetchRequests[2].resolve(response("Auto City", "ZZ"));
assert.equal(await third, true);
assert.equal(city.value, "Manual City");
assert.equal(province.value, "XY");

// Detached input cannot receive a response.
currentSequence = 4;
input.value = "00400";
const fourth = run("00400", 4, city.value, province.value);
input.isConnected = false;
fetchRequests[3].resolve(response("Detached City", "DD"));
assert.equal(await fourth, false);
assert.equal(city.value, "Manual City");
assert.equal(province.value, "XY");

// Non-OK and empty-place responses are no-ops.
currentSequence = 5;
input.value = "00500";
const fifth = run("00500", 5);
fetchRequests[4].resolve({ ok: false, json: async () => ({ places: [] }) });
assert.equal(await fifth, false);
currentSequence = 6;
input.value = "00600";
input.isConnected = true;
const sixth = run("00600", 6);
fetchRequests[5].resolve({ ok: true, json: async () => ({ places: [] }) });
assert.equal(await sixth, false);
console.log("CAP lookup runtime regression: PASS (production helper, stale response, manual edits, detached input, non-OK/empty responses)");
