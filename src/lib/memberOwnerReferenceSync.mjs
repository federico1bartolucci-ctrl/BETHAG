export function buildMemberOwnerReferenceSyncArgs({
  workspaceId,
  condominiumId,
  previousUnitId,
  nextUnitId,
  memberLegacyId,
  member,
}) {
  const workspace = String(workspaceId ?? "").trim();
  const condominium = String(condominiumId ?? "").trim();
  const legacyId = String(memberLegacyId ?? "").trim();
  if (!workspace || !condominium || !/^\d+$/.test(legacyId)) {
    throw new Error("Contesto o identificativo del condòmino non valido per sincronizzare i proprietari dell'unità.");
  }

  const data = member?.data && typeof member.data === "object" && !Array.isArray(member.data)
    ? member.data
    : {};
  const nested = data.data && typeof data.data === "object" && !Array.isArray(data.data)
    ? data.data
    : {};
  const currentMarker = member?.currentOwner
    ?? data.current_owner
    ?? nested.current_owner
    ?? data.currentOwner
    ?? nested.currentOwner;
  const status = String(
    member?.positionStatus
      ?? data.position_status
      ?? nested.position_status
      ?? ""
  ).trim();
  const ownershipShareRaw = data.ownership_share ?? nested.ownership_share;
  const ownershipShare = ownershipShareRaw === undefined
    || ownershipShareRaw === null
    || ownershipShareRaw === ""
    ? null
    : Number(ownershipShareRaw);
  const shouldBeOwner = member?.role === "Proprietario"
    && member?.active !== false
    && (currentMarker === undefined || currentMarker === null || currentMarker === true)
    && status !== "In chiusura"
    && status !== "Archiviato"
    && (ownershipShare === null || !Number.isFinite(ownershipShare) || ownershipShare > 0);

  const normalizeUnitId = (value) => {
    const normalized = String(value ?? "").trim();
    return normalized || null;
  };

  return {
    p_workspace_id: workspace,
    p_condominium_id: condominium,
    p_previous_unit_id: normalizeUnitId(previousUnitId),
    p_next_unit_id: normalizeUnitId(nextUnitId),
    p_member_legacy_id: legacyId,
    p_should_be_owner: shouldBeOwner,
  };
}

export async function syncMemberOwnerReferences(client, args) {
  if (!client || typeof client.rpc !== "function") {
    throw new Error("Client Supabase non disponibile per sincronizzare i proprietari dell'unità.");
  }

  const { data, error } = await client.rpc(
    "sync_condominium_member_owner_references",
    args
  );
  if (error) throw new Error(error?.message || "Sincronizzazione proprietari non riuscita.");
  if (!Number.isInteger(data) || data < 0) {
    throw new Error("La sincronizzazione atomica dei proprietari non ha restituito un risultato valido.");
  }
  return data;
}
