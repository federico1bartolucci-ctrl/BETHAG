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
    condominiumWorks,
    fiscalYears,
    ledgerEntries,
    funds,
    expenseAllocations,
    taxObligations,
    legalCases,
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
    supabase.from("condominium_works").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("condominium_fiscal_years").select("*").eq("workspace_id", workspaceId).order("start_date"),
    supabase.from("condominium_ledger_entries").select("*").eq("workspace_id", workspaceId).order("entry_date"),
    supabase.from("condominium_funds").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("condominium_expense_allocations").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("condominium_tax_obligations").select("*").eq("workspace_id", workspaceId).order("due_date"),
    supabase.from("condominium_legal_cases").select("*").eq("workspace_id", workspaceId).order("created_at"),
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
    condominiumWorks,
    fiscalYears,
    ledgerEntries,
    funds,
    expenseAllocations,
    taxObligations,
    legalCases,
    portalAccess,
    workspaceMembers,
  ].find((result) => result.error)?.error;

  if (firstError) throw firstError;

  const condominiumLegacyByDbId = new Map(
    (condominiums.data ?? []).map((row: any) => [row.id, row.legacy_id])
  );

  const mappedCondominiumMembers = (condominiumMembers.data ?? []).map((row: any) => {
    // I millesimi appartengono esclusivamente all'unità immobiliare.
    // Eliminiamo anche eventuali valori legacy rimasti nel JSON del condòmino,
    // così un vecchio record non può farli riapparire nella scheda persona.
    const { millesimi: _legacyMillesimi, ...memberData } = row.data ?? {};
    return {
      ...memberData,
      // Manteniamo l'UUID DB oltre all'ID legacy usato dall'interfaccia.
      // Le RPC transazionali (es. subentro) richiedono l'UUID reale.
      databaseId: row.id,
      id: row.legacy_id,
      condominiumId:
        condominiumLegacyByDbId.get(row.condominium_id) ??
        row.data?.condominiumId ??
        null,
      unitId: row.unit_id ?? row.data?.unitId ?? "",
    };
  });

  const ownerIdsByUnit = new Map<string, number[]>();
  mappedCondominiumMembers.forEach((member: any) => {
    // La colonna tecnica role identifica il ruolo di accesso al portale
    // (es. resident), mentre la qualifica condominiale è conservata nel
    // JSON anagrafico. I proprietari devono quindi essere ricavati dalla
    // qualifica condominiale, altrimenti un refresh può perdere i proprietari
    // associati all'unità.
    const condominiumRole = String(member.data?.role ?? member.role ?? "").trim();
    if (condominiumRole !== "Proprietario" || !member.unitId) return;
    const current = ownerIdsByUnit.get(String(member.unitId)) ?? [];
    if (!current.includes(member.id)) current.push(member.id);
    ownerIdsByUnit.set(String(member.unitId), current);
  });

  const condominiumSupplierLegacyByDbId = new Map<string, number>();
  const { data: condominiumSuppliersForWorks, error: condominiumSuppliersForWorksError } = await supabase
    .from("condominium_suppliers")
    .select("id,condominium_id,business_name,data")
    .eq("workspace_id", workspaceId);
  if (condominiumSuppliersForWorksError) throw condominiumSuppliersForWorksError;

  (condominiumSuppliersForWorks ?? []).forEach((supplier: any) => {
    const storedLegacyId = Number(supplier.data?.legacySupplierId ?? supplier.data?.supplierId);
    if (Number.isFinite(storedLegacyId) && storedLegacyId > 0) {
      condominiumSupplierLegacyByDbId.set(String(supplier.id), storedLegacyId);
    }
  });

  const mappedCondominiumUnits = (condominiumUnits.data ?? []).map((row: any) => {
    const storedOwnerIds = Array.isArray(row.data?.ownerMemberIds) ? row.data.ownerMemberIds : [];
    const linkedOwnerIds = ownerIdsByUnit.get(String(row.id)) ?? [];
    return {
      ...row.data,
      id: row.id,
      condominiumId: condominiumLegacyByDbId.get(row.condominium_id) ?? row.data?.condominiumId ?? null,
      // Lo stato strutturato del ciclo di vita prevale sui campi legacy nel JSON.
      // Le unità storiche restano disponibili per la genealogia, ma non sono attive.
      lifecycleStatus: row.lifecycle_status ?? row.data?.lifecycleStatus ?? "Attiva",
      lifecycleEffectiveDate: row.lifecycle_effective_date ?? row.data?.lifecycleEffectiveDate ?? null,
      supersededAt: row.superseded_at ?? row.data?.supersededAt ?? null,
      unitCode: row.unit_code,
      buildingCode: row.building_code ?? row.data?.buildingCode ?? "",
      unitType: row.data?.unitType ?? "Abitazione",
      cadastralCategory: row.data?.cadastralCategory ?? "",
      cadastralAutonomous: row.data?.cadastralAutonomous ?? (row.data?.unitType !== "Abitazione"),
      millesimi: row.data?.millesimi ?? "",
      incorporatedInUnitId: row.data?.incorporatedInUnitId ?? null,
      relationshipToResidentialUnit: row.data?.relationshipToResidentialUnit ?? (row.data?.incorporatedInUnitId ? "Pertinenza" : "Nessuna"),
      ownerMode: row.data?.ownerMode ?? "condominium_member",
      ownerMemberIds: Array.from(new Set([...storedOwnerIds, ...linkedOwnerIds])),
      externalOwners: Array.isArray(row.data?.externalOwners) ? row.data.externalOwners : [],
      notes: row.data?.notes ?? "",
      active: (row.lifecycle_status ?? row.data?.lifecycleStatus ?? "Attiva") === "Attiva" && (row.data?.active ?? true),
    };
  });

  return {
    condominiums: (condominiums.data ?? []).map((row: any) => ({
      ...row.data,
      id: row.legacy_id,
      // Le colonne strutturate sono la fonte di verità per i dati essenziali
      // del condominio. Questo fallback è fondamentale quando il JSON data
      // di una vecchia riga è incompleto: il refresh non deve trasformare
      // dati già presenti nel database in valori null/vuoti.
      name: row.name ?? row.data?.name ?? "",
      address: row.address ?? row.data?.address ?? "",
      city: row.city ?? row.data?.city ?? "",
      cap: row.postal_code ?? row.data?.cap ?? "",
      province: row.province ?? row.data?.province ?? "",
    })),
    condominiumUnits: mappedCondominiumUnits,
    condominiumMembers: mappedCondominiumMembers,
    documents: (documents.data ?? []).map((row: any) => ({
      ...row.data,
      id: row.legacy_id,
      storagePath: row.file_path ?? row.data?.storagePath ?? undefined,
    })),
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
    condominiumWorks: (condominiumWorks.data ?? []).map((row: any) => ({
      ...(row.data && typeof row.data === "object" ? row.data : {}),
      id: row.id,
      condominiumId: condominiumLegacyByDbId.get(row.condominium_id) ?? row.data?.condominiumId ?? null,
      title: row.title ?? row.data?.title ?? "",
      category: row.category ?? row.data?.category ?? "Manutenzione",
      description: row.description ?? row.data?.description ?? "",
      status: row.status ?? row.data?.status ?? "Da programmare",
      priority: row.priority ?? row.data?.priority ?? "Media",
      supplierId: row.supplier_id ? (condominiumSupplierLegacyByDbId.get(String(row.supplier_id)) ?? row.data?.supplierId ?? null) : (row.data?.supplierId ?? null),
      startDate: row.start_date ?? row.data?.startDate ?? "",
      expectedEndDate: row.expected_end_date ?? row.data?.expectedEndDate ?? "",
      actualEndDate: row.actual_end_date ?? row.data?.actualEndDate ?? "",
      estimatedAmount: Number(row.estimated_amount ?? row.data?.estimatedAmount ?? 0),
      approvedAmount: Number(row.approved_amount ?? row.data?.approvedAmount ?? 0),
      actualAmount: Number(row.actual_amount ?? row.data?.actualAmount ?? 0),
      progressPercent: Number(row.progress_percent ?? row.data?.progressPercent ?? 0),
      activityId: row.data?.activityId ?? null,
      documentIds: Array.isArray(row.data?.documentIds) ? row.data.documentIds : [],
      notes: row.notes ?? row.data?.notes ?? "",
    })),
    fiscalYears: fiscalYears.data ?? [],
    ledgerEntries: ledgerEntries.data ?? [],
    funds: funds.data ?? [],
    expenseAllocations: expenseAllocations.data ?? [],
    taxObligations: taxObligations.data ?? [],
    legalCases: legalCases.data ?? [],
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

async function syncBackendStateNow(
  workspaceId: string,
  state: BackendState,
  allowedModules: string[] | null = null
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  const canSyncModule = (module: string) =>
    allowedModules === null || allowedModules.includes(module);

  const canSyncCondomini = canSyncModule("condomini");
  const canSyncPortal = canSyncModule("portale");

  const condominiumRows = canSyncCondomini ? (state.condominiums ?? []) : [];
  const { data: existingCondominiums, error: condominiumError } = await supabase
    .from("condominiums")
    .select("id, legacy_id, name, address, city, postal_code, province, data")
    .eq("workspace_id", workspaceId);

  if (condominiumError) throw condominiumError;

  const condominiumDbIdByLegacyId = new Map(
    (existingCondominiums ?? []).map((row: any) => [row.legacy_id, row.id])
  );

  if (condominiumRows.length) {
    const existingByLegacyId = new Map(
      (existingCondominiums ?? []).map((row: any) => [row.legacy_id, row])
    );

    const rowsToPersist = condominiumRows.map((item: any) => {
      const existing = existingByLegacyId.get(item.id);

      // La sincronizzazione automatica riceve anche stati locali parziali
      // (ad esempio durante hydration/refresh). Un valore assente o vuoto
      // nel payload di sincronizzazione non deve cancellare un dato già
      // persistito. Le modifiche intenzionali effettuate dal form passano
      // invece da save_condominium e continuano a poter impostare i campi.
      const hasText = (value: unknown) =>
        typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;

      const name = hasText(item.name) ? item.name : (existing?.name ?? existing?.data?.name ?? "");
      const address = hasText(item.address) ? item.address : (existing?.address ?? existing?.data?.address ?? "");
      const city = hasText(item.city) ? item.city : (existing?.city ?? existing?.data?.city ?? "");
      const postalCode = hasText(item.cap) ? item.cap : (existing?.postal_code ?? existing?.data?.cap ?? "");
      const province = hasText(item.province) ? item.province : (existing?.province ?? existing?.data?.province ?? "");
      const mergedData = {
        ...(existing?.data && typeof existing.data === "object" ? existing.data : {}),
        ...item,
        name,
        address,
        city,
        cap: postalCode,
        province,
      };

      return {
        workspace_id: workspaceId,
        legacy_id: item.id,
        name,
        address,
        city,
        postal_code: postalCode,
        province,
        data: mergedData,
      };
    });

    await upsertRows("condominiums", rowsToPersist);

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
  let condominiumSupplierIdByLegacySupplierKey = new Map<string, string>();
  if (canSyncModule("attivita")) {
    const selectedSupplierIds = Array.from(new Set(
      (state.condominiumWorks ?? [])
        .map((item: any) => Number(item.supplierId))
        .filter((id: number) => Number.isFinite(id) && id > 0)
    ));
    if (selectedSupplierIds.length) {
      const { data: condominiumSuppliers, error: condominiumSuppliersError } = await supabase
        .from("condominium_suppliers")
        .select("id,condominium_id,business_name,data")
        .eq("workspace_id", workspaceId);
      if (condominiumSuppliersError) throw condominiumSuppliersError;

      const normalizeSupplierName = (value: unknown) =>
        String(value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
      const genericSuppliersByLegacyId = new Map(
        (state.suppliers ?? []).map((supplier: any) => [Number(supplier.id), supplier])
      );

      for (const legacySupplierId of selectedSupplierIds) {
        const supplier = genericSuppliersByLegacyId.get(legacySupplierId);
        if (!supplier) continue;
        const workCondominiumIds = Array.from(new Set(
          (state.condominiumWorks ?? [])
            .filter((work: any) => Number(work.supplierId) === legacySupplierId)
            .map((work: any) => condominiumDbIdByLegacyId.get(work.condominiumId))
            .filter(Boolean)
        ));
        const condominiumDbId = condominiumDbIdByLegacyId.get(Number(supplier.condominiumId));
        const candidateCondominiumIds = workCondominiumIds.length
          ? workCondominiumIds
          : (condominiumDbId ? [condominiumDbId] : Array.from(condominiumDbIdByLegacyId.values()));
        const name = normalizeSupplierName(supplier.name);
        for (const workCondominiumId of candidateCondominiumIds) {
          const existing = (condominiumSuppliers ?? []).find((row: any) =>
            String(row.condominium_id) === String(workCondominiumId) &&
            normalizeSupplierName(row.business_name) === name
          );

          if (existing) {
            condominiumSupplierIdByLegacySupplierKey.set(legacySupplierId + "::" + String(workCondominiumId), existing.id);
            continue;
          }

          if (!workCondominiumIds.includes(workCondominiumId)) continue;

          const { data: created, error: createError } = await supabase
            .from("condominium_suppliers")
            .insert({
              workspace_id: workspaceId,
              condominium_id: workCondominiumId,
              business_name: supplier.name,
              email: supplier.email || null,
              phone: supplier.phone || null,
              category: supplier.service || null,
              data: { source: "supplier_legacy", legacySupplierId, supplierId: legacySupplierId }
            })
            .select("id")
            .single();
          if (createError) throw createError;
          condominiumSupplierIdByLegacySupplierKey.set(legacySupplierId + "::" + String(workCondominiumId), created.id);
        }
      }
    }
  }

  let cumulativeWorkActualAmountById = new Map<string, number>();
  if (canSyncModule("attivita")) {
    const workIds = (state.condominiumWorks ?? []).map((item: any) => String(item.id)).filter(Boolean);
    if (workIds.length) {
      const { data: progressRows, error: progressRowsError } = await supabase
        .from("condominium_work_progress").select("work_id,amount").eq("workspace_id", workspaceId).in("work_id", workIds);
      if (progressRowsError) throw progressRowsError;
      for (const row of progressRows ?? []) {
        const key = String(row.work_id);
        cumulativeWorkActualAmountById.set(key, (cumulativeWorkActualAmountById.get(key) ?? 0) + Math.max(0, Number(row.amount) || 0));
      }
    }
  }

  const rowsByTable: Array<[string, any[]]> = [
    canSyncModule("documenti") ? ["documents", (state.documents ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.name, category: item.category, status: item.publication,
      file_path: item.storagePath ?? null,
      data: item,
    }))] : null,
    canSyncModule("scadenze") ? ["deadlines", (state.deadlines ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, due_date: item.dueDate || null, status: item.status, data: item,
    }))] : null,
    canSyncModule("assemblee") ? ["assemblies", (state.assemblies ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, assembly_date: item.date ? new Date(item.date).toISOString() : null, status: item.status, data: item,
    }))] : null,
    canSyncModule("fornitori") ? ["suppliers", (state.suppliers ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      name: item.name, category: item.service, data: item,
    }))] : null,
    canSyncModule("attivita") ? ["activities", (state.activities ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, activity_date: item.dueDate ? new Date(item.dueDate).toISOString() : null, status: item.status, data: item,
    }))] : null,
    canSyncModule("comunicazioni") ? ["communications", (state.communications ?? []).map((item: any) => ({
      workspace_id: workspaceId, legacy_id: item.id, condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title, body: item.body, published: item.publishedToPortal, email_status: item.emailStatus, email_prepared_at: item.emailPreparedAt || null, data: item,
    }))] : null,
    canSyncModule("attivita") ? ["condominium_works", (state.condominiumWorks ?? []).map((item: any) => ({
      id: item.id,
      workspace_id: workspaceId,
      condominium_id: condominiumDbIdByLegacyId.get(item.condominiumId) ?? null,
      title: item.title,
      category: item.category ?? "Manutenzione",
      description: item.description ?? "",
      status: item.status ?? "Da programmare",
      priority: item.priority ?? "Media",
      start_date: item.startDate || null,
      expected_end_date: item.expectedEndDate || null,
      actual_end_date: item.actualEndDate || null,
      estimated_amount: Number(item.estimatedAmount || 0),
      approved_amount: Number(item.approvedAmount || 0),
      actual_amount: cumulativeWorkActualAmountById.has(String(item.id))
        ? cumulativeWorkActualAmountById.get(String(item.id))
        : Number(item.actualAmount || 0),
      progress_percent: Math.max(0, Math.min(100, Number(item.progressPercent || 0))),
      supplier_id: item.supplierId ? (condominiumSupplierIdByLegacySupplierKey.get(`${Number(item.supplierId)}::${String(condominiumDbIdByLegacyId.get(item.condominiumId) ?? "")}`) ?? null) : null,
      notes: item.notes ?? "",
      data: item,
    })).filter((row: any) => row.condominium_id && row.title)] : null,
  ].filter((entry): entry is [string, any[]] => Boolean(entry));

  for (const [table, rows] of rowsByTable) {
    if (!rows.length) continue;
    await upsertRows(table, rows, table === "condominium_works" ? "id" : undefined);
  }

  const collaboratorRows =
    allowedModules === null
      ? (state.collaborators ?? []).map((item: any) => ({
          workspace_id: workspaceId,
          user_id: item.userId ?? null,
          role: "collaborator",
          active: item.status !== "Disattivato",
          permissions: item.permissions ?? [],
          legacy_id: item.id,
          data: { name: item.name ?? "", email: item.email ?? "", status: item.status ?? "Attivo" },
        })).filter((row: any) => row.user_id)
      : [];

  if (allowedModules === null && collaboratorRows.length) await upsertRows("workspace_members", collaboratorRows, "workspace_id,user_id");

  const portalRows = canSyncPortal
    ? (state.portalMembers ?? []).map((item: any) => ({
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
      })).filter((row: any) => row.condominium_id)
    : [];

  if (portalRows.length) await upsertRows("portal_access", portalRows);
  // L'accesso al Portale è persistente: uno stato locale parziale durante
  // hydration/refresh non deve mai cancellare autorizzazioni server.
  // La rimozione passa esclusivamente dalle azioni esplicite dell'interfaccia.

  // Anche i collaboratori sono persistenti: la sincronizzazione automatica
  // può creare/aggiornare record ma non eliminarli in base a uno stato locale
  // potenzialmente incompleto. La cancellazione resta un'azione esplicita.

  if (!canSyncCondomini) return;

  const unitRowsByKey = new Map<string, any>();

  // Più condòmini possono appartenere alla stessa unità abitativa.
  // Prima della sincronizzazione dobbiamo quindi eliminare i duplicati
  // della coppia (condominio, codice unità). Senza questa deduplicazione
  // PostgreSQL può rifiutare un singolo upsert che contiene due volte
  // la stessa chiave di conflitto; in quel caso il secondo condòmino
  // rimaneva solo nello stato locale e spariva al successivo refresh.
  const desiredUnitMap = new Map<string, any>();
  for (const item of state.condominiumMembers ?? []) {
    const condominiumId = condominiumDbIdByLegacyId.get(item.condominiumId);
    const unitCode = String(item.apartment ?? "").trim();
    if (!condominiumId || !unitCode) continue;

    const key = String(condominiumId) + "::" + unitCode.toLowerCase();
    if (!desiredUnitMap.has(key)) {
      desiredUnitMap.set(key, {
        workspace_id: workspaceId,
        condominium_id: condominiumId,
        unit_code: unitCode,
        data: { unitCode },
      });
    }
  }

  const desiredUnits = Array.from(desiredUnitMap.values());
  if (desiredUnits.length) {
    const unitCondominiums = Array.from(new Set(desiredUnits.map((row: any) => row.condominium_id)));

    const existingResult = await supabase
      .from("condominium_units")
      .select("id, condominium_id, unit_code")
      .in("condominium_id", unitCondominiums);
    if (existingResult.error) throw existingResult.error;

    const existingKeys = new Set(
      (existingResult.data ?? []).map((unit: any) =>
        String(unit.condominium_id) + "::" + String(unit.unit_code).trim().toLowerCase()
      )
    );

    // Creiamo solo le unità mancanti. Non sovrascriviamo mai un'unità già
    // presente: potrebbe contenere dati catastali, proprietari esterni,
    // pertinenze e altri dati inseriti dall'amministratore.
    const missingUnits = desiredUnits.filter((row: any) =>
      !existingKeys.has(
        String(row.condominium_id) + "::" + String(row.unit_code).trim().toLowerCase()
      )
    );
    if (missingUnits.length) {
      await upsertRows("condominium_units", missingUnits, "condominium_id,unit_code");
    }

    const persistedResult = await supabase
      .from("condominium_units")
      .select("id, condominium_id, unit_code")
      .in("condominium_id", unitCondominiums);
    if (persistedResult.error) throw persistedResult.error;

    (persistedResult.data ?? []).forEach((unit: any) => {
      unitRowsByKey.set(
        String(unit.condominium_id) + "::" + String(unit.unit_code).trim().toLowerCase(),
        unit
      );
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
  // Le richieste/segnalazioni sono persistenti: un refresh o uno stato locale
  // incompleto non può cancellarle. La rimozione passa dall'azione esplicita.

  // I condomini vengono creati/modificati tramite RPC dedicato. Non riconciliamo
  // qui le cancellazioni, perché una sincronizzazione già accodata con uno stato
  // precedente potrebbe eliminare subito un condominio appena salvato.
  // Questi moduli sono persistenti: uno stato locale parziale non deve mai
  // trasformarsi in una cancellazione server al refresh. La cancellazione
  // passa esclusivamente dalle azioni esplicite dell'interfaccia.
  // Le riconciliazioni automatiche restano quindi disabilitate per:
  // documenti, scadenze, assemblee, fornitori, attività e comunicazioni.

  const condominiumIds = Array.from(condominiumDbIdByLegacyId.values());
  for (const condominiumId of condominiumIds) {
    const membersForCondominium = memberRows.filter((row: any) => row.condominium_id === condominiumId);
    await reconcileCondominiumMembers(condominiumId, membersForCondominium);
  }

  // Riconciliazione delle unità dopo quella dei condòmini: in questo modo
  // un'unità rimasta senza condòmini può essere eliminata senza violare
  // la foreign key condominium_members.unit_id.
  const desiredUnitKeys = new Set(
    desiredUnits.map((row: any) =>
      String(row.condominium_id) + "::" + String(row.unit_code).trim().toLowerCase()
    )
  );
  const { data: existingUnitsWorkspace, error: existingUnitsError } = await supabase
    .from("condominium_units")
    .select("id, condominium_id, unit_code")
    .eq("workspace_id", workspaceId);
  if (existingUnitsError) throw existingUnitsError;

  // Le unità sono dati persistenti e non vengono mai cancellate dalla
  // sincronizzazione dello stato locale. La loro eliminazione deve essere
  // effettuata da un'azione esplicita dell'interfaccia, mai da un refresh,
  // login o stato locale temporaneamente incompleto.
  void desiredUnitKeys;
  void existingUnitsWorkspace;
}

async function reconcileCondominiumMembers(condominiumId: string, desiredRows: any[]) {
  if (!supabase) return;
  const { data: existingRows, error } = await supabase
    .from("condominium_members")
    .select("id, legacy_id")
    .eq("condominium_id", condominiumId);
  if (error) throw error;

  // I condòmini sono dati anagrafici persistenti: la sincronizzazione
  // dello stato locale può aggiungere o modificare record, ma non può
  // cancellarli. L'eliminazione passa esclusivamente dall'azione esplicita
  // deleteCondominiumMember(), così un refresh o uno stato locale incompleto
  // non può mai svuotare l'anagrafica.
  void desiredRows;
  void existingRows;
}

async function upsertRows(table: string, rows: any[], onConflict = "workspace_id,legacy_id") {
  if (!supabase || !rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
  });
  if (error) throw error;
}

export async function saveCondominiumUnit(workspaceId: string, item: any) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", item.condominiumId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium?.id) throw new Error("Condominio non trovato sul server.");

    const unitCode = String(item.unitCode ?? "").trim();
    if (!unitCode) throw new Error("Il codice dell'unità è obbligatorio.");

    // Il vincolo di unicità dell'unità è normalizzato su lower(trim(unit_code)).
    // Non usiamo quindi un upsert con conflict target testuale: Postgres non
    // può inferire un indice espresso da (condominium_id, unit_code).
    const { data: existingUnits, error: existingUnitError } = await supabase
      .from("condominium_units")
      .select("id, unit_code, building_code, lifecycle_status")
      .eq("condominium_id", condominium.id);

    if (existingUnitError) throw existingUnitError;

    const normalizedUnitCode = unitCode.toLowerCase();
    // In modifica l'ID DB dell'unità è la fonte di verità: il codice può
    // essere cambiato senza trasformare la modifica in una nuova unità.
    const existingUnitById = item.id
      ? (existingUnits ?? []).find((unit: any) => String(unit.id) === String(item.id))
      : null;
    if (existingUnitById && (existingUnitById.lifecycle_status ?? "Attiva") !== "Attiva") {
      throw new Error("Le unità storiche o soppresse sono consultabili ma non modificabili come unità attive.");
    }
    const existingUnitByCode = (existingUnits ?? []).find(
      (unit: any) =>
        (unit.lifecycle_status ?? "Attiva") === "Attiva" &&
        String(unit.unit_code ?? "").trim().toLowerCase() === normalizedUnitCode
    );
    const existingUnit = existingUnitById ?? existingUnitByCode;

    const unitData = {
      ...item,
      unitCode,
      unitType: item.unitType ?? "Abitazione",
      cadastralCategory: item.cadastralCategory ?? "",
      cadastralAutonomous: item.cadastralAutonomous ?? true,
      millesimi: item.millesimi ?? "",
      incorporatedInUnitId: item.incorporatedInUnitId ?? null,
      relationshipToResidentialUnit:
        item.relationshipToResidentialUnit ??
        (item.incorporatedInUnitId ? "Pertinenza" : "Nessuna"),
      ownerMode: item.ownerMode ?? "condominium_member",
      ownerMemberIds: Array.isArray(item.ownerMemberIds) ? item.ownerMemberIds : [],
      externalOwners: Array.isArray(item.externalOwners) ? item.externalOwners : [],
      notes: item.notes ?? "",
      active: item.active ?? true,
      building_code: String(item.buildingCode ?? "").trim(),
    };

    if (existingUnit?.id) {
      const previousUnitCode = String(existingUnit.unit_code ?? "").trim();
      const { data, error } = await supabase
        .from("condominium_units")
        .update({
          workspace_id: workspaceId,
          condominium_id: condominium.id,
          unit_code: unitCode,
          building_code: String(item.buildingCode ?? "").trim(),
          data: unitData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUnit.id)
        .eq("condominium_id", condominium.id)
        .select("id, unit_code, data")
        .single();

      if (error) throw error;

      // Il riferimento strutturato unit_id resta invariato. Aggiorniamo solo
      // il vecchio campo testuale apartment dei condòmini collegati, così le
      // schermate legacy restano coerenti anche dopo la rinumerazione.
      if (previousUnitCode !== unitCode) {
        const { data: linkedMembers, error: linkedMembersError } = await supabase
          .from("condominium_members")
          .select("id, data")
          .eq("condominium_id", condominium.id)
          .eq("unit_id", existingUnit.id);
        if (linkedMembersError) throw linkedMembersError;

        for (const member of linkedMembers ?? []) {
          const nextMemberData = {
            ...(member.data ?? {}),
            apartment: unitCode,
          };
          const { error: memberUpdateError } = await supabase
            .from("condominium_members")
            .update({
              data: nextMemberData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", member.id)
            .eq("condominium_id", condominium.id)
            .eq("unit_id", existingUnit.id);
          if (memberUpdateError) throw memberUpdateError;
        }
      }

      return data;
    }

    const { data, error } = await supabase
      .from("condominium_units")
      .insert({
        workspace_id: workspaceId,
        condominium_id: condominium.id,
        unit_code: unitCode,
        building_code: String(item.buildingCode ?? "").trim(),
        data: unitData,
      })
      .select("id, unit_code, data")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function saveCondominiumMember(
  workspaceId: string,
  item: any
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", item.condominiumId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium?.id) throw new Error("Condominio non trovato sul server.");

    const apartment = String(item.apartment ?? "").trim();
    let unitId: string | null = null;

    if (apartment) {
      // L'unità è il contenitore dei millesimi e degli altri dati patrimoniali.
      // Quando associamo una persona non dobbiamo mai sovrascrivere il JSON
      // dell'unità con il solo unitCode: altrimenti un semplice salvataggio
      // anagrafico potrebbe cancellare millesimi, proprietari e pertinenze.
      const { data: existingUnits, error: existingUnitError } = await supabase
        .from("condominium_units")
        .select("id, unit_code, data")
        .eq("condominium_id", condominium.id);

      if (existingUnitError) throw existingUnitError;

      const normalizedApartment = apartment.toLowerCase();
      const existingUnit = (existingUnits ?? []).find(
        (unit: any) =>
          String(unit.unit_code ?? "").trim().toLowerCase() === normalizedApartment
      );

      if (existingUnit?.id) {
        unitId = existingUnit.id;
      } else {
        throw new Error(
          "L'unità indicata non esiste nel condominio. Crea prima l'unità nella gestione delle unità immobiliari."
        );
      }
    }

    const { data: previousMemberRow, error: previousMemberError } = await supabase
      .from("condominium_members")
      .select("id, email, user_id, name, data, unit_id")
      .eq("condominium_id", condominium.id)
      .eq("legacy_id", item.id)
      .maybeSingle();

    if (previousMemberError) throw previousMemberError;

    const { millesimi: _legacyMillesimi, ...memberData } = item ?? {};
    const row = {
      condominium_id: condominium.id,
      unit_id: unitId,
      legacy_id: item.id,
      user_id: item.userId ?? null,
      name: [item.firstName, item.lastName].filter(Boolean).join(" ") || item.name || "Condòmino",
      email: item.email ?? null,
      role: item.role === "Inquilino" ? "resident" : "resident",
      active: item.active ?? true,
      permissions: item.permissions ?? {},
      data: memberData,
    };

    const { data, error } = await supabase
      .from("condominium_members")
      .upsert(row, { onConflict: "condominium_id,legacy_id" })
      .select("id, legacy_id, unit_id")
      .single();

    if (error) throw error;

    // L'elenco proprietari appartiene alle unità e non alle persone.
    // Quando un condòmino viene trasferito, oppure cambia qualifica,
    // riallineiamo ownerMemberIds sulle unità coinvolte senza mai riscrivere
    // i millesimi: questi ultimi restano esclusivamente nei dati dell'unità.
    const previousUnitId = previousMemberRow?.unit_id ?? null;
    const affectedUnitIds = Array.from(
      new Set([previousUnitId, unitId].filter(Boolean).map(String))
    );

    if (affectedUnitIds.length) {
      const { data: affectedUnits, error: affectedUnitsError } = await supabase
        .from("condominium_units")
        .select("id, data")
        .eq("condominium_id", condominium.id)
        .in("id", affectedUnitIds);

      if (affectedUnitsError) throw affectedUnitsError;

      for (const unit of affectedUnits ?? []) {
        const currentOwners = Array.isArray(unit.data?.ownerMemberIds)
          ? unit.data.ownerMemberIds.map((id: any) => Number(id)).filter(Number.isFinite)
          : [];
        const withoutMember = currentOwners.filter((id: number) => id !== Number(item.id));
        const shouldOwnThisUnit = String(unit.id) === String(unitId) && item.role === "Proprietario";
        const nextOwners = shouldOwnThisUnit
          ? Array.from(new Set([...withoutMember, Number(item.id)]))
          : withoutMember;

        if (JSON.stringify(currentOwners) !== JSON.stringify(nextOwners)) {
          const { error: ownerSyncError } = await supabase
            .from("condominium_units")
            .update({
              data: {
                ...(unit.data ?? {}),
                ownerMemberIds: nextOwners,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", unit.id)
            .eq("condominium_id", condominium.id);

          if (ownerSyncError) throw ownerSyncError;
        }
      }
    }

    // Manteniamo allineato l'accesso al Portale quando l'anagrafica viene
    // modificata. L'aggiornamento usa l'e-mail precedente e, quando presente,
    // anche user_id come chiavi di collegamento. Non crea mai nuovi accessi:
    // l'accesso viene creato esclusivamente dal flusso di invito/registrazione.
    const previousEmail = String(previousMemberRow?.email ?? "").trim().toLowerCase();
    const nextEmail = String(item.email ?? "").trim();

    if (previousMemberRow?.id) {
      let portalQuery = supabase
        .from("portal_access")
        .update({
          name: row.name,
          email: nextEmail || null,
          apartment: apartment,
          condominium_id: condominium.id,
          active: item.active ?? true,
          user_id: item.userId ?? previousMemberRow.user_id ?? null,
        })
        .eq("workspace_id", workspaceId)
        .eq("condominium_id", condominium.id);

      // Per individuare un accesso già esistente usiamo sempre l'identificativo
      // precedente: se user_id cambia, l'UPDATE deve comunque raggiungere la
      // vecchia riga e poi sostituirlo con il nuovo valore.
      const previousUserId = previousMemberRow.user_id ?? null;
      const effectiveUserId = previousUserId;
      if (effectiveUserId) {
        portalQuery = portalQuery.eq("user_id", effectiveUserId);
      } else if (previousEmail) {
        // L'e-mail può essere condivisa da più persone della stessa unità:
        // non è quindi un identificatore sufficiente per l'accesso Portale.
        portalQuery = portalQuery
          .ilike("email", previousEmail)
          .eq("name", previousMemberRow.name ?? row.name)
          .eq("apartment", String(previousMemberRow.data?.apartment ?? apartment));
      } else {
        portalQuery = null as any;
      }

      if (portalQuery) {
        const { error: portalSyncError } = await portalQuery;
        if (portalSyncError) throw portalSyncError;
      }
    }

    return data;
  });
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

    const condominiumDbId = data as string;
    const requestedUnits = Math.max(0, Number(item.units) || 0);

    if (requestedUnits > 0 && !item.structure?.configured) {
      const { data: existingUnits, error: existingUnitsError } = await supabase
        .from("condominium_units")
        .select("id, unit_code, data")
        .eq("condominium_id", condominiumDbId);

      if (existingUnitsError) throw existingUnitsError;

      // Le unità residenziali iniziali hanno come codice l'interno numerico
      // (1, 2, 3, ...). Non usiamo più "Interno 1", perché il codice deve
      // coincidere con quello utilizzato dall'anagrafica dei condòmini.
      for (let index = 0; index < requestedUnits; index += 1) {
        const code = String(index + 1);
        const legacyCode = `Interno ${index + 1}`;
        const exact = (existingUnits ?? []).find(
          (unit: any) => String(unit.unit_code).trim().toLowerCase() === code.toLowerCase()
        );
        const legacy = (existingUnits ?? []).find(
          (unit: any) => String(unit.unit_code).trim().toLowerCase() === legacyCode.toLowerCase()
        );

        if (exact) continue;

        if (legacy) {
          const { error: renameError } = await supabase
            .from("condominium_units")
            .update({
              unit_code: code,
              data: {
                ...(legacy.data ?? {}),
                unitCode: code,
              },
            })
            .eq("id", legacy.id)
            .eq("condominium_id", condominiumDbId);

          if (renameError) throw renameError;
          continue;
        }

        const { error: insertError } = await supabase
          .from("condominium_units")
          .insert({
            workspace_id: workspaceId,
            condominium_id: condominiumDbId,
            unit_code: code,
            data: {
              unitCode: code,
              unitType: "Abitazione",
              cadastralCategory: "",
              cadastralAutonomous: true,
              millesimi: "",
              incorporatedInUnitId: null,
              notes: "",
              active: true,
            },
          });

        if (insertError) throw insertError;
      }
    }

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

export function syncBackendState(
  workspaceId: string,
  state: BackendState,
  allowedModules: string[] | null = null
) {
  return enqueueBackendSync(() =>
    syncBackendStateNow(workspaceId, state, allowedModules)
  );
}

function parseBethagAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9,.-]/g, "");
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if ((cleaned.match(/\./g) ?? []).length > 1) {
    normalized = cleaned.replace(/\./g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBethagDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date().toISOString().slice(0, 10);
  const match = raw.match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    return `${match[3]}-${month}-${day}`;
  }
  const iso = raw.match(/^(\\d{4}-\\d{2}-\\d{2})/);
  return iso ? iso[1] : new Date(raw).toISOString().slice(0, 10);
}

function extractBethagDocumentData(data: unknown): Record<string, any> {
  const root = data && typeof data === "object" ? data as Record<string, any> : {};
  const nested = typeof root.extractedData === "string"
    ? (() => { try { return JSON.parse(root.extractedData); } catch { return {}; } })()
    : (root.extractedData && typeof root.extractedData === "object" ? root.extractedData : {});
  return { ...root, ...nested };
}

export async function reconcileCondominiumWork(workspaceId: string, workId: string) {
  if (!supabase) throw new Error("Supabase non configurato.");
  return enqueueBackendSync(async () => {
    const { data: work, error: workError } = await supabase.from("condominium_works").select("id,title,condominium_id,estimated_amount,approved_amount,actual_amount").eq("workspace_id", workspaceId).eq("id", workId).maybeSingle();
    if (workError) throw workError;
    if (!work) throw new Error("Lavoro non trovato.");
    const { data: links, error: linksError } = await supabase.from("condominium_work_documents").select("document_id,title").eq("workspace_id", workspaceId).eq("work_id", workId);
    if (linksError) throw linksError;
    const documentLegacyIds = (links ?? []).map((x: any) => Number(x.document_id)).filter((id: number) => Number.isFinite(id));
    const { data: docs, error: docsError } = documentLegacyIds.length ? await supabase.from("documents").select("id,legacy_id,title,category,data").eq("workspace_id", workspaceId).in("legacy_id", documentLegacyIds) : { data: [], error: null } as any;
    if (docsError) throw docsError;
    const invoices = (docs ?? []).map((doc: any) => {
      const d = extractBethagDocumentData(doc.data);
      const amount = parseBethagAmount(d.invoiceAmount ?? d.amount ?? d.totalAmount ?? d.importo ?? d.importoTotale ?? d.expenseAmount);
      const type = String(doc.category ?? "").toLowerCase() + " " + String(d.documentType ?? d.aiDocumentType ?? "").toLowerCase();
      const confirmed = String(d.invoiceConfirmation?.status ?? "").toLowerCase() === "confermato";
      const isInvoice = type.includes("fattur") || confirmed;
      return isInvoice ? { id: doc.id, legacyId: doc.legacy_id, title: doc.title, amount } : null;
    }).filter(Boolean);
    const { data: progress, error: progressError } = await supabase.from("condominium_work_progress").select("progress_no,title,amount,paid_amount,ledger_entry_id").eq("workspace_id", workspaceId).eq("work_id", workId).order("progress_no");
    if (progressError) throw progressError;
    const { data: ledger, error: ledgerError } = await supabase.from("condominium_ledger_entries").select("id,amount,payment_status,description,data,document_id").eq("workspace_id", workspaceId).eq("condominium_id", work.condominium_id).eq("direction", "Uscita");
    if (ledgerError) throw ledgerError;
    const invoiceDocumentIds = new Set((docs ?? []).filter((doc: any) => (invoices as any[]).some((invoice: any) => invoice.id === doc.id)).map((doc: any) => doc.id));
    const invoiceLedger = (ledger ?? []).filter((entry: any) => entry.document_id && invoiceDocumentIds.has(entry.document_id));
    const salLedger = (ledger ?? []).filter((entry: any) =>
      (progress ?? []).some((p: any) => p.ledger_entry_id === entry.id) ||
      (entry.data?.source === "condominium_work_progress" && entry.data?.workId === workId)
    );
    const linkedLedger = [...invoiceLedger, ...salLedger.filter((entry: any) => !invoiceLedger.some((invoiceEntry: any) => invoiceEntry.id === entry.id))];
    const invoiceAmount = (invoices as any[]).reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const salAmount = (progress ?? []).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    const invoiceAccountingAmount = invoiceLedger.reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    const salAccountingAmount = salLedger.reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
    const accountingAmount = invoiceAccountingAmount || salAccountingAmount;
    const approvedAmount = Number(work.approved_amount || 0);
    const expectedAmount = approvedAmount || Number(work.estimated_amount || 0);
    return {
      workId, title: work.title, invoiceCount: (invoices as any[]).length, invoiceAmount, salAmount,
      accountingAmount, invoiceAccountingAmount, salAccountingAmount, approvedAmount,
      estimatedAmount: Number(work.estimated_amount || 0), expectedAmount,
      residualToInvoices: invoiceAmount - salAmount,
      residualToAccounting: invoiceAmount - (invoiceAccountingAmount || salAccountingAmount),
      residualToExpected: expectedAmount - invoiceAmount,
      documents: invoices, progress: progress ?? [], ledger: linkedLedger
    };
  });
}

export async function syncCondominiumWorkDocuments(workspaceId: string, workId: string, condominiumId: string, legacyDocumentIds: number[]) {
  if (!supabase) throw new Error("Supabase non configurato.");
  return enqueueBackendSync(async () => {
    const requestedDocumentIds = Array.from(new Set((legacyDocumentIds ?? []).map(Number).filter((id) => Number.isFinite(id))));
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("id,legacy_id,title,data,category")
      .eq("workspace_id", workspaceId)
      .in("legacy_id", requestedDocumentIds.length ? requestedDocumentIds : [-1]);
    if (docsError) throw docsError;

    const { data: existingLinks, error: existingLinksError } = await supabase
      .from("condominium_work_documents")
      .select("document_id")
      .eq("workspace_id", workspaceId)
      .eq("work_id", workId);
    if (existingLinksError) throw existingLinksError;

    const existingLegacyIds = (existingLinks ?? []).map((row: any) => Number(row.document_id)).filter((id) => Number.isFinite(id));
    let existingDocs: any[] = [];
    if (existingLegacyIds.length) {
      const { data: existingDocsRows, error: existingDocsError } = await supabase
        .from("documents")
        .select("id,legacy_id,title,data,category")
        .eq("workspace_id", workspaceId)
        .in("legacy_id", existingLegacyIds);
      if (existingDocsError) throw existingDocsError;
      existingDocs = existingDocsRows ?? [];
    }
    const requestedSet = new Set(requestedDocumentIds);
    const protectedDocuments = existingLegacyIds.filter((legacyId) => {
      const doc = existingDocs.find((item: any) => Number(item.legacy_id) === legacyId);
      const data = doc?.data && typeof doc.data === "object" ? doc.data : {};
      const confirmed = String(data.invoiceConfirmation?.status ?? "").toLowerCase() === "confermato";
      const isInvoice = String(doc?.category ?? "").toLowerCase().includes("fattur") || confirmed;
      return isInvoice;
    });
    const removedProtected = protectedDocuments.filter((legacyId) => !requestedSet.has(legacyId));
    if (removedProtected.length) {
      throw new Error("Il lavoro contiene una fattura già confermata e contabilizzata: il collegamento non può essere rimosso con un semplice salvataggio del lavoro. Gestisci prima la fattura e la relativa scrittura contabile.");
    }

    const missingRequested = requestedDocumentIds.filter((legacyId) => !(docs ?? []).some((doc: any) => Number(doc.legacy_id) === legacyId));
    if (missingRequested.length) {
      throw new Error("Uno o più documenti selezionati per il lavoro non sono più disponibili nel workspace. Il salvataggio è stato annullato per evitare di perdere collegamenti esistenti.");
    }

    const existingSet = new Set(existingLegacyIds);
    const documentsToRemove = existingLegacyIds.filter((legacyId) => !requestedSet.has(legacyId));
    if (documentsToRemove.length) {
      const { error: deleteError } = await supabase
        .from("condominium_work_documents")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("work_id", workId)
        .in("document_id", documentsToRemove);
      if (deleteError) throw deleteError;
    }

    const rows = (docs ?? [])
      .filter((doc: any) => requestedSet.has(Number(doc.legacy_id)) && !existingSet.has(Number(doc.legacy_id)))
      .map((doc: any) => ({ workspace_id: workspaceId, condominium_id: condominiumId, work_id: workId, document_id: doc.legacy_id, title: doc.title || null }));
    if (!rows.length) return (docs ?? []).filter((doc: any) => requestedSet.has(Number(doc.legacy_id)));
    const { data, error } = await supabase.from("condominium_work_documents").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  });
}

export async function recordCondominiumWorkEvent(workspaceId: string, workId: string, condominiumId: string, event: { eventType: string; title: string; description?: string; amount?: number; data?: any }) {
  if (!supabase) throw new Error("Supabase non configurato.");
  return enqueueBackendSync(async () => {
    const { data, error } = await supabase.from("condominium_work_events").insert({ workspace_id: workspaceId, condominium_id: condominiumId, work_id: workId, event_type: event.eventType, event_date: new Date().toISOString(), title: event.title, description: event.description ?? null, amount: event.amount ?? null, data: event.data ?? {} }).select("*").single();
    if (error) throw error;
    return data;
  });
}

export async function saveCondominiumWorkProgress(workspaceId: string, workId: string, input: { progressNo: number; progressDate: string; title: string; status: string; percentage: number; amount: number; paidAmount: number; notes: string; registerAccounting: boolean; }) {
  if (!supabase) throw new Error("Supabase non configurato.");
  return enqueueBackendSync(async () => {
    const { data: work, error: workError } = await supabase.from("condominium_works").select("id,condominium_id,supplier_id,title,category,data,start_date,expected_end_date").eq("workspace_id", workspaceId).eq("id", workId).maybeSingle();
    if (workError) throw workError;
    if (!work) throw new Error("Lavoro non trovato sul server.");

if (!Number.isInteger(Number(input.progressNo)) || Number(input.progressNo) < 1) {
      throw new Error("Il numero del SAL deve essere un intero maggiore o uguale a 1.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.progressDate || ""))) {
      throw new Error("La data del SAL non è valida.");
    }
    const startDate = work.start_date ? String(work.start_date).slice(0, 10) : "";
    const expectedEndDate = work.expected_end_date ? String(work.expected_end_date).slice(0, 10) : "";
    if (startDate && String(input.progressDate) < startDate) {
      throw new Error("La data del SAL non può essere precedente alla data di inizio del lavoro.");
    }
    if (expectedEndDate && String(input.progressDate) > expectedEndDate) {
      throw new Error("La data del SAL supera la data di fine prevista del lavoro. Verifica la data prima di confermare.");
    }

    const amount = Math.max(0, Number(input.amount) || 0);
    const paidAmount = Math.max(0, Number(input.paidAmount) || 0);
    const percentage = Math.max(0, Math.min(100, Number(input.percentage) || 0));
    if (paidAmount > amount + 0.000001) {
      throw new Error("L'importo pagato non può essere superiore all'importo del SAL.");
    }

    let ledgerSupplierId: string | null = null;
    const legacySupplierId = Number(work.data?.supplierId);
    if (Number.isFinite(legacySupplierId) && legacySupplierId > 0) {
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("legacy_id", legacySupplierId)
        .maybeSingle();
      if (supplierError) throw supplierError;
      ledgerSupplierId = supplier?.id ?? null;
    }

    const { data: existingProgress } = await supabase.from("condominium_work_progress").select("id,ledger_entry_id,amount,paid_amount,progress_date,title,notes").eq("workspace_id", workspaceId).eq("work_id", workId).eq("progress_no", input.progressNo).maybeSingle();

    const { data: neighbouringProgress, error: neighbouringProgressError } = await supabase
      .from("condominium_work_progress")
      .select("progress_no,progress_date,percentage")
      .eq("workspace_id", workspaceId)
      .eq("work_id", workId)
      .neq("progress_no", input.progressNo)
      .order("progress_no", { ascending: true });
    if (neighbouringProgressError) throw neighbouringProgressError;

    const previousProgress = (neighbouringProgress ?? [])
      .filter((row: any) => Number(row.progress_no) < Number(input.progressNo))
      .sort((a: any, b: any) => Number(b.progress_no) - Number(a.progress_no))[0];
    const nextProgress = (neighbouringProgress ?? [])
      .filter((row: any) => Number(row.progress_no) > Number(input.progressNo))
      .sort((a: any, b: any) => Number(a.progress_no) - Number(b.progress_no))[0];

    if (!existingProgress && previousProgress && Number(input.progressNo) !== Number(previousProgress.progress_no) + 1) {
      throw new Error("La numerazione dei SAL deve essere progressiva. Inserisci prima il SAL n. " + (Number(previousProgress.progress_no) + 1) + ".");
    }
    if (previousProgress?.progress_date && String(input.progressDate) < String(previousProgress.progress_date).slice(0, 10)) {
      throw new Error("La data del SAL non può essere precedente a quella del SAL precedente.");
    }
    if (nextProgress?.progress_date && String(input.progressDate) > String(nextProgress.progress_date).slice(0, 10)) {
      throw new Error("La data del SAL non può essere successiva a quella del SAL seguente.");
    }
    if (previousProgress && Number(input.percentage) + 0.000001 < Number(previousProgress.percentage || 0)) {
      throw new Error("La percentuale del SAL non può essere inferiore a quella del SAL precedente.");
    }
    if (nextProgress && Number(input.percentage) - 0.000001 > Number(nextProgress.percentage || 0)) {
      throw new Error("La percentuale del SAL non può essere superiore a quella del SAL seguente.");
    }

    let ledgerEntryId: string | null = existingProgress?.ledger_entry_id ?? null;
    if (existingProgress?.ledger_entry_id && !input.registerAccounting) {
      const accountingFieldsChanged =
        Math.abs(Number(existingProgress.amount || 0) - amount) > 0.000001 ||
        Math.abs(Number(existingProgress.paid_amount || 0) - paidAmount) > 0.000001 ||
        String(existingProgress.progress_date || "").slice(0, 10) !== String(input.progressDate) ||
        String(existingProgress.title || "") !== String(input.title || ("SAL " + input.progressNo)) ||
        String(existingProgress.notes || "") !== String(input.notes || "");
      if (accountingFieldsChanged) {
        throw new Error("Il SAL è già contabilizzato: per modificare importo, pagato, data o descrizione devi usare «Salva + Contabilità», così BETHAG mantiene allineata la scrittura contabile.");
      }
    }
    if (input.registerAccounting) {
      if (existingProgress?.ledger_entry_id) {
        if (amount <= 0) {
          throw new Error("Un SAL già contabilizzato non può essere portato a zero. Occorre gestire lo storno della scrittura contabile prima di azzerarlo.");
        }
        const { data: existingLedger, error: existingLedgerError } = await supabase
          .from("condominium_ledger_entries")
          .select("id,fiscal_year_id")
          .eq("workspace_id", workspaceId)
          .eq("id", existingProgress.ledger_entry_id)
          .maybeSingle();
        if (existingLedgerError) throw existingLedgerError;
        if (!existingLedger?.id) throw new Error("La scrittura contabile collegata al SAL non è più disponibile.");
        const { data: fiscalYear, error: fiscalYearError } = await supabase
          .from("condominium_fiscal_years")
          .select("id,status")
          .eq("workspace_id", workspaceId)
          .eq("condominium_id", work.condominium_id)
          .lte("start_date", input.progressDate)
          .gte("end_date", input.progressDate)
          .maybeSingle();
        if (fiscalYearError) throw fiscalYearError;
        if (!fiscalYear?.id) throw new Error("La data del SAL non ricade in alcun esercizio contabile del condominio.");
        if (String(fiscalYear.id) !== String(existingLedger.fiscal_year_id)) {
          throw new Error("La modifica della data del SAL sposterebbe la scrittura in un esercizio diverso. Gestisci la scrittura contabile nel relativo esercizio prima di modificare la data.");
        }
        if (fiscalYear.status !== "Aperto") {
          throw new Error("L'esercizio contabile del SAL è chiuso: la scrittura non può essere modificata.");
        }
        ledgerEntryId = existingProgress.ledger_entry_id;
        const { error: ledgerUpdateError } = await supabase.from("condominium_ledger_entries").update({
          amount,
          entry_date: input.progressDate,
          payment_status: paidAmount >= amount ? "Pagato" : paidAmount > 0 ? "Parzialmente pagato" : "Da pagare",
          description: (work.title || "Lavoro condominiale") + " — " + (input.title || "SAL " + input.progressNo),
          notes: input.notes || null
        }).eq("workspace_id", workspaceId).eq("id", ledgerEntryId);
        if (ledgerUpdateError) throw ledgerUpdateError;
      } else {
        const { data: fiscalYear, error: fiscalYearError } = await supabase
          .from("condominium_fiscal_years")
          .select("id,status")
          .eq("workspace_id", workspaceId)
          .eq("condominium_id", work.condominium_id)
          .eq("status", "Aperto")
          .lte("start_date", input.progressDate)
          .gte("end_date", input.progressDate)
          .maybeSingle();
        if (fiscalYearError) throw fiscalYearError;
        if (!fiscalYear?.id) throw new Error("Non esiste un esercizio contabile aperto che comprenda la data del SAL. Apri l'esercizio corretto prima di registrare il SAL.");
        const { data: ledger, error: ledgerError } = await supabase.from("condominium_ledger_entries").insert({
          workspace_id: workspaceId, condominium_id: work.condominium_id, fiscal_year_id: fiscalYear.id,
          entry_date: input.progressDate, direction: "Uscita", category: work.category || "Lavori e manutenzioni",
          description: (work.title || "Lavoro condominiale") + " — " + (input.title || "SAL " + input.progressNo),
          amount, payment_status: paidAmount >= amount ? "Pagato" : paidAmount > 0 ? "Parzialmente pagato" : "Da pagare",
          supplier_id: ledgerSupplierId, notes: input.notes || null,
          data: { source: "condominium_work_progress", workId, progressNo: input.progressNo }
        }).select("id").single();
        if (ledgerError) throw ledgerError;
        ledgerEntryId = ledger.id;
      }
    }

    const { data: previousProgressRows, error: previousProgressError } = await supabase.from("condominium_work_progress").select("progress_no,amount").eq("workspace_id", workspaceId).eq("work_id", workId);
    if (previousProgressError) throw previousProgressError;
    const previousAmount = (previousProgressRows ?? []).filter((row: any) => Number(row.progress_no) !== Number(input.progressNo)).reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);
    const cumulativeActualAmount = previousAmount + Math.max(0, amount);

    const { data: progress, error: progressError } = await supabase.from("condominium_work_progress").upsert({
      workspace_id: workspaceId, condominium_id: work.condominium_id, work_id: work.id,
      progress_no: input.progressNo, progress_date: input.progressDate, title: input.title || ("SAL " + input.progressNo),
      status: input.status, percentage: Math.max(0, Math.min(100, percentage)), amount: Math.max(0, amount),
      paid_amount: Math.max(0, paidAmount), notes: input.notes || null, ledger_entry_id: ledgerEntryId
    }, { onConflict: "work_id,progress_no" }).select("*").single();
    if (progressError) throw progressError;

    const { data: budgetReference, error: budgetReferenceError } = await supabase
      .from("condominium_works")
      .select("estimated_amount,approved_amount")
      .eq("workspace_id", workspaceId)
      .eq("id", workId)
      .maybeSingle();
    if (budgetReferenceError) throw budgetReferenceError;
    const approvedAmount = Number(budgetReference?.approved_amount || 0);
    const estimatedAmount = Number(budgetReference?.estimated_amount || 0);
    const budgetReferenceAmount = approvedAmount > 0 ? approvedAmount : estimatedAmount;
    const budgetWarning = budgetReferenceAmount > 0 && cumulativeActualAmount > budgetReferenceAmount + 0.01
      ? {
          type: approvedAmount > 0 ? "approved_amount_exceeded" : "estimated_amount_exceeded",
          referenceAmount: budgetReferenceAmount,
          cumulativeActualAmount,
          exceededBy: cumulativeActualAmount - budgetReferenceAmount,
        }
      : null;

    const { error: workUpdateError } = await supabase.from("condominium_works").update({
      progress_percent: Math.max(0, Math.min(100, percentage)),
      actual_amount: cumulativeActualAmount,
      status: Number(percentage) >= 100
        ? "Completato"
        : Number(percentage) > 0
          ? "In corso"
          : work.status === "Completato"
            ? "In corso"
            : work.status,
      actual_end_date: Number(percentage) >= 100 ? input.progressDate : null
    }).eq("workspace_id", workspaceId).eq("id", workId);
    if (workUpdateError) throw workUpdateError;
    return { ...progress, cumulativeActualAmount, budgetWarning };
  });
}

export async function deleteCondominiumWork(workspaceId: string, id: string) {
  if (!supabase) throw new Error("Supabase non configurato.");
  return enqueueBackendSync(async () => {
    const { data: work, error: workError } = await supabase
      .from("condominium_works")
      .select("id,title")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();
    if (workError) throw workError;
    if (!work) return;

    const { data: progressRows, error: progressError } = await supabase
      .from("condominium_work_progress")
      .select("progress_no,ledger_entry_id,payment_entry_id")
      .eq("workspace_id", workspaceId)
      .eq("work_id", id);
    if (progressError) throw progressError;

    const hasAccountingProgress = (progressRows ?? []).some((row: any) => Boolean(row.ledger_entry_id) || Boolean(row.payment_entry_id));
    const { data: linkedLedger, error: ledgerError } = await supabase
      .from("condominium_ledger_entries")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("direction", "Uscita")
      .contains("data", { workId: id })
      .limit(1);
    if (ledgerError) throw ledgerError;

    const { data: linkedDocuments, error: linkedDocumentsError } = await supabase
      .from("condominium_work_documents")
      .select("document_id")
      .eq("workspace_id", workspaceId)
      .eq("work_id", id);
    if (linkedDocumentsError) throw linkedDocumentsError;

    const linkedLegacyIds = (linkedDocuments ?? []).map((row: any) => Number(row.document_id)).filter((value: number) => Number.isFinite(value));
    let linkedInvoiceCount = 0;
    if (linkedLegacyIds.length) {
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("legacy_id,category,data")
        .eq("workspace_id", workspaceId)
        .in("legacy_id", linkedLegacyIds);
      if (documentsError) throw documentsError;
      linkedInvoiceCount = (documents ?? []).filter((doc: any) => {
        const data = doc.data && typeof doc.data === "object" ? doc.data : {};
        return String(doc.category ?? "").toLowerCase().includes("fattur") ||
          String(data.invoiceConfirmation?.status ?? "").toLowerCase() === "confermato";
      }).length;
    }

    if (hasAccountingProgress || (linkedLedger ?? []).length > 0) {
      throw new Error("Il lavoro non può essere eliminato perché presenta registrazioni contabili collegate. Prima occorre gestire o stornare le scritture contabili; in questo modo BETHAG evita di lasciare movimenti finanziari senza il relativo lavoro.");
    }
    if (linkedInvoiceCount > 0) {
      throw new Error("Il lavoro non può essere eliminato perché contiene una o più fatture collegate. Gestisci prima il collegamento e la relativa contabilizzazione per evitare di perdere la tracciabilità dell'intervento.");
    }

    const { error } = await supabase
      .from("condominium_works")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) throw error;
  });
}

export async function deleteWorkspaceRecord(
  workspaceId: string,
  table: "documents" | "deadlines" | "assemblies" | "suppliers" | "activities" | "communications",
  legacyId: number
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const allowedTables = ["documents", "deadlines", "assemblies", "suppliers", "activities", "communications"] as const;
    if (!allowedTables.includes(table)) {
      throw new Error("Tabella non autorizzata.");
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", legacyId);

    if (error) throw error;
  });
}


export async function deletePortalMember(workspaceId: string, legacyId: number) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { error } = await supabase
      .from("portal_access")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", legacyId);

    if (error) throw error;
  });
}

export async function deleteCondominium(workspaceId: string, legacyId: number, securityCode?: string) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    // La RPC elimina i record in modo atomico. Gli oggetti Storage non possono
    // essere cancellati da una funzione SQL, quindi ne raccogliamo prima i path
    // e li rimuoviamo solo dopo il successo della transazione DB.
    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium?.id) throw new Error("Condominio non trovato sul server.");

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("file_path")
      .eq("workspace_id", workspaceId)
      .eq("condominium_id", condominium.id)
      .not("file_path", "is", null);

    if (documentsError) throw documentsError;

    const storagePaths = Array.from(
      new Set(
        (documents ?? [])
          .map((row: any) => String(row.file_path ?? "").trim())
          .filter(Boolean)
      )
    );

    const { error } = await supabase.rpc("delete_condominium", {
      p_workspace_id: workspaceId,
      p_legacy_id: legacyId,
      p_security_code: securityCode ?? null,
    });

    if (error) throw error;

    if (storagePaths.length) {
      const { error: storageError } = await supabase.storage
        .from("bethag-documents")
        .remove(storagePaths);

      if (storageError) {
        throw new Error(
          "Il condominio è stato eliminato dal database, ma alcuni file Storage non sono stati rimossi: " +
          storageError.message
        );
      }
    }
  });
}

export async function deleteCondominiumUnit(
  workspaceId: string,
  condominiumId: number,
  unitId: string
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", condominiumId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium?.id) throw new Error("Condominio non trovato sul server.");

    const { error } = await supabase
      .from("condominium_units")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("condominium_id", condominium.id)
      .eq("id", unitId);

    if (error) throw error;
  });
}

export async function deleteCondominiumMember(
  workspaceId: string,
  condominiumId: number,
  legacyId: number
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", condominiumId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium?.id) return;

    const { data: member, error: memberLookupError } = await supabase
      .from("condominium_members")
      .select("email, user_id, name, data, unit_id")
      .eq("condominium_id", condominium.id)
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (memberLookupError) throw memberLookupError;

    // La cancellazione esplicita dell'anagrafica revoca anche l'accesso
    // applicativo al Portale, ma non elimina mai l'utente da Supabase Auth.
    if (member) {
      let portalDelete = supabase
        .from("portal_access")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("condominium_id", condominium.id);

      const memberEmail = String(member.email ?? "").trim().toLowerCase();
      if (member.user_id) {
        portalDelete = portalDelete.eq("user_id", member.user_id);
      } else if (memberEmail) {
        // L'e-mail può essere condivisa: abbiniamo anche identità e unità.
        portalDelete = portalDelete
          .ilike("email", memberEmail)
          .eq("name", member.name ?? "")
          .eq("apartment", String(member.data?.apartment ?? ""));
      } else {
        portalDelete = null as any;
      }

      if (portalDelete) {
        const { error: portalError } = await portalDelete;
        if (portalError) throw portalError;
      }
    }

    const { error } = await supabase
      .from("condominium_members")
      .delete()
      .eq("condominium_id", condominium.id)
      .eq("legacy_id", legacyId);

    if (error) throw error;

    // Dopo la cancellazione rimuoviamo l'ID del condòmino dagli ownerMemberIds
    // di tutte le unità del medesimo condominio. I millesimi restano
    // esclusivamente nell'oggetto unità e non vengono mai modificati.
    const { data: condominiumUnits, error: unitsError } = await supabase
      .from("condominium_units")
      .select("id, data")
      .eq("workspace_id", workspaceId)
      .eq("condominium_id", condominium.id);

    if (unitsError) throw unitsError;

    for (const unit of condominiumUnits ?? []) {
      const currentData =
        unit.data && typeof unit.data === "object" ? unit.data : {};
      const currentOwners = Array.isArray((currentData as any).ownerMemberIds)
        ? (currentData as any).ownerMemberIds
        : [];
      const nextOwners = currentOwners.filter(
        (ownerId: unknown) => String(ownerId) !== String(legacyId)
      );

      if (nextOwners.length !== currentOwners.length) {
        const nextData = {
          ...currentData,
          ownerMemberIds: nextOwners,
        };
        const { error: unitUpdateError } = await supabase
          .from("condominium_units")
          .update({ data: nextData })
          .eq("workspace_id", workspaceId)
          .eq("condominium_id", condominium.id)
          .eq("id", unit.id);
        if (unitUpdateError) throw unitUpdateError;
      }
    }
  });
}


export async function storeWorkspaceDocuments(
  workspaceId: string,
  files: File[],
  condominiumId?: string
): Promise<any[]> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId) throw new Error("Workspace non disponibile.");
  if (!files.length) return [];

  const stored: any[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathPrefix = condominiumId ? workspaceId + "/" + condominiumId : workspaceId;
    const path = pathPrefix + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-" + safeName;
    const { error } = await supabase.storage.from("bethag-documents").upload(path, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });
    if (error) throw new Error(`Impossibile memorizzare "${file.name}": ${error.message}`);
    stored.push({
      name: file.name,
      path,
      type: file.type || "application/octet-stream",
      size: file.size,
      lastModified: file.lastModified,
    });
  }
  return stored;
}

export async function deleteWorkspaceStoredFile(path: string): Promise<void> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!path) return;
  const { error } = await supabase.storage.from("bethag-documents").remove([path]);
  if (error) throw new Error(`Impossibile eliminare il file memorizzato: ${error.message}`);
}

export async function storeCondominiumDocuments(
  workspaceId: string,
  files: File[]
): Promise<any[]> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId) throw new Error("Workspace non disponibile.");
  if (!files.length) return [];

  const stored: any[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = workspaceId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-" + safeName;
    const { error } = await supabase.storage
      .from("bethag-documents")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (error) throw new Error(`Impossibile memorizzare "${file.name}": ${error.message}`);

    stored.push({
      name: file.name,
      path,
      type: file.type || "application/octet-stream",
      size: file.size,
      lastModified: file.lastModified,
    });
  }

  return stored;
}

export async function analyzeWorkspaceStoredDocumentsWithAI(
  workspaceId: string,
  files: Array<{ filename: string; storagePath: string; mimeType?: string }>
): Promise<any> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId || !files.length) throw new Error("Workspace o documenti mancanti.");

  const { data, error } = await supabase.functions.invoke("bethag-ai-document", {
    body: { workspaceId, files },
  });
  if (error) throw error;
  if (!data?.draft) throw new Error(data?.error ?? "L'AI non ha restituito una proposta.");
  return data.draft;
}

export async function analyzeWorkspaceDocumentsWithAI(
  workspaceId: string,
  files: File[]
): Promise<any> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId || !files.length) throw new Error("Workspace o documenti mancanti.");

  const stored = await storeWorkspaceDocuments(workspaceId, files);
  try {
    return await analyzeWorkspaceStoredDocumentsWithAI(
      workspaceId,
      stored.map((item: any) => ({
        filename: item.name,
        storagePath: item.path,
        mimeType: item.type,
      }))
    );
  } finally {
    await Promise.all(
      stored.map((item: any) =>
        deleteWorkspaceStoredFile(item.path).catch(() => undefined)
      )
    );
  }
}

export async function analyzeCondominiumStoredDocumentsWithAI(
  workspaceId: string,
  files: Array<{ filename: string; storagePath: string; mimeType?: string }>
): Promise<any> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId || !files.length) throw new Error("Workspace o documenti mancanti.");

  const { data, error } = await supabase.functions.invoke("bethag-ai-condominium", {
    body: { workspaceId, files },
  });
  if (error) throw error;
  if (!data?.draft) throw new Error(data?.error ?? "L'AI non ha restituito una proposta.");
  return data.draft;
}

export async function analyzeCondominiumDocumentsWithAI(
  workspaceId: string,
  files: File[]
): Promise<any> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!files.length) throw new Error("Nessun documento selezionato.");

  const stored = await storeCondominiumDocuments(workspaceId, files);
  try {
    return await analyzeCondominiumStoredDocumentsWithAI(
      workspaceId,
      stored.map((item: any) => ({
        filename: item.name,
        storagePath: item.path,
        mimeType: item.type,
      }))
    );
  } finally {
    await Promise.all(
      stored.map((item: any) =>
        deleteWorkspaceStoredFile(item.path).catch(() => undefined)
      )
    );
  }
}


export async function createCondominiumCreationIntake(
  workspaceId: string,
  payload: {
    source?: "AI" | "Importazione" | "Manuale";
    sourceDocuments?: any[];
    extractedData?: Record<string, any>;
    structure?: Record<string, any>;
    validationErrors?: any[];
    warnings?: any[];
    notes?: string;
  }
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userResult.user) throw new Error("Sessione utente non disponibile.");

    const { data, error } = await supabase
      .from("condominium_creation_intakes")
      .insert({
        workspace_id: workspaceId,
        source: payload.source ?? "AI",
        status: "Da verificare",
        source_documents: payload.sourceDocuments ?? [],
        extracted_data: payload.extractedData ?? {},
        structure: payload.structure ?? {},
        validation_errors: payload.validationErrors ?? [],
        warnings: payload.warnings ?? [],
        notes: payload.notes ?? "",
        created_by: userResult.user.id,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  });
}

export async function confirmCondominiumCreationIntake(
  workspaceId: string,
  intakeId: string,
  payload: {
    extractedData?: Record<string, any>;
    structure?: Record<string, any>;
    validationErrors?: any[];
    warnings?: any[];
    notes?: string;
  }
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userResult.user) throw new Error("Sessione utente non disponibile.");

    const { data, error } = await supabase
      .from("condominium_creation_intakes")
      .update({
        status: "Confermato",
        extracted_data: payload.extractedData ?? {},
        structure: payload.structure ?? {},
        validation_errors: payload.validationErrors ?? [],
        warnings: payload.warnings ?? [],
        notes: payload.notes ?? "",
        confirmed_by: userResult.user.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("id", intakeId)
      .select("id, status")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function cancelCondominiumCreationIntake(
  workspaceId: string,
  intakeId: string
) {
  if (!supabase) throw new Error("Supabase non configurato.");

  return enqueueBackendSync(async () => {
    const { error } = await supabase
      .from("condominium_creation_intakes")
      .update({
        status: "Annullato",
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("id", intakeId);

    if (error) throw error;
  });
}

export async function confirmCondominiumInvoice(
  workspaceId: string,
  payload: {
    documentLegacyId: number;
    condominiumLegacyId: number;
    extractedData: Record<string, any>;
    supplierId?: string | null;
    workId?: string | null;
  }
) {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId) throw new Error("Workspace non disponibile.");

  return enqueueBackendSync(async () => {
    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums").select("id").eq("workspace_id", workspaceId)
      .eq("legacy_id", payload.condominiumLegacyId).maybeSingle();
    if (condominiumError) throw condominiumError;
    if (!condominium?.id) throw new Error("Condominio associato alla fattura non trovato.");

    const { data: document, error: documentError } = await supabase
      .from("documents").select("id,data,title").eq("workspace_id", workspaceId)
      .eq("legacy_id", payload.documentLegacyId).maybeSingle();
    if (documentError) throw documentError;
    if (!document?.id) throw new Error("Documento fattura non trovato nel database.");

    const amount = parseBethagAmount(payload.extractedData?.expenseAmount ?? payload.extractedData?.amount ?? payload.extractedData?.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("L'importo della fattura non è stato riconosciuto con sufficiente certezza. Verificalo prima della conferma.");

    const invoiceDate = parseBethagDate(payload.extractedData?.documentDate ?? payload.extractedData?.invoiceDate);
    if (!invoiceDate) {
      throw new Error("La data della fattura non è stata riconosciuta con sufficiente certezza. Verificala prima della conferma.");
    }
    const invoiceNumber = String(payload.extractedData?.invoiceNumber ?? payload.extractedData?.numeroFattura ?? "").trim();
    const supplierName = String(payload.extractedData?.supplier ?? "").trim();
    const supplierVatNumber = String(
      payload.extractedData?.supplierVatNumber ??
      payload.extractedData?.partitaIva ??
      payload.extractedData?.vatNumber ??
      payload.extractedData?.vat ??
      ""
    ).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    let supplierId = payload.supplierId ?? null;
    if (!supplierId) {
      const { data: supplierRows, error: suppliersError } = await supabase
        .from("suppliers").select("id,name,data,condominium_id").eq("workspace_id", workspaceId)
        .or(`condominium_id.eq.${condominium.id},condominium_id.is.null`);
      if (suppliersError) throw suppliersError;
      const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
      const normalizeTaxId = (value: unknown) => String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const target = normalize(supplierName);
      const byVat = supplierVatNumber
        ? (supplierRows ?? []).find((item: any) => {
            const data = item.data && typeof item.data === "object" ? item.data : {};
            const candidateVat = normalizeTaxId(data.vatNumber ?? data.partitaIva ?? data.vat ?? data.supplierVatNumber ?? data.piva);
            return candidateVat && candidateVat === supplierVatNumber;
          })
        : null;
      if (byVat) {
        supplierId = byVat.id;
      } else if (supplierName) {
        const exact = (supplierRows ?? []).find((item: any) => normalize(String(item.name ?? "")) === target);
        const exactNameHasConflictingVat = Boolean(exact && supplierVatNumber && (() => {
          const data = exact.data && typeof exact.data === "object" ? exact.data : {};
          const exactVat = normalizeTaxId(data.vatNumber ?? data.partitaIva ?? data.vat ?? data.supplierVatNumber ?? data.piva);
          return exactVat && exactVat !== supplierVatNumber;
        })());
        if (exactNameHasConflictingVat) {
          throw new Error(`La partita IVA rilevata (${supplierVatNumber}) non coincide con quella del fornitore "${exact.name}". Verifica il fornitore prima di confermare la fattura.`);
        }
        const contained = exact ?? (supplierRows ?? []).find((item: any) => {
          const candidate = normalize(String(item.name ?? ""));
          return candidate && target && (candidate.includes(target) || target.includes(candidate));
        });
        supplierId = contained?.id ?? null;
      }
    }
    if (!supplierId) throw new Error(supplierName ? `Il fornitore "${supplierName}" non è stato associato automaticamente. Seleziona/crea il fornitore in Anagrafica prima di confermare la fattura.` : "Il fornitore della fattura non è stato riconosciuto. Verificalo prima della conferma.");

    const { data: selectedSupplier, error: selectedSupplierError } = await supabase
      .from("suppliers").select("id,name,data,condominium_id").eq("workspace_id", workspaceId).eq("id", supplierId).maybeSingle();
    if (selectedSupplierError) throw selectedSupplierError;
    if (!selectedSupplier?.id) throw new Error("Il fornitore selezionato non appartiene al workspace corrente.");
    if (selectedSupplier.condominium_id && String(selectedSupplier.condominium_id) !== String(condominium.id)) {
      throw new Error("Il fornitore selezionato non appartiene al condominio della fattura.");
    }
    if (supplierVatNumber) {
      const supplierData = selectedSupplier.data && typeof selectedSupplier.data === "object" ? selectedSupplier.data : {};
      const storedVat = String(supplierData.vatNumber ?? supplierData.partitaIva ?? supplierData.vat ?? supplierData.supplierVatNumber ?? supplierData.piva ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (storedVat && storedVat !== supplierVatNumber) {
        throw new Error(`La partita IVA rilevata (${supplierVatNumber}) non coincide con quella del fornitore selezionato "${selectedSupplier.name}". Verifica il documento prima di confermare la fattura.`);
      }
    }

    const workId = payload.workId ?? null;
    const aiWorkReference = String(
      payload.extractedData?.workReference ??
      payload.extractedData?.riferimentoLavoro ??
      ""
    ).trim();
    if (workId) {
      const { data: work, error: workError } = await supabase.from("condominium_works")
        .select("id,title,category,status,supplier_id,data")
        .eq("workspace_id", workspaceId).eq("condominium_id", condominium.id).eq("id", workId).maybeSingle();
      if (workError) throw workError;
      if (!work?.id) throw new Error("Il lavoro proposto non appartiene al condominio della fattura.");

      if (aiWorkReference) {
        const normalizeWorkReference = (value: unknown) =>
          String(value ?? "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
        const reference = normalizeWorkReference(aiWorkReference);
        const workText = normalizeWorkReference([
          work.title,
          work.category,
          work.data?.title,
          work.data?.description,
          work.data?.notes
        ].filter(Boolean).join(" "));
        const referenceTokens = reference.split(/\s+/).filter((token: string) => token.length >= 4);
        const matchedTokens = referenceTokens.filter((token: string) => workText.includes(token));
        const referenceHasUsefulEvidence = referenceTokens.length > 0 && matchedTokens.length > 0;
        if (!referenceHasUsefulEvidence) {
          throw new Error(`Il riferimento al lavoro rilevato dall'AI ("${aiWorkReference}") non trova riscontro nel lavoro selezionato. Verifica manualmente il collegamento prima di confermare la fattura.`);
        }
      }
    }

    const { data: existingWorkLinks, error: existingWorkLinksError } = await supabase
      .from("condominium_work_documents").select("id,work_id")
      .eq("workspace_id", workspaceId).eq("document_id", payload.documentLegacyId).limit(10);
    if (existingWorkLinksError) throw existingWorkLinksError;
    const existingWorkIds = (existingWorkLinks ?? []).map((row: any) => String(row.work_id));
    if (existingWorkIds.length && !workId) {
      throw new Error("La fattura è già collegata a un lavoro. Per confermarla senza lavoro occorre prima rimuovere esplicitamente il collegamento esistente.");
    }
    if (workId && existingWorkIds.some((existingId: string) => existingId !== String(workId))) {
      throw new Error("La fattura è già collegata a un altro lavoro. Rimuovi prima il collegamento precedente oppure verifica manualmente l'associazione.");
    }

    const dataPayload = { source: "ai_invoice_confirmation", invoiceNumber, invoiceDate, supplierName, workId, confirmedAt: new Date().toISOString(), aiExtractedData: payload.extractedData };
    const { data: existingEntry, error: existingEntryError } = await supabase.from("condominium_ledger_entries")
      .select("id,fiscal_year_id").eq("workspace_id", workspaceId).eq("document_id", document.id).eq("direction", "Uscita").limit(1).maybeSingle();
    if (existingEntryError) throw existingEntryError;

    const { data: fiscalYear, error: fiscalYearError } = await supabase.from("condominium_fiscal_years")
      .select("id,status").eq("workspace_id", workspaceId).eq("condominium_id", condominium.id)
      .eq("status", "Aperto").lte("start_date", invoiceDate).gte("end_date", invoiceDate).maybeSingle();
    if (fiscalYearError) throw fiscalYearError;
    if (!fiscalYear?.id) throw new Error("Non esiste un esercizio contabile aperto che comprenda la data della fattura. Apri l'esercizio corretto prima di confermarla.");
    if (existingEntry?.id && String(existingEntry.fiscal_year_id) !== String(fiscalYear.id)) {
      throw new Error("La fattura è già contabilizzata in un esercizio diverso da quello della data indicata. Gestisci prima la scrittura contabile esistente.");
    }

    let ledgerEntryId: string;
    const ledgerPayload = {
      fiscal_year_id: fiscalYear.id, entry_date: invoiceDate, category: "Fattura",
      description: invoiceNumber ? `Fattura ${invoiceNumber} - ${supplierName || "Fornitore"}` : `Fattura - ${supplierName || "Fornitore"}`,
      amount, supplier_id: supplierId, document_id: document.id,
      notes: "Registrazione confermata dall'amministratore a partire dall'analisi AI.",
      data: dataPayload, updated_at: new Date().toISOString(),
    };
    if (existingEntry?.id) {
      const { data: updated, error } = await supabase.from("condominium_ledger_entries").update(ledgerPayload)
        .eq("workspace_id", workspaceId).eq("id", existingEntry.id).select("id").single();
      if (error) throw error;
      ledgerEntryId = updated.id;
    } else {
      const { data: created, error } = await supabase.from("condominium_ledger_entries").insert({
        workspace_id: workspaceId, condominium_id: condominium.id, ...ledgerPayload,
        direction: "Uscita", payment_status: "Da pagare",
      }).select("id").single();
      if (error) throw error;
      ledgerEntryId = created.id;
    }

    if (workId && !existingWorkIds.includes(String(workId))) {
      const { error } = await supabase.from("condominium_work_documents").insert({
        workspace_id: workspaceId, condominium_id: condominium.id, work_id: workId, document_id: payload.documentLegacyId,
        title: document.title ?? "Fattura", notes: invoiceNumber ? `Fattura ${invoiceNumber}` : "Fattura collegata dall'analisi AI.",
      });
      if (error) throw error;
    }

    if (workId && !existingWorkIds.includes(String(workId))) {
      const { error: eventError } = await supabase.from("condominium_work_events").insert({
        workspace_id: workspaceId, condominium_id: condominium.id, work_id: workId, event_type: "invoice_linked",
        event_date: invoiceDate, title: invoiceNumber ? `Fattura ${invoiceNumber} collegata` : "Fattura collegata",
        description: `Fattura ${supplierName || "fornitore"} registrata in Contabilità per ${amount.toFixed(2)} €.`,
        amount, data: { documentId: document.id, ledgerEntryId, supplierId },
      });
      if (eventError) throw eventError;
    }

    const currentDocumentData = document.data && typeof document.data === "object" ? document.data : {};
    const { error: documentUpdateError } = await supabase.from("documents").update({
      data: { ...currentDocumentData, invoiceConfirmation: { status: "Confermato", invoiceNumber, invoiceDate, amount, supplierId, supplierName, workId, ledgerEntryId, confirmedAt: new Date().toISOString() } },
      updated_at: new Date().toISOString(),
    }).eq("workspace_id", workspaceId).eq("id", document.id);
    if (documentUpdateError) throw documentUpdateError;

    return { ledgerEntryId, supplierId, workId, amount, invoiceNumber, invoiceDate };
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

/**
 * Struttura restituita dalla RPC di anteprima contabile del subentro.
 * Gli identificativi sono UUID Supabase, non ID legacy numerici.
 */
export type MemberTransferPreview = {
  transfer_date: string;
  unit_id: string;
  outgoing_member_id: string;
  outstanding_before: number;
  paid_before: number;
  installments_before: Array<{
    id: string;
    title: string;
    amount: number;
    paid_amount: number;
    residual: number;
    due_date: string;
    status: string;
    fiscal_year_id: string | null;
  }>;
  extraordinary_deliberated_before_due_after: Array<{
    id: string;
    amount: number;
    paid_amount: number;
    due_date: string | null;
    status: string;
    ledger_entry_id: string;
    deliberation_date: string | null;
    description: string | null;
  }>;
  unit_expenses: Array<Record<string, unknown>>;
  review_flags: {
    unpaid_before_transfer: boolean;
    extraordinary_deliberated_before_due_after: boolean;
    legal_liability_review_required: boolean;
  };
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export async function previewCondominiumMemberTransfer(
  unitDatabaseId: string,
  outgoingMemberDatabaseId: string,
  transferDate: string
): Promise<MemberTransferPreview> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!isUuid(unitDatabaseId) || !isUuid(outgoingMemberDatabaseId) || !isIsoDate(transferDate)) {
    throw new Error("Per l’anteprima servono UUID Supabase validi e una data nel formato AAAA-MM-GG.");
  }
  const { data, error } = await supabase.rpc("preview_condominium_member_transfer", {
    p_unit_id: unitDatabaseId,
    p_outgoing_member_id: outgoingMemberDatabaseId,
    p_transfer_date: transferDate,
  });
  if (error) throw error;
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
  const isFiniteNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value);
  const flags = isRecord(data) ? data.review_flags : null;
  const installmentsValid = isRecord(data) && Array.isArray(data.installments_before) &&
    data.installments_before.every((item: unknown) => isRecord(item) &&
      typeof item.id === "string" && typeof item.title === "string" &&
      isFiniteNumber(item.amount) && isFiniteNumber(item.paid_amount) &&
      isFiniteNumber(item.residual) && typeof item.due_date === "string" &&
      typeof item.status === "string" &&
      (item.fiscal_year_id === null || typeof item.fiscal_year_id === "string"));
  const extraordinaryValid = isRecord(data) &&
    Array.isArray(data.extraordinary_deliberated_before_due_after) &&
    data.extraordinary_deliberated_before_due_after.every((item: unknown) => isRecord(item) &&
      typeof item.id === "string" && isFiniteNumber(item.amount) &&
      isFiniteNumber(item.paid_amount) &&
      (item.due_date === null || typeof item.due_date === "string") &&
      typeof item.status === "string" && typeof item.ledger_entry_id === "string" &&
      (item.deliberation_date === null || typeof item.deliberation_date === "string") &&
      (item.description === null || typeof item.description === "string"));
  if (!isRecord(data) || data.transfer_date !== transferDate ||
      data.unit_id !== unitDatabaseId || data.outgoing_member_id !== outgoingMemberDatabaseId ||
      !isFiniteNumber(data.outstanding_before) || !isFiniteNumber(data.paid_before) ||
      !installmentsValid || !extraordinaryValid || !Array.isArray(data.unit_expenses) ||
      !data.unit_expenses.every(isRecord) || !isRecord(flags) ||
      typeof flags.unpaid_before_transfer !== "boolean" ||
      typeof flags.extraordinary_deliberated_before_due_after !== "boolean" ||
      typeof flags.legal_liability_review_required !== "boolean") {
    throw new Error("La risposta di anteprima del subentro non rispetta il formato atteso.");
  }
  return data as MemberTransferPreview;
}

/**
 * Registra il subentro tramite la RPC transazionale protetta lato database.
 * Non trasferisce né riscrive automaticamente le poste contabili pregresse.
 */
export async function confirmCondominiumMemberTransfer(input: {
  unitDatabaseId: string;
  outgoingMemberDatabaseId: string;
  incomingName: string;
  incomingEmail?: string | null;
  incomingUserId?: string | null;
  transferDate: string;
  transferType?: "Vendita" | "Acquisto" | "Donazione" | "Successione" | "Altro";
  notes?: string;
  data?: Record<string, unknown>;
}): Promise<string> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("I dati del subentro non sono validi.");
  }
  if ((input.incomingEmail != null && typeof input.incomingEmail !== "string") ||
      (input.incomingUserId != null && typeof input.incomingUserId !== "string") ||
      (input.notes != null && typeof input.notes !== "string")) {
    throw new Error("E-mail, identificativo utente o note del subentrante non hanno un formato valido.");
  }
  const incomingName = typeof input.incomingName === "string" ? input.incomingName.trim() : "";
  const incomingEmail = typeof input.incomingEmail === "string"
    ? input.incomingEmail.trim().toLowerCase() || null
    : null;
  const incomingUserId = typeof input.incomingUserId === "string"
    ? input.incomingUserId.trim() || null
    : null;
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const transferType = input.transferType ?? "Vendita";
  const validTransferTypes = ["Vendita", "Acquisto", "Donazione", "Successione", "Altro"];
  if (!isUuid(input.unitDatabaseId) || !isUuid(input.outgoingMemberDatabaseId) ||
      !isIsoDate(input.transferDate) || !incomingName ||
      !validTransferTypes.includes(transferType)) {
    throw new Error("Inserisci UUID Supabase validi, nominativo, tipo di operazione e data del subentro corretti.");
  }
  if (incomingName.length > 180 || (incomingEmail !== null &&
      (incomingEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(incomingEmail)))) {
    throw new Error("Controlla il nominativo e l'indirizzo e-mail del subentrante.");
  }
  if (incomingUserId !== null && !isUuid(incomingUserId)) {
    throw new Error("L'identificativo utente del subentrante non è valido.");
  }
  if (notes.length > 2000) {
    throw new Error("Le note del subentro non possono superare 2.000 caratteri.");
  }
  if (input.data !== undefined && (!input.data || typeof input.data !== "object" || Array.isArray(input.data))) {
    throw new Error("I dati aggiuntivi del subentro non sono validi.");
  }
  const { data, error } = await supabase.rpc("confirm_condominium_member_transfer", {
    p_unit_id: input.unitDatabaseId,
    p_outgoing_member_id: input.outgoingMemberDatabaseId,
    p_incoming_name: incomingName,
    p_incoming_email: incomingEmail,
    p_incoming_user_id: incomingUserId,
    p_transfer_date: input.transferDate,
    p_transfer_type: transferType,
    p_notes: notes,
    p_data: input.data || {},
  });
  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error("Supabase non ha restituito l'identificativo del subentro.");
  return data;
}

export async function getMemberTransferAccountingSnapshot(
  transferId: string
): Promise<Record<string, unknown>> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!isUuid(transferId)) throw new Error("Identificativo Supabase del subentro non valido.");
  const { data, error } = await supabase.rpc("get_member_transfer_accounting_snapshot", {
    p_transfer_id: transferId,
  });
  if (error) throw error;

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);
  const isFiniteNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value);
  if (!isRecord(data) || !isRecord(data.transfer) ||
      !isRecord(data.outgoing) || !isRecord(data.post_transfer) ||
      !Array.isArray(data.unit_expenses)) {
    throw new Error("La risposta del riepilogo contabile del subentro non è valida.");
  }
  const { transfer, outgoing, post_transfer: postTransfer } = data;
  if (typeof transfer.id !== "string" || transfer.id.toLowerCase() !== transferId.toLowerCase() ||
      !isUuid(transfer.unit_id) || !isUuid(transfer.outgoing_member_id) ||
      (transfer.incoming_member_id !== null && !isUuid(transfer.incoming_member_id)) ||
      typeof transfer.transfer_date !== "string" || !isIsoDate(transfer.transfer_date) ||
      typeof transfer.transfer_type !== "string" || typeof transfer.status !== "string" ||
      !["Confermato", "Chiuso", "Annullato", "Bozza"].includes(transfer.status) ||
      !["installments_due_before", "installments_paid_before", "installments_residual", "allocations_before"]
        .every((key) => isFiniteNumber(outgoing[key])) ||
      !["installments_after", "allocations_after"].every((key) => isFiniteNumber(postTransfer[key])) ||
      !data.unit_expenses.every((item: unknown) => isRecord(item) &&
        typeof item.id === "string" && typeof item.description === "string" &&
        typeof item.expense_type === "string" && typeof item.entry_date === "string" &&
        (item.deliberation_date === null || typeof item.deliberation_date === "string") &&
        isFiniteNumber(item.amount) &&
        (item.assembly_id === null || typeof item.assembly_id === "string") &&
        typeof item.deliberation_before_transfer === "boolean")) {
    throw new Error("La risposta del riepilogo contabile del subentro contiene dati incompleti o incoerenti.");
  }
  return data;
}

export async function closeCondominiumMemberTransfer(transferId: string): Promise<boolean> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!isUuid(transferId)) throw new Error("Identificativo Supabase del subentro non valido.");
  const { data, error } = await supabase.rpc("close_condominium_member_transfer", {
    p_transfer_id: transferId,
  });
  if (error) throw error;
  if (typeof data !== "boolean") {
    throw new Error("La risposta della chiusura del subentro non è valida.");
  }
  return data;
}
