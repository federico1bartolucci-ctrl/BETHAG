import { supabase } from "./supabase";

export type BackendState = Record<string, any[]>;

export async function getActiveWorkspaceId(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, active")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.workspace_id ?? null;
}

export async function loadBackendState(workspaceId: string): Promise<BackendState> {
  if (!supabase) throw new Error("Supabase non configurato.");

  const condominiums = await supabase
    .from("condominiums")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (condominiums.error) throw condominiums.error;

  const condominiumIds = (condominiums.data ?? []).map((row: any) => row.id);

  const [
    condominiumMembers,
    documents,
    deadlines,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumRequests,
  ] = await Promise.all([
    condominiumIds.length
      ? supabase.from("condominium_members").select("*").in("condominium_id", condominiumIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("documents").select("*").eq("workspace_id", workspaceId),
    supabase.from("deadlines").select("*").eq("workspace_id", workspaceId),
    supabase.from("assemblies").select("*").eq("workspace_id", workspaceId),
    supabase.from("suppliers").select("*").eq("workspace_id", workspaceId),
    supabase.from("activities").select("*").eq("workspace_id", workspaceId),
    supabase.from("communications").select("*").eq("workspace_id", workspaceId),
    supabase.from("condominium_requests").select("*").eq("workspace_id", workspaceId),
  ]);

  const firstError = [
    condominiumMembers,
    documents,
    deadlines,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumRequests,
  ].find((result) => result.error)?.error;

  if (firstError) throw firstError;

  const condominiumLegacyByDbId = new Map(
    (condominiums.data ?? []).map((row: any) => [row.id, row.legacy_id])
  );

  return {
    condominiums: (condominiums.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    condominiumMembers: (condominiumMembers.data ?? []).map((row: any) => ({
      ...row.data,
      id: row.legacy_id,
      condominiumId:
        row.data?.condominiumId ??
        condominiumLegacyByDbId.get(row.condominium_id) ??
        null,
    })),
    documents: (documents.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    deadlines: (deadlines.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    assemblies: (assemblies.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    suppliers: (suppliers.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    activities: (activities.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    communications: (communications.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    condominiumRequests: (condominiumRequests.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
  };
}

export async function syncBackendState(workspaceId: string, state: BackendState) {
  if (!supabase) throw new Error("Supabase non configurato.");

  const rows = [
    ["condominiums", state.condominiums],
    ["documents", state.documents],
    ["deadlines", state.deadlines],
    ["assemblies", state.assemblies],
    ["suppliers", state.suppliers],
    ["activities", state.activities],
    ["communications", state.communications],
    ["condominium_requests", state.condominiumRequests],
  ] as const;

  for (const [table, items] of rows) {
    if (!items.length) continue;

    const payload = items.map((item: any) => ({
      workspace_id: workspaceId,
      condominium_id:
        "condominiumId" in item
          ? undefined
          : undefined,
      legacy_id: item.id,
      title: item.title ?? item.name ?? "BETHAG",
      name: item.name ?? item.title ?? "BETHAG",
      data: item,
    }));

    if (table === "condominiums") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        name: item.name,
        address: item.address,
        city: item.city,
        postal_code: item.cap,
        province: item.province,
        data: item,
      })));
    } else if (table === "documents") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: null,
        title: item.name,
        category: item.category,
        status: item.publication,
        data: item,
      })));
    } else if (table === "deadlines") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: undefined,
        title: item.title,
        due_date: item.dueDate || null,
        status: item.status,
        data: item,
      })));
    } else if (table === "assemblies") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: undefined,
        title: item.title,
        assembly_date: item.date ? new Date(item.date).toISOString() : null,
        status: item.status,
        data: item,
      })));
    } else if (table === "suppliers") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: undefined,
        name: item.name,
        category: item.service,
        status: undefined,
        data: item,
      })));
    } else if (table === "activities") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: undefined,
        title: item.title,
        activity_date: item.dueDate ? new Date(item.dueDate).toISOString() : null,
        status: item.status,
        data: item,
      })));
    } else if (table === "communications") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: undefined,
        title: item.title,
        body: item.body,
        published: item.publishedToPortal,
        email_status: item.emailStatus,
        email_prepared_at: item.emailPreparedAt || null,
        data: item,
      })));
    } else if (table === "condominium_requests") {
      await upsertRows(table, items.map((item: any) => ({
        workspace_id: workspaceId,
        legacy_id: item.id,
        condominium_id: undefined,
        title: item.category,
        description: item.description,
        status: item.status,
        data: item,
      })));
    }
  }
}

async function upsertRows(table: string, rows: any[]) {
  if (!supabase || !rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "workspace_id,legacy_id",
  });
  if (error) throw error;
}
