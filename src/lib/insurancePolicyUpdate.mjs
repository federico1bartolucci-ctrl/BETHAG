export async function requireInsurancePolicyUpdateResult(query) {
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error("La polizza non è stata aggiornata: il record non esiste più o non è accessibile.");
  }
  return data;
}
