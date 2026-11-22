/**
 * Returns a resolved condominium ID only while its workspace and selection still match.
 * This prevents RegisterPage from rendering rows scoped to the previous selection
 * during the render that occurs before the next resolver completes.
 */
export function getScopedRegisterCondominiumId(scope, workspaceId, selected) {
  if (!scope || scope.workspaceId !== workspaceId || scope.selected !== selected) return null;
  const id = scope.condominiumId;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}
