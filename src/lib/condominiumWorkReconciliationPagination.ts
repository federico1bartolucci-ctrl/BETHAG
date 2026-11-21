import { loadPages } from "./portalRegistrationRequestPagination.ts";

export async function loadWorkReconciliationLedger(client: any, workspaceId: string, condominiumId: string) {
  if (!workspaceId || !condominiumId) return [];
  return loadPages(() => client
    .from("condominium_ledger_entries")
    .select("id,amount,payment_status,description,data,document_id")
    .eq("workspace_id", workspaceId)
    .eq("condominium_id", condominiumId)
    .eq("direction", "Uscita")
    .order("id", { ascending: true }));
}
