import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
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

import vm from "node:vm";
import ts from "typescript";

// Execute the actual global field-rules function extracted from main.tsx in a
// lightweight DOM harness. The fetch responses are controlled to exercise races.
const sourceFile = ts.createSourceFile("src/main.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const actualHelperNode = sourceFile.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "bethagInstallGlobalFieldRules");
assert.ok(actualHelperNode, "actual global field-rules function is extractable");
const compiledHelper = ts.transpileModule(actualHelperNode.getText(sourceFile), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

class MockInput {
  constructor(meta, value = "") {
    this.meta = meta;
    this.value = value;
    this.type = "text";
    this.maxLength = 0;
    this.inputMode = "";
    this.isConnected = true;
    this.form = null;
  }
  closest(selector) { return selector === "form" ? this.form : null; }
}
class MockTextarea extends MockInput {}
const fields = [];
const form = { querySelectorAll: () => fields };
const listeners = new Map();
const documentMock = {
  body: form,
  addEventListener(type, listener) { listeners.set(type, listener); },
  removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
};
let nextTimer = 0;
const timers = new Map();
const windowMock = {
  setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
  clearTimeout(id) { timers.delete(id); },
  alert() {},
};
const fetchRequests = [];
const context = {
  HTMLInputElement: MockInput,
  HTMLTextAreaElement: MockTextarea,
  document: documentMock,
  window: windowMock,
  bethagFieldMeta: (element) => element.meta,
  bethagIsNumericField: (meta) => /(cap|codice postale|telefono|cellulare|quantità|quantita|importo|premio|franchigia|millesimi|percentuale|quota|progressivo|anno|giorni|ore|metri|superficie|prezzo|totale)/i.test(meta),
  bethagSetNativeInputValue: (element, value) => { element.value = value; },
  bethagSentenceCase: (value) => { const text = String(value).trim(); return text ? text[0].toLocaleUpperCase("it-IT") + text.slice(1) : text; },
  bethagTitleCase: (value) => String(value),
  fetch: (url) => new Promise((resolve) => fetchRequests.push({ url, resolve }),
};
vm.createContext(context);
vm.runInContext(compiledHelper, context);
const uninstall = vm.runInContext("bethagInstallGlobalFieldRules()", context);
const cap = new MockInput("CAP", "00100");
const city = new MockInput("Comune", "");
const province = new MockInput("Provincia", "");
for (const field of [cap, city, province]) field.form = form;
fields.push(cap, city, province);
const onInput = listeners.get("input");
assert.equal(typeof onInput, "function", "actual input listener is installed");
const triggerCap = (value) => { cap.value = value; onInput({ target: cap }); };
const lastTimerId = () => Math.max(...timers.keys());
const runTimer = (id) => { const callback = timers.get(id); assert.equal(typeof callback, "function"); timers.delete(id); return callback(); };
const response = (place, state) => ({ ok: true, json: async () => ({ places: [{ "place name": place, "state abbreviation": state }] }) });

// CAP must stay numeric on mobile; the old normalization order overwrote it with decimal.
triggerCap("00100");
assert.equal(cap.inputMode, "numeric", "CAP mobile keyboard is numeric, not decimal");
const firstTimer = lastTimerId();
const firstPending = runTimer(firstTimer);
await Promise.resolve();
assert.equal(fetchRequests.length, 1, "first CAP request started");
triggerCap("00200");
fetchRequests[0].resolve(response("Old City", "AA"));
await firstPending;
assert.equal(city.value, "", "late response for old CAP cannot fill Comune");
assert.equal(province.value, "", "late response for old CAP cannot fill Provincia");

// The current CAP response fills unchanged fields.
const secondPending = runTimer(lastTimerId());
await Promise.resolve();
assert.equal(fetchRequests.length, 2, "second CAP request started");
fetchRequests[1].resolve(response("Current City", "BB"));
await secondPending;
assert.equal(city.value, "Current City");
assert.equal(province.value, "BB");

// Manual edits after a request starts must not be overwritten.
triggerCap("00300");
const thirdPending = runTimer(lastTimerId());
await Promise.resolve();
assert.equal(fetchRequests.length, 3);
city.value = "Manual City";
province.value = "XY";
fetchRequests[2].resolve(response("Auto City", "ZZ"));
await thirdPending;
assert.equal(city.value, "Manual City");
assert.equal(province.value, "XY");

// Detached CAP fields cannot receive a late response.
triggerCap("00400");
const fourthPending = runTimer(lastTimerId());
await Promise.resolve();
assert.equal(fetchRequests.length, 4);
cap.isConnected = false;
fetchRequests[3].resolve(response("Detached City", "DD"));
await fourthPending;
assert.equal(city.value, "Manual City");
assert.equal(province.value, "XY");
uninstall();
console.log("CAP lookup runtime regression: PASS (actual handler, stale response, manual edits, detached input, numeric input mode)");
