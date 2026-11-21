export async function loadCondominiumUnitsForLookup(client: any, condominiumId: string | string[], columns = "id, unit_code, building_code, lifecycle_status", workspaceId?: string) {
  if (!condominiumId || (Array.isArray(condominiumId) && !condominiumId.length)) return [];
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client
      .from("condominium_units")
      .select(columns);
    if (Array.isArray(condominiumId)) query = query.in("condominium_id", condominiumId);
    else query = query.eq("condominium_id", condominiumId);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data, error } = await query
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

export function removeOwnerMemberIdFromUnitData(unitData: any, legacyId: number) {
  const currentData = unitData && typeof unitData === "object" ? unitData : {};
  const currentOwners = Array.isArray(currentData.ownerMemberIds) ? currentData.ownerMemberIds : [];
  const nextOwners = currentOwners.filter((ownerId: unknown) => String(ownerId) !== String(legacyId));
  return { currentData, nextOwners, changed: nextOwners.length !== currentOwners.length };
}
