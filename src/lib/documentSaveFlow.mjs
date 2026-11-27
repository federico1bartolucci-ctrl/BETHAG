export class DocumentPersistenceUncertainError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "DocumentPersistenceUncertainError";
    this.persistenceUncertain = true;
    if (cause !== undefined) this.cause = cause;
  }
}

function normalizeJson(value) {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, normalizeJson(value[key])])
    );
  }
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(normalizeJson(left)) === JSON.stringify(normalizeJson(right));
}

export async function persistDocumentRecordWithVerification({ document, write, read }) {
  if (!document || typeof document !== "object" || typeof write !== "function" || typeof read !== "function") {
    throw new TypeError("Contesto di persistenza documento non valido.");
  }

  let writeError = null;
  try {
    await write(document);
  } catch (error) {
    writeError = error;
  }

  let persisted;
  try {
    persisted = await read(document);
  } catch (readError) {
    throw new DocumentPersistenceUncertainError(
      "Il salvataggio del documento non è verificabile. Il file caricato è stato conservato per evitare di interrompere un eventuale collegamento già registrato.",
      writeError ?? readError
    );
  }

  const matches = persisted &&
    String(persisted.legacy_id) === String(document.legacy_id) &&
    String(persisted.condominium_id ?? "") === String(document.condominium_id ?? "") &&
    persisted.title === document.title &&
    persisted.category === document.category &&
    persisted.status === document.status &&
    (persisted.file_path ?? null) === (document.file_path ?? null) &&
    sameJson(persisted.data, document.data);

  if (matches) return persisted;
  if (writeError) throw writeError;

  throw new DocumentPersistenceUncertainError(
    "Il server non ha restituito una conferma coerente del salvataggio. Il file caricato è stato conservato finché lo stato del documento non sarà verificato."
  );
}

export async function saveDocumentWithStorage({
  document,
  previousDocument = null,
  file = null,
  uploadFiles,
  persistDocument,
  deleteStoredFile,
}) {
  if (!document || typeof document !== "object") throw new TypeError("Documento non valido.");
  if (typeof persistDocument !== "function") throw new TypeError("Persistenza documento non disponibile.");
  if (typeof deleteStoredFile !== "function") throw new TypeError("Pulizia Storage non disponibile.");
  if (file && typeof uploadFiles !== "function") throw new TypeError("Caricamento Storage non disponibile.");

  let nextDocument = { ...document };
  let uploadedPath = null;

  if (file) {
    const stored = await uploadFiles([file]);
    const uploaded = Array.isArray(stored) ? stored[0] : null;
    if (!uploaded || typeof uploaded.path !== "string" || !uploaded.path.trim()) {
      throw new Error("Il caricamento non ha restituito un percorso Storage verificabile.");
    }
    uploadedPath = uploaded.path;
    nextDocument = {
      ...nextDocument,
      storagePath: uploadedPath,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
    };
  }

  try {
    await persistDocument(nextDocument);
  } catch (error) {
    if (uploadedPath && !error?.persistenceUncertain) {
      try {
        await deleteStoredFile(uploadedPath);
      } catch (cleanupError) {
        throw new Error(
          "Il documento non è stato salvato e non è stato possibile rimuovere il nuovo file Storage (" +
          uploadedPath + "). Verificare la presenza dell'oggetto prima di ripetere l'operazione. " +
          (cleanupError?.message || "Errore di pulizia Storage.")
        );
      }
    }

    if (uploadedPath && error?.persistenceUncertain) {
      throw new Error(
        (error?.message || "Stato di persistenza non verificabile.") +
        " Percorso conservato: " + uploadedPath
      );
    }
    throw error;
  }

  let cleanupWarning = null;
  const previousPath = previousDocument?.storagePath;
  if (previousPath && previousPath !== nextDocument.storagePath) {
    try {
      await deleteStoredFile(previousPath);
    } catch (error) {
      cleanupWarning =
        "Documento salvato, ma il file precedente non è stato eliminato (" +
        previousPath + "). " + (error?.message || "Verificare la pulizia Storage.");
    }
  }

  return { document: nextDocument, cleanupWarning };
}
