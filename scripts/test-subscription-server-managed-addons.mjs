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
assert.match(mainSource, /Le Comunicazioni richiedono un piano Plus o superiore verificato dal server/);
assert.match(mainSource, /const prepareCondominiumEmail = async[\\s\\S]*?requirePlan\\("plus", "L'invio delle comunicazioni", "comunicazioni"\\)/);
assert.match(mainSource, /const saveCommunication = [\\s\\S]*?requirePlan\\("plus", "La gestione delle comunicazioni", "comunicazioni"\\)/);
assert.match(mainSource, /const editCommunication = [\\s\\S]*?requirePlan\\("plus", "La modifica delle comunicazioni", "comunicazioni"\\)/);
assert.match(mainSource, /const newCommunication = [\\s\\S]*?requirePlan\\("plus", "La creazione delle comunicazioni", "comunicazioni"\\)/);
assert.match(mainSource, /const openCondominiumEmailComposer = [\\s\\S]*?requirePlan\\("plus", "L'invio delle comunicazioni", "comunicazioni"\\)/);

console.log("PASS UI entitlement runtime: local AI, Portal and Communications add-ons cannot unlock server-managed features.");
console.log("PASS Plus, Professional and Portal plans include Communications; Free cannot unlock it with client-local add-on state.");
console.log("PASS subscription UI disables single activation and does not advertise a standalone price for server-managed entitlements.");
