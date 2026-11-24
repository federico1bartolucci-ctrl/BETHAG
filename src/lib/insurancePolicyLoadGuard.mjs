export function applyInsurancePoliciesLoadResponse({
  data,
  requestedCondominiumId,
  currentCondominiumId,
  requestSequence,
  currentRequestSequence,
  setPolicies,
}) {
  if (requestSequence !== currentRequestSequence || requestedCondominiumId !== currentCondominiumId) return false;
  if (!Array.isArray(data)) throw new Error("Risposta polizze non valida: atteso un array.");
  if (typeof setPolicies !== "function") throw new Error("Setter polizze non disponibile.");
  setPolicies(data);
  return true;
}
