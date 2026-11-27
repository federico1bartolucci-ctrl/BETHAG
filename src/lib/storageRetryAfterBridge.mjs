const MAX_PENDING_PATHS = 512;
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
  const storageObjectMarker = "/storage/v1/object/";
  const markerIndex = pathname.lastIndexOf(storageObjectMarker);
  if (markerIndex < 0) return [];
  const bucket = pathname.slice(markerIndex + storageObjectMarker.length).split("/")[0];
  if (bucket !== "bethag-documents") return [];

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

function parseRetryAfterDeadline(value, now) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) ? now + Math.max(0, seconds * 1000) : null;
  }

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? Math.max(now, timestamp) : null;
}

function recordRetryAfter(path, value) {
  const now = Date.now();
  const retryAt = parseRetryAfterDeadline(value, now);
  if (retryAt === null) return;

  const current = pendingRetryAfterByPath.get(path);
  const currentRetryAt = current?.expiresAt > now ? current.retryAt : 0;
  const strongestRetryAt = Math.max(currentRetryAt, retryAt);

  // Retain the strongest outstanding deadline. Concurrent SDK error handlers
  // can resolve out of fetch-response order, so a consumable FIFO can assign a
  // shorter Retry-After to the request that actually received the longer one.
  // Keep the entry until after the server deadline; otherwise a long
  // Retry-After could expire from memory while it is still in force.
  pendingRetryAfterByPath.delete(path);
  pendingRetryAfterByPath.set(path, {
    retryAt: strongestRetryAt,
    expiresAt: Math.max(now + RETRY_AFTER_TTL_MS, strongestRetryAt + RETRY_AFTER_TTL_MS),
  });

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
 * Reads the strongest outstanding Retry-After instruction for a Storage path.
 * The deadline is retained until it expires so concurrent errors for the same
 * path cannot consume one another's metadata.
 */
export function readStorageRetryAfter(error, path) {
  const now = Date.now();
  const captured = pendingRetryAfterByPath.get(path);
  if (captured && captured.expiresAt <= now) {
    pendingRetryAfterByPath.delete(path);
  }

  const directValues = [
    error?.retryAfter,
    error?.headers?.get?.("retry-after"),
    error?.headers?.get?.("Retry-After"),
    error?.headers?.["retry-after"],
    error?.headers?.["Retry-After"],
    error?.context?.headers?.get?.("retry-after"),
  ];
  const directDeadlines = directValues
    .map((value) => parseRetryAfterDeadline(value, now))
    .filter((value) => value !== null);

  const current = pendingRetryAfterByPath.get(path);
  const deadlines = [
    current && current.expiresAt > now ? current.retryAt : null,
    ...directDeadlines,
  ].filter((value) => value !== null);

  if (!deadlines.length) return null;
  const strongestRetryAt = Math.max(...deadlines);
  if (strongestRetryAt <= now) {
    pendingRetryAfterByPath.delete(path);
    return "0";
  }
  return String((strongestRetryAt - now) / 1000);
}
