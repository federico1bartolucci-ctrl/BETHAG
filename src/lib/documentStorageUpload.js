const STORAGE_REMOVE_BATCH_SIZE = 1000;

function missingRemovalPaths(data, batch) {
  if (!Array.isArray(data)) return [...batch];
  const confirmed = new Set(
    data
      .filter((item) => item && typeof item.name === "string")
      .map((item) => item.name)
  );
  return batch.filter((path) => !confirmed.has(path));
}

export async function uploadFilesWithRollback(storage, bucketName, files, createPath) {
  if (!Array.isArray(files)) throw new TypeError("Elenco documenti non valido.");
  if (files.length === 0) return [];
  if (!storage || typeof storage.from !== "function") throw new Error("Storage non disponibile.");
  if (typeof bucketName !== "string" || !bucketName.trim()) throw new Error("Bucket Storage non valido.");
  if (typeof createPath !== "function") throw new TypeError("Generatore percorso Storage non valido.");

  const stored = [];
  let ambiguousUploadPath = null;
  try {
    for (const file of files) {
      const path = createPath(file);
      if (typeof path !== "string" || !path.trim()) {
        throw new Error("Percorso Storage non valido per il documento.");
      }

      // Keep the path pending until the response explicitly confirms the same object path.
      // A malformed/empty response is ambiguous: the server may already have stored the object.
      ambiguousUploadPath = path;
      const response = await storage.from(bucketName).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

      if (response?.error) {
        if (isDefinitiveStorageRejection(response.error)) ambiguousUploadPath = null;
        throw new Error("Impossibile memorizzare \"" + file.name + "\": " + response.error.message);
      }
      if (!response || typeof response !== "object" ||
          !response.data || typeof response.data !== "object" ||
          response.data.path !== path) {
        throw new Error("Risposta Storage non valida: caricamento non confermato per \"" + file.name + "\".");
      }

      ambiguousUploadPath = null;
      stored.push({
        name: file.name,
        path,
        type: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
      });
    }
    return stored;
  } catch (uploadFailure) {
    const uploadedPaths = stored.map((item) => item.path);
    if (ambiguousUploadPath && !uploadedPaths.includes(ambiguousUploadPath)) {
      uploadedPaths.push(ambiguousUploadPath);
    }

    const rollbackFailures = [];
    for (let offset = 0; offset < uploadedPaths.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
      const batch = uploadedPaths.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE);
      try {
        const response = await storage.from(bucketName).remove(batch);
        if (response?.error) {
          rollbackFailures.push({ paths: batch, error: response.error });
          continue;
        }
        const unconfirmed = missingRemovalPaths(response?.data, batch);
        if (unconfirmed.length) {
          rollbackFailures.push({
            paths: unconfirmed,
            error: new Error("Storage non ha confermato la rimozione di tutti i percorsi richiesti."),
          });
        }
      } catch (error) {
        rollbackFailures.push({ paths: batch, error });
      }
    }

    if (rollbackFailures.length) {
      const failedPaths = rollbackFailures.flatMap((failure) => failure.paths);
      const cleanupDetails = rollbackFailures
        .map((failure) => failure.error instanceof Error ? failure.error.message : String(failure.error))
        .join("; ");
      const uploadMessage = uploadFailure instanceof Error ? uploadFailure.message : String(uploadFailure);
      throw new Error(uploadMessage + ". Rollback Storage incompleto (" + cleanupDetails +
        "); file potenzialmente orfani: " + failedPaths.join(", "));
    }
    throw uploadFailure;
  }
}
