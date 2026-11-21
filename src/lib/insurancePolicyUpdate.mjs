export async function requireInsurancePolicyMutationResult(query, action) {
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(`La polizza non è stata ${action}: il record non esiste più o non è accessibile.`);
  }
  return data;
}
