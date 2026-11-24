const BACKUP_AUTHORIZATION_TABLES = new Set([
  "workspace_members",
  "portal_access",
  "portal_registration_requests",
]);

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/**
 * Authorization and registration workflow rows are exported for reference,
 * but never replayed from an editable backup file.
 */
export function isBackupAuthorizationTable(table) {
  return BACKUP_AUTHORIZATION_TABLES.has(String(table ?? ""));
}

/**
 * Restores condominium member business data without allowing a backup to
 * reassign an existing identity, reactivate a disabled member, or move a
 * member across condominiums/workspaces.
 *
 * New rows are deliberately unlinked from Auth identities. Existing identity
 * and permission-bearing fields are copied from the live row, not the backup.
 */
export function prepareCondominiumMembersForBackupRestore(rows, condominiumIds, existingMembers) {
  const allowedCondominiumIds = new Set(
    (Array.isArray(condominiumIds) ? condominiumIds : [])
      .filter((id) => typeof id === "string" && id.length > 0)
  );
  const existingById = new Map(
    (Array.isArray(existingMembers) ? existingMembers : [])
      .filter((member) => member && typeof member === "object" && typeof member.id === "string")
      .map((member) => [member.id, member])
  );
  const safeRows = [];
  let skipped = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") {
      skipped += 1;
      continue;
    }

    const backupCondominiumId = String(row.condominium_id ?? "");
    if (!allowedCondominiumIds.has(backupCondominiumId)) {
      skipped += 1;
      continue;
    }

    const existing = existingById.get(String(row.id ?? ""));
    if (existing && !allowedCondominiumIds.has(String(existing.condominium_id ?? ""))) {
      // An ID visible in another workspace must not be moved by this restore.
      skipped += 1;
      continue;
    }

    const { workspace_id: _ignoredWorkspaceId, ...memberRow } = row;
    if (existing) {
      memberRow.condominium_id = existing.condominium_id;
      memberRow.user_id = existing.user_id ?? null;
      memberRow.email = existing.email ?? null;
      memberRow.active = existing.active === true;
      memberRow.role = existing.role ?? "resident";
      memberRow.permissions = existing.permissions ?? {};

      const nextData = { ...asRecord(row.data) };
      const currentData = asRecord(existing.data);
      for (const key of ["role", "position_status", "ownership_share"]) {
        if (Object.hasOwn(currentData, key)) {
          nextData[key] = currentData[key];
        } else {
          delete nextData[key];
        }
      }
      memberRow.data = nextData;
    } else {
      // A restored person is not automatically linked to an Auth account.
      memberRow.user_id = null;
      memberRow.email = null;
      memberRow.active = true;
      memberRow.permissions = {};
    }

    safeRows.push(memberRow);
  }

  return { rows: safeRows, skipped };
}
