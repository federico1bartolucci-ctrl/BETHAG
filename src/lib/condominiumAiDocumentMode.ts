export async function analyzeCondominiumDocumentsByStorageMode(
  workspaceId: string,
  selectedFiles: File[],
  storageMode: "both" | "analysis",
  analysisFiles: Array<{ filename: string; storagePath: string; mimeType?: string }>,
  analyzeStored: (workspaceId: string, files: Array<{ filename: string; storagePath: string; mimeType?: string }>) => Promise<any>,
  analyzeTemporary: (workspaceId: string, files: File[]) => Promise<any>
) {
  if (storageMode === "analysis") {
    return analyzeTemporary(workspaceId, selectedFiles);
  }
  return analyzeStored(workspaceId, analysisFiles);
}
