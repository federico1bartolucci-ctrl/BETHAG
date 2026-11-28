import assert from "node:assert/strict";
import { calculateRendicontoUnitBalances } from "../src/lib/accountingRendicontoUnitBalance.js";

// Reproduce the previous unit-level switch: once any installment existed for the
// unit, direct allocations from other ledger entries were ignored.
const allocations = [
  { id: "a1", ledger_entry_id: "expense-1", unit_id: "u1", amount: 100, paid_amount: 30 },
  { id: "a2", ledger_entry_id: "expense-2", unit_id: "u1", amount: 40, paid_amount: 10 },
];
const installments = [
  { id: "i1", ledger_entry_id: "expense-1", unit_id: "u1", member_id: null, amount: 100, paid_amount: 30 },
];
const legacyResidual = Math.max(
  0,
  installments.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    - installments.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0),
);
assert.equal(legacyResidual, 70, "baseline must reproduce omission of the unlinked 40 allocation");

const result = calculateRendicontoUnitBalances({
  allocations,
  installments,
  units: [{ id: "u1", unit_code: "A-1" }],
  members: [],
  carryovers: [],
  yearId: "2026",
});
assert.deepEqual(result, [{
  unitId: "u1",
  unitCode: "A-1",
  allocated: 140,
  installments: 100,
  allocatedPaid: 40,
  installmentPaid: 30,
  paid: 40,
  residual: 100,
  carryover: 0,
  balance: 100,
}]);

// Fully installment-covered allocation is not counted twice.
const fullyCovered = calculateRendicontoUnitBalances({
  allocations: [{ id: "a", ledger_entry_id: "l1", unit_id: "u1", amount: 100, paid_amount: 30 }],
  installments: [{ id: "i", ledger_entry_id: "l1", unit_id: "u1", member_id: null, amount: 100, paid_amount: 30 }],
  units: [{ id: "u1", unit_code: "A-1" }],
});
assert.equal(fullyCovered[0].residual, 70);
assert.equal(fullyCovered[0].paid, 30);

// Member-level installments remain split proportionally with the cent remainder
// assigned to the final unit, while both allocations are covered.
const memberSplit = calculateRendicontoUnitBalances({
  allocations: [
    { id: "a1", ledger_entry_id: "l2", unit_id: "u1", amount: 60, paid_amount: 0 },
    { id: "a2", ledger_entry_id: "l2", unit_id: "u2", amount: 40, paid_amount: 0 },
  ],
  installments: [{ id: "i2", ledger_entry_id: "l2", member_id: "m1", unit_id: null, amount: 100, paid_amount: 33.33 }],
  units: [{ id: "u1", unit_code: "A-1" }, { id: "u2", unit_code: "A-2" }],
  members: [{ id: "m1", unit_id: "u1", active: true }, { id: "m1", unit_id: "u2", active: true }],
});
assert.equal(memberSplit.reduce((sum, row) => sum + row.installments, 0), 100);
assert.equal(memberSplit.reduce((sum, row) => sum + row.installmentPaid, 0), 33.33);
assert.equal(memberSplit.reduce((sum, row) => sum + row.residual, 0), 66.67);

// Unlinked allocations and opening carryovers still contribute.
const carryoverResult = calculateRendicontoUnitBalances({
  allocations: [{ id: "a3", ledger_entry_id: null, unit_id: "u3", amount: 20, paid_amount: 5 }],
  units: [{ id: "u3", unit_code: "B-1" }],
  carryovers: [{ unit_id: "u3", kind: "Debito", balance: 12 }],
  yearId: "2026",
});
assert.equal(carryoverResult[0].residual, 15);
assert.equal(carryoverResult[0].carryover, 12);
assert.equal(carryoverResult[0].balance, 27);

console.log("Accounting rendiconto per-unit mixed installments runtime regression: PASS");

// Regression: a linked installment plan that covers only part of its allocation
// must not mark the entire allocation as covered.
const partialCoverage = calculateRendicontoUnitBalances({
  allocations: [{ id:"partial-a", ledger_entry_id:"partial-ledger", unit_id:"u1", amount:100, paid_amount:10 }],
  installments: [{ id:"partial-i", ledger_entry_id:"partial-ledger", unit_id:"u1", member_id:null, amount:40, paid_amount:10 }],
  units: [{ id:"u1", unit_code:"A-1" }],
});
assert.equal(partialCoverage[0].installments, 40);
assert.equal(partialCoverage[0].installmentPaid, 10);
assert.equal(partialCoverage[0].paid, 10);
assert.equal(partialCoverage[0].residual, 90, "40 scheduled (10 paid) plus 60 uncovered must leave 90 outstanding");

// Multiple installment rows accumulate coverage instead of boolean coverage.
const multiplePartialCoverage = calculateRendicontoUnitBalances({
  allocations: [{ id:"multi-a", ledger_entry_id:"multi-ledger", unit_id:"u1", amount:100, paid_amount:25 }],
  installments: [
    { id:"multi-i1", ledger_entry_id:"multi-ledger", unit_id:"u1", member_id:null, amount:30, paid_amount:10 },
    { id:"multi-i2", ledger_entry_id:"multi-ledger", unit_id:"u1", member_id:null, amount:20, paid_amount:15 },
  ],
  units: [{ id:"u1", unit_code:"A-1" }],
});
assert.equal(multiplePartialCoverage[0].paid, 25);
assert.equal(multiplePartialCoverage[0].residual, 75);

// Regression: linked installments must not exceed the unit allocation in the unit report.
// An over-scheduled linked plan previously reported residual 90 (120 scheduled - 30 paid)
// for a 100 allocation; correct unpaid amount is 70.
const overScheduled = calculateRendicontoUnitBalances({
  allocations: [{ id: "a-over", ledger_entry_id: "over-ledger", unit_id: "u1", amount: 100, paid_amount: 30 }],
  installments: [{ id: "i-over", ledger_entry_id: "over-ledger", unit_id: "u1", member_id: null, amount: 120, paid_amount: 30 }],
  units: [{ id: "u1", unit_code: "A-1" }],
});
assert.equal(overScheduled[0].installments, 120, "raw scheduled total remains visible");
assert.equal(overScheduled[0].paid, 30);
assert.equal(overScheduled[0].residual, 70, "linked residual must be capped at the allocation residual");

// A separate manual installment remains additive and must not be absorbed by the linked-plan cap.
const overScheduledPlusManual = calculateRendicontoUnitBalances({
  allocations: [{ id: "a-over", ledger_entry_id: "over-ledger", unit_id: "u1", amount: 100, paid_amount: 30 }],
  installments: [
    { id: "i-over", ledger_entry_id: "over-ledger", unit_id: "u1", member_id: null, amount: 120, paid_amount: 30 },
    { id: "i-manual", ledger_entry_id: null, unit_id: "u1", member_id: null, amount: 20, paid_amount: 0 },
  ],
  units: [{ id: "u1", unit_code: "A-1" }],
});
assert.equal(overScheduledPlusManual[0].paid, 30);
assert.equal(overScheduledPlusManual[0].residual, 90, "standalone manual installment must remain separate");
console.log("Accounting rendiconto over-scheduled installment guard: PASS");


// A superseded Accorpata row must not be added on top of the active unified installment.
// The legacy row would otherwise make the same 100-euro allocation appear fully paid.
const consolidatedOnly = calculateRendicontoUnitBalances({
  allocations: [{ id:"a-consolidated", ledger_entry_id:"l-consolidated", unit_id:"u1", amount:100, paid_amount:0 }],
  installments: [
    { id:"old-unit-row", ledger_entry_id:"l-consolidated", unit_id:"u1", member_id:null, amount:100, paid_amount:100, status:"Accorpata" },
    { id:"active-owner-row", ledger_entry_id:"l-consolidated", unit_id:null, member_id:"m1", amount:100, paid_amount:30, status:"Da pagare" },
  ],
  units: [{ id:"u1", unit_code:"A-1" }],
  members: [{ id:"m1", unit_id:"u1", active:true }],
  yearId: "2026",
});
assert.equal(consolidatedOnly[0].installments, 100, "only the active unified installment must be counted");
assert.equal(consolidatedOnly[0].installmentPaid, 30);
assert.equal(consolidatedOnly[0].paid, 30, "the historical Accorpata payment must not be counted again");
assert.equal(consolidatedOnly[0].residual, 70, "the active installment must retain its actual 70-euro residual");
