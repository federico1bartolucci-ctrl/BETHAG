/**
 * Inserts a SAL progress row and leaves the parent work financial summary
 * to the database trigger that recalculates it from the latest dated SAL.
 *
 * The UI must not write a client-side sum over cumulative SAL percentages:
 * progress_percent is the latest cumulative percentage, not their sum.
 */
export async function insertWorkProgressRecord({ supabase, payload }) {
  if (!supabase || typeof supabase.from !== "function") {
    throw new Error("Supabase non configurato.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Dati SAL non validi.");
  }

  const { error } = await supabase
    .from("condominium_work_progress")
    .insert(payload);

  if (error) throw error;
}
