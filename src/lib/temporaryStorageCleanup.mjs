const DEFAULT_MAX_CONCURRENT_REMOVALS = 5;
const DEFAULT_RETRY_BASE_DELAY_MS = 250;
const DEFAULT_RETRY_MAX_DELAY_MS = 5000;

function readRetryAfterMs(error) {
  if (Number.isFinite(error?.retryAfterMs)) return Math.max(0, Number(error.retryAfterMs));

  const headers = error?.headers ?? error?.context?.headers;
  const value = error?.retryAfter ??
    headers?.get?.("retry-after") ??
    headers?.get?.("Retry-After") ??
    headers?.["retry-after"] ??
    headers?.["Retry-After"];
  if (value === undefined || value === null || value === "") return null;

  const text = String(value).trim();
  if (/^\d+(?:\.\d+)?$/.test(text)) return Math.max(0, Number(text) * 1000);
  const date = Date.parse(text);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}

function getRetryDelayMs(error, attempt, options) {
  const exponentialCap = Math.min(options.maxDelayMs, options.baseDelayMs * (2 ** (attempt - 1)));
  const randomValue = Math.min(1, Math.max(0, Number(options.random()) || 0));
  const jitteredBackoff = Math.floor(exponentialCap * (0.5 + randomValue * 0.5));
  const retryAfterMs = readRetryAfterMs(error);
  const delayMs = Math.max(jitteredBackoff, retryAfterMs ?? 0);

  // Do not retry earlier than the server's Retry-After instruction. If it
  // exceeds the interactive cleanup budget, report the path as uncleaned.
  return delayMs <= options.maxDelayMs ? delayMs : null;
}

export async function cleanupTemporaryStorageFiles(
  paths,
  removeFile,
  maxAttempts = 2,
  maxConcurrency = DEFAULT_MAX_CONCURRENT_REMOVALS,
  retryOptions = {},
) {
  if (
    !Array.isArray(paths) ||
    typeof removeFile !== "function" ||
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    !Number.isInteger(maxConcurrency) ||
    maxConcurrency < 1 ||
    !retryOptions ||
    typeof retryOptions !== "object" ||
    Array.isArray(retryOptions)
  ) {
    throw new TypeError("Contesto di pulizia Storage temporanea non valido.");
  }

  const options = {
    baseDelayMs: retryOptions.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
    maxDelayMs: retryOptions.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
    sleep: retryOptions.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    random: retryOptions.random ?? Math.random,
  };
  if (
    !Number.isFinite(options.baseDelayMs) || options.baseDelayMs < 0 ||
    !Number.isFinite(options.maxDelayMs) || options.maxDelayMs < options.baseDelayMs ||
    typeof options.sleep !== "function" ||
    typeof options.random !== "function"
  ) {
    throw new TypeError("Parametri di retry Storage non validi.");
  }

  const uniquePaths = [...new Set(paths.filter((path) => typeof path === "string" && path.trim()))];
  const results = new Array(uniquePaths.length);
  let nextIndex = 0;

  const workerCount = Math.min(maxConcurrency, uniquePaths.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < uniquePaths.length) {
        const index = nextIndex;
        nextIndex += 1;
        const path = uniquePaths[index];
        let lastError = null;
        let attempts = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          attempts = attempt;
          try {
            await removeFile(path);
            results[index] = { path, ok: true, attempts };
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            const status = Number(error?.status);
            const retryable = !Number.isInteger(status) || status >= 500 || status === 408 || status === 429;
            if (!retryable || attempt === maxAttempts) break;

            const delayMs = getRetryDelayMs(error, attempt, options);
            if (delayMs === null) break;
            if (delayMs > 0) await options.sleep(delayMs);
          }
        }

        if (lastError) {
          results[index] = {
            path,
            ok: false,
            attempts,
            error: lastError?.message || String(lastError || "Errore di pulizia Storage."),
          };
        }
      }
    }),
  );

  return {
    ok: results.every((result) => result.ok),
    results,
    failures: results.filter((result) => !result.ok),
  };
}

export async function runWithTemporaryStorageCleanup({ stored, analyze, removeFile }) {
  if (!Array.isArray(stored) || typeof analyze !== "function" || typeof removeFile !== "function") {
    throw new TypeError("Flusso di analisi con file temporanei non valido.");
  }

  let result;
  let analysisError = null;
  try {
    result = await analyze(stored);
  } catch (error) {
    analysisError = error;
  }

  const cleanup = await cleanupTemporaryStorageFiles(
    stored.map((item) => item?.path),
    removeFile,
  );

  if (analysisError) {
    if (cleanup.failures.length) {
      const details = cleanup.failures
        .map((failure) => failure.path + " (" + failure.error + ")")
        .join("; ");
      throw new Error(
        (analysisError?.message || String(analysisError)) +
        " Pulizia dei file temporanei non completata: " + details,
        { cause: analysisError },
      );
    }
    throw analysisError;
  }

  if (cleanup.failures.length) {
    if (result && typeof result === "object" && !Array.isArray(result)) {
      return { ...result, cleanupWarnings: cleanup.failures };
    }
    return { result, cleanupWarnings: cleanup.failures };
  }

  return result;
}