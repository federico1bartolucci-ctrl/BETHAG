export function applyInsurancePoliciesLoadResponse({
  data,
  requestedCondominiumId,
  currentCondominiumId,
  requestSequence,
  currentRequestSequence,
  setPolicies,
  setPoliciesCondominiumId,
}) {
  if (requestSequence !== currentRequestSequence || requestedCondominiumId !== currentCondominiumId) return false;
  if (!Array.isArray(data)) throw new Error("Risposta polizze non valida: atteso un array.");
  if (typeof setPolicies !== "function") throw new Error("Setter polizze non disponibile.");
  setPolicies(data);
  if (typeof setPoliciesCondominiumId === "function") setPoliciesCondominiumId(requestedCondominiumId);
  return true;
}

function insurancePolicyLoadErrorMessage(error) {
  const message = typeof error === "string" ? error : error?.message;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Impossibile caricare le polizze assicurative. Riprova.";
}

export function applyInsurancePoliciesLoadFailure({
  error,
  requestedCondominiumId,
  currentCondominiumId,
  requestSequence,
  currentRequestSequence,
  setPolicies,
  setPoliciesCondominiumId,
  setLoadError,
  setLoadErrorCondominiumId,
}) {
  if (requestSequence !== currentRequestSequence || requestedCondominiumId !== currentCondominiumId) return false;
  if (typeof setPolicies !== "function" ||
      typeof setPoliciesCondominiumId !== "function" ||
      typeof setLoadError !== "function" ||
      typeof setLoadErrorCondominiumId !== "function") {
    throw new Error("Setter stato polizze non disponibile.");
  }

  setPolicies([]);
  setPoliciesCondominiumId(requestedCondominiumId);
  setLoadError(insurancePolicyLoadErrorMessage(error));
  setLoadErrorCondominiumId(requestedCondominiumId);
  return true;
}

export function selectVisibleInsurancePolicies({ policies, policiesCondominiumId, condominiumId }) {
  if (policiesCondominiumId !== condominiumId || !Array.isArray(policies)) return [];
  return policies;
}
