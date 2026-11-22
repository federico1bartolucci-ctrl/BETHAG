export interface PortalWorkspaceRow {
  workspace_id?: string | null;
}

export declare function resolveUniqueWorkspaceId(
  rows: readonly PortalWorkspaceRow[]
): string | null;
