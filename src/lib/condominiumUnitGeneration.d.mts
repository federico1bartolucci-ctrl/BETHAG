export declare function loadExistingCondominiumUnits(
  client: any,
  condominiumId: string | number,
  workspaceId?: string,
  pageSize?: number,
): Promise<any[]>;

export declare function requireCondominiumUnitRenameResult(
  query: any,
  expectedUnitId: string | number,
  unitCode: string,
): Promise<{ id: string | number }>;
