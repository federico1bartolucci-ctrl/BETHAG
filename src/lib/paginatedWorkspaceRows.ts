export async function loadPaginatedWorkspaceRows(
  client: any,
  workspaceId: string,
  table: string,
  orderBy: string | null = null,
  tieBreaker: string | null = "id"
): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client.from(table).select("*").eq("workspace_id", workspaceId);
    if (orderBy) query = query.order(orderBy, { ascending: true });
    if (tieBreaker && tieBreaker !== orderBy) query = query.order(tieBreaker, { ascending: true });
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

/**
 * Loads rows scoped through a parent relation when the child table has no workspace_id.
 * Values are chunked to keep PostgREST filters bounded; every chunk is fully paginated.
 */
export async function loadPaginatedRowsByInFilter(
  client: any,
  table: string,
  filterColumn: string,
  filterValues: string[],
  orderBy: string | null = "id"
): Promise<any[]> {
  const uniqueValues = Array.from(
    new Set((filterValues ?? []).filter((value) => typeof value === "string" && value.length > 0))
  );
  if (!uniqueValues.length) return [];

  const rows: any[] = [];
  const filterChunkSize = 100;
  for (let index = 0; index < uniqueValues.length; index += filterChunkSize) {
    const valueChunk = uniqueValues.slice(index, index + filterChunkSize);
    for (let offset = 0; ; offset += 1000) {
      let query = client.from(table).select("*").in(filterColumn, valueChunk);
      if (orderBy) query = query.order(orderBy, { ascending: true });
      const { data, error } = await query.range(offset, offset + 999);
      if (error) throw error;
      const batch = data ?? [];
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
  }
  return rows;
}

/**
 * Restricts restored condominium members to condominiums successfully restored
 * for the current workspace and removes the nonexistent workspace_id column.
 */
export function filterCondominiumMembersToWorkspace(rows: any[], condominiumIds: string[]) {
  const allowedCondominiumIds = new Set(
    (condominiumIds ?? []).filter((id) => typeof id === "string" && id.length > 0)
  );
  const safeRows: any[] = [];
  let skipped = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const condominiumId = String(row?.condominium_id ?? "");
    if (!row || typeof row !== "object" || !allowedCondominiumIds.has(condominiumId)) {
      skipped += 1;
      continue;
    }
    const { workspace_id: _ignoredWorkspaceId, ...memberRow } = row;
    safeRows.push(memberRow);
  }

  return { rows: safeRows, skipped };
}
