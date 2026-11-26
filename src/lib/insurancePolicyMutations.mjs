const TABLE = "condominium_insurance_policies";

function validateContext({ supabase, policyId, workspaceId, condominiumId }) {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (![policyId, workspaceId, condominiumId].every((value) => typeof value === "string" && value.trim())) {
    throw new Error("Contesto polizza non valido: ID polizza, workspace e condominio sono obbligatori.");
  }
}

export async function updateInsurancePolicy({ supabase, policyId, workspaceId, condominiumId, payload }) {
  validateContext({ supabase, policyId, workspaceId, condominiumId });
  if (!payload || typeof payload !== "object") throw new Error("Dati polizza non validi.");
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", policyId)
    .eq("workspace_id", workspaceId)
    .eq("condominium_id", condominiumId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Polizza non aggiornata: non trovata o non autorizzata nel condominio selezionato.");
  return data.id;
}

export async function deleteInsurancePolicy({ supabase, policyId, workspaceId, condominiumId }) {
  validateContext({ supabase, policyId, workspaceId, condominiumId });
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", policyId)
    .eq("workspace_id", workspaceId)
    .eq("condominium_id", condominiumId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Polizza non eliminata: non trovata o non autorizzata nel condominio selezionato.");
  return data.id;
}
