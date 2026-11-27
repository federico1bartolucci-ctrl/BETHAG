export function findOverlappingFiscalYear(years, condominiumId, startDate, endDate) {
  const rows = Array.isArray(years) ? years : [];
  return rows.find((year) =>
    String(year.condominium_id) === String(condominiumId)
    && String(startDate) <= String(year.end_date)
    && String(endDate) >= String(year.start_date)
  ) ?? null;
}

export async function persistFiscalYearRecord({
  supabase,
  workspaceId,
  condominiumId,
  yearForm,
  existingYears,
}) {
  const overlappingYear = findOverlappingFiscalYear(
    existingYears,
    condominiumId,
    yearForm.start_date,
    yearForm.end_date
  );

  if (overlappingYear) {
    const error = new Error("Il periodo si sovrappone a un altro esercizio contabile del condominio.");
    error.code = "FISCAL_YEAR_OVERLAP";
    error.overlappingYearId = overlappingYear.id;
    throw error;
  }

  const payload = {
    workspace_id: workspaceId,
    condominium_id: condominiumId,
    ...yearForm,
    opening_balance: Number(yearForm.opening_balance),
  };

  const { data: savedYear, error: saveError } = await supabase
    .from("condominium_fiscal_years")
    .upsert(payload, { onConflict: "condominium_id,start_date,end_date" })
    .select("id")
    .single();

  if (saveError) throw saveError;
  if (!savedYear?.id) {
    throw new Error("Salvataggio esercizio non confermato: identificativo non restituito.");
  }

  const previousYear = (Array.isArray(existingYears) ? existingYears : [])
    .filter((year) =>
      String(year.condominium_id) === String(condominiumId)
      && year.status === "Chiuso"
      && year.end_date < yearForm.start_date
    )
    .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];

  if (previousYear) {
    const { error: carryError } = await supabase.rpc("generate_fiscal_year_carryovers", {
      p_workspace_id: workspaceId,
      p_condominium_id: condominiumId,
      p_source_fiscal_year_id: previousYear.id,
      p_target_fiscal_year_id: savedYear.id,
    });

    if (carryError) {
      const error = new Error(carryError.message || "Generazione dei riporti non riuscita.");
      error.fiscalYearSaved = true;
      error.savedYearId = savedYear.id;
      error.cause = carryError;
      throw error;
    }
  }

  return {
    savedYearId: savedYear.id,
    previousYearId: previousYear?.id ?? null,
  };
}
