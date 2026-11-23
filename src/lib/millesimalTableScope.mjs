export function millesimalTableScopeMatchesUnit(table, unit) {
  const mode = table?.scope_mode || "all";
  if (mode === "all") return true;
  if (mode === "units") {
    const ids = Array.isArray(table?.scope_unit_ids) ? table.scope_unit_ids : [];
    return ids.includes(unit?.id);
  }
  if (mode === "buildings") {
    const codes = Array.isArray(table?.scope_building_codes) ? table.scope_building_codes : [];
    const unitCode = String(unit?.building_code || unit?.data?.building_code || unit?.data?.civic_code || unit?.data?.fabbricato || "").trim().toLowerCase();
    return Boolean(unitCode) && codes.some(code => String(code ?? "").trim().toLowerCase() === unitCode);
  }
  return false;
}
