import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getClientUnlockedAddons,
  hasEntitlement,
  isServerManagedAddon,
} from "../src/lib/subscription-entitlements.js";

const freeWithForgedAddons = {
  plan: "free",
  addons: ["ai", "portale", "comunicazioni", "documenti"],
};
assert.equal(hasEntitlement(freeWithForgedAddons, "plus", "ai"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "professional", "ai"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "portal", "portale"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "plus", "comunicazioni"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "plus", "documenti"), true);
assert.deepEqual(getClientUnlockedAddons(freeWithForgedAddons), ["documenti"]);

for (const addon of ["ai", "portale", "comunicazioni"]) {
  assert.equal(isServerManagedAddon(addon), true, addon + " must require a server-owned entitlement.");
}
assert.equal(isServerManagedAddon("documenti"), false);

assert.equal(hasEntitlement({ plan: "plus", addons: [] }, "plus", "comunicazioni"), true);
assert.equal(hasEntitlement({ plan: "professional", addons: [] }, "plus", "comunicazioni"), true);
assert.equal(hasEntitlement({ plan: "portal", addons: [] }, "plus", "comunicazioni"), true);
assert.equal(hasEntitlement({ plan: "professional", addons: ["portale"] }, "portal", "portale"), false);
assert.equal(hasEntitlement({ plan: "portal", addons: [] }, "portal", "portale"), true);

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.ok(mainSource.includes('from "./lib/subscription-entitlements.js"'));
assert.ok(mainSource.includes("if (isServerManagedAddon(addon)) return;"));
assert.ok(mainSource.includes("disabled={included || unlocked || serverManaged}"));
assert.ok(mainSource.includes("getClientUnlockedAddons(subscription)"));
assert.ok(mainSource.includes('comunicazioni: "Incluso da Plus"'));
assert.ok(mainSource.includes("addon && !isServerManagedAddon(addon)"));
assert.ok(mainSource.includes("Le Comunicazioni sono comprese nel piano Plus e nei piani superiori"));

function assertPlanGate(startMarker, endMarker, expectedCall) {
  const start = mainSource.indexOf(startMarker);
  const end = mainSource.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, "Missing UI action section: " + startMarker);
  assert.ok(
    mainSource.slice(start, end).includes(expectedCall),
    "Missing Plus entitlement gate in " + startMarker,
  );
}

assertPlanGate(
  "const prepareCondominiumEmail = async",
  "/* =======================================================\n     COMUNICAZIONI",
  'requirePlan("plus", "L\'invio delle comunicazioni", "comunicazioni")',
);
assertPlanGate(
  "const saveCommunication =",
  "const editCommunication =",
  'requirePlan("plus", "La gestione delle comunicazioni", "comunicazioni")',
);
assertPlanGate(
  "const editCommunication =",
  "const deleteCommunication =",
  'requirePlan("plus", "La modifica delle comunicazioni", "comunicazioni")',
);
assertPlanGate(
  "const newCommunication =",
  "const openCondominiumEmailComposer =",
  'requirePlan("plus", "La creazione delle comunicazioni", "comunicazioni")',
);
assertPlanGate(
  "const openCondominiumEmailComposer =",
  "/* =======================================================\n     DASHBOARD",
  'requirePlan("plus", "L\'invio delle comunicazioni", "comunicazioni")',
);

console.log("PASS UI entitlement runtime: local AI, Portal and Communications add-ons cannot unlock server-managed features.");
console.log("PASS Plus, Professional and Portal plans include Communications; Free cannot unlock it with client-local add-on state.");
console.log("PASS subscription UI disables single activation and does not advertise a standalone price for server-managed entitlements.");
console.log("PASS communication creation, editing and email sending are gated in the UI by Plus-or-higher entitlement.");
