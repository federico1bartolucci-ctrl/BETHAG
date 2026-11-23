const STORAGE_REMOVE_BATCH_SIZE = 1000;

export async function uploadFilesWithRollback(storage, bucketName, files, createPath) {
  if (!files.length) return [];

  const stored = [];
  try {
    for (const file of files) {
      const path = createPath(file);
      const { error } = await storage.from(bucketName).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });
      if (error) throw new Error("Impossibile memorizzare \"" + file.name + "\": " + error.message);

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
    const rollbackFailures = [];
    for (let offset = 0; offset < uploadedPaths.length; offset += STORAGE_REMOVE_BATCH_SIZE) {
      const batch = uploadedPaths.slice(offset, offset + STORAGE_REMOVE_BATCH_SIZE);
      try {
        const { error } = await storage.from(bucketName).remove(batch);
        if (error) rollbackFailures.push({ paths: batch, error });
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
      throw new Error(uploadMessage + ". Rollback Storage incompleto (" + cleanupDetails + "); file potenzialmente orfani: " + failedPaths.join(", "));
    }
    throw uploadFailure;
  }
}
