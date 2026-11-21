export async function requireCollaboratorMutationResult(query, action) {
  const { data, error } = await query.select("user_id").maybeSingle();
  if (error) throw error;
  if (!data?.user_id) {
    throw new Error(`Collaboratore non ${action}: record non trovato o non accessibile.`);
  }
  return data;
}
