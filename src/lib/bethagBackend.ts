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

  const mappedCondominiumUnits = (condominiumUnits.data ?? []).map((row: any) => {
    const storedOwnerIds = Array.isArray(row.data?.ownerMemberIds) ? row.data.ownerMemberIds : [];
    const linkedOwnerIds = ownerIdsByUnit.get(String(row.id)) ?? [];
    return {
      ...row.data,
      id: row.id,
      condominiumId: condominiumLegacyByDbId.get(row.condominium_id) ?? row.data?.condominiumId ?? null,
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
  ].filter((entry): entry is [string, any[]] => Boolean(entry));

  for (const [table, rows] of rowsByTable) {
    if (rows.length) await upsertRows(table, rows);
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
      .select("id, unit_code, building_code")
      .eq("condominium_id", condominium.id);

    if (existingUnitError) throw existingUnitError;

    const normalizedUnitCode = unitCode.toLowerCase();
    // In modifica l'ID DB dell'unità è la fonte di verità: il codice può
    // essere cambiato senza trasformare la modifica in una nuova unità.
    const existingUnitById = item.id
      ? (existingUnits ?? []).find((unit: any) => String(unit.id) === String(item.id))
      : null;
    const existingUnitByCode = (existingUnits ?? []).find(
      (unit: any) => String(unit.unit_code ?? "").trim().toLowerCase() === normalizedUnitCode
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
    const { error } = await supabase.rpc("delete_condominium", {
      p_workspace_id: workspaceId,
      p_legacy_id: legacyId,
      p_security_code: securityCode ?? null,
    });

    if (error) throw error;
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
  files: File[]
): Promise<any[]> {
  if (!supabase) throw new Error("Supabase non configurato.");
  if (!workspaceId) throw new Error("Workspace non disponibile.");
  if (!files.length) return [];

  const stored: any[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = workspaceId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-" + safeName;
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