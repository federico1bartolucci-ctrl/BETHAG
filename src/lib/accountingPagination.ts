export async function loadAllPages(queryFactory: () => any) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
}

export async function loadActiveAllocationUnitMembers(
  client: any,
  condominiumId: string | null,
  unitIds: string[],
) {
  const uniqueUnitIds = [...new Set(unitIds.filter(Boolean))];
  if (!condominiumId || uniqueUnitIds.length === 0) return { data: [], error: null };
  return loadAllPages(() => client
    .from("condominium_members")
    .select("id,unit_id,role,active,data")
    .eq("condominium_id", condominiumId)
    .eq("active", true)
    .in("unit_id", uniqueUnitIds)
    .order("id", { ascending: true }));
}
