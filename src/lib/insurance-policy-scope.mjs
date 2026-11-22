/**
 * Exposes insurance context and rows only for the currently selected workspace and condominium.
 * React effects run after render, so tagging the loaded context prevents old policies
 * and IDs from appearing or being used during the first render after a scope switch.
 */
export function getScopedInsurancePolicyContext(scope, workspaceId, condominiumId) {
  if (!scope || scope.workspaceId !== workspaceId || scope.condominiumId !== condominiumId) return null;
  return scope;
}
