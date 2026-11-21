export async function loadCondominiumUnitsForMember(client: any, condominiumId: string) {
  if (!condominiumId) return [];
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("condominium_units")
      .select("id, unit_code, data")
      .eq("condominium_id", condominiumId)
      .order("unit_code", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
