export type CapLookupField = Pick<HTMLInputElement | HTMLTextAreaElement, "value" | "isConnected">;
export type CapLookupResponse = {
  ok: boolean;
  json: () => Promise<{
    places?: Array<{
      "place name"?: string;
      "state abbreviation"?: string;
    }>;
  }>;
};
export declare function applyCapLookupResponse(args: {
  input: CapLookupField;
  city?: CapLookupField | null;
  province?: CapLookupField | null;
  requestedCap: string;
  cityValueAtRequest?: string;
  provinceValueAtRequest?: string;
  lookupSequence: number;
  getCurrentLookupSequence: () => number | undefined;
  fetcher: (url: string) => Promise<CapLookupResponse>;
  setNativeInputValue: (field: CapLookupField, value: string) => void;
  sentenceCase: (value: string) => string;
}): Promise<boolean>;
