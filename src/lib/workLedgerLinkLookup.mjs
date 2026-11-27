export async function loadLinkedWorkLedgerRows(client, workspaceId, workId) {
  if (!client || !workspaceId || !workId) {
    throw new Error("Contesto del lavoro incompleto: verifica delle scritture contabili interrotta.");
  }

  // Historical writers used both camelCase and snake_case JSON keys.
  // Check both forms and fail closed if either query cannot be verified.
  const keyFields = ["workId", "work_id"];
  const results = await Promise.all(keyFields.map(async (field) => {
    const { data, error } = await client
      .from("condominium_ledger_entries")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("direction", "Uscita")
      .contains("data", { [field]: workId })
      .limit(1);
    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error("Risposta non valida durante la verifica delle scritture collegate al lavoro.");
    }
    return data;
  }));

  const rowsById = new Map();
  for (const rows of results) {
    for (const row of rows) {
      if (row?.id != null) rowsById.set(String(row.id), row);
    }
  }
  return Array.from(rowsById.values());
}
