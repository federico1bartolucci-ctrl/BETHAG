export async function findExistingAllocationIntake(client, workspaceId, documentLegacyId) {
  if (!client || typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new Error("Allocation intake document lookup requires a client and workspace ID.");
  }

  const { data: dbDocument, error: documentLookupError } = await client
    .from("documents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("legacy_id", documentLegacyId)
    .maybeSingle();
  if (documentLookupError) {
    throw new Error("Allocation intake document lookup failed: " + documentLookupError.message, { cause: documentLookupError });
  }

  if (!dbDocument?.id) return { documentId: null, existingIntake: null };

  const { data: existingIntake, error: existingIntakeError } = await client
    .from("condominium_allocation_intakes")
    .select("id,status")
    .eq("workspace_id", workspaceId)
    .eq("document_id", dbDocument.id)
    .neq("status", "Annullato")
    .limit(1)
    .maybeSingle();
  if (existingIntakeError) {
    throw new Error("Allocation intake duplicate lookup failed: " + existingIntakeError.message, { cause: existingIntakeError });
  }

  return { documentId: dbDocument.id, existingIntake: existingIntake ?? null };
}
