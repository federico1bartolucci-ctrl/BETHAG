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
assert.match(mainSource, /from "\.\/lib\/subscription-entitlements\.js"/);
assert.match(mainSource, /if \(isServerManagedAddon\(addon\)\) return;/);
assert.match(mainSource, /disabled=\{included \|\| unlocked \|\| serverManaged\}/);
assert.match(mainSource, /getClientUnlockedAddons\(subscription\)/);
assert.match(mainSource, /comunicazioni: "Incluso da Plus"/);
assert.match(mainSource, /addon && !isServerManagedAddon\(addon\)/);
assert.match(mainSource, /Le Comunicazioni sono comprese nel piano Plus e nei piani superiori/);
assert.match(mainSource, /requirePlan\("plus", "L\x27invio delle comunicazioni", "comunicazioni"\)/);
const gatedEntryPoints = [
  ["const prepareCondominiumEmail = async", 'requirePlan("plus", "L\'invio delle comunicazioni", "comunicazioni")'],
  ["const saveCommunication =", 'requirePlan("plus", "La gestione delle comunicazioni", "comunicazioni")'],
  ["const editCommunication =", 'requirePlan("plus", "La modifica delle comunicazioni", "comunicazioni")'],
  ["const newCommunication =", 'requirePlan("plus", "La creazione delle comunicazioni", "comunicazioni")'],
  ["const openCondominiumEmailComposer =", 'requirePlan("plus", "L\'invio delle comunicazioni", "comunicazioni")'],
];
for (const [entryPoint, gate] of gatedEntryPoints) {
  const start = mainSource.indexOf(entryPoint);
  assert.notEqual(start, -1, entryPoint + " must exist");
  const next = mainSource.indexOf("\n  const ", start + entryPoint.length);
  const block = mainSource.slice(start, next === -1 ? undefined : next);
  assert.ok(block.includes(gate), entryPoint + " must enforce the Plus entitlement");
}

console.log("PASS UI entitlement runtime: local AI, Portal and Communications add-ons cannot unlock server-managed features.");
console.log("PASS Plus, Professional and Portal plans include Communications; Free cannot unlock it with client-local add-on state.");
console.log("PASS subscription UI disables single activation and does not advertise a standalone price for server-managed entitlements.");
