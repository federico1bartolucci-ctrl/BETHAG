export async function loadExistingCondominiumUnits(client, condominiumId, workspaceId, pageSize = 1000) {
  if (!client || typeof client.from !== "function") {
    throw new TypeError("Client Supabase non valido per il caricamento delle unità.");
  }
  if (condominiumId == null || String(condominiumId).trim() === "") return [];
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new RangeError("Dimensione pagina unità non valida.");
  }

  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = client
      .from("condominium_units")
      .select("id, unit_code, data")
      .eq("condominium_id", condominiumId);
    if (workspaceId != null && String(workspaceId).trim() !== "") {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error("Risposta non valida durante il caricamento delle unità del condominio.");
    }

    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}

export async function requireCondominiumUnitRenameResult(query, expectedUnitId, unitCode) {
  if (!query || typeof query.select !== "function") {
    throw new TypeError("Query di rinomina dell'unità non valida.");
  }

  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;

  if (
    !data ||
    typeof data !== "object" ||
    data.id == null ||
    String(data.id) !== String(expectedUnitId)
  ) {
    throw new Error(
      `Il condominio è stato salvato, ma l'unità legacy ${String(unitCode)} non è stata rinominata. Ricarica il condominio e verifica le unità prima di ripetere l'operazione.`
    );
  }

  return data;
}
