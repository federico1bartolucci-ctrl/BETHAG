const PLAN_LEVELS = Object.freeze({
  free: 0,
  plus: 1,
  professional: 2,
  portal: 3,
});

const SERVER_MANAGED_ADDONS = new Set(["ai", "portale"]);

export function hasFeature(plan, required) {
  const planLevel = PLAN_LEVELS[plan];
  const requiredLevel = PLAN_LEVELS[required];
  return typeof planLevel === "number"
    && typeof requiredLevel === "number"
    && planLevel >= requiredLevel;
}

export function hasAddon(subscription, addon) {
  return Array.isArray(subscription?.addons) && subscription.addons.includes(addon);
}

export function isServerManagedAddon(addon) {
  return SERVER_MANAGED_ADDONS.has(addon);
}

export function getClientUnlockedAddons(subscription) {
  return Array.isArray(subscription?.addons)
    ? subscription.addons.filter((addon) => !isServerManagedAddon(addon))
    : [];
}

export function hasEntitlement(subscription, required, addon) {
  return hasFeature(subscription?.plan, required)
    || Boolean(addon && !isServerManagedAddon(addon) && hasAddon(subscription, addon));
}
