export function createAccountingSettingsState(row, year = new Date().getFullYear()) {
  const defaults = {
    accounting_start_date: `${year}-01-01`,
    accounting_end_date: `${year}-12-31`,
    ordinary_installment_count: 12,
    ordinary_due_dates: "",
    extraordinary_mode: "separata",
    extraordinary_allow_multi_year: true,
  };
  if (!row) return { settings: null, form: defaults };
  return {
    settings: row,
    form: {
      accounting_start_date: row.accounting_start_date,
      accounting_end_date: row.accounting_end_date,
      ordinary_installment_count: Number(row.ordinary_installment_count || 12),
      ordinary_due_dates: Array.isArray(row.ordinary_due_dates) ? row.ordinary_due_dates.join(", ") : "",
      extraordinary_mode: row.extraordinary_mode === "integrata" ? "integrata" : "separata",
      extraordinary_allow_multi_year: row.extraordinary_allow_multi_year !== false,
    },
  };
}

export function selectAccountingSettingsRow(rows, condominiumId) {
  if (!condominiumId) return null;
  return rows.find((row) => row?.condominium_id === condominiumId) ?? null;
}

export async function resolveAccountingCondominiumId({ supabase, workspaceId, selectedCondominiumId }) {
  if (!supabase || selectedCondominiumId === "all") return null;
  const { data, error } = await supabase
    .from("condominiums")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("legacy_id", selectedCondominiumId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Condominio selezionato non trovato nel database.");
  return data.id;
}
