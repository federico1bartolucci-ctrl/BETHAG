function cents(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function allocationKey(ledgerEntryId, unitId) {
  return ledgerEntryId && unitId ? `${ledgerEntryId}::${unitId}` : null;
}

export function calculateRendicontoUnitBalances({
  allocations = [],
  installments = [],
  units = [],
  members = [],
  carryovers = [],
  yearId = "all",
}) {
  const map = new Map();
  const coveredAllocationKeys = new Set();
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const allocationByKey = new Map();

  const createRow = (unitId) => {
    const unit = unitById.get(unitId);
    return {
      unitId,
      unitCode: unit?.unit_code || "Unità non trovata",
      allocated: 0,
      installments: 0,
      allocatedPaid: 0,
      installmentPaid: 0,
      paid: 0,
      residual: 0,
      carryover: 0,
      balance: 0,
    };
  };

  for (const allocation of allocations) {
    const unitId = allocation.unit_id;
    if (!unitId) continue;
    const row = map.get(unitId) ?? createRow(unitId);
    row.allocated += Number(allocation.amount || 0);
    row.allocatedPaid += Number(allocation.paid_amount || 0);
    map.set(unitId, row);
    const key = allocationKey(allocation.ledger_entry_id, unitId);
    if (key) {
      const rows = allocationByKey.get(key) ?? [];
      rows.push(allocation);
      allocationByKey.set(key, rows);
    }
  }

  const addInstallment = (unitId, amount, paid, ledgerEntryId) => {
    if (!unitId) return;
    const row = map.get(unitId) ?? createRow(unitId);
    row.installments += Number(amount || 0);
    row.installmentPaid += Number(paid || 0);
    map.set(unitId, row);
    const key = allocationKey(ledgerEntryId, unitId);
    if (key && allocationByKey.has(key)) coveredAllocationKeys.add(key);
  };

  for (const installment of installments) {
    if (installment.unit_id) {
      addInstallment(
        installment.unit_id,
        installment.amount,
        installment.paid_amount,
        installment.ledger_entry_id,
      );
      continue;
    }
    if (!installment.member_id || !installment.ledger_entry_id) continue;

    const ownerUnitIds = [...new Set(
      members
        .filter((member) => member.id === installment.member_id && member.active && member.unit_id)
        .map((member) => member.unit_id),
    )];
    if (!ownerUnitIds.length) continue;

    const ownerAllocations = allocations
      .filter((allocation) => allocation.ledger_entry_id === installment.ledger_entry_id && ownerUnitIds.includes(allocation.unit_id))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const allocationTotal = ownerAllocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
    if (allocationTotal <= 0) continue;

    let allocatedInstallments = 0;
    let allocatedPaid = 0;
    ownerAllocations.forEach((allocation, index) => {
      const isLast = index === ownerAllocations.length - 1;
      const amount = isLast
        ? cents(Number(installment.amount || 0) - allocatedInstallments)
        : cents(Number(installment.amount || 0) * Number(allocation.amount || 0) / allocationTotal);
      const paid = isLast
        ? cents(Number(installment.paid_amount || 0) - allocatedPaid)
        : cents(Number(installment.paid_amount || 0) * Number(allocation.amount || 0) / allocationTotal);
      allocatedInstallments += amount;
      allocatedPaid += paid;
      coveredAllocationKeys.add(allocationKey(installment.ledger_entry_id, allocation.unit_id));
      addInstallment(allocation.unit_id, amount, paid, installment.ledger_entry_id);
    });
  }

  for (const carryover of yearId === "all" ? [] : carryovers) {
    if (!carryover.unit_id || map.has(carryover.unit_id)) continue;
    map.set(carryover.unit_id, createRow(carryover.unit_id));
  }

  return Array.from(map.values()).map((row) => {
    const uncoveredAllocations = allocations.filter((allocation) => (
      allocation.unit_id === row.unitId
      && !coveredAllocationKeys.has(allocationKey(allocation.ledger_entry_id, allocation.unit_id))
    ));
    const uncoveredPaid = uncoveredAllocations.reduce((sum, allocation) => sum + Number(allocation.paid_amount || 0), 0);
    const uncoveredResidual = uncoveredAllocations.reduce((sum, allocation) => (
      sum + Math.max(0, Number(allocation.amount || 0) - Number(allocation.paid_amount || 0))
    ), 0);
    const installmentResidual = Math.max(0, row.installments - row.installmentPaid);
    const paid = row.installmentPaid + uncoveredPaid;
    const residual = installmentResidual + uncoveredResidual;
    const unitCarryovers = yearId === "all" ? [] : carryovers.filter((carryover) => carryover.unit_id === row.unitId);
    const carryover = unitCarryovers.reduce((sum, item) => (
      sum + (item.kind === "Debito" ? Math.abs(Number(item.balance || 0)) : -Math.abs(Number(item.balance || 0)))
    ), 0);
    return {
      ...row,
      paid,
      residual,
      carryover,
      balance: cents(residual + carryover),
    };
  }).sort((a, b) => a.unitCode.localeCompare(b.unitCode, "it"));
}
