export const AI_DOCUMENT_MAX_FILES = 20;
export const AI_DOCUMENT_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const AI_DOCUMENT_MAX_TOTAL_BYTES = 100 * 1024 * 1024;

export function validateAiDocumentRequestFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      allowed: false,
      status: 400,
      code: "AI_DOCUMENTS_REQUIRED",
      message: "Seleziona almeno un documento da analizzare.",
    };
  }

  if (files.length > AI_DOCUMENT_MAX_FILES) {
    return {
      allowed: false,
      status: 413,
      code: "AI_DOCUMENT_COUNT_LIMIT",
      message: `Puoi analizzare al massimo ${AI_DOCUMENT_MAX_FILES} documenti per richiesta.`,
    };
  }

  const seenStoragePaths = new Set();
  for (const file of files) {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      return {
        allowed: false,
        status: 400,
        code: "AI_DOCUMENT_FILE_INVALID",
        message: "Ogni documento deve essere un oggetto valido.",
      };
    }

    const storagePath = file.storagePath;
    if (typeof storagePath !== "string" || storagePath.trim().length === 0) {
      return {
        allowed: false,
        status: 400,
        code: "AI_DOCUMENT_STORAGE_PATH_INVALID",
        message: "Ogni documento deve indicare un percorso Storage valido.",
      };
    }

    if (seenStoragePaths.has(storagePath)) {
      return {
        allowed: false,
        status: 400,
        code: "AI_DOCUMENT_DUPLICATE_STORAGE_PATH",
        message: "Lo stesso documento non può essere incluso più volte nella stessa analisi.",
      };
    }
    seenStoragePaths.add(storagePath);
  }

  return { allowed: true, status: 200, code: "AI_DOCUMENT_BATCH_ALLOWED" };
}

export function addAiDocumentBlobSize(currentTotalBytes, fileBytes) {
  if (
    !Number.isSafeInteger(currentTotalBytes) ||
    currentTotalBytes < 0 ||
    !Number.isSafeInteger(fileBytes) ||
    fileBytes <= 0
  ) {
    return {
      allowed: false,
      status: 400,
      code: "AI_DOCUMENT_SIZE_INVALID",
      message: "La dimensione di un documento non è valida.",
    };
  }

  if (fileBytes > AI_DOCUMENT_MAX_FILE_BYTES) {
    return {
      allowed: false,
      status: 413,
      code: "AI_DOCUMENT_FILE_TOO_LARGE",
      message: "Ogni documento destinato all'analisi AI deve essere inferiore o uguale a 50 MB.",
    };
  }

  const nextTotalBytes = currentTotalBytes + fileBytes;
  if (nextTotalBytes > AI_DOCUMENT_MAX_TOTAL_BYTES) {
    return {
      allowed: false,
      status: 413,
      code: "AI_DOCUMENT_BATCH_TOO_LARGE",
      message: "La dimensione complessiva dei documenti per una singola analisi AI non può superare 100 MB.",
    };
  }

  return { allowed: true, totalBytes: nextTotalBytes };
}
