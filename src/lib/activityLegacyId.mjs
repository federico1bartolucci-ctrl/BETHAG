let lastIssuedActivityLegacyId = 0;

/**
 * Generate a workspace-legacy identifier that retains millisecond ordering
 * while avoiding the same Date.now() value for multiple inserts in one tab.
 * The database unique constraint remains authoritative across tabs/devices;
 * insertActivityWithUniqueLegacyId retries that exact collision.
 */
export function nextActivityLegacyId({ now = Date.now, random = Math.random } = {}) {
  const timestamp = Math.trunc(typeof now === "function" ? now() : now);
  const sample = Number(random());
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    throw new TypeError("Activity legacy ID requires a positive safe timestamp.");
  }
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new TypeError("Activity legacy ID random source must return a value in [0, 1).");
  }

  // 1,024 slots per millisecond keep 2026-era values within Number's safe range.
  const candidate = timestamp * 1024 + Math.floor(sample * 1024);
  const next = Math.max(candidate, lastIssuedActivityLegacyId + 1);
  if (!Number.isSafeInteger(next) || next <= 0) {
    throw new RangeError("Generated activity legacy ID is outside the safe integer range.");
  }
  lastIssuedActivityLegacyId = next;
  return next;
}

function isActivityLegacyIdCollision(error) {
  if (error?.code !== "23505") return false;
  const detail = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  return detail.includes("activities_workspace_legacy_unique");
}

/**
 * Insert an activity and retry only the workspace/legacy_id unique collision.
 * Other database errors are returned unchanged to the caller.
 */
export async function insertActivityWithUniqueLegacyId({
  insert,
  payload,
  now = Date.now,
  random = Math.random,
  maxAttempts = 4,
}) {
  if (typeof insert !== "function") throw new TypeError("Activity insert operation must be a function.");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("Activity insert payload must be an object.");
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new RangeError("Activity legacy ID retry limit must be between 1 and 10.");
  }

  let result;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const legacyId = nextActivityLegacyId({ now, random });
    result = await insert({ ...payload, legacy_id: legacyId });
    if (!result?.error || !isActivityLegacyIdCollision(result.error)) return result;
  }
  return result;
}
