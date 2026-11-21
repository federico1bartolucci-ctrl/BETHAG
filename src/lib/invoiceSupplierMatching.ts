export async function loadInvoiceSupplierRows(
  client: any,
  workspaceId: string,
  condominiumId: string
): Promise<any[]> {
  const rows: any[] = [];
  const scope = `condominium_id.eq.${condominiumId},condominium_id.is.null`;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("suppliers")
      .select("id,name,data,condominium_id")
      .eq("workspace_id", workspaceId)
      .or(scope)
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

export function matchInvoiceSupplierRows(
  supplierRows: any[],
  supplierName: string,
  supplierVatNumber: string
) {
  const normalize = (value: string) =>
    value.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const normalizeTaxId = (value: unknown) =>
    String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const target = normalize(supplierName);
  const byVat = supplierVatNumber
    ? supplierRows.find((item: any) => {
        const data = item.data && typeof item.data === "object" ? item.data : {};
        const candidateVat = normalizeTaxId(data.vatNumber ?? data.partitaIva ?? data.vat ?? data.supplierVatNumber ?? data.piva);
        return candidateVat && candidateVat === supplierVatNumber;
      })
    : null;
  if (byVat) return byVat.id;
  if (supplierName) {
    const exact = supplierRows.find((item: any) => normalize(String(item.name ?? "")) === target);
    const exactNameHasConflictingVat = Boolean(exact && supplierVatNumber && (() => {
      const data = exact.data && typeof exact.data === "object" ? exact.data : {};
      const exactVat = normalizeTaxId(data.vatNumber ?? data.partitaIva ?? data.vat ?? data.supplierVatNumber ?? data.piva);
      return exactVat && exactVat !== supplierVatNumber;
    })());
    if (exactNameHasConflictingVat) {
      throw new Error(`La partita IVA rilevata (${supplierVatNumber}) non coincide con quella del fornitore "${exact.name}". Verifica il fornitore prima di confermare la fattura.`);
    }
    const contained = exact ?? supplierRows.find((item: any) => {
      const candidate = normalize(String(item.name ?? ""));
      return candidate && target && (candidate.includes(target) || target.includes(candidate));
    });
    return contained?.id ?? null;
  }
  return null;
}
