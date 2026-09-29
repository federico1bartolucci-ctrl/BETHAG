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
      id: row.legacy_id,
      condominiumId:
        row.data?.condominiumId ??
        condominiumLegacyByDbId.get(row.condominium_id) ??
        null,
      unitId: row.unit_id ?? row.data?.unitId ?? "",
    };
  });

  const ownerIdsByUnit = new Map<string, number[]>();
  mappedCondominiumMembers.forEach((member: any) => {
    if (member.role !== "Proprietario" || !member.unitId) return;
    const current = ownerIdsByUnit.get(String(member.unitId)) ?? [];
    if (!current.includes(member.id)) current.push(member.id);
    ownerIdsByUnit.set(String(member.unitId), current);
  });

  const mappedCondominiumUnits = (condominiumUnits.data ?? []).map((row: any) => {
    const storedOwnerIds = Array.isArray(row.data?.ownerMemberIds) ? row.data.ownerMemberIds : [];
    const linkedOwnerIds = ownerIdsByUnit.get(String(row.id)) ?? [];
    return {
      ...row.data,
      id: row.id,
      condominiumId: condominiumLegacyByDbId.get(row.condominium_id) ?? row.data?.condominiumId ?? null,
      unitCode: row.unit_code,
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
      active: row.data?.active ?? true,
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

async function syncBackendStateNow(workspaceId: string, state: BackendState) {
  if (!supabase) throw new Error("Supabase non configurato.");

  const condominiumRows = state.condominiums ?? [];
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

    const { data, error } = await supabase
      .from("condominium_units")
      .upsert({
        workspace_id: workspaceId,
        condominium_id: condominium.id,
        unit_code: unitCode,
        data: {
          ...item,
          unitCode,
          unitType: item.unitType ?? "Abitazione",
          cadastralCategory: item.cadastralCategory ?? "",
          cadastralAutonomous: item.cadastralAutonomous ?? true,
          millesimi: item.millesimi ?? "",
          incorporatedInUnitId: item.incorporatedInUnitId ?? null,
          relationshipToResidentialUnit: item.relationshipToResidentialUnit ?? (item.incorporatedInUnitId ? "Pertinenza" : "Nessuna"),
          ownerMode: item.ownerMode ?? "condominium_member",
          ownerMemberIds: Array.isArray(item.ownerMemberIds) ? item.ownerMemberIds : [],
          externalOwners: Array.isArray(item.externalOwners) ? item.externalOwners : [],
          notes: item.notes ?? "",
          active: item.active ?? true,
        },
      }, { onConflict: "condominium_id,unit_code" })
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
      const { data: existingUnit, error: existingUnitError } = await supabase
        .from("condominium_units")
        .select("id, data")
        .eq("condominium_id", condominium.id)
        .eq("unit_code", apartment)
        .maybeSingle();

      if (existingUnitError) throw existingUnitError;

      if (existingUnit?.id) {
        unitId = existingUnit.id;
      } else {
        const { data: createdUnit, error: unitError } = await supabase
          .from("condominium_units")
          .insert({
            workspace_id: workspaceId,
            condominium_id: condominium.id,
            unit_code: apartment,
            data: { unitCode: apartment },
          })
          .select("id")
          .single();

        if (unitError) throw unitError;
        unitId = createdUnit?.id ?? null;
      }
    }

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

    if (requestedUnits > 0) {
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

export function syncBackendState(workspaceId: string, state: BackendState) {
  return enqueueBackendSync(() => syncBackendStateNow(workspaceId, state));
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

    const { error } = await supabase
      .from("condominium_members")
      .delete()
      .eq("condominium_id", condominium.id)
      .eq("legacy_id", legacyId);

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