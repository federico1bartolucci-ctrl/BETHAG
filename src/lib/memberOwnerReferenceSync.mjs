export function buildMemberOwnerReferenceSaveArgs({ workspaceId, condominiumId, unitId, member, row }) {
  const workspace = String(workspaceId ?? "").trim();
  const condominium = String(condominiumId ?? "").trim();
  const legacyId = String(member?.id ?? "").trim();
  if (!workspace || !condominium || !/^\\d+$/.test(legacyId)) {
    throw new Error("Contesto o identificativo del condòmino non valido per il salvataggio atomico.");
  }
  if (!row || typeof row !== "object" || !row.data || typeof row.data !== "object") {
    throw new Error("Dati anagrafici non validi per il salvataggio atomico del condòmino.");
  }
  return {
    p_workspace_id: workspace, p_condominium_id: condominium,
    p_unit_id: String(unitId ?? "").trim() || null, p_legacy_id: legacyId,
    p_user_id: row.user_id ?? null, p_name: row.name, p_email: row.email ?? null,
    p_role: row.role ?? "resident", p_active: row.active ?? true,
    p_permissions: row.permissions ?? {}, p_data: row.data,
  };
}
