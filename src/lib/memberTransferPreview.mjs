export function createPreviewRequestSequence() {
  let current = 0;
  return {
    begin() {
      current += 1;
      return current;
    },
    invalidate() {
      current += 1;
      return current;
    },
    isCurrent(requestId) {
      return Number.isSafeInteger(requestId) && requestId > 0 && requestId === current;
    },
  };
}

export function isMemberTransferPreviewCurrent(preview, selection) {
  if (!preview || !selection) return false;
  const scope = selection.transferScope;
  const ownershipShare = scope === "ownership_share" ? selection.ownershipShare : null;
  return preview.unit_id === selection.unitId
    && preview.outgoing_member_id === selection.outgoingId
    && preview.transfer_date === selection.transferDate
    && preview.transfer_scope === scope
    && preview.ownership_share === ownershipShare;
}
