/**
 * Applies an asynchronous document-AI state update only to the exact document
 * snapshot and workspace that started the request.
 *
 * Document IDs are legacy numeric IDs and may collide across workspaces. A
 * late AI result must therefore never be matched by ID alone.
 */
export function updateDocumentAiStateForWorkspace(documents, context, patch) {
  if (!Array.isArray(documents)) return documents;

  const requestWorkspaceId = context?.requestWorkspaceId;
  const currentWorkspaceId = context?.currentWorkspaceId;
  const documentsWorkspaceId = context?.documentsWorkspaceId;
  const requestDocument = context?.requestDocument;

  if (
    typeof requestWorkspaceId !== "string" ||
    requestWorkspaceId.length === 0 ||
    currentWorkspaceId !== requestWorkspaceId ||
    documentsWorkspaceId !== requestWorkspaceId ||
    !requestDocument
  ) {
    return documents;
  }

  let updated = false;
  const next = documents.map((document) => {
    if (
      !document ||
      document.id !== requestDocument.id ||
      document.condominiumId !== requestDocument.condominiumId ||
      document.storagePath !== requestDocument.storagePath
    ) {
      return document;
    }

    updated = true;
    return { ...document, ...patch };
  });

  return updated ? next : documents;
}
