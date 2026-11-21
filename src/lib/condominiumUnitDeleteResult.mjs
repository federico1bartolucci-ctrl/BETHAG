export async function requireCondominiumUnitDeleteResult(query) {
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error("Unità non eliminata: record non trovato o non accessibile.");
  }
  return data;
}
