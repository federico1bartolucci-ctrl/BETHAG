const BACKUP_AUTHORIZATION_TABLES = new Set(["workspace_members","portal_access","portal_registration_requests"]);
function asRecord(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
export function isBackupAuthorizationTable(table) { return BACKUP_AUTHORIZATION_TABLES.has(String(table ?? "")); }
export function prepareWorkspaceRowsForBackupRestore(rows, workspaceId, existingRows) {
  const targetWorkspaceId = String(workspaceId ?? "");
  if (!targetWorkspaceId) throw new Error("Workspace di ripristino non valido.");
  const existingById = new Map((Array.isArray(existingRows) ? existingRows : []).filter(row => row && typeof row === "object" && row.id != null).map(row => [String(row.id), row]));
  const updateRows = [], insertRows = [], seenIds = new Set();
  let skipped = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) { skipped += 1; continue; }
    const id = row.id == null ? "" : String(row.id);
    if (id && seenIds.has(id)) { skipped += 1; continue; }
    if (id) seenIds.add(id);
    const existing = id ? existingById.get(id) : undefined;
    const normalized = { ...row, workspace_id: targetWorkspaceId };
    if (existing) {
      if (String(existing.workspace_id ?? "") !== targetWorkspaceId) { skipped += 1; continue; }
      updateRows.push(normalized);
    } else insertRows.push(normalized);
  }
  return { updateRows, insertRows, skipped };
}
export function prepareCondominiumMembersForBackupRestore(rows, condominiumIds, existingMembers) {
  const allowedCondominiumIds = new Set((Array.isArray(condominiumIds) ? condominiumIds : []).filter(id => typeof id === "string" && id.length > 0));
  const existingById = new Map((Array.isArray(existingMembers) ? existingMembers : []).filter(member => member && typeof member === "object" && member.id != null).map(member => [String(member.id), member]));
  const safeRows = [], updateRows = [], insertRows = [], seenIds = new Set();
  let skipped = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) { skipped += 1; continue; }
    const backupCondominiumId = String(row.condominium_id ?? "");
    if (!allowedCondominiumIds.has(backupCondominiumId)) { skipped += 1; continue; }
    const id = row.id == null ? "" : String(row.id);
    if (id && seenIds.has(id)) { skipped += 1; continue; }
    if (id) seenIds.add(id);
    const existing = id ? existingById.get(id) : undefined;
    if (existing && !allowedCondominiumIds.has(String(existing.condominium_id ?? ""))) { skipped += 1; continue; }
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
        if (Object.hasOwn(currentData, key)) nextData[key] = currentData[key];
        else delete nextData[key];
      }
      memberRow.data = nextData;
      updateRows.push(memberRow);
    } else {
      memberRow.user_id = null;
      memberRow.email = null;
      memberRow.active = true;
      memberRow.permissions = {};
      insertRows.push(memberRow);
    }
    safeRows.push(memberRow);
  }
  return { rows: safeRows, updateRows, insertRows, skipped };
}
