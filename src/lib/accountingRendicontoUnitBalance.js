function cents(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function allocationKey(ledgerEntryId, unitId) {
  return ledgerEntryId && unitId ? String(ledgerEntryId) + "::" + String(unitId) : null;
}

export function calculateRendicontoUnitBalances({
  allocations = [],
  installments = [],
  units = [],
  members = [],
  carryovers = [],
  yearId = "all",
}) {
  const rowsByUnit = new Map();
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const allocationGroupsByUnit = new Map();
  const allocationGroupsByKey = new Map();
  const installmentCoverageByKey = new Map();
  const standaloneInstallmentsByUnit = new Map();

  const createRow = (unitId) => ({
    unitId,
    unitCode: unitsById.get(unitId)?.unit_code || "Unità non trovata",
    allocated: 0,
    installments: 0,
    allocatedPaid: 0,
    installmentPaid: 0,
    paid: 0,
    residual: 0,
    carryover: 0,
    balance: 0,
  });
  const getRow = (unitId) => {
    if (!rowsByUnit.has(unitId)) rowsByUnit.set(unitId, createRow(unitId));
    return rowsByUnit.get(unitId);
  };

  allocations.forEach((allocation, index) => {
    if (!allocation.unit_id) return;
    const row = getRow(allocation.unit_id);
    const amount = Number(allocation.amount || 0);
    const paidAmount = Number(allocation.paid_amount || 0);
    row.allocated += amount;
    row.allocatedPaid += paidAmount;

    const linkedKey = allocationKey(allocation.ledger_entry_id, allocation.unit_id);
    const groupKey = linkedKey || "unlinked:" + allocation.unit_id + ":" + (allocation.id ?? index);
    const groups = allocationGroupsByUnit.get(allocation.unit_id) || new Map();
    const group = groups.get(groupKey) || { key: linkedKey, amount: 0, paid: 0 };
    group.amount += amount;
    group.paid += paidAmount;
    groups.set(groupKey, group);
    allocationGroupsByUnit.set(allocation.unit_id, groups);
    if (linkedKey) allocationGroupsByKey.set(linkedKey, group);
  });

  const addInstallment = (unitId, amount, paidAmount, ledgerEntryId) => {
    if (!unitId) return;
    const row = getRow(unitId);
    const installmentAmount = Number(amount || 0);
    const installmentPaid = Number(paidAmount || 0);
    row.installments += installmentAmount;
    row.installmentPaid += installmentPaid;
    const key = allocationKey(ledgerEntryId, unitId);
    if (key && allocationGroupsByKey.has(key)) {
      const coverage = installmentCoverageByKey.get(key) || { amount: 0, paid: 0 };
      coverage.amount += installmentAmount;
      coverage.paid += installmentPaid;
      installmentCoverageByKey.set(key, coverage);
    } else {
      const standalone = standaloneInstallmentsByUnit.get(unitId) || { amount: 0, paid: 0 };
      standalone.amount += installmentAmount;
      standalone.paid += installmentPaid;
      standaloneInstallmentsByUnit.set(unitId, standalone);
    }
  };

  for (const installment of installments) {
    if (installment.unit_id) {
      addInstallment(installment.unit_id, installment.amount, installment.paid_amount, installment.ledger_entry_id);
      continue;
    }
    if (!installment.member_id || !installment.ledger_entry_id) continue;
    const ownerUnitIds = [...new Set(members
      .filter((member) => member.id === installment.member_id && member.active && member.unit_id)
      .map((member) => member.unit_id))];
    if (!ownerUnitIds.length) continue;
    const ownerAllocations = allocations
      .filter((allocation) => allocation.ledger_entry_id === installment.ledger_entry_id && ownerUnitIds.includes(allocation.unit_id))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const allocationTotal = ownerAllocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
    if (allocationTotal <= 0) continue;
    let allocatedAmount = 0;
    let allocatedPaid = 0;
    ownerAllocations.forEach((allocation, index) => {
      const isLast = index === ownerAllocations.length - 1;
      const amount = isLast
        ? cents(Number(installment.amount || 0) - allocatedAmount)
        : cents(Number(installment.amount || 0) * Number(allocation.amount || 0) / allocationTotal);
      const paid = isLast
        ? cents(Number(installment.paid_amount || 0) - allocatedPaid)
        : cents(Number(installment.paid_amount || 0) * Number(allocation.amount || 0) / allocationTotal);
      allocatedAmount += amount;
      allocatedPaid += paid;
      addInstallment(allocation.unit_id, amount, paid, installment.ledger_entry_id);
    });
  }

  for (const carryover of (yearId === "all" ? [] : carryovers)) {
    if (carryover.unit_id) getRow(carryover.unit_id);
  }

  return Array.from(rowsByUnit.values()).map((row) => {
    let paid = 0;
    let residual = 0;
    for (const group of allocationGroupsByUnit.get(row.unitId)?.values() || []) {
      const coverage = group.key ? installmentCoverageByKey.get(group.key) || { amount: 0, paid: 0 } : { amount: 0, paid: 0 };
      const allocationAmount = Math.max(0, group.amount);
      const coveredAmount = Math.min(allocationAmount, Math.max(0, coverage.amount));
      const coveredPaid = Math.min(coveredAmount, Math.max(0, coverage.paid));
      const uncoveredAmount = Math.max(0, allocationAmount - coveredAmount);
      const uncoveredPaid = Math.min(uncoveredAmount, Math.max(0, group.paid - coveredPaid));
      paid += coveredPaid + uncoveredPaid;
      residual += Math.max(0, allocationAmount - coveredPaid - uncoveredPaid);
    }
    const standalone = standaloneInstallmentsByUnit.get(row.unitId) || { amount: 0, paid: 0 };
    const standaloneAmount = Math.max(0, standalone.amount);
    const standalonePaid = Math.min(standaloneAmount, Math.max(0, standalone.paid));
    paid += standalonePaid;
    residual += Math.max(0, standaloneAmount - standalonePaid);
    const unitCarryovers = yearId === "all" ? [] : carryovers.filter((carryover) => carryover.unit_id === row.unitId);
    const carryover = unitCarryovers.reduce((sum, item) => sum + (item.kind === "Debito"
      ? Math.abs(Number(item.balance || 0))
      : -Math.abs(Number(item.balance || 0))), 0);
    return {
      ...row,
      paid,
      residual,
      carryover,
      balance: cents(residual + carryover),
    };
  }).sort((a, b) => a.unitCode.localeCompare(b.unitCode, "it"));
}
