const PROFILE_FIELDS = ["name", "company", "email", "phone", "address", "fiscalCode", "vat"];
const BLOCK_REASON = "Ripristino bloccato: il profilo amministratore nel backup non appartiene al workspace corrente o non è valido. Nessun dato è stato modificato.";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

/**
 * Validates and normalizes the administrator profile carried by an editable
 * workspace backup. The workspace ID is an invariant owned by the active
 * authenticated context, never by the imported JSON.
 */
export function prepareBackupAdminProfileRestore(candidate, backupWorkspaceId, currentProfile) {
  if (candidate === undefined || candidate === null) {
    return { ok: true, profile: null, reason: "" };
  }

  if (!isRecord(candidate) || !isRecord(currentProfile)) {
    return { ok: false, profile: null, reason: BLOCK_REASON };
  }

  const currentWorkspaceId = currentProfile.workspaceId;
  if (
    typeof currentWorkspaceId !== "string" ||
    !currentWorkspaceId.trim() ||
    typeof backupWorkspaceId !== "string" ||
    backupWorkspaceId.trim() !== currentWorkspaceId.trim()
  ) {
    return { ok: false, profile: null, reason: BLOCK_REASON };
  }

  if (hasOwn(candidate, "workspaceId") && candidate.workspaceId !== currentWorkspaceId) {
    return { ok: false, profile: null, reason: BLOCK_REASON };
  }

  const restoredProfile = {
    name: typeof currentProfile.name === "string" ? currentProfile.name : "",
    company: typeof currentProfile.company === "string" ? currentProfile.company : "",
    email: typeof currentProfile.email === "string" ? currentProfile.email : "",
    phone: typeof currentProfile.phone === "string" ? currentProfile.phone : "",
    address: typeof currentProfile.address === "string" ? currentProfile.address : "",
    fiscalCode: typeof currentProfile.fiscalCode === "string" ? currentProfile.fiscalCode : "",
    vat: typeof currentProfile.vat === "string" ? currentProfile.vat : "",
    workspaceId: currentWorkspaceId,
  };

  for (const field of PROFILE_FIELDS) {
    if (!hasOwn(candidate, field)) continue;
    if (typeof candidate[field] !== "string") {
      return { ok: false, profile: null, reason: BLOCK_REASON };
    }
    restoredProfile[field] = candidate[field];
  }

  return { ok: true, profile: restoredProfile, reason: "" };
}
