export async function deleteDocumentRecordBeforeStorage({ deleteRecord, deleteStoredFile, storagePath }) {
  await deleteRecord();
  if (!storagePath) return { recordDeleted: true, storageDeleted: true, storagePath: null };
  try {
    await deleteStoredFile(storagePath);
    return { recordDeleted: true, storageDeleted: true, storagePath };
  } catch (error) {
    return { recordDeleted: true, storageDeleted: false, storagePath, error };
  }
}
