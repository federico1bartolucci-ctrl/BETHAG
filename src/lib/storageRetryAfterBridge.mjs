const STORAGE_OBJECT_PATH = "/storage/v1/object/bethag-documents";
const MAX_PENDING_PATHS = 512;
const MAX_PENDING_PER_PATH = 4;
const RETRY_AFTER_TTL_MS = 60_000;

const pendingRetryAfterByPath = new Map();

function getRequestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return typeof input?.url === "string" ? input.url : "";
}

function getRequestMethod(input, init) {
  return String(init?.method ?? input?.method ?? "GET").toUpperCase();
}

async function getRequestBody(input, init) {
  if (typeof init?.body === "string") return init.body;
  if (init?.body instanceof URLSearchParams) return init.body.toString();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.clone().text();
  }
  return "";
}

async function getStorageRemovalPaths(input, init) {
  if (getRequestMethod(input, init) !== "DELETE") return [];

  let pathname;
  try {
    pathname = new URL(getRequestUrl(input)).pathname;
  } catch {
    return [];
  }
  if (!pathname.includes(STORAGE_OBJECT_PATH)) return [];

  let payload;
  try {
    payload = JSON.parse(await getRequestBody(input, init));
  } catch {
    return [];
  }
  if (!Array.isArray(payload?.prefixes)) return [];

  return [...new Set(
    payload.prefixes.filter((path) => typeof path === "string" && path.trim())
  )];
}

function recordRetryAfter(path, value) {
  const now = Date.now();
  const queue = (pendingRetryAfterByPath.get(path) ?? [])
    .filter((entry) => entry.expiresAt > now);
  queue.push({ value, expiresAt: now + RETRY_AFTER_TTL_MS });
  while (queue.length > MAX_PENDING_PER_PATH) queue.shift();
  pendingRetryAfterByPath.set(path, queue);

  while (pendingRetryAfterByPath.size > MAX_PENDING_PATHS) {
    const oldestPath = pendingRetryAfterByPath.keys().next().value;
    if (oldestPath === undefined) break;
    pendingRetryAfterByPath.delete(oldestPath);
  }
}

/**
 * Wraps the Supabase fetch implementation before Storage SDK error conversion.
 * storage-js currently turns a failed Response into StorageApiError(status,
 * statusCode) and drops Response.headers. Capture Retry-After out-of-band so
 * deleteWorkspaceStoredFile can restore it after the SDK returns the error.
 */
export function createStorageRetryAfterFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("Fetch Storage non valido.");
  }

  return async (input, init) => {
    const paths = await getStorageRemovalPaths(input, init);
    const response = await fetchImpl(input, init);

    if (!response.ok && paths.length) {
      const retryAfter = response.headers?.get?.("retry-after");
      if (typeof retryAfter === "string" && retryAfter.trim()) {
        for (const path of paths) recordRetryAfter(path, retryAfter.trim());
      }
    }

    return response;
  };
}

/**
 * Reads a Retry-After value from a Storage SDK error or from the response
 * metadata captured by createStorageRetryAfterFetch. The captured entry is
 * consumed even when the SDK error already exposes a header, preventing stale
 * metadata from being reused by a later request for the same path.
 */
export function readStorageRetryAfter(error, path) {
  const queue = pendingRetryAfterByPath.get(path) ?? [];
  const now = Date.now();
  let captured = null;

  while (queue.length) {
    const entry = queue.shift();
    if (entry.expiresAt > now) {
      captured = entry.value;
      break;
    }
  }

  if (queue.length) pendingRetryAfterByPath.set(path, queue);
  else pendingRetryAfterByPath.delete(path);

  return error?.retryAfter ??
    error?.headers?.get?.("retry-after") ??
    error?.headers?.get?.("Retry-After") ??
    error?.headers?.["retry-after"] ??
    error?.headers?.["Retry-After"] ??
    error?.context?.headers?.get?.("retry-after") ??
    captured;
}
