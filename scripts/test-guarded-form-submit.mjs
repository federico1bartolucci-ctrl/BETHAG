import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runGuardedFormSubmit } from "../src/lib/guarded-form-submit.js";

function submitEvent() {
  return {
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
}

const deniedByModule = submitEvent();
const moduleCalls = [];
const moduleAllowed = runGuardedFormSubmit(deniedByModule, [
  () => { moduleCalls.push("module"); return false; },
  () => { moduleCalls.push("plan"); return true; },
]);
assert.equal(moduleAllowed, false);
assert.equal(deniedByModule.defaultPrevented, true);
assert.deepEqual(moduleCalls, ["module"], "later guards must not run after a denied module permission");

const deniedByPlan = submitEvent();
const planCalls = [];
const planAllowed = runGuardedFormSubmit(deniedByPlan, [
  () => { planCalls.push("module"); return true; },
  () => { planCalls.push("plan"); return false; },
  () => { planCalls.push("save"); return true; },
]);
assert.equal(planAllowed, false);
assert.equal(deniedByPlan.defaultPrevented, true);
assert.deepEqual(planCalls, ["module", "plan"], "a denied plan must stop the save while keeping native submit prevented");

const allowedEvent = submitEvent();
const allowedCalls = [];
const allowed = runGuardedFormSubmit(allowedEvent, [
  () => { allowedCalls.push("module"); return true; },
  () => { allowedCalls.push("plan"); return true; },
]);
assert.equal(allowed, true);
assert.equal(allowedEvent.defaultPrevented, true);
assert.deepEqual(allowedCalls, ["module", "plan"]);

assert.equal(runGuardedFormSubmit({}, [() => true]), false, "missing preventDefault must fail closed");

const source = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const guardedHandlers = [
  ["const saveDeadline =", "const saveDocument =", "event"],
  ["const saveDocument =", "/* =======================================================\n     ASSEMBLEE", "event"],
  ["const saveAssembly =", "/* =======================================================\n     FORNITORI", "event"],
  ["const saveSupplier =", "const saveActivity =", "event"],
  ["const saveActivity =", "const saveCondominiumWork =", "event"],
  ["const saveCondominiumWork =", "const editCondominiumWork =", "event"],
  ["const saveWorkProgress =", "const saveWorkProgressAndAccount =", "event"],
  ["const saveWorkProgressAndAccount =", "/* =======================================================\n     CONDOMINI - ANAGRAFICA", "event"],
  ["const saveCondominiumMember =", "const deleteCondominiumMember =", "event"],
  ["const saveCommunication =", "const editCommunication =", "event"],
];
for (const [startMarker, endMarker, eventName] of guardedHandlers) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, "Missing handler section: " + startMarker);
  const section = source.slice(start, end);
  assert.ok(section.includes("runGuardedFormSubmit("), "Missing early native-submit guard in " + startMarker);
  assert.doesNotMatch(section, new RegExp(eventName + "\\.preventDefault\\(\\)"), "direct preventDefault must be centralized in " + startMarker);
}
const collaboratorSaveStart = source.indexOf("const save = async (e: React.FormEvent) => {");
const collaboratorSaveEnd = source.indexOf("\\n    const name = form.name.trim();", collaboratorSaveStart);
assert.ok(collaboratorSaveStart >= 0 && collaboratorSaveEnd > collaboratorSaveStart);
const collaboratorSaveSection = source.slice(collaboratorSaveStart, collaboratorSaveEnd);
assert.ok(collaboratorSaveSection.includes("runGuardedFormSubmit(e,"));
assert.ok(collaboratorSaveSection.indexOf("runGuardedFormSubmit(e,") < collaboratorSaveSection.indexOf("if (!isAdministrator)"));

const profileStart = source.indexOf("function ProfilePage(");
const profileSaveStart = source.indexOf("const save = async (", profileStart);
const profileSaveEnd = source.indexOf("\\n\\n    if (", profileSaveStart);
assert.ok(profileStart >= 0 && profileSaveStart > profileStart && profileSaveEnd > profileSaveStart);
const profileSaveSection = source.slice(profileSaveStart, profileSaveEnd);
assert.ok(profileSaveSection.includes("runGuardedFormSubmit(e,"));
assert.ok(profileSaveSection.indexOf("runGuardedFormSubmit(e,") < profileSaveSection.indexOf("if (!isAdministrator)"));

console.log("PASS guarded form submission runtime: preventDefault runs before module/plan/administrator guards, including denied paths.");
console.log("PASS guarded form integration: protected forms cannot fall through to native GET/reload when authorization is denied.");
