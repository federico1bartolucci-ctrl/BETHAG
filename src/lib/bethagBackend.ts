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

  const mappedCondominiumMembers = (condominiumMembers.data ?? []).map((row: any) => ({
    ...row.data,
    id: row.legacy_id,
    condominiumId:
      row.data?.condominiumId ??
      condominiumLegacyByDbId.get(row.condominium_id) ??
      null,
    unitId: row.unit_id ?? row.data?.unitId ?? "",
  }));

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
      ownerMode: row.data?.ownerMode ?? (linkedOwnerIds.length ? "condominium_member" : "condominium_member"),
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