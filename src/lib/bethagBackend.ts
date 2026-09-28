import { supabase } from "./supabase";

export type BackendState = Record<string, any[]>;

export async function getActiveWorkspaceId(userId: string, preferredWorkspaceId?: string | null) {
  if (!supabase) return null;

  if (preferredWorkspaceId) {
    const { data: preferred, error: preferredError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("workspace_id", preferredWorkspaceId)
      .eq("active", true)
      .maybeSingle();

    if (preferredError) throw preferredError;
    if (preferred?.workspace_id) return preferred.workspace_id;
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("workspace_id")
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
    condominiumUnits,
    documents,
    deadlines,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumRequests,
    portalAccess,
    workspaceMembers,
  ] = await Promise.all([
    condominiumIds.length
      ? supabase.from("condominium_members").select("*").in("condominium_id", condominiumIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    condominiumIds.length
      ? supabase.from("condominium_units").select("*").in("condominium_id", condominiumIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    supabase.from("documents").select("*").eq("workspace_id", workspaceId),
    supabase.from("deadlines").select("*").eq("workspace_id", workspaceId),
    supabase.from("assemblies").select("*").eq("workspace_id", workspaceId),
    supabase.from("suppliers").select("*").eq("workspace_id", workspaceId),
    supabase.from("activities").select("*").eq("workspace_id", workspaceId),
    supabase.from("communications").select("*").eq("workspace_id", workspaceId),
    supabase.from("condominium_requests").select("*").eq("workspace_id", workspaceId),
    supabase.from("portal_access").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("workspace_members").select("*").eq("workspace_id", workspaceId).eq("role", "collaborator").order("created_at"),
  ]);

  const firstError = [
    condominiumMembers,
    condominiumUnits,
    documents,
    deadlines,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumRequests,
    portalAccess,
    workspaceMembers,
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
      unitId: row.unit_id ?? row.data?.unitId ?? "",
    })),
    documents: (documents.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    deadlines: (deadlines.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    assemblies: (assemblies.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    suppliers: (suppliers.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    activities: (activities.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    communications: (communications.data ?? []).map((row: any) => ({ ...row.data, id: row.legacy_id })),
    condominiumRequests: (condominiumRequests.data ?? []).map((row: any) => ({
      ...row.data,
      id: row.legacy_id,
      requesterUserId: row.requester_user_id ?? row.data?.requesterUserId ?? undefined,
      memberId: row.data?.memberId ?? null,
    })),
    collaborators: (workspaceMembers.data ?? []).map((row: any) => ({
      id: row.legacy_id,
      userId: row.user_id,
      name: row.data?.name ?? "",
      email: row.data?.email ?? "",
      workspaceId,
      status: row.active ? "Attivo" : "Disattivato",
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    })),
    portalMembers: (portalAccess.data ?? []).map((row: any) => ({
      ...row.data,
      id: row.legacy_id,
      name: row.name,
      email: row.email,
      condominiumId: condominiumLegacyByDbId.get(row.condominium_id) ?? row.data?.condominiumId ?? null,
      role: row.role === "council" ? "council" : "resident",
      apartment: row.apartment ?? "",
      permissions: row.permissions ?? [],
      active: row.active ?? true,
    })),
  };
}

let backendSyncQueue: Promise<void> = Promise.resolve();

function enqueueBackendSync<T>(task: () => Promise<T>): Promise<T> {
  const run = backendSyncQueue.then(task, task);
  backendSyncQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function syncBackendStateNow(workspaceId: string, state: BackendState) {
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

  // Le richieste dipendono dagli ID DB dei condòmini: vengono sincronizzate
  // dopo la persistenza dei membri, così la mappa degli ID DB è disponibile.
  const rowsByTable: Array<[string, any[]]> = [
    ["documents", (state.documents ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.name, category: item.category, status: item.publication, data: item,
    }))],
    ["deadlines", (state.deadlines ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, due_date: item.dueDate || null, status: item.status, data: item,
    }))],
    ["assemblies", (state.assemblies ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, assembly_date: item.date ? new Date(item.date).toISOString() : null, status: item.status, data: item,
    }))],
    ["suppliers", (state.suppliers ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      name: item.name, category: item.service, data: item,
    }))],
    ["activities", (state.activities ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, activity_date: item.dueDate ? new Date(item.dueDate).toISOString() : null, status: item.status, data: item,
    }))],
    ["communications", (state.communications ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, body: item.body, published: item.publishedToPortal, email_status: item.emailStatus, email_prepared_at: item.emailPreparedAt || null, data: item,
    }))],
  ];

  for (const [table, rows] of rowsByTable) {
    if (rows.length) await upsertRows(table, rows);
  }

  const collaboratorRows = (state.collaborators ?? []).map((item: any) => ({
    workspace_id: workspaceId,
    user_id: item.userId ?? null,
    role: "collaborator",
    active: item.status !== "Disattivato",
    permissions: item.permissions ?? [],
    legacy_id: item.id,
    data: { name: item.name ?? "", email: item.email ?? "", status: item.status ?? "Attivo" },
  })).filter((row: any) => row.user_id);

  if (collaboratorRows.length) await upsertRows("workspace_members", collaboratorRows, "workspace_id,user_id");

  const portalRows = (state.portalMembers ?? []).map((item: any) => ({
    workspace_id: workspaceId,
    legacy_id: item.id,
    condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
    name: item.name,
    email: item.email,
    role: item.role === "council" ? "council" : "resident",
    apartment: item.apartment ?? "",
    permissions: item.permissions ?? [],
    active: item.active ?? true,
    user_id: item.userId ?? null,
    data: item,
  })).filter((row: any) => row.condominium_id);

  if (portalRows.length) await upsertRows("portal_access", portalRows);
  await reconcileWorkspaceRows("portal_access", workspaceId, portalRows);

  const { data: existingCollaborators, error: collaboratorQueryError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "collaborator");
  if (collaboratorQueryError) throw collaboratorQueryError;
  const desiredCollaboratorIds = new Set(collaboratorRows.map((row: any) => row.user_id));
  for (const row of existingCollaborators ?? []) {
    if (!desiredCollaboratorIds.has(row.user_id)) {
      const { error: deleteError } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", row.user_id)
        .eq("role", "collaborator");
      if (deleteError) throw deleteError;
    }
  }

  const unitRowsByKey = new Map<string, any>();
  const desiredUnits = (state.condominiumMembers ?? [])
    .map((item: any) => ({
      condominiumId: condominiumDbIdByLegacyId.get(item.condominiumId),
      unitCode: String(item.apartment ?? "").trim(),
    }))
    .filter((unit: any) => unit.condominiumId && unit.unitCode)
    .map((unit: any) => ({
      workspace_id: workspaceId,
      condominium_id: unit.condominiumId,
      unit_code: unit.unitCode,
      data: { unitCode: unit.unitCode },
    }));
  if (desiredUnits.length) {
    await upsertRows("condominium_units", desiredUnits, "condominium_id,unit_code");
    const unitCondominiums = Array.from(new Set(desiredUnits.map((row: any) => row.condominium_id)));
    const { data: persistedUnits, error: unitsError } = await supabase
      .from("condominium_units")
      .select("id, condominium_id, unit_code")
      .in("condominium_id", unitCondominiums);
    if (unitsError) throw unitsError;
    (persistedUnits ?? []).forEach((unit: any) => {
      unitRowsByKey.set(`${unit.condominium_id}::${String(unit.unit_code).trim().toLowerCase()}`, unit);
    });
  }

  const memberRows = (state.condominiumMembers ?? []).map((item: any) => ({

    condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
    unit_id: (() => {
      const condominiumDbId = condominiumDbIdByLegacyId.get(item.condominiumId);
      const unit = condominiumDbId
        ? unitRowsByKey.get(`${condominiumDbId}::${String(item.apartment ?? "").trim().toLowerCase()}`)
        : null;
      return unit?.id ?? null;
    })(),
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

  const memberRowsByLegacyKey = new Map<string, any>();
  if (memberRows.length) {
    const memberCondominiumIds = Array.from(new Set(memberRows.map((row: any) => row.condominium_id)));
    const { data: persistedMembers, error: persistedMembersError } = await supabase
      .from("condominium_members")
      .select("id, condominium_id, legacy_id")
      .in("condominium_id", memberCondominiumIds);
    if (persistedMembersError) throw persistedMembersError;
    (persistedMembers ?? []).forEach((member: any) => {
      memberRowsByLegacyKey.set(`${member.condominium_id}::${member.legacy_id}`, member);
    });
  }

  const requestRows = (state.condominiumRequests ?? []).map((item: any) => {
    const condominiumDbId = condominiumDbIdByLegacyId.get(item.condominiumId) ?? null;
    const memberDb = condominiumDbId
      ? memberRowsByLegacyKey.get(String(condominiumDbId) + "::" + String(item.memberId ?? ""))
      : null;
    const requester = (state.condominiumMembers ?? []).find(
      (member: any) => member.id === item.memberId && member.condominiumId === item.condominiumId
    );
    return {
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbId,
      member_id: memberDb?.id ?? null, requester_user_id: item.requesterUserId ?? requester?.userId ?? null,
      title: item.category, description: item.description, status: item.status, data: item,
    };
  });

  if (requestRows.length) await upsertRows("condominium_requests", requestRows);

  // I condomini vengono creati/modificati tramite RPC dedicato. Non riconciliamo
  // qui le cancellazioni, perché una sincronizzazione già accodata con uno stato
  // precedente potrebbe eliminare subito un condominio appena salvato.
  for (const [table, rows] of rowsByTable) {
    await reconcileWorkspaceRows(table, workspaceId, rows);
  }

  const condominiumIds = Array.from(condominiumDbIdByLegacyId.values());
  for (const condominiumId of condominiumIds) {
    const membersForCondominium = memberRows.filter((row: any) => row.condominium_id === condominiumId);
    await reconcileCondominiumMembers(condominiumId, membersForCondominium);
  }
}

async function reconcileWorkspaceRows(table: string, workspaceId: string, desiredRows: any[]) {
  if (!supabase) return;
  const { data: existingRows, error } = await supabase
    .from(table)
    .select("id, legacy_id")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  const desiredIds = new Set(desiredRows.map((row: any) => row.legacy_id));
  const staleRows = (existingRows ?? []).filter((row: any) => !desiredIds.has(row.legacy_id));
  for (const row of staleRows) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", row.id)
      .eq("workspace_id", workspaceId);
    if (deleteError) throw deleteError;
  }
}

async function reconcileCondominiumMembers(condominiumId: string, desiredRows: any[]) {
  if (!supabase) return;
  const { data: existingRows, error } = await supabase
    .from("condominium_members")
    .select("id, legacy_id")
    .eq("condominium_id", condominiumId);
  if (error) throw error;

  const desiredIds = new Set(desiredRows.map((row: any) => row.legacy_id));
  const staleRows = (existingRows ?? []).filter((row: any) => !desiredIds.has(row.legacy_id));
  for (const row of staleRows) {
    const { error: deleteError } = await supabase
      .from("condominium_members")
      .delete()
      .eq("id", row.id)
      .eq("condominium_id", condominiumId);
    if (deleteError) throw deleteError;
  }
}

async function upsertRows(table: string, rows: any[], onConflict = "workspace_id,legacy_id") {
  if (!supabase || !rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
  });
  if (error) throw error;
}

export async function saveCondominium(
  workspaceId: string,
  item: any
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data, error } = await supabase.rpc("save_condominium", {
      p_workspace_id: workspaceId,
      p_legacy_id: item.id,
      p_name: item.name,
      p_address: item.address,
      p_city: item.city,
      p_postal_code: item.cap,
      p_province: item.province,
      p_data: item,
    });

    if (error) throw error;
    return data as string;
  });
}

export async function claimFirstWorkspaceAdmin(workspaceId?: string | null) {
  if (!supabase) throw new Error("Supabase non configurato.");

  const { data, error } = await supabase.rpc("claim_first_workspace_admin", {
    p_workspace_id: workspaceId ?? null,
  });

  if (error) throw error;
  return data as string;
}

export function syncBackendState(workspaceId: string, state: BackendState) {
  return enqueueBackendSync(() => syncBackendStateNow(workspaceId, state));
}

export async function deleteCondominium(workspaceId: string, legacyId: number) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { error } = await supabase.rpc("delete_condominium", {
      p_workspace_id: workspaceId,
      p_legacy_id: legacyId,
    });

    if (error) throw error;
  });
}


export async function updateCondominiumRequestStatus(
  workspaceId: string,
  request: any
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { error } = await supabase
      .from("condominium_requests")
      .update({
        title: request.category,
        description: request.description,
        status: request.status,
        data: request,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", request.id);

    if (error) throw error;
  });
}
