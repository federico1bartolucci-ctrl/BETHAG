function errorMessage(error) {
  return typeof error?.message === "string" && error.message.trim()
    ? error.message
    : "Impossibile caricare i proprietari delle unità. Riprova.";
}

export async function loadAccountingUnitMembers(runQuery) {
  try {
    const result = await runQuery();
    if (result?.error) {
      return { ok: false, data: [], error: errorMessage(result.error) };
    }
    if (!Array.isArray(result?.data)) {
      return {
        ok: false,
        data: [],
        error: "Risposta non valida durante il caricamento dei proprietari delle unità.",
      };
    }
    const rowsAreValid = result.data.every((row) =>
      row !== null &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      typeof row.unit_id === "string" &&
      row.unit_id.trim().length > 0 &&
      (row.data == null || (typeof row.data === "object" && !Array.isArray(row.data)))
    );
    if (!rowsAreValid) {
      return {
        ok: false,
        data: [],
        error: "Risposta non valida durante il caricamento dei proprietari delle unità.",
      };
    }
    return { ok: true, data: result.data, error: null };
  } catch (error) {
    return { ok: false, data: [], error: errorMessage(error) };
  }
}
