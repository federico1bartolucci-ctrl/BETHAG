const VALID_STATUSES = new Set(["pending", "queued", "sent", "delivered", "failed", "skipped"]);
const VALID_ROLES = new Set(["resident", "council", "owner", "tenant"]);
const STATUS_RANK = Object.freeze({
  pending: 1,
  failed: 2,
  skipped: 3,
  queued: 4,
  sent: 5,
  delivered: 6,
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasProviderEvidence(row) {
  return [
    row.provider_message_id,
    row.provider_event_id,
    row.sent_at,
    row.delivered_at,
    row.bounced_at,
    row.complained_at,
    row.event_type,
  ].some(nonEmptyString);
}

function normalizeDeliveryState(row) {
  let status = typeof row.status === "string" && row.status ? row.status : "pending";
  if (!VALID_STATUSES.has(status)) return null;

  let errorMessage = typeof row.error_message === "string" ? row.error_message : null;
  const hasMessageId = nonEmptyString(row.provider_message_id);
  const hasEvidence = hasProviderEvidence(row);

  // A provider message ID is proof that the provider accepted the send.
  // Never let a stale pending/failed flag make that recipient sendable again.
  if (["pending", "failed", "skipped", "queued"].includes(status) && hasMessageId) {
    status = nonEmptyString(row.delivered_at) ? "delivered" : "sent";
  } else if (["pending", "failed", "queued"].includes(status) && hasEvidence) {
    // Provider event/time metadata without a message ID is ambiguous.
    // Keep it out of the automatic pending/failed retry path.
    status = "skipped";
    errorMessage = errorMessage || "Storico provider incompleto: verifica manuale richiesta prima di un nuovo invio.";
  } else if (status === "pending" && nonEmptyString(row.queued_at)) {
    status = "queued";
  }

  if ((status === "sent" || status === "delivered") && !hasMessageId) return null;
  if (status === "delivered" && !nonEmptyString(row.delivered_at)) status = "sent";
  if (status === "queued" && !nonEmptyString(row.queued_at)) return null;

  return { status, errorMessage };
}

function timestampValue(row) {
  const value = Date.parse(row?.updated_at || row?.sent_at || row?.created_at || "");
  return Number.isFinite(value) ? value : 0;
}

function communicationEmailKey(communicationId, email) {
  return String(communicationId) + "\u0000" + String(email).trim().toLowerCase();
}

function validTimestamp(value) {
  return nonEmptyString(value) && Number.isFinite(Date.parse(value));
}

/**
 * Prepare communication recipient rows for a same-workspace JSON backup restore.
 *
 * Recipient IDs are intentionally preserved: the email sender uses the recipient
 * UUID as the Resend idempotency key. Recreating a sent recipient with a new UUID
 * would create a new provider idempotency key and could send the same communication
 * to the same address again.
 */
export function prepareCommunicationRecipientsForBackupRestore(
  rows,
  workspaceId,
  existingRows,
  restoredCommunications,
  restoredCondominiumIds,
  restoredMembers
) {
  const targetWorkspaceId = String(workspaceId ?? "").trim();
  if (!isUuid(targetWorkspaceId)) throw new Error("Workspace di ripristino non valido.");

  const communicationsById = new Map(
    (Array.isArray(restoredCommunications) ? restoredCommunications : [])
      .filter((row) => isRecord(row) && isUuid(row.id))
      .map((row) => [String(row.id), row])
  );
  const membersById = new Map(
    (Array.isArray(restoredMembers) ? restoredMembers : [])
      .filter((row) => isRecord(row) && isUuid(row.id))
      .map((row) => [String(row.id), row])
  );
  const allowedCondominiumIds = new Set(
    (restoredCondominiumIds instanceof Set
      ? [...restoredCondominiumIds]
      : Array.isArray(restoredCondominiumIds)
        ? restoredCondominiumIds
        : [])
      .filter(isUuid)
  );

  const scopedExisting = (Array.isArray(existingRows) ? existingRows : [])
    .filter((row) => isRecord(row) && String(row.workspace_id ?? "") === targetWorkspaceId);
  const existingById = new Map(scopedExisting.filter((row) => isUuid(row.id)).map((row) => [String(row.id), row]));
  const existingByEmail = new Map(
    scopedExisting
      .filter((row) => isUuid(row.communication_id) && nonEmptyString(row.email))
      .map((row) => [communicationEmailKey(row.communication_id, row.email), row])
  );
  const existingByEventId = new Map(
    scopedExisting
      .filter((row) => nonEmptyString(row.provider_event_id))
      .map((row) => [String(row.provider_event_id), row])
  );

  const updateRows = [];
  const insertRows = [];
  const seenIds = new Set();
  const seenEmailKeys = new Set();
  const seenEventIds = new Map();
  let skipped = 0;
  let manualReview = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isRecord(row) || !isUuid(row.id) || !isUuid(row.communication_id)) {
      skipped += 1;
      continue;
    }
    if (String(row.workspace_id ?? "") !== targetWorkspaceId) {
      skipped += 1;
      continue;
    }

    const communicationId = String(row.communication_id);
    const communication = communicationsById.get(communicationId);
    if (!communication || String(communication.workspace_id ?? "") !== targetWorkspaceId) {
      skipped += 1;
      continue;
    }

    const communicationCondominiumId = communication.condominium_id == null
      ? null
      : String(communication.condominium_id);
    const rowCondominiumId = row.condominium_id == null ? null : String(row.condominium_id);
    if (rowCondominiumId !== communicationCondominiumId) {
      skipped += 1;
      continue;
    }
    if (communicationCondominiumId && !allowedCondominiumIds.has(communicationCondominiumId)) {
      skipped += 1;
      continue;
    }

    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (email.indexOf("@") <= 1 || typeof row.name !== "string") {
      skipped += 1;
      continue;
    }
    const recipientRole = row.recipient_role == null ? "resident" : String(row.recipient_role);
    if (!VALID_ROLES.has(recipientRole)) {
      skipped += 1;
      continue;
    }

    const id = String(row.id);
    const emailKey = communicationEmailKey(communicationId, email);
    if (seenIds.has(id) || seenEmailKeys.has(emailKey)) {
      skipped += 1;
      continue;
    }
    seenIds.add(id);
    seenEmailKeys.add(emailKey);

    const byId = existingById.get(id);
    const byEmail = existingByEmail.get(emailKey);
    if (byId && (
      String(byId.workspace_id ?? "") !== targetWorkspaceId ||
      String(byId.communication_id ?? "") !== communicationId ||
      String(byId.email ?? "").trim().toLowerCase() !== email
    )) {
      skipped += 1;
      continue;
    }
    if (byEmail && String(byEmail.communication_id ?? "") !== communicationId) {
      skipped += 1;
      continue;
    }
    if (byId && byEmail && String(byId.id) !== String(byEmail.id)) {
      skipped += 1;
      continue;
    }

    const existing = byId || byEmail || null;
    const backupState = normalizeDeliveryState(row);
    const existingState = existing ? normalizeDeliveryState(existing) : null;
    if (!backupState && !existingState) {
      skipped += 1;
      continue;
    }

    let stateSource = row;
    let deliveryState = backupState;
    if (!backupState || (existingState && (
      STATUS_RANK[existingState.status] > STATUS_RANK[backupState.status] ||
      (STATUS_RANK[existingState.status] === STATUS_RANK[backupState.status] &&
        timestampValue(existing) >= timestampValue(row))
    ))) {
      stateSource = existing;
      deliveryState = existingState;
    }
    if (!deliveryState) {
      skipped += 1;
      continue;
    }
    if (deliveryState.status === "skipped" && hasProviderEvidence(stateSource)) manualReview += 1;

    const targetId = existing ? String(existing.id) : id;
    const memberFromExisting = existing?.member_id == null
      ? null
      : membersById.get(String(existing.member_id));
    const memberFromBackup = row.member_id == null
      ? null
      : membersById.get(String(row.member_id));
    const memberIsValid = (member) => Boolean(
      member &&
      communicationCondominiumId &&
      String(member.condominium_id ?? "") === communicationCondominiumId &&
      allowedCondominiumIds.has(communicationCondominiumId)
    );
    const memberId = memberIsValid(memberFromExisting)
      ? String(memberFromExisting.id)
      : memberIsValid(memberFromBackup)
        ? String(memberFromBackup.id)
        : null;

    const eventId = nonEmptyString(stateSource.provider_event_id)
      ? String(stateSource.provider_event_id)
      : null;
    if (eventId) {
      const existingEventOwner = existingByEventId.get(eventId);
      if (existingEventOwner && String(existingEventOwner.id) !== targetId) {
        skipped += 1;
        continue;
      }
      const seenEventOwner = seenEventIds.get(eventId);
      if (seenEventOwner && seenEventOwner !== targetId) {
        skipped += 1;
        continue;
      }
      seenEventIds.set(eventId, targetId);
    }

    const snapshotSource = existing && (
      deliveryState.status === "sent" ||
      deliveryState.status === "delivered" ||
      deliveryState.status === "queued"
    ) ? existing : row;

    const normalized = {
      id: targetId,
      communication_id: communicationId,
      workspace_id: targetWorkspaceId,
      condominium_id: communicationCondominiumId,
      member_id: memberId,
      // Profile IDs are destination-local and are not portable in a workspace JSON backup.
      user_id: existing ? (existing.user_id ?? null) : null,
      email,
      name: typeof snapshotSource.name === "string" ? snapshotSource.name : row.name,
      recipient_role: VALID_ROLES.has(String(snapshotSource.recipient_role ?? ""))
        ? String(snapshotSource.recipient_role)
        : recipientRole,
      status: deliveryState.status,
      provider_message_id: nonEmptyString(stateSource.provider_message_id) ? String(stateSource.provider_message_id) : null,
      provider_event_id: eventId,
      error_message: deliveryState.errorMessage,
      sent_at: nonEmptyString(stateSource.sent_at) ? stateSource.sent_at : null,
      delivered_at: nonEmptyString(stateSource.delivered_at) ? stateSource.delivered_at : null,
      bounced_at: nonEmptyString(stateSource.bounced_at) ? stateSource.bounced_at : null,
      complained_at: nonEmptyString(stateSource.complained_at) ? stateSource.complained_at : null,
      event_type: nonEmptyString(stateSource.event_type) ? stateSource.event_type : null,
      queued_at: deliveryState.status === "queued" && validTimestamp(stateSource.queued_at)
        ? stateSource.queued_at
        : null,
      created_at: existing?.created_at || row.created_at || undefined,
      updated_at: stateSource.updated_at || existing?.updated_at || row.updated_at || undefined,
    };

    if (normalized.status === "queued" && !normalized.queued_at) {
      skipped += 1;
      continue;
    }
    if ((normalized.status === "sent" || normalized.status === "delivered") && !normalized.provider_message_id) {
      skipped += 1;
      continue;
    }
    if (normalized.status === "delivered" && !normalized.delivered_at) {
      normalized.status = "sent";
    }

    if (existing) updateRows.push(normalized);
    else insertRows.push(normalized);
  }

  return { updateRows, insertRows, skipped, manualReview };
}
