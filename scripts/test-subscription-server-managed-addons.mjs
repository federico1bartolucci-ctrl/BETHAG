import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  getClientUnlockedAddons,
  hasEntitlement,
  isServerManagedAddon,
} from "../src/lib/subscription-entitlements.js";

const freeWithForgedAddons = { plan: "free", addons: ["ai", "portale", "documenti"] };
assert.equal(hasEntitlement(freeWithForgedAddons, "plus", "ai"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "professional", "ai"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "portal", "portale"), false);
assert.equal(hasEntitlement(freeWithForgedAddons, "plus", "documenti"), true);
assert.deepEqual(getClientUnlockedAddons(freeWithForgedAddons), ["documenti"]);
assert.equal(isServerManagedAddon("ai"), true);
assert.equal(isServerManagedAddon("portale"), true);
assert.equal(isServerManagedAddon("documenti"), false);

assert.equal(hasEntitlement({ plan: "plus", addons: ["ai"] }, "plus", "ai"), true);
assert.equal(hasEntitlement({ plan: "professional", addons: [] }, "professional", "ai"), true);
assert.equal(hasEntitlement({ plan: "portal", addons: [] }, "portal", "portale"), true);
assert.equal(hasEntitlement({ plan: "professional", addons: ["portale"] }, "portal", "portale"), false);

const mainSource = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
assert.match(mainSource, /from "\.\/lib\/subscription-entitlements\.js"/);
assert.match(mainSource, /if \(isServerManagedAddon\(addon\)\) return;/);
assert.match(mainSource, /disabled=\{included \|\| unlocked \|\| serverManaged\}/);
assert.match(mainSource, /getClientUnlockedAddons\(subscription\)/);
assert.match(mainSource, /PORTAL_PLAN_REQUIRED/);

console.log("PASS UI entitlement runtime: local AI/Portal add-ons cannot unlock server-managed features.");
console.log("PASS subscription UI: server-managed add-ons are disabled until a server entitlement exists.");
