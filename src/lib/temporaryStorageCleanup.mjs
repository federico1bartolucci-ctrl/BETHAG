export async function cleanupTemporaryStorageFiles(paths, removeFile, maxAttempts = 2) {
  if (!Array.isArray(paths) || typeof removeFile !== "function") {
    throw new TypeError("Contesto di pulizia Storage temporanea non valido.");
  }

  const uniquePaths = [...new Set(paths.filter((path) => typeof path === "string" && path.trim()))];
  const results = await Promise.all(uniquePaths.map(async (path) => {
    let lastError = null;
    let attempts = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attempts = attempt;
      try {
        await removeFile(path);
        return { path, ok: true, attempts };
      } catch (error) {
        lastError = error;
        const status = Number(error?.status);
        const retryable = !Number.isInteger(status) || status >= 500 || status === 408 || status === 429;
        if (!retryable || attempt === maxAttempts) break;
      }
    }
    return {
      path,
      ok: false,
      attempts,
      error: lastError?.message || String(lastError || "Errore di pulizia Storage."),
    };
  }));

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
