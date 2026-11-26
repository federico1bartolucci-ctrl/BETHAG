export function createCommittedMemberTransferOutcome({
  transferId,
  transferRecord,
  transferLookupError,
  incoming,
  incomingLookupError,
}) {
  const normalizedTransferId =
    typeof transferId === "string" && transferId.trim() ? transferId.trim() : null;

  let reconciliationReason = null;
  if (!normalizedTransferId) {
    reconciliationReason = "transfer_id_missing";
  } else if (transferLookupError) {
    reconciliationReason = "transfer_record_lookup_failed";
  } else if (!transferRecord || String(transferRecord.id ?? "") !== normalizedTransferId) {
    reconciliationReason = "transfer_record_not_visible";
  } else if (!transferRecord.incoming_member_id) {
    reconciliationReason = "incoming_member_reference_missing";
  } else if (incomingLookupError) {
    reconciliationReason = "incoming_member_lookup_failed";
  } else if (!incoming || String(incoming.id ?? "") !== String(transferRecord.incoming_member_id)) {
    reconciliationReason = "incoming_member_not_visible";
  } else if (!Number.isSafeInteger(Number(incoming.legacy_id)) || Number(incoming.legacy_id) <= 0) {
    reconciliationReason = "incoming_member_legacy_id_invalid";
  } else if (incoming.active !== true ||
    String(incoming.data?.role ?? "").trim() !== "Proprietario" ||
    incoming.data?.current_owner === false ||
    ["In chiusura", "Archiviato"].includes(String(incoming.data?.position_status ?? "Attivo").trim())) {
    reconciliationReason = "incoming_member_not_current_owner";
  }

  return {
    committed: true,
    transferId: normalizedTransferId,
    incoming: reconciliationReason ? null : incoming,
    reconciliationRequired: Boolean(reconciliationReason),
    reconciliationReason,
  };
}
