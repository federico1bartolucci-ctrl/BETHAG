export function selectVisibleInsurancePolicies({ policies, policiesCondominiumId, condominiumId }) {
  if (policiesCondominiumId !== condominiumId || !Array.isArray(policies)) return [];
  return policies;
}

export function insurancePolicyLoadErrorMessage(error) {
  const message = typeof error === "string" ? error : error?.message;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Impossibile caricare le polizze assicurative. Riprova.";
}

export function applyInsurancePoliciesLoadFailure({
  error,
  requestedCondominiumId,
  currentCondominiumId,
  isCurrent,
  setPolicies,
  setPoliciesCondominiumId,
  setLoadError,
  setLoadErrorCondominiumId,
}) {
  if (typeof isCurrent !== "function" || !isCurrent() || requestedCondominiumId !== currentCondominiumId) return false;
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
