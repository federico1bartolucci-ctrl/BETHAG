/**
 * Archives only the outgoing member belonging to the condominium whose
 * accounting transfer was closed. Legacy member IDs are not globally unique.
 */
export function archiveTransferredMember(members, target) {
  if (!Array.isArray(members)) return members;
  const memberId = Number(target?.memberId);
  const condominiumId = Number(target?.condominiumId);
  if (!Number.isSafeInteger(memberId) || memberId <= 0 ||
      !Number.isSafeInteger(condominiumId) || condominiumId <= 0) {
    return members;
  }

  let changed = false;
  const next = members.map((member) => {
    if (!member ||
        Number(member.id) !== memberId ||
        Number(member.condominiumId) !== condominiumId) {
      return member;
    }
    changed = true;
    return {
      ...member,
      active: false,
      data: {
        ...(member.data ?? {}),
        position_status: "Archiviato",
        current_owner: false,
      },
    };
  });
  return changed ? next : members;
}
