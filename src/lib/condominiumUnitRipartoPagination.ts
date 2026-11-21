import { loadPages } from "./portalRegistrationRequestPagination.ts";

export async function loadCondominiumUnitsForRiparto(client: any, workspaceId: string, condominiumId: string) {
  if (!workspaceId || !condominiumId) return [];
  return loadPages(() => client
    .from("condominium_units")
    .select("id,unit_code,data")
    .eq("workspace_id", workspaceId)
    .eq("condominium_id", condominiumId)
    .order("unit_code", { ascending: true })
    .order("id", { ascending: true }));
}
