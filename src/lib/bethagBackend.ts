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

  const condominiumRows = state.condominiums ?? [];
  const { data: existingCondominiums, error: condominiumError } = await supabase
    .from("condominiums")
    .select("id, legacy_id")
    .eq("workspace_id", workspaceId);

  if (condominiumError) throw condominiumError;

  const condominiumDbIdByLegacyId = new Map(
    (existingCondominiums ?? []).map((row: any) => [row.legacy_id, row.id])
  );

  if (condominiumRows.length) {
    await upsertRows("condominiums", condominiumRows.map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      name: item.name,
      address: item.address,
      city: item.city,
      postal_code: item.cap,
      province: item.province,
      data: item,
    })));

    const { data: refreshedCondominiums, error } = await supabase
      .from("condominiums")
      .select("id, legacy_id")
      .eq("workspace_id", workspaceId);

    if (error) throw error;
    (refreshedCondominiums ?? []).forEach((row: any) => {
      condominiumDbIdByLegacyId.set(row.legacy_id, row.id);
    });
  }

  const rowsByTable: Array<[string, any[]]> = [
    ["documents", (state.documents ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.name,
      category: item.category,
      status: item.publication,
      data: item,
    }))],
    ["deadlines", (state.deadlines ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title,
      due_date: item.dueDate || null,
      status: item.status,
      data: item,
    }))],
    ["assemblies", (state.assemblies ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title,
      assembly_date: item.date ? new Date(item.date).toISOString() : null,
      status: item.status,
      data: item,
    }))],
    ["suppliers", (state.suppliers ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      name: item.name,
      category: item.service,
      data: item,
    }))],
    ["activities", (state.activities ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title,
      activity_date: item.dueDate ? new Date(item.dueDate).toISOString() : null,
      status: item.status,
      data: item,
    }))],
    ["communications", (state.communications ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title,
      body: item.body,
      published: item.publishedToPortal,
      email_status: item.emailStatus,
      email_prepared_at: item.emailPreparedAt || null,
      data: item,
    }))],
    ["condominium_requests", (state.condominiumRequests ?? []).map((item: any) => ({
      workspace_id: workspaceId,
      legacy_id: item.id,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.category,
      description: item.description,
      status: item.status,
      data: item,
    }))],
  ];

  for (const [table, rows] of rowsByTable) {
    if (rows.length) await upsertRows(table, rows);
  }

  const memberRows = (state.condominiumMembers ?? []).map((item: any) => ({
    condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
    legacy_id: item.id,
    user_id: item.userId ?? null,
    name: [item.firstName, item.lastName].filter(Boolean).join(" ") || item.name || "Condòmino",
    email: item.email ?? null,
    role: item.role === "Inquilino" ? "resident" : "resident",
    active: item.active ?? true,
    permissions: item.permissions ?? {},
    data: item,
  })).filter((row: any) => row.condominium_id);

  if (memberRows.length) await upsertRows("condominium_members", memberRows, "condominium_id,legacy_id");
}

async function upsertRows(table: string, rows: any[], onConflict = "workspace_id,legacy_id") {
  if (!supabase || !rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
  });
  if (error) throw error;
}
