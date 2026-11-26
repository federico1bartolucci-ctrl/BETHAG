export type ConsumptionReadingRow = {
  id: string;
  workspace_id: string;
  period_end: string | null;
  [key: string]: unknown;
};

export type ConsumptionReadingsResult = {
  data: ConsumptionReadingRow[];
  error: null;
};

export declare function loadConsumptionReadings(
  client: any,
  workspaceId: string,
  pageSize?: number
): Promise<ConsumptionReadingsResult>;
