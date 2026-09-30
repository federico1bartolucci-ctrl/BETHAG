import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type Condominium = {
  id: number;
  name: string;
};
type DocumentOption = { id:number; name:string; condominiumId:number; category:string; aiStatus:string; extractedData:string; aiSummary:string; };

type FiscalYear = {
  id: string;
  condominium_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "Aperto" | "Chiuso" | "Provvisorio";
  opening_balance: number;
  notes: string;
};

type LedgerEntry = {
  id: string;
  condominium_id: string;
  fiscal_year_id: string | null;
  entry_date: string;
  direction: "Entrata" | "Uscita";
  expense_type: "Ordinaria" | "Straordinaria";
  category: string;
  description: string;
  amount: number;
  payment_status: "Da pagare" | "Parzialmente pagato" | "Pagato";
  due_date: string;
  supplier_id: string | null;
  unit_id: string | null;
  member_id: string | null;
  document_id: string | null;
  fund_id: string | null;
  notes: string;
};

type Fund = {
  id: string;
  condominium_id: string;
  name: string;
  purpose: string;
  target_amount: number;
  allocated_amount: number;
  used_amount: number;
  active: boolean;
  notes: string;
};

type TaxObligation = {
  id: string;
  condominium_id: string;
  title: string;
  category: string;
  due_date: string;
  amount: number;
  status: string;
  notes: string;
};

type LegalCase = {
  id: string;
  condominium_id: string;
  title: string;
  counterpart: string;
  status: string;
  opened_date: string;
  closed_date: string;
  notes: string;
};

type Allocation = {
  id: string;
  condominium_id: string;
  ledger_entry_id: string;
  allocation_table_id: string | null;
  unit_id: string;
  member_id: string | null;
  allocation_basis: string;
  millesimi: number;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  notes: string;
};

type UnitOption = { id: string; condominium_id: string; unit_code: string; data: any };

type MillesimalTable = { id:string; condominium_id:string; name:string; description:string; total_millesimi:number; active:boolean; notes:string; basis_type:"Millesimi"|"Quote personalizzate"|"Consumo"|"Misto"; scope_mode:"all"|"units"|"buildings"; scope_unit_ids:string[]; scope_building_codes:string[] };
type MillesimalValue = { id:string; condominium_id:string; table_id:string; unit_id:string; value:number; excluded:boolean; notes:string };
type ConsumptionReading = { id:string; condominium_id:string; fiscal_year_id:string|null; unit_id:string; service_type:string; period_start:string|null; period_end:string|null; meter_code:string; previous_reading:number|null; current_reading:number|null; consumption:number|null; kwh:number|null; allocation_value:number|null; charge_amount:number|null; source:string; notes:string; data:any };
type AllocationRule = { id:string; condominium_id:string; name:string; expense_type:string|null; category:string|null; allocation_table_id:string; priority:number; active:boolean; notes:string };
type AllocationPreviewRow = { unit_id:string; unit_code:string; millesimi:number; amount:number };
type AllocationIntake = { id:string; condominium_id:string; source:"Manuale"|"AI"|"Importazione"; status:"Bozza"|"Da verificare"|"Confermato"|"Annullato"; document_id:string|null; ledger_entry_id:string|null; allocation_table_id:string|null; title:string; description:string; expense_amount:number|null; extracted_data:any; rows:any[]; validation_errors:any[]; notes:string; created_by:string|null; confirmed_by:string|null; confirmed_at:string|null; created_at:string; };
type Installment = { id:string; condominium_id:string; fiscal_year_id:string|null; member_id:string|null; unit_id:string|null; title:string; due_date:string; amount:number; paid_amount:number; status:string; notes:string };
type BudgetItem = { id:string; condominium_id:string; fiscal_year_id:string|null; category:string; description:string; amount:number; notes:string };
type FiscalCarryover = { id:string; condominium_id:string; source_fiscal_year_id:string; target_fiscal_year_id:string; unit_id:string|null; member_id:string|null; balance:number; kind:"Debito"|"Credito"; status:"Da riportare"|"Parzialmente compensato"|"Compensato"; notes:string };
type Tab = "rendiconto" | "movimenti" | "ripartizioni" | "millesimi" | "consumi" | "rate" | "fondi" | "fiscale" | "contenzioso" | "impostazioni";
type AccountingSettings = { id:string; condominium_id:string; accounting_start_date:string; accounting_end_date:string; ordinary_installment_count:number; ordinary_due_dates:string[]; extraordinary_mode:"integrata"|"separata"; extraordinary_allow_multi_year:boolean; };

const emptyLedger: Omit<LedgerEntry, "id" | "condominium_id"> = {
  fiscal_year_id: null,
  entry_date: new Date().toISOString().slice(0, 10),
  direction: "Uscita",
  expense_type: "Ordinaria",
  category: "Manutenzione",
  description: "",
  amount: 0,
  payment_status: "Da pagare",
  due_date: "",
  supplier_id: null,
  unit_id: null,
  member_id: null,
  document_id: null,
  fund_id: null,
  notes: "",
};

function money(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function AccountingPage({
  workspaceId,
  condominiums,
  isAdministrator = false,
  aiEnabled = false,
  documents = [],
}: {
  workspaceId: string;
  condominiums: Condominium[];
  isAdministrator?: boolean;
  aiEnabled?: boolean;
  documents?: DocumentOption[];
}) {
  const [tab, setTab] = useState<Tab>("rendiconto");
  const [selectedCondominiumId, setSelectedCondominiumId] = useState<number | "all">(
    condominiums[0]?.id ?? "all"
  );
  const [dbCondominiumId, setDbCondominiumId] = useState<string | null>(null);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [taxes, setTaxes] = useState<TaxObligation[]>([]);
  const [legalCases, setLegalCases] = useState<LegalCase[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocationIntakes, setAllocationIntakes] = useState<AllocationIntake[]>([]);
  const [showAllocationIntakeForm, setShowAllocationIntakeForm] = useState(false);
  const [allocationIntakeForm, setAllocationIntakeForm] = useState({ source:"Manuale" as "Manuale"|"AI"|"Importazione", title:"", description:"", document_id:"", ledger_entry_id:"", allocation_table_id:"", expense_amount:0, rows:[] as Array<{unit_id:string;millesimi:number;amount:number}>, notes:"" });
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [millesimalTables, setMillesimalTables] = useState<MillesimalTable[]>([]);
  const [millesimalValues, setMillesimalValues] = useState<MillesimalValue[]>([]);
  const [consumptionReadings, setConsumptionReadings] = useState<ConsumptionReading[]>([]);
  const [allocationRules, setAllocationRules] = useState<AllocationRule[]>([]);
  const [allocationRuleForm, setAllocationRuleForm] = useState({name:"",expense_type:"",category:"",allocation_table_id:"",priority:100,active:true,notes:""});
  const [consumptionForm, setConsumptionForm] = useState({ fiscal_year_id:"", unit_id:"", service_type:"Riscaldamento", meter_code:"", period_start:"", period_end:"", previous_reading:"", current_reading:"", consumption:"", kwh:"", allocation_value:"", charge_amount:"", source:"Manuale", notes:"" });
  const [consumptionExpenseForm, setConsumptionExpenseForm] = useState({ ledger_entry_id:"", fiscal_year_id:"", service_type:"Riscaldamento" });
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [carryovers, setCarryovers] = useState<FiscalCarryover[]>([]);
  const [accountingSettings, setAccountingSettings] = useState<AccountingSettings | null>(null);
  const [accountingSettingsForm, setAccountingSettingsForm] = useState({ accounting_start_date:new Date().getFullYear()+"-01-01", accounting_end_date:new Date().getFullYear()+"-12-31", ordinary_installment_count:12, ordinary_due_dates:"", extraordinary_mode:"separata" as "integrata"|"separata", extraordinary_allow_multi_year:true });
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [budgetForm, setBudgetForm] = useState({ fiscal_year_id:"", category:"Manutenzione", description:"", amount:0, notes:"" });
  const [showMillesimalForm, setShowMillesimalForm] = useState(false);
  const [showInstallmentForm, setShowInstallmentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentInstallment, setPaymentInstallment] = useState<Installment | null>(null);
  const [paymentForm, setPaymentForm] = useState({ payment_date:new Date().toISOString().slice(0,10), amount:0, method:"Bonifico", reference:"", notes:"" });
  const [showMillesimalValueForm, setShowMillesimalValueForm] = useState(false);
  const [showBulkMillesimalForm, setShowBulkMillesimalForm] = useState(false);
  const [bulkMillesimalTableId, setBulkMillesimalTableId] = useState("");
  const [bulkMillesimalValues, setBulkMillesimalValues] = useState<Record<string, number>>({});
  const [millesimalValueForm, setMillesimalValueForm] = useState({ table_id:"", unit_id:"", value:0, excluded:false, notes:"" });
  const [millesimalForm, setMillesimalForm] = useState({ name:"Tabella generale", description:"", total_millesimi:1000, active:true, notes:"", basis_type:"Millesimi" as MillesimalTable["basis_type"], scope_mode:"all" as MillesimalTable["scope_mode"], scope_unit_ids:[] as string[], scope_building_codes:"" });
  const [installmentForm, setInstallmentForm] = useState({ title:"", fiscal_year_id:"", unit_id:"", due_date:"", amount:0, paid_amount:0, status:"Da pagare", notes:"" });
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [showAutoAllocationForm, setShowAutoAllocationForm] = useState(false);
  const [autoAllocationForm, setAutoAllocationForm] = useState({ ledger_entry_id:"", table_id:"", due_date:"" });
  const [autoPreview, setAutoPreview] = useState<AllocationPreviewRow[]>([]);
  const [showInstallmentsFromAllocation, setShowInstallmentsFromAllocation] = useState(false);
  const [allocationInstallmentForm, setAllocationInstallmentForm] = useState({ ledger_entry_id:"", title:"", due_date:"", fiscal_year_id:"", installment_count:1, due_dates:Array(1).fill("") as string[], percentages:[100] as number[] });
  const [allocationForm, setAllocationForm] = useState({
    ledger_entry_id: "",
    unit_id: "",
    allocation_basis: "Millesimi generali",
    millesimi: 0,
    amount: 0,
    paid_amount: 0,
    due_date: "",
    status: "Da pagare",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showRendicontoPrint, setShowRendicontoPrint] = useState(false);
  const [editingLedger, setEditingLedger] = useState<LedgerEntry | null>(null);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [editingTax, setEditingTax] = useState<TaxObligation | null>(null);
  const [editingCase, setEditingCase] = useState<LegalCase | null>(null);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showFundForm, setShowFundForm] = useState(false);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [yearForm, setYearForm] = useState({
    name: "",
    start_date: new Date().getFullYear() + "-01-01",
    end_date: new Date().getFullYear() + "-12-31",
    status: "Aperto" as FiscalYear["status"],
    opening_balance: 0,
    notes: "",
  });
  const [ledgerForm, setLedgerForm] = useState({ ...emptyLedger });
  const [fundForm, setFundForm] = useState({
    name: "",
    purpose: "",
    target_amount: 0,
    allocated_amount: 0,
    used_amount: 0,
    active: true,
    notes: "",
  });
  const [taxForm, setTaxForm] = useState({
    title: "",
    category: "Fiscale",
    due_date: "",
    amount: 0,
    status: "Da verificare",
    notes: "",
  });
  const [caseForm, setCaseForm] = useState({
    title: "",
    counterpart: "",
    status: "Aperto",
    opened_date: new Date().toISOString().slice(0, 10),
    closed_date: "",
    notes: "",
  });

  const selectedCondominium = useMemo(
    () => condominiums.find((c) => c.id === selectedCondominiumId) ?? null,
    [condominiums, selectedCondominiumId]
  );

  const selectedName =
    selectedCondominium?.name ?? "Tutti i condomini";

  const scopedYears = useMemo(
    () =>
      dbCondominiumId
        ? fiscalYears.filter((y) => y.condominium_id === dbCondominiumId)
        : fiscalYears,
    [dbCondominiumId, fiscalYears]
  );

  const scopedLedger = useMemo(
    () =>
      dbCondominiumId
        ? ledger.filter((e) => e.condominium_id === dbCondominiumId)
        : ledger,
    [dbCondominiumId, ledger]
  );

  const allocationReconciliation = useMemo(() => scopedLedger.filter(e => e.direction === "Uscita").map(expense => {
    const rows = allocations.filter(a => a.ledger_entry_id === expense.id && (!dbCondominiumId || a.condominium_id === dbCondominiumId));
    const allocated = rows.reduce((s,a) => s + Number(a.amount || 0), 0);
    const difference = Number(expense.amount || 0) - allocated;
    return { id:expense.id, description:expense.description, amount:Number(expense.amount||0), allocated, difference, balanced:Math.abs(difference)<0.005 };
  }), [scopedLedger, allocations, dbCondominiumId]);
  const scopedFunds = useMemo(
    () =>
      dbCondominiumId
        ? funds.filter((f) => f.condominium_id === dbCondominiumId)
        : funds,
    [dbCondominiumId, funds]
  );

  const scopedTaxes = useMemo(
    () =>
      dbCondominiumId
        ? taxes.filter((t) => t.condominium_id === dbCondominiumId)
        : taxes,
    [dbCondominiumId, taxes]
  );


  const scopedMillesimalTables = useMemo(() => dbCondominiumId ? millesimalTables.filter(t=>t.condominium_id===dbCondominiumId) : millesimalTables,[dbCondominiumId,millesimalTables]);
  const scopedMillesimalValues = useMemo(() => dbCondominiumId ? millesimalValues.filter(v=>v.condominium_id===dbCondominiumId) : millesimalValues,[dbCondominiumId,millesimalValues]);
  const millesimalTableChecks = useMemo(() => scopedMillesimalTables.map(t => {
    const allUnits = units.filter(u => !dbCondominiumId || u.condominium_id === dbCondominiumId);
    const scopedUnits = allUnits.filter(u => t.scope_mode === "all" || (t.scope_mode === "units" && t.scope_unit_ids.includes(u.id)) || (t.scope_mode === "buildings" && t.scope_building_codes.some(code => code.trim().toLowerCase() === String((u as any).building_code || "").trim().toLowerCase())));
    const values = scopedUnits.map(u => scopedMillesimalValues.find(v => v.table_id === t.id && v.unit_id === u.id)).filter(Boolean) as MillesimalValue[];
    const eligible = values.filter(v => !v.excluded);
    const sum = eligible.reduce((s,v) => s + Number(v.value || 0), 0);
    const missing = scopedUnits.filter(u => !scopedMillesimalValues.some(v => v.table_id === t.id && v.unit_id === u.id));
    return { id:t.id, total:Number(t.total_millesimi||0), sum, count:values.length, missingCount:missing.length, complete:scopedUnits.length>0 && missing.length===0 && Math.abs(sum-Number(t.total_millesimi||0))<0.001 };
  }), [scopedMillesimalTables, scopedMillesimalValues, units, dbCondominiumId]);
  const scopedInstallments = useMemo(() => dbCondominiumId ? installments.filter(i=>i.condominium_id===dbCondominiumId) : installments,[dbCondominiumId,installments]);
  const scopedConsumptionReadings = useMemo(() => dbCondominiumId ? consumptionReadings.filter(r=>r.condominium_id===dbCondominiumId) : consumptionReadings,[dbCondominiumId,consumptionReadings]);
  const scopedBudgets = useMemo(() => dbCondominiumId ? budgets.filter(b=>b.condominium_id===dbCondominiumId) : budgets,[dbCondominiumId,budgets]);

  const scopedCases = useMemo(
    () =>
      dbCondominiumId
        ? legalCases.filter((c) => c.condominium_id === dbCondominiumId)
        : legalCases,
    [dbCondominiumId, legalCases]
  );

  const arrears = useMemo(() => scopedInstallments.reduce((s,i)=>s+Math.max(0,Number(i.amount)-Number(i.paid_amount)),0),[scopedInstallments]);

  const [rendicontoYearId, setRendicontoYearId] = useState<string>("all");

  useEffect(() => {
    setRendicontoYearId("all");
  }, [selectedCondominiumId]);

  const rendicontoYear = useMemo(
    () => scopedYears.find((y) => y.id === rendicontoYearId) ?? null,
    [scopedYears, rendicontoYearId]
  );

  const scopedCarryovers = useMemo(() => dbCondominiumId ? carryovers.filter(c => c.condominium_id === dbCondominiumId) : carryovers,[dbCondominiumId,carryovers]);
  const rendicontoCarryovers = useMemo(() => rendicontoYearId === "all" ? scopedCarryovers : scopedCarryovers.filter(c => c.target_fiscal_year_id === rendicontoYearId), [scopedCarryovers, rendicontoYearId]);
  const carryoverDebt = useMemo(() => rendicontoCarryovers.filter(c => c.kind === "Debito").reduce((s,c)=>s+Number(c.balance||0),0),[rendicontoCarryovers]);
  const carryoverCredit = useMemo(() => rendicontoCarryovers.filter(c => c.kind === "Credito").reduce((s,c)=>s+Math.abs(Number(c.balance||0)),0),[rendicontoCarryovers]);

  const rendicontoLedger = useMemo(
    () => rendicontoYearId === "all"
      ? scopedLedger
      : scopedLedger.filter((e) => e.fiscal_year_id === rendicontoYearId),
    [scopedLedger, rendicontoYearId]
  );

  const rendicontoAllocations = useMemo(
    () => rendicontoYearId === "all"
      ? allocations.filter((a) => !dbCondominiumId || a.condominium_id === dbCondominiumId)
      : allocations.filter((a) => (!dbCondominiumId || a.condominium_id === dbCondominiumId) && rendicontoLedger.some((e) => e.id === a.ledger_entry_id)),
    [allocations, dbCondominiumId, rendicontoLedger, rendicontoYearId]
  );

  const rendicontoInstallments = useMemo(
    () => rendicontoYearId === "all"
      ? scopedInstallments
      : scopedInstallments.filter((i) => i.fiscal_year_id === rendicontoYearId),
    [scopedInstallments, rendicontoYearId]
  );

  const rendicontoBudgets = useMemo(
    () => rendicontoYearId === "all"
      ? scopedBudgets
      : scopedBudgets.filter((b) => b.fiscal_year_id === rendicontoYearId),
    [scopedBudgets, rendicontoYearId]
  );

  const budgetSummary = useMemo(() => {
    const rows = new Map<string, { category:string; budget:number; actual:number }>();
    for (const b of rendicontoBudgets) {
      const row = rows.get(b.category) ?? { category:b.category, budget:0, actual:0 };
      row.budget += Number(b.amount || 0);
      rows.set(b.category, row);
    }
    for (const e of rendicontoLedger.filter((x) => x.direction === "Uscita")) {
      const row = rows.get(e.category) ?? { category:e.category, budget:0, actual:0 };
      row.actual += Number(e.amount || 0);
      rows.set(e.category, row);
    }
    return Array.from(rows.values()).map((r) => ({ ...r, variance:r.budget-r.actual }))
      .sort((a,b) => a.category.localeCompare(b.category,"it"));
  }, [rendicontoBudgets, rendicontoLedger]);

  const quadratura = useMemo(() => {
    const expenses = rendicontoLedger.filter(e => e.direction === "Uscita").reduce((s,e) => s + Number(e.amount || 0), 0);
    const allocated = rendicontoAllocations.reduce((s,a) => s + Number(a.amount || 0), 0);
    const installments = rendicontoInstallments.reduce((s,i) => s + Number(i.amount || 0), 0);
    const paidInstallments = rendicontoInstallments.reduce((s,i) => s + Number(i.paid_amount || 0), 0);
    const budget = rendicontoBudgets.reduce((s,b) => s + Number(b.amount || 0), 0);
    const allocationGap = expenses - allocated;
    const installmentGap = allocated - installments;
    const collectionGap = installments - paidInstallments;
    const budgetVariance = budget - expenses;
    return {
      expenses, allocated, installments, paidInstallments, budget,
      allocationGap, installmentGap, collectionGap, budgetVariance,
      balancedAllocations: Math.abs(allocationGap) < 0.01,
      balancedInstallments: Math.abs(installmentGap) < 0.01,
    };
  }, [rendicontoLedger, rendicontoAllocations, rendicontoInstallments, rendicontoBudgets]);

  const rendicontoSummary = useMemo(() => {
    const income = rendicontoLedger.filter((e) => e.direction === "Entrata").reduce((s,e) => s + Number(e.amount || 0), 0);
    const expenses = rendicontoLedger.filter((e) => e.direction === "Uscita").reduce((s,e) => s + Number(e.amount || 0), 0);
    const paidExpenses = rendicontoLedger.filter((e) => e.direction === "Uscita" && e.payment_status === "Pagato").reduce((s,e) => s + Number(e.amount || 0), 0);
    const unpaidExpenses = Math.max(0, expenses - paidExpenses);
    const allocated = rendicontoAllocations.reduce((s,a) => s + Number(a.amount || 0), 0);
    const allocatedPaid = rendicontoAllocations.reduce((s,a) => s + Number(a.paid_amount || 0), 0);
    const installmentsAmount = rendicontoInstallments.reduce((s,i) => s + Number(i.amount || 0), 0);
    const installmentsPaid = rendicontoInstallments.reduce((s,i) => s + Number(i.paid_amount || 0), 0);
    const installmentsResidual = Math.max(0, installmentsAmount - installmentsPaid);
    const opening = rendicontoYear ? Number(rendicontoYear.opening_balance || 0) : 0;
    const closing = opening + income - expenses;
    const fundsAllocated = scopedFunds.reduce((s,f) => s + Number(f.allocated_amount || 0), 0);
    const fundsUsed = scopedFunds.reduce((s,f) => s + Number(f.used_amount || 0), 0);
    return { income, expenses, paidExpenses, unpaidExpenses, allocated, allocatedPaid, installmentsAmount, installmentsPaid, installmentsResidual, opening, closing, fundsAllocated, fundsUsed };
  }, [rendicontoLedger, rendicontoAllocations, rendicontoInstallments, rendicontoYear, scopedFunds]);

  const rendicontoByUnit = useMemo(() => {
    const map = new Map<string, { unitId:string; unitCode:string; allocated:number; installments:number; paid:number; residual:number }>();
    for (const a of rendicontoAllocations) {
      const unit = units.find((u) => u.id === a.unit_id);
      const row = map.get(a.unit_id) ?? { unitId:a.unit_id, unitCode:unit?.unit_code || "Unità non trovata", allocated:0, installments:0, paid:0, residual:0 };
      row.allocated += Number(a.amount || 0);
      row.paid += Number(a.paid_amount || 0);
      map.set(a.unit_id, row);
    }
    const installmentUnits = new Set<string>();
    for (const i of rendicontoInstallments) {
      if (!i.unit_id) continue;
      installmentUnits.add(i.unit_id);
      const unit = units.find((u) => u.id === i.unit_id);
      const row = map.get(i.unit_id) ?? { unitId:i.unit_id, unitCode:unit?.unit_code || "Unità non trovata", allocated:0, installments:0, paid:0, residual:0 };
      row.installments += Number(i.amount || 0);
      row.paid += Number(i.paid_amount || 0);
      map.set(i.unit_id, row);
    }
    return Array.from(map.values()).map((row) => {
      const installmentPaid = rendicontoInstallments
        .filter((i) => i.unit_id === row.unitId)
        .reduce((s,i) => s + Number(i.paid_amount || 0), 0);
      const paid = installmentUnits.has(row.unitId) ? installmentPaid : row.paid;
      return {
        ...row,
        paid,
        residual: installmentUnits.has(row.unitId)
          ? Math.max(0,row.installments-paid)
          : Math.max(0,row.allocated-paid)
      };
    }).sort((a,b) => a.unitCode.localeCompare(b.unitCode,"it"));
  }, [rendicontoAllocations, rendicontoInstallments, units]);

  const totals = useMemo(() => {
    const income = scopedLedger
      .filter((e) => e.direction === "Entrata")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expenses = scopedLedger
      .filter((e) => e.direction === "Uscita")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const due = scopedLedger
      .filter((e) => e.direction === "Uscita" && e.payment_status !== "Pagato")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return { income, expenses, balance: income - expenses, due };
  }, [scopedLedger]);

  async function resolveCondominium() {
    if (!supabase || selectedCondominiumId === "all") {
      setDbCondominiumId(null);
      return;
    }
    const { data, error: readError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", selectedCondominiumId)
      .maybeSingle();
    if (readError) throw readError;
    setDbCondominiumId(data?.id ?? null);
  }

  const rendicontoPrintStyles = `
    .rendiconto-print-sheet { display:none; }
    @media print {
      body * { visibility:hidden !important; }
      .rendiconto-print-sheet, .rendiconto-print-sheet * { visibility:visible !important; }
      .rendiconto-print-sheet { display:block !important; position:absolute; inset:0; padding:24px; background:white; color:black; font-family:Arial,sans-serif; }
      .rendiconto-print-sheet h1 { margin:0 0 8px; }
      .rendiconto-print-sheet h2 { margin:20px 0 8px; }
      .rendiconto-print-sheet p { margin:5px 0; }
    }
  `;
  function isFiscalYearClosed(yearId?: string | null) {
    return !!yearId && fiscalYears.some(y => y.id === yearId && y.status === "Chiuso");
  }

  function guardOpenFiscalYear(yearId?: string | null) {
    if (isFiscalYearClosed(yearId)) {
      setError("L'esercizio contabile selezionato è chiuso. Riaprilo prima di modificare i dati.");
      return false;
    }
    return true;
  }

  function printRendiconto() {
    setShowRendicontoPrint(true);
    setTimeout(() => window.print(), 100);
  }

  async function load() {
    if (!supabase) {
      setError("Supabase non configurato.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resolveCondominium();
      const [yearsResult, ledgerResult, fundsResult, taxResult, caseResult, allocationsResult, allocationIntakesResult, unitsResult, millesimalTablesResult, millesimalValuesResult, installmentsResult, budgetsResult] =
        await Promise.all([
          supabase
            .from("condominium_fiscal_years")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("start_date", { ascending: false }),
          supabase
            .from("condominium_ledger_entries")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("entry_date", { ascending: false }),
          supabase
            .from("condominium_funds")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("name"),
          supabase
            .from("condominium_tax_obligations")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("due_date"),
          supabase
            .from("condominium_legal_cases")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("opened_date", { ascending: false }),
          supabase
            .from("condominium_expense_allocations")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("due_date"),
          supabase
            .from("condominium_allocation_intakes")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false }),
          supabase
            .from("condominium_units")
            .select("id, condominium_id, unit_code, data")
            .eq("workspace_id", workspaceId)
            .order("unit_code"),
          supabase
            .from("condominium_millesimal_tables")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("name"),
          supabase
            .from("condominium_millesimal_values")
            .select("*")
            .eq("workspace_id", workspaceId),
          supabase
            .from("condominium_installments")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("due_date"),
          supabase
            .from("condominium_budgets")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("category"),
          supabase
            .from("condominium_fiscal_carryovers")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at"),
          supabase.from("condominium_accounting_settings").select("*").eq("workspace_id", workspaceId),
        ]);
      for (const result of [
        yearsResult,
        ledgerResult,
        fundsResult,
        taxResult,
        caseResult,
        allocationsResult,
        unitsResult,
        millesimalTablesResult,
        millesimalValuesResult,
        consumptionReadingsResult,
        allocationRulesResult,
        installmentsResult,
        budgetsResult,
        carryoversResult,
        settingsResult,
      ]) {
        if (result.error) throw result.error;
      }
      setFiscalYears((yearsResult.data ?? []) as FiscalYear[]);
      setLedger((ledgerResult.data ?? []) as LedgerEntry[]);
      setFunds((fundsResult.data ?? []) as Fund[]);
      setTaxes((taxResult.data ?? []) as TaxObligation[]);
      setLegalCases((caseResult.data ?? []) as LegalCase[]);
      setAllocations((allocationsResult.data ?? []) as Allocation[]);
      setAllocationIntakes((allocationIntakesResult.data ?? []) as AllocationIntake[]);
      setUnits((unitsResult.data ?? []) as UnitOption[]);
      setMillesimalTables((millesimalTablesResult.data ?? []) as MillesimalTable[]);
      setMillesimalValues((millesimalValuesResult.data ?? []) as MillesimalValue[]);
      setConsumptionReadings((consumptionReadingsResult.data ?? []) as ConsumptionReading[]);
      setAllocationRules((allocationRulesResult.data ?? []) as AllocationRule[]);
      setInstallments((installmentsResult.data ?? []) as Installment[]);
      setBudgets((budgetsResult.data ?? []) as BudgetItem[]);
      setCarryovers((carryoversResult.data ?? []) as FiscalCarryover[]);
      const settingsRow = (settingsResult.data ?? []).find((row:any) => row.condominium_id === dbCondominiumId) as AccountingSettings | undefined;
      if (settingsRow) { setAccountingSettings(settingsRow); setAccountingSettingsForm({accounting_start_date:settingsRow.accounting_start_date,accounting_end_date:settingsRow.accounting_end_date,ordinary_installment_count:Number(settingsRow.ordinary_installment_count||12),ordinary_due_dates:Array.isArray(settingsRow.ordinary_due_dates)?settingsRow.ordinary_due_dates.join(", "):"",extraordinary_mode:settingsRow.extraordinary_mode==="integrata"?"integrata":"separata",extraordinary_allow_multi_year:settingsRow.extraordinary_allow_multi_year!==false}); }
    } catch (e: any) {
      setError(e?.message || "Errore nel caricamento della contabilità.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [workspaceId, selectedCondominiumId]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  async function closeFiscalYear(year: FiscalYear) {
    if (!supabase) return;
    if (year.status === "Chiuso") return;
    if (!window.confirm("Confermi la chiusura dell'esercizio " + year.name + "? Dopo la chiusura non sarà possibile modificare movimenti, ripartizioni, rate, pagamenti e preventivi associati.")) return;
    setSaving(true);
    setError("");
    try {
      const { error: closeError } = await supabase.from("condominium_fiscal_years").update({ status: "Chiuso" }).eq("id", year.id).eq("workspace_id", workspaceId);
      if (closeError) throw closeError;
      const nextYear = fiscalYears.filter(y => y.condominium_id === year.condominium_id && y.id !== year.id && y.start_date > year.end_date).sort((a,b) => a.start_date.localeCompare(b.start_date))[0];
      if (nextYear) {
        const { data: carryCount, error: carryError } = await supabase.rpc("generate_fiscal_year_carryovers", { p_workspace_id: workspaceId, p_condominium_id: year.condominium_id, p_source_fiscal_year_id: year.id, p_target_fiscal_year_id: nextYear.id });
        if (carryError) throw carryError;
        flash("Esercizio chiuso. Partite riportate: " + Number(carryCount || 0) + ".");
      } else {
        flash("Esercizio chiuso. Il riporto sarà generato quando esisterà l'esercizio successivo.");
      }
      await load();
    } catch (e:any) {
      setError(e?.message || "Impossibile chiudere l'esercizio.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAccountingSettings(e: React.FormEvent) {
    e.preventDefault(); if(!supabase||!dbCondominiumId)return;
    const count=Number(accountingSettingsForm.ordinary_installment_count); const dates=accountingSettingsForm.ordinary_due_dates.split(/[,;\\n]+/).map(s=>s.trim()).filter(Boolean);
    if(accountingSettingsForm.accounting_start_date>accountingSettingsForm.accounting_end_date){setError("La data di inizio contabilità non può essere successiva alla data di fine.");return;}
    if(!Number.isInteger(count)||count<1||count>12){setError("Il numero di rate ordinarie deve essere compreso tra 1 e 12.");return;}
    if(dates.length&&dates.length!==count){setError("Le scadenze ordinarie devono corrispondere al numero di rate.");return;}
    if(dates.some((d,i,a)=>!/^\\d{4}-\\d{2}-\\d{2}$/.test(d)||(i>0&&d<=a[i-1]))){setError("Le scadenze devono essere valide, crescenti e non duplicate.");return;}
    if(dates.some(d=>d<accountingSettingsForm.accounting_start_date||d>accountingSettingsForm.accounting_end_date)){setError("Le scadenze ordinarie devono ricadere nell'esercizio configurato.");return;}
    setSaving(true);setError(""); try{const payload={workspace_id:workspaceId,condominium_id:dbCondominiumId,accounting_start_date:accountingSettingsForm.accounting_start_date,accounting_end_date:accountingSettingsForm.accounting_end_date,ordinary_installment_count:count,ordinary_due_dates:dates,extraordinary_mode:accountingSettingsForm.extraordinary_mode,extraordinary_allow_multi_year:accountingSettingsForm.extraordinary_allow_multi_year}; const {data,error}=await supabase.from("condominium_accounting_settings").upsert(payload,{onConflict:"workspace_id,condominium_id"}).select("*").single(); if(error)throw error; setAccountingSettings(data as AccountingSettings);flash("Impostazioni contabilità salvate.");await load();}catch(e:any){setError(e?.message||"Impossibile salvare le impostazioni.");}finally{setSaving(false);}
  }

  async function saveYear(e: React.FormEvent) {
    e.preventDefault();
    if (editingYear && isFiscalYearClosed(editingYear.id)) {
      setError("Un esercizio chiuso non può essere riaperto o modificato.");
      return;
    }
    if (!supabase || !dbCondominiumId) return;
    if (yearForm.start_date > yearForm.end_date) {
      setError("La data di inizio esercizio non può essere successiva alla data di fine.");
      return;
    }
    const openingBalance = Number(yearForm.opening_balance);
    if (!Number.isFinite(openingBalance)) {
      setError("Il saldo iniziale deve essere numerico.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        ...yearForm,
        opening_balance: openingBalance,
      };
      const { error: saveError } = await supabase
        .from("condominium_fiscal_years")
        .upsert(payload, { onConflict: "condominium_id,start_date,end_date" });
      if (saveError) throw saveError;
      setShowYearForm(false);
      setYearForm({
        name: "",
        start_date: new Date().getFullYear() + "-01-01",
        end_date: new Date().getFullYear() + "-12-31",
        status: "Aperto",
        opening_balance: 0,
        notes: "",
      });
      const savedYear = (await supabase.from("condominium_fiscal_years").select("id").eq("workspace_id", workspaceId).eq("condominium_id", dbCondominiumId).eq("start_date", yearForm.start_date).eq("end_date", yearForm.end_date).single()).data;
      const previousYear = fiscalYears.filter(y => y.condominium_id === dbCondominiumId && y.status === "Chiuso" && y.end_date < yearForm.start_date).sort((a,b) => b.end_date.localeCompare(a.end_date))[0];
      if (previousYear && savedYear?.id) {
        const { error: carryError } = await supabase.rpc("generate_fiscal_year_carryovers", { p_workspace_id: workspaceId, p_condominium_id: dbCondominiumId, p_source_fiscal_year_id: previousYear.id, p_target_fiscal_year_id: savedYear.id });
        if (carryError) throw carryError;
      }
      flash("Esercizio salvato.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Impossibile salvare l'esercizio.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLedger(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId) return;
    if (!guardOpenFiscalYear(ledgerForm.fiscal_year_id)) return;
    if (!ledgerForm.description.trim() || Number(ledgerForm.amount) <= 0) {
      setError("Inserisci descrizione e importo maggiore di zero.");
      return;
    }
    const ledgerYear = scopedYears.find(y => y.id === ledgerForm.fiscal_year_id);
    if (ledgerYear && (ledgerForm.entry_date < ledgerYear.start_date || ledgerForm.entry_date > ledgerYear.end_date)) {
      setError("La data del movimento non rientra nell'esercizio contabile selezionato.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        fiscal_year_id: ledgerForm.fiscal_year_id || null,
        entry_date: ledgerForm.entry_date,
        direction: ledgerForm.direction,
        category: ledgerForm.category,
        description: ledgerForm.description.trim(),
        amount: Number(ledgerForm.amount),
        payment_status: ledgerForm.payment_status,
        due_date: ledgerForm.due_date || null,
        supplier_id: ledgerForm.supplier_id || null,
        unit_id: ledgerForm.unit_id || null,
        member_id: ledgerForm.member_id || null,
        document_id: ledgerForm.document_id || null,
        fund_id: ledgerForm.fund_id || null,
        expense_type: ledgerForm.direction === "Uscita" ? ledgerForm.expense_type : "Ordinaria",
        notes: ledgerForm.notes,
      };
      const query = editingLedger
        ? supabase
            .from("condominium_ledger_entries")
            .update(payload)
            .eq("id", editingLedger.id)
            .eq("workspace_id", workspaceId)
        : supabase.from("condominium_ledger_entries").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditingLedger(null);
      setShowLedgerForm(false);
      setLedgerForm({ ...emptyLedger });
      flash("Movimento contabile salvato.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Impossibile salvare il movimento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveFund(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !fundForm.name.trim()) return;
    const targetAmount = Number(fundForm.target_amount);
    const allocatedAmount = Number(fundForm.allocated_amount);
    const usedAmount = Number(fundForm.used_amount);
    if (![targetAmount, allocatedAmount, usedAmount].every(Number.isFinite) || targetAmount < 0 || allocatedAmount < 0 || usedAmount < 0) {
      setError("Gli importi del fondo devono essere numerici e non negativi.");
      return;
    }
    if (usedAmount > allocatedAmount) {
      setError("L'importo utilizzato non può superare l'importo allocato.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        name: fundForm.name.trim(),
        purpose: fundForm.purpose,
        target_amount: targetAmount,
        allocated_amount: allocatedAmount,
        used_amount: usedAmount,
        active: fundForm.active,
        notes: fundForm.notes,
      };
      const query = editingFund
        ? supabase
            .from("condominium_funds")
            .update(payload)
            .eq("id", editingFund.id)
            .eq("workspace_id", workspaceId)
        : supabase.from("condominium_funds").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditingFund(null);
      setShowFundForm(false);
      flash("Fondo salvato.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Impossibile salvare il fondo.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTax(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !taxForm.title.trim()) return;
    const taxAmount = Number(taxForm.amount);
    if (taxForm.amount !== "" && (!Number.isFinite(taxAmount) || taxAmount < 0)) {
      setError("L'importo dell'adempimento deve essere numerico e non negativo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        title: taxForm.title.trim(),
        category: taxForm.category,
        due_date: taxForm.due_date || null,
        amount: taxForm.amount === "" ? null : taxAmount,
        status: taxForm.status,
        notes: taxForm.notes,
      };
      const query = editingTax
        ? supabase
            .from("condominium_tax_obligations")
            .update(payload)
            .eq("id", editingTax.id)
            .eq("workspace_id", workspaceId)
        : supabase.from("condominium_tax_obligations").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditingTax(null);
      setShowTaxForm(false);
      flash("Adempimento fiscale salvato.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Impossibile salvare l'adempimento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCase(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !caseForm.title.trim()) return;
    if (caseForm.closed_date && caseForm.opened_date && caseForm.closed_date < caseForm.opened_date) {
      setError("La data di chiusura non può essere antecedente alla data di apertura.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        title: caseForm.title.trim(),
        counterpart: caseForm.counterpart,
        status: caseForm.status,
        opened_date: caseForm.opened_date || null,
        closed_date: caseForm.closed_date || null,
        notes: caseForm.notes,
      };
      const query = editingCase
        ? supabase
            .from("condominium_legal_cases")
            .update(payload)
            .eq("id", editingCase.id)
            .eq("workspace_id", workspaceId)
        : supabase.from("condominium_legal_cases").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditingCase(null);
      setShowCaseForm(false);
      flash("Pratica legale salvata.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Impossibile salvare la pratica.");
    } finally {
      setSaving(false);
    }
  }

  function calculateAutomaticPreview() {
    if (!dbCondominiumId || !autoAllocationForm.ledger_entry_id || !autoAllocationForm.table_id) {
      setAutoPreview([]);
      return;
    }
    const expense = scopedLedger.find(e => e.id === autoAllocationForm.ledger_entry_id);
    const matchingRule = expense ? allocationRules.filter(r=>r.active&&r.condominium_id===dbCondominiumId&&(!r.expense_type||r.expense_type===expense.expense_type)&&(!r.category||r.category.toLowerCase()===expense.category.toLowerCase())).sort((a,b)=>a.priority-b.priority)[0] : undefined;
    const resolvedTableId = autoAllocationForm.table_id || matchingRule?.allocation_table_id || "";
    const table = scopedMillesimalTables.find(t => t.id === resolvedTableId);
    if (!expense || expense.direction !== "Uscita" || !table) {
      setAutoPreview([]);
      return;
    }
    const selectedTableCheck = millesimalTableChecks.find(x => x.id === resolvedTableId);
    if (!selectedTableCheck?.complete) {
      setAutoPreview([]);
      setError("Il riparto non può essere calcolato: completare le quote millesimali di tutte le unità e verificare che la somma coincida con il totale della tabella.");
      return;
    }
    const eligible = units
      .filter(u => u.condominium_id === dbCondominiumId)
      .filter(u => table.scope_mode === "all" || (table.scope_mode === "units" && table.scope_unit_ids.includes(u.id)) || (table.scope_mode === "buildings" && table.scope_building_codes.some(code => code.trim().toLowerCase() === String((u as any).building_code || "").trim().toLowerCase())))
      .map(unit => ({ unit, value: scopedMillesimalValues.find(v => v.table_id === table.id && v.unit_id === unit.id) }))
      .filter(item => item.value && !item.value.excluded && Number(item.value.value) > 0);
    const totalMillesimi = eligible.reduce((sum, item) => sum + Number(item.value?.value || 0), 0);
    if (totalMillesimi <= 0) {
      setAutoPreview([]);
      setError("Non è possibile calcolare il riparto: la tabella selezionata non ha quote millesimali valide associate alle unità.");
      return;
    }
    setError("");
    const totalCents = Math.round(Number(expense.amount || 0) * 100);
    const rows = eligible.map(item => {
      const exactCents = totalCents * Number(item.value?.value || 0) / totalMillesimi;
      const baseCents = Math.floor(exactCents);
      return { unit:item.unit, millesimi:Number(item.value?.value || 0), baseCents, remainder:exactCents-baseCents };
    });
    let remaining = totalCents - rows.reduce((sum,row) => sum + row.baseCents, 0);
    rows.sort((a,b) => b.remainder-a.remainder || a.unit.unit_code.localeCompare(b.unit.unit_code));
    for (let i=0; i<rows.length && remaining>0; i++) rows[i].baseCents += 1;
    setAutoPreview(rows.map(row => ({
      unit_id:row.unit.id,
      unit_code:row.unit.unit_code,
      millesimi:row.millesimi,
      amount:row.baseCents/100
    })).sort((a,b)=>a.unit_code.localeCompare(b.unit_code)));
  }

  async function generateAutomaticAllocation() {
    if (!supabase || !dbCondominiumId || !autoAllocationForm.ledger_entry_id || !autoAllocationForm.table_id) {
      setError("Seleziona una spesa e una tabella millesimale.");
      return;
    }
    const expense = scopedLedger.find(e => e.id === autoAllocationForm.ledger_entry_id);
    if (!expense || expense.direction !== "Uscita" || !autoPreview.length) {
      setError("Impossibile generare il riparto: verifica spesa, tabella e quote millesimali.");
      return;
    }
    if (!guardOpenFiscalYear(expense.fiscal_year_id)) return;
    const previewTotal = autoPreview.reduce((sum,row)=>sum+row.amount,0);
    if (Math.abs(previewTotal-Number(expense.amount))>0.005) {
      setError("La somma del riparto non coincide con l'importo della spesa.");
      return;
    }
    const linkedInstallments = scopedInstallments.filter(i => i.ledger_entry_id === expense.id);
    if (linkedInstallments.length > 0) {
      setError("La spesa ha già rate collegate. Modifica o elimina prima le rate per poter rigenerare la ripartizione.");
      return;
    }
    if (!window.confirm("Confermi il riparto automatico? Le ripartizioni automatiche precedenti della stessa spesa e tabella saranno sostituite.")) return;
    setSaving(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("generate_condominium_expense_allocations", {
        p_workspace_id:workspaceId,
        p_condominium_id:dbCondominiumId,
        p_ledger_entry_id:expense.id,
        p_table_id:autoAllocationForm.table_id || allocationRules.filter(r=>r.active&&r.condominium_id===dbCondominiumId&&(!r.expense_type||r.expense_type===expense.expense_type)&&(!r.category||r.category.toLowerCase()===expense.category.toLowerCase())).sort((a,b)=>a.priority-b.priority)[0]?.allocation_table_id,
        p_due_date:autoAllocationForm.due_date || expense.due_date || null
      });
      if (rpcError) throw rpcError;
      setShowAutoAllocationForm(false);
      setAutoPreview([]);
      flash("Ripartizione automatica generata.");
      await load();
    } catch(e:any) {
      setError(e?.message || "Impossibile generare il riparto automatico.");
    } finally {
      setSaving(false);
    }
  }

  async function generateInstallmentsFromAllocation() {
    if (!supabase || !dbCondominiumId || !allocationInstallmentForm.ledger_entry_id || !allocationInstallmentForm.title.trim()) {
      setError("Indica spesa e titolo delle rate.");
      return;
    }
    const installmentCount = Math.max(1, Math.min(12, Math.floor(Number(allocationInstallmentForm.installment_count) || 0)));
    const dueDates = allocationInstallmentForm.due_dates.map(v => v.trim()).filter(Boolean);
    if (dueDates.length !== installmentCount || dueDates.some((d, i, arr) => !/^\\d{4}-\\d{2}-\\d{2}$/.test(d) || (i > 0 && d < arr[i - 1]))) {
      setError("Indica esattamente una scadenza YYYY-MM-DD per ciascuna rata, in ordine cronologico.");
      return;
    }
    const dueFiscalYearCounts = new Map<string, number>();
    for (const date of dueDates) {
      const fiscalYear = scopedYears.find(y => date >= y.start_date && date <= y.end_date);
      if (!fiscalYear) {
        setError("Esiste una scadenza senza un esercizio contabile corrispondente. Crea prima l'esercizio necessario.");
        return;
      }
      dueFiscalYearCounts.set(fiscalYear.id, (dueFiscalYearCounts.get(fiscalYear.id) || 0) + 1);
    }
    if ([...dueFiscalYearCounts.values()].some(count => count > 12)) {
      setError("Per ogni esercizio contabile sono consentite al massimo 12 rate. I lavori straordinari possono proseguire su più esercizi.");
      return;
    }
    const selectedExpense = scopedLedger.find(e => e.id === allocationInstallmentForm.ledger_entry_id);
    const selectedAllocations = allocations.filter(a => a.ledger_entry_id === allocationInstallmentForm.ledger_entry_id && (!dbCondominiumId || a.condominium_id === dbCondominiumId) && Number(a.amount) > 0);
    if (!selectedExpense || !selectedAllocations.length) {
      setError("Non ci sono ripartizioni valide per la spesa selezionata.");
      return;
    }
    const allocatedTotal = selectedAllocations.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const expenseTotal = Number(selectedExpense.amount || 0);
    if (Math.abs(expenseTotal - allocatedTotal) > 0.005) {
      setError("Non è possibile generare le rate: la ripartizione della spesa non è ancora quadrata.");
      return;
    }
    if (!guardOpenFiscalYear(allocationInstallmentForm.fiscal_year_id || selectedExpense.fiscal_year_id)) return;
    const percentages=allocationInstallmentForm.percentages.slice(0,installmentCount).map(Number);
    if(percentages.length!==installmentCount||percentages.some(v=>!Number.isFinite(v)||v<=0)||Math.abs(percentages.reduce((s,v)=>s+v,0)-100)>0.001){setError("Le percentuali delle rate devono essere positive e la loro somma deve essere 100%.");return;}
    if (!window.confirm("Confermi la generazione delle rate per tutte le quote della ripartizione selezionata?")) return;
    setSaving(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("generate_installments_from_allocations_schedule", {
        p_workspace_id:workspaceId,
        p_condominium_id:dbCondominiumId,
        p_ledger_entry_id:allocationInstallmentForm.ledger_entry_id,
        p_title:allocationInstallmentForm.title.trim(),
        p_due_dates: dueDates,
        p_fiscal_year_id:allocationInstallmentForm.fiscal_year_id || null,
        p_percentages:percentages
      });
      if (rpcError) throw rpcError;
      setShowInstallmentsFromAllocation(false);
      flash("Rate generate: " + Number(data || 0) + ".");
      await load();
    } catch(e:any) {
      setError(e?.message || "Impossibile generare le rate.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId) return;
    const allocationYearId = scopedLedger.find(x => x.id === allocationForm.ledger_entry_id)?.fiscal_year_id;
    if (!guardOpenFiscalYear(allocationYearId)) return;
    const selectedExpense = scopedLedger.find(x => x.id === allocationForm.ledger_entry_id);
    const selectedUnit = units.find(u => u.id === allocationForm.unit_id && u.condominium_id === dbCondominiumId);
    const millesimi = Number(allocationForm.millesimi);
    const amount = Number(allocationForm.amount);
    const paidAmount = Number(allocationForm.paid_amount);
    if (!selectedExpense || selectedExpense.direction !== "Uscita") {
      setError("La ripartizione deve riferirsi a una spesa registrata nel condominio.");
      return;
    }
    if (!selectedUnit || !allocationForm.ledger_entry_id || !allocationForm.unit_id || !Number.isFinite(amount) || amount <= 0) {
      setError("Seleziona una spesa, un'unità e un importo maggiore di zero.");
      return;
    }
    if (!Number.isFinite(millesimi) || millesimi < 0) {
      setError("I millesimi devono essere numerici e non negativi.");
      return;
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > amount) {
      setError("L'importo pagato deve essere compreso tra zero e l'importo della ripartizione.");
      return;
    }
    const otherAllocated = allocations
      .filter(a => a.ledger_entry_id === selectedExpense.id && a.id !== editingAllocation?.id && (!dbCondominiumId || a.condominium_id === dbCondominiumId))
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);
    if (otherAllocated + amount > Number(selectedExpense.amount || 0) + 0.005) {
      setError("La ripartizione supera l'importo della spesa. Riduci l'importo oppure modifica una quota esistente.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        ledger_entry_id: allocationForm.ledger_entry_id,
        allocation_table_id: null,
        unit_id: allocationForm.unit_id,
        member_id: null,
        allocation_basis: allocationForm.allocation_basis,
        millesimi,
        amount,
        paid_amount: editingAllocation ? paidAmount : 0,
        due_date: allocationForm.due_date || null,
        status: editingAllocation ? allocationForm.status : "Da pagare",
        notes: allocationForm.notes,
      };
      const query = editingAllocation
        ? supabase.from("condominium_expense_allocations").update(payload).eq("id", editingAllocation.id).eq("workspace_id", workspaceId)
        : supabase.from("condominium_expense_allocations").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditingAllocation(null);
      setShowAllocationForm(false);
      setAllocationForm({ ledger_entry_id: "", unit_id: "", allocation_basis: "Millesimi generali", millesimi: 0, amount: 0, paid_amount: 0, due_date: "", status: "Da pagare", notes: "" });
      flash("Ripartizione salvata.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Impossibile salvare la ripartizione.");
    } finally {
      setSaving(false);
    }
  }

  function openManualAllocationIntake() {
    if (!dbCondominiumId) { setError("Seleziona prima un condominio."); return; }
    const firstExpense = scopedLedger.find(e => e.direction === "Uscita");
    const firstTable = scopedMillesimalTables.find(t => t.active);
    const rows = firstTable ? units.filter(u => u.condominium_id === dbCondominiumId && (firstTable.scope_mode === "all" || (firstTable.scope_mode === "units" && firstTable.scope_unit_ids.includes(u.id)) || (firstTable.scope_mode === "buildings" && firstTable.scope_building_codes.some(code => code.trim().toLowerCase() === String((u as any).building_code || "").trim().toLowerCase())))).map(u => ({unit_id:u.id,millesimi:Number(scopedMillesimalValues.find(v=>v.table_id===firstTable.id&&v.unit_id===u.id)?.value||0),amount:0})) : [];
    setAllocationIntakeForm({source:"Manuale",title:"",description:"",document_id:"",ledger_entry_id:firstExpense?.id||"",allocation_table_id:firstTable?.id||"",expense_amount:Number(firstExpense?.amount||0),rows,notes:""});
    setShowAllocationIntakeForm(true);
  }
  function openAIAllocationIntake() {
    if (!dbCondominiumId) { setError("Seleziona prima un condominio."); return; }
    setAllocationIntakeForm({source:"AI",title:"Acquisizione AI",description:"",document_id:"",ledger_entry_id:scopedLedger.find(e=>e.direction==="Uscita")?.id||"",allocation_table_id:scopedMillesimalTables.find(t=>t.active)?.id||"",expense_amount:0,rows:[],notes:"L'AI produrrà una proposta da verificare prima della conferma."});
    setShowAllocationIntakeForm(true);
  }
  function buildAIAllocationProposal() {
    const selectedDocument = documents.find(d => d.id === Number(allocationIntakeForm.document_id) && d.condominiumId === selectedCondominiumId);
    const expense = scopedLedger.find(e => e.id === allocationIntakeForm.ledger_entry_id);
    const matchingRule = expense
      ? allocationRules
          .filter(r=>r.active && r.condominium_id===dbCondominiumId && (!r.expense_type || r.expense_type===expense.expense_type) && (!r.category || r.category.toLowerCase()===expense.category.toLowerCase()))
          .sort((a,b)=>a.priority-b.priority)[0]
      : undefined;
    const resolvedTableId = allocationIntakeForm.allocation_table_id || matchingRule?.allocation_table_id || "";
    const table = scopedMillesimalTables.find(x => x.id === resolvedTableId);
    if (!expense) { setError("Seleziona la spesa da ripartire."); return; }
    if (!table) { setError("Seleziona la tabella millesimale."); return; }
    if (!allocationIntakeForm.allocation_table_id && matchingRule) {
      setAllocationIntakeForm(current => ({...current, allocation_table_id: matchingRule.allocation_table_id}));
    }

    let extracted:any = null;
    if (selectedDocument?.extractedData?.trim()) {
      try { extracted = JSON.parse(selectedDocument.extractedData); } catch { extracted = null; }
    }
    const extractedRows = Array.isArray(extracted?.rows) ? extracted.rows : [];
    const extractedScope = String(extracted?.scope || extracted?.ambito || "").trim();
    const extractedTotalMillesimi = Number(extracted?.total_millesimi ?? extracted?.totalMillesimi ?? 0);
    const scopedUnits = units
      .filter(u => u.condominium_id === dbCondominiumId)
      .filter(u => table.scope_mode === "all" || (table.scope_mode === "units" && table.scope_unit_ids.includes(u.id)) || (table.scope_mode === "buildings" && table.scope_building_codes.some(code => code.trim().toLowerCase() === String((u as any).building_code || "").trim().toLowerCase())));
    const sourceRows = extractedRows.length ? extractedRows.map((r:any) => {
      const byId = units.find(u => u.id === String(r.unit_id || r.unitId || ""));
      const byCode = units.find(u => u.condominium_id === dbCondominiumId && String(u.unit_code).trim().toLowerCase() === String(r.unit_code || r.unitCode || "").trim().toLowerCase());
      return {
        unit_id: String(r.unit_id || r.unitId || byCode?.id || ""),
        millesimi: Number(r.millesimi ?? r.millesimal ?? 0),
        amount: Number(r.amount ?? r.importo ?? 0)
      };
    }).filter((r:any) => r.unit_id && scopedUnits.some(u => u.id === r.unit_id)) : scopedUnits
      .map(u => ({ unit_id:u.id, millesimi:Number(scopedMillesimalValues.find(v=>v.table_id===table.id && v.unit_id===u.id)?.value || 0), amount:0 }));

    const totalMillesimi = sourceRows.reduce((sum:any,r:any)=>sum + Math.max(0, Number(r.millesimi || 0)), 0);
    const scopeMismatch = extractedTotalMillesimi > 0 && Math.abs(extractedTotalMillesimi - totalMillesimi) > 0.01;
    if (!totalMillesimi) { setError("Non risultano millesimi disponibili per costruire la proposta."); return; }
    const validationNote = scopeMismatch
      ? `Attenzione: il documento indica ${extractedTotalMillesimi} millesimi, mentre l'ambito della tabella selezionata ne comprende ${totalMillesimi}. Verificare tabella e unità partecipanti.`
      : extractedScope ? `Ambito rilevato dal documento: ${extractedScope}.` : "Ambito determinato dalla tabella millesimale selezionata.";
    const expenseAmount = Number(extracted?.expense_amount ?? extracted?.amount ?? expense.amount ?? 0);
    const rows = sourceRows.map((r:any) => ({
      unit_id:r.unit_id,
      millesimi:Number(r.millesimi || 0),
      amount:Number(r.amount || 0) > 0 ? Number(r.amount) : Number(((expenseAmount * Number(r.millesimi || 0)) / totalMillesimi).toFixed(2))
    }));
    const roundedTotal = rows.reduce((sum:any,r:any)=>sum + r.amount, 0);
    const difference = Number((expenseAmount - roundedTotal).toFixed(2));
    if (rows.length && Math.abs(difference) >= 0.01) rows[rows.length - 1].amount = Number((rows[rows.length - 1].amount + difference).toFixed(2));

    setAllocationIntakeForm(current => ({
      ...current,
      title: current.title || `Riparto AI · ${expense.description}`,
      description: selectedDocument ? `Proposta generata dal documento: ${selectedDocument.name}.` : "Proposta generata dai dati contabili e dalla tabella millesimale.",
      expense_amount: expenseAmount,
      rows,
      notes: `Proposta automatica da verificare. Nessuna quota è definitiva prima della conferma. ${validationNote}`
    }));
    setMessage("Proposta AI costruita: controlla unità, millesimi e importi prima della conferma.");
  }

  async function saveAllocationIntake() {
    if (!supabase || !dbCondominiumId) return;
    if (!allocationIntakeForm.title.trim()) { setError("Inserisci un titolo per l'acquisizione."); return; }
    if (!allocationIntakeForm.ledger_entry_id) { setError("Collega una spesa del registro contabile."); return; }
    if (allocationIntakeForm.source === "Manuale" && allocationIntakeForm.rows.length === 0) { setError("Inserisci almeno una quota."); return; }
    const total = allocationIntakeForm.rows.reduce((s,r)=>s+Number(r.amount||0),0);
    if (allocationIntakeForm.source === "Manuale" && Math.abs(total-Number(allocationIntakeForm.expense_amount||0))>0.005) { setError("La somma delle quote manuali deve coincidere con l'importo della spesa."); return; }
    setSaving(true); setError("");
    try {
      let backendDocumentId: string | null = null;
      if (allocationIntakeForm.document_id) {
        const { data: documentRow, error: documentLookupError } = await supabase.from("documents").select("id").eq("workspace_id", workspaceId).eq("legacy_id", Number(allocationIntakeForm.document_id)).maybeSingle();
        if (documentLookupError) throw documentLookupError;
        backendDocumentId = documentRow?.id ?? null;
        if (!backendDocumentId) throw new Error("Il documento selezionato non è ancora presente nel database.");
      }
      const { error: saveError } = await supabase.from("condominium_allocation_intakes").insert({
        workspace_id:workspaceId, condominium_id:dbCondominiumId, source:allocationIntakeForm.source,
        status:allocationIntakeForm.source==="AI" ? "Da verificare" : "Bozza",
        document_id:backendDocumentId,
        ledger_entry_id:allocationIntakeForm.ledger_entry_id || null, allocation_table_id:allocationIntakeForm.allocation_table_id || null,
        title:allocationIntakeForm.title.trim(), description:allocationIntakeForm.description, expense_amount:Number(allocationIntakeForm.expense_amount||0),
        rows:allocationIntakeForm.rows, extracted_data:{}, validation_errors:[], notes:allocationIntakeForm.notes
      });
      if (saveError) throw saveError;
      setShowAllocationIntakeForm(false);
      flash(allocationIntakeForm.source==="AI" ? "Acquisizione AI creata: dati da verificare." : "Acquisizione manuale salvata come bozza.");
      await load();
    } catch(e:any) { setError(e?.message||"Impossibile salvare l'acquisizione."); }
    finally { setSaving(false); }
  }
  async function confirmAllocationIntake(intake: AllocationIntake) {
    if (!supabase) return;
    if (!window.confirm("Confermi l'acquisizione? Le quote saranno trasferite nel riparto contabile definitivo.")) return;
    setSaving(true); setError("");
    try {
      const { error: rpcError } = await supabase.rpc("confirm_allocation_intake",{p_workspace_id:workspaceId,p_intake_id:intake.id});
      if (rpcError) throw rpcError;
      flash("Acquisizione confermata e riparto contabile aggiornato.");
      await load();
    } catch(e:any) { setError(e?.message||"Impossibile confermare l'acquisizione."); }
    finally { setSaving(false); }
  }

  async function saveMillesimalTable(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !millesimalForm.name.trim()) return;
    const totalMillesimi = Number(millesimalForm.total_millesimi);
    if (!Number.isFinite(totalMillesimi) || totalMillesimi <= 0) {
      setError("Il totale dei millesimi deve essere un numero maggiore di zero.");
      return;
    }
    setSaving(true); setError("");
    try {
      const scopeUnitIds = millesimalForm.scope_mode === "units" ? millesimalForm.scope_unit_ids : [];
      const scopeBuildingCodes = millesimalForm.scope_mode === "buildings" ? millesimalForm.scope_building_codes.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean) : [];
      if (millesimalForm.scope_mode === "units" && scopeUnitIds.length === 0) { setError("Seleziona almeno una unità."); return; }
      if (millesimalForm.scope_mode === "buildings" && scopeBuildingCodes.length === 0) { setError("Indica almeno un fabbricato o civico."); return; }
      const { error: saveError } = await supabase.from("condominium_millesimal_tables").insert({
        workspace_id: workspaceId, condominium_id: dbCondominiumId, name:millesimalForm.name.trim(),
        description:millesimalForm.description, total_millesimi:totalMillesimi,
        active:millesimalForm.active, notes:millesimalForm.notes, basis_type:millesimalForm.basis_type,
        scope_mode:millesimalForm.scope_mode, scope_unit_ids:scopeUnitIds, scope_building_codes:scopeBuildingCodes
      });
      if (saveError) throw saveError;
      setShowMillesimalForm(false); flash("Tabella millesimale salvata."); await load();
    } catch(e:any){ setError(e?.message || "Impossibile salvare la tabella."); }
    finally{setSaving(false);}
  }

  async function saveBulkMillesimalValues() {
    if (!supabase || !dbCondominiumId || !bulkMillesimalTableId) { setError("Seleziona una tabella millesimale."); return; }
    const table = scopedMillesimalTables.find(t => t.id === bulkMillesimalTableId);
    const allCondominiumUnits = units.filter(u => u.condominium_id === dbCondominiumId);
    const condominiumUnits = allCondominiumUnits.filter(u => table && (table.scope_mode === "all" || (table.scope_mode === "units" && table.scope_unit_ids.includes(u.id)) || (table.scope_mode === "buildings" && table.scope_building_codes.some(code => code.trim().toLowerCase() === String((u as any).building_code || "").trim().toLowerCase()))));
    if (!table || condominiumUnits.length === 0) { setError("Tabella o unità non disponibili per il criterio selezionato."); return; }
    const invalidValue = condominiumUnits.some(u => {
      const value = Number(bulkMillesimalValues[u.id]);
      return !Number.isFinite(value) || value < 0;
    });
    if (invalidValue) {
      setError("Tutte le quote devono essere numeriche e non negative.");
      return;
    }
    const total = condominiumUnits.reduce((s,u) => s + Number(bulkMillesimalValues[u.id] || 0), 0);
    if (Math.abs(total - Number(table.total_millesimi || 0)) > 0.001) { setError("La somma delle quote deve coincidere con il totale della tabella."); return; }
    setSaving(true); setError("");
    try {
      const payload = condominiumUnits.map(u => ({workspace_id:workspaceId,condominium_id:dbCondominiumId,table_id:bulkMillesimalTableId,unit_id:u.id,value:Number(bulkMillesimalValues[u.id]||0),excluded:false,notes:""}));
      const {error:saveError}=await supabase.from("condominium_millesimal_values").upsert(payload,{onConflict:"table_id,unit_id"});
      if(saveError) throw saveError;
      setShowBulkMillesimalForm(false); setBulkMillesimalTableId(""); setBulkMillesimalValues({});
      flash("Quote millesimali salvate e quadrate."); await load();
    } catch(e:any){setError(e?.message||"Impossibile salvare le quote millesimali.");}
    finally{setSaving(false);}
  }

  async function saveMillesimalValue(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !millesimalValueForm.table_id || !millesimalValueForm.unit_id) {
      setError("Seleziona tabella e unità."); return;
    }
    const millesimalValue = Number(millesimalValueForm.value);
    if (!Number.isFinite(millesimalValue) || millesimalValue < 0) {
      setError("Il valore millesimale deve essere un numero non negativo.");
      return;
    }
    const selectedTable = scopedMillesimalTables.find(t => t.id === millesimalValueForm.table_id);
    const selectedUnit = units.find(u => u.id === millesimalValueForm.unit_id && u.condominium_id === dbCondominiumId);
    if (!selectedTable || !selectedUnit || selectedTable.condominium_id !== dbCondominiumId) {
      setError("Tabella o unità non appartenenti al condominio selezionato.");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        workspace_id:workspaceId, condominium_id:dbCondominiumId,
        table_id:millesimalValueForm.table_id, unit_id:millesimalValueForm.unit_id,
        value:millesimalValue, excluded:millesimalValueForm.excluded,
        notes:millesimalValueForm.notes
      };
      const { error: saveError } = await supabase.from("condominium_millesimal_values").upsert(payload,{onConflict:"table_id,unit_id"});
      if(saveError) throw saveError;
      setShowMillesimalValueForm(false);
      setMillesimalValueForm({table_id:"",unit_id:"",value:0,excluded:false,notes:""});
      flash("Quota millesimale salvata."); await load();
    } catch(e:any){setError(e?.message || "Impossibile salvare il valore millesimale.");}
    finally{setSaving(false);}
  }


  async function saveConsumptionReading(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !consumptionForm.fiscal_year_id || !consumptionForm.unit_id) { setError("Indica esercizio e unità."); return; }
    if (!guardOpenFiscalYear(consumptionForm.fiscal_year_id)) return;
    const num=(v:string)=>v.trim()===""?null:Number(v);
    const previous=num(consumptionForm.previous_reading), current=num(consumptionForm.current_reading), consumption=num(consumptionForm.consumption), kwh=num(consumptionForm.kwh), allocationValue=num(consumptionForm.allocation_value), chargeAmount=num(consumptionForm.charge_amount);
    if ([previous,current,consumption,kwh,allocationValue,chargeAmount].some(v=>v!==null&&(!Number.isFinite(v)||v<0))) { setError("I valori di consumo devono essere numerici e non negativi."); return; }
    if (previous!==null&&current!==null&&current<previous) { setError("La lettura attuale non può essere inferiore alla precedente."); return; }
    setSaving(true); setError("");
    try {
      const payload={workspace_id:workspaceId,condominium_id:dbCondominiumId,fiscal_year_id:consumptionForm.fiscal_year_id,unit_id:consumptionForm.unit_id,service_type:consumptionForm.service_type.trim()||"Riscaldamento",period_start:consumptionForm.period_start||null,period_end:consumptionForm.period_end||null,meter_code:consumptionForm.meter_code.trim(),previous_reading:previous,current_reading:current,consumption:consumption??(previous!==null&&current!==null?Math.max(0,current-previous):null),kwh,allocation_value:allocationValue,charge_amount:chargeAmount,source:consumptionForm.source.trim()||"Manuale",notes:consumptionForm.notes.trim(),data:{}};
      const {error:saveError}=await supabase.from("condominium_consumption_readings").upsert(payload,{onConflict:"workspace_id,condominium_id,fiscal_year_id,unit_id,service_type,meter_code,period_start,period_end"});
      if(saveError) throw saveError;
      setConsumptionForm({fiscal_year_id:"",unit_id:"",service_type:"Riscaldamento",meter_code:"",period_start:"",period_end:"",previous_reading:"",current_reading:"",consumption:"",kwh:"",allocation_value:"",charge_amount:"",source:"Manuale",notes:""});
      flash("Dato di consumo salvato."); await load();
    } catch(e:any) { setError(e?.message||"Impossibile salvare il dato di consumo."); } finally { setSaving(false); }
  }

  function parseCsvLine(line:string) {
    const out:string[]=[]; let current=""; let quoted=false;
    for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(ch===';'&&!quoted){out.push(current.trim());current="";}else if(ch===','&&!quoted){out.push(current.trim());current="";}else current+=ch;} out.push(current.trim()); return out;
  }

  async function importConsumptionCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; if(!file||!dbCondominiumId) return;
    const text=await file.text(); const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(lines.length<2){setError("Il CSV non contiene righe dati.");return;}
    const headers=parseCsvLine(lines[0]).map(h=>h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""));
    const find=(row:string[],names:string[])=>{const idx=headers.findIndex(h=>names.includes(h));return idx>=0?row[idx]||"":"";};
    const rows:any[]=[];
    for(const line of lines.slice(1)){
      const row=parseCsvLine(line), unitCode=find(row,["unita","unita_immobiliare","unit_code","unita_codice"]).trim();
      const unit=units.find(u=>u.condominium_id===dbCondominiumId&&u.unit_code.toLowerCase()===unitCode.toLowerCase()); if(!unit) continue;
      const toNum=(v:string)=>{const s=v.trim();if(!s)return null;return s.includes(",")?Number(s.replace(/\\./g,"").replace(",", ".")):Number(s);};
      const fiscal=find(row,["esercizio","fiscal_year_id"]).trim(); const fy=scopedYears.find(y=>y.id===fiscal||y.name.toLowerCase()===fiscal.toLowerCase()); if(!fy) continue;
      const previous=toNum(find(row,["lettura_precedente","precedente"])), current=toNum(find(row,["lettura_attuale","attuale"]));
      rows.push({workspace_id:workspaceId,condominium_id:dbCondominiumId,fiscal_year_id:fy.id,unit_id:unit.id,service_type:find(row,["servizio","service_type"]).trim()||"Riscaldamento",meter_code:find(row,["matricola","meter_code"]).trim(),period_start:find(row,["periodo_inizio","period_start"]).trim()||null,period_end:find(row,["periodo_fine","period_end"]).trim()||null,previous_reading:previous,current_reading:current,consumption:toNum(find(row,["consumo","consumption"]))??(previous!==null&&current!==null?Math.max(0,current-previous):null),kwh:toNum(find(row,["kwh"])),allocation_value:toNum(find(row,["valore_riparto","allocation_value","valore"])),charge_amount:toNum(find(row,["importo","charge_amount","quota"])),source:"Importazione CSV",notes:find(row,["note","notes"]),data:{}});
    }
    if(!rows.length){setError("Nessuna riga CSV riconosciuta. Verifica il codice unità e l'esercizio.");return;}
    setSaving(true);setError("");
    try{const {error:saveError}=await supabase.from("condominium_consumption_readings").upsert(rows,{onConflict:"workspace_id,condominium_id,fiscal_year_id,unit_id,service_type,meter_code,period_start,period_end"});if(saveError)throw saveError;flash("Importazione consumi completata: "+rows.length+" righe.");await load();}catch(e:any){setError(e?.message||"Impossibile importare il CSV.");}finally{setSaving(false);event.target.value="";}
  }

  async function generateConsumptionAllocation() {
    if(!supabase||!dbCondominiumId||!consumptionExpenseForm.ledger_entry_id||!consumptionExpenseForm.fiscal_year_id||!consumptionExpenseForm.service_type.trim()){setError("Indica spesa, esercizio e servizio.");return;}
    const expense=scopedLedger.find(e=>e.id===consumptionExpenseForm.ledger_entry_id);
    if(!expense||expense.direction!=="Uscita"){setError("Seleziona una spesa di uscita.");return;}
    if(!guardOpenFiscalYear(expense.fiscal_year_id||consumptionExpenseForm.fiscal_year_id))return;
    const rows=scopedConsumptionReadings.filter(r=>r.fiscal_year_id===consumptionExpenseForm.fiscal_year_id&&r.service_type.toLowerCase().trim()===consumptionExpenseForm.service_type.toLowerCase().trim());
    if(!rows.length){setError("Non ci sono dati di consumo per il servizio selezionato.");return;}
    if(!window.confirm("Generare il riparto automatico della spesa usando i dati di consumo?"))return;
    setSaving(true);setError("");
    try{const {data,error:rpcError}=await supabase.rpc("generate_consumption_allocations",{p_workspace_id:workspaceId,p_condominium_id:dbCondominiumId,p_ledger_entry_id:expense.id,p_fiscal_year_id:consumptionExpenseForm.fiscal_year_id,p_service_type:consumptionExpenseForm.service_type.trim()});if(rpcError)throw rpcError;flash("Riparto da consumi generato: "+Number(data||0)+" quote.");await load();}catch(e:any){setError(e?.message||"Impossibile generare il riparto da consumi.");}finally{setSaving(false);}
  }


  async function saveAllocationRule(e: React.FormEvent) {
    e.preventDefault();
    if(!supabase||!dbCondominiumId||!allocationRuleForm.name.trim()||!allocationRuleForm.allocation_table_id){setError("Indica nome e tabella del criterio automatico.");return;}
    if(!allocationRuleForm.expense_type.trim()&&!allocationRuleForm.category.trim()){setError("Indica almeno il tipo di spesa o la categoria.");return;}
    setSaving(true);setError("");
    try{
      const payload={workspace_id:workspaceId,condominium_id:dbCondominiumId,name:allocationRuleForm.name.trim(),expense_type:allocationRuleForm.expense_type.trim()||null,category:allocationRuleForm.category.trim()||null,allocation_table_id:allocationRuleForm.allocation_table_id,priority:Math.max(0,Math.floor(Number(allocationRuleForm.priority)||100)),active:allocationRuleForm.active,notes:allocationRuleForm.notes.trim()};
      const {error:saveError}=await supabase.from("condominium_allocation_rules").insert(payload);if(saveError)throw saveError;
      setAllocationRuleForm({name:"",expense_type:"",category:"",allocation_table_id:"",priority:100,active:true,notes:""});flash("Regola di riparto salvata.");await load();
    }catch(e:any){setError(e?.message||"Impossibile salvare la regola di riparto.");}finally{setSaving(false);}
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId || !guardOpenFiscalYear(budgetForm.fiscal_year_id) || !budgetForm.description.trim() || Number(budgetForm.amount) <= 0) {
      setError("Inserisci descrizione e importo del preventivo.");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        fiscal_year_id: budgetForm.fiscal_year_id || null,
        category: budgetForm.category.trim() || "Generale",
        description: budgetForm.description.trim(),
        amount: Number(budgetForm.amount),
        notes: budgetForm.notes
      };
      const query = editingBudget
        ? supabase.from("condominium_budgets").update(payload).eq("id", editingBudget.id).eq("workspace_id", workspaceId)
        : supabase.from("condominium_budgets").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setEditingBudget(null); setShowBudgetForm(false);
      setBudgetForm({ fiscal_year_id:"", category:"Manutenzione", description:"", amount:0, notes:"" });
      flash("Voce di preventivo salvata."); await load();
    } catch(e:any) { setError(e?.message || "Impossibile salvare il preventivo."); }
    finally { setSaving(false); }
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    const paymentAmount = Number(paymentForm.amount);
    if (!supabase || !dbCondominiumId || !paymentInstallment || paymentInstallment.condominium_id !== dbCondominiumId || !guardOpenFiscalYear(paymentInstallment.fiscal_year_id) || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Inserisci un importo di pagamento valido per la rata selezionata."); return;
    }
    const residual=Math.max(0,Number(paymentInstallment.amount || 0)-Number(paymentInstallment.paid_amount || 0));
    if(paymentAmount > residual + 0.005){
      const credit = paymentAmount - residual;
      if (!window.confirm("Il pagamento supera il residuo di " + money(credit) + ". L'eccedenza sarà registrata come credito da riportare all'esercizio successivo. Confermi?")) return;
    }
    setSaving(true); setError("");
    try {
      const { data, error: paymentError } = await supabase.rpc("register_condominium_installment_payment", {
        p_workspace_id: workspaceId,
        p_condominium_id: dbCondominiumId,
        p_installment_id: paymentInstallment.id,
        p_payment_date: paymentForm.payment_date,
        p_amount: paymentAmount,
        p_method: paymentForm.method,
        p_reference: paymentForm.reference,
        p_notes: paymentForm.notes
      });
      if(paymentError) throw paymentError;
      setShowPaymentForm(false); setPaymentInstallment(null);
      setPaymentForm({payment_date:new Date().toISOString().slice(0,10),amount:0,method:"Bonifico",reference:"",notes:""});
      const overpayment = Math.max(0, paymentAmount - residual);
      flash(overpayment > 0.005 ? "Pagamento registrato. Eccedenza a credito: " + money(overpayment) + "." : "Pagamento registrato. Nuovo totale pagato: " + money(Number(data || 0)) + ".");
      await load();
    } catch(e:any){setError(e?.message || "Impossibile registrare il pagamento.");}
    finally{setSaving(false);}
  }
  async function saveInstallment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(installmentForm.amount);
    if (!supabase || !dbCondominiumId || !installmentForm.unit_id || !guardOpenFiscalYear(installmentForm.fiscal_year_id) || !installmentForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Inserisci unità, titolo e un importo della rata maggiore di zero."); return;
    }
    const installmentYear = scopedYears.find(y => y.id === installmentForm.fiscal_year_id);
    if (installmentYear && installmentForm.due_date && (installmentForm.due_date < installmentYear.start_date || installmentForm.due_date > installmentYear.end_date)) {
      setError("La scadenza della rata non rientra nell'esercizio contabile selezionato."); return;
    }
    setSaving(true); setError("");
    try {
      const { error: saveError } = await supabase.from("condominium_installments").insert({
        workspace_id:workspaceId, condominium_id:dbCondominiumId,
        fiscal_year_id:installmentForm.fiscal_year_id || null, member_id:null,
        unit_id:installmentForm.unit_id || null, ledger_entry_id:null, title:installmentForm.title.trim(),
        due_date:installmentForm.due_date || null, amount,
        paid_amount:0, status:"Da pagare",
        notes:installmentForm.notes
      });
      if(saveError) throw saveError;
      setShowInstallmentForm(false);
      setInstallmentForm({title:"",fiscal_year_id:"",unit_id:"",due_date:"",amount:0,paid_amount:0,status:"Da pagare",notes:""});
      flash("Rata salvata."); await load();
    } catch(e:any){setError(e?.message || "Impossibile salvare la rata.");}
    finally{setSaving(false);}
  }

  async function remove(table: string, id: string, label: string) {
    if (!supabase) return;
    if (!window.confirm("Sei sicuro di voler cancellare " + label + "?")) return;
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (deleteError) {
      const errorCode = (deleteError as any).code;
      if (errorCode === "23503" || errorCode === "P0001") {
        let dependencyMessage = "Non è possibile cancellare l'elemento perché esistono dati collegati che ne impediscono la cancellazione.";
        if (table === "condominium_ledger_entries") {
          dependencyMessage = "Non è possibile cancellare la voce contabile perché è collegata a una o più rate. Elimina prima le rate collegate e riprova.";
        } else if (table === "condominium_installments") {
          dependencyMessage = "Non è possibile cancellare una rata con pagamenti registrati. Occorre utilizzare una rettifica del pagamento.";
        } else if (table === "condominium_expense_allocations") {
          dependencyMessage = "Non è possibile cancellare una ripartizione con pagamenti registrati.";
        } else if (table === "condominium_units") {
          dependencyMessage = "Non è possibile cancellare l'unità perché ha movimenti contabili o rate collegate.";
        }
        setError(dependencyMessage);
      } else {
        setError(deleteError.message);
      }
      return;
    }
    flash("Elemento eliminato.");
    await load();
  }

  function openLedger(item?: LedgerEntry) {
    if (item) {
      setEditingLedger(item);
      setLedgerForm({
        fiscal_year_id: item.fiscal_year_id,
        entry_date: item.entry_date,
        direction: item.direction,
        category: item.category,
        description: item.description,
        amount: item.amount,
        payment_status: item.payment_status,
        due_date: item.due_date || "",
        supplier_id: item.supplier_id,
        unit_id: item.unit_id,
        member_id: item.member_id,
        document_id: item.document_id,
        notes: item.notes,
      });
    } else {
      setEditingLedger(null);
      setLedgerForm({
        ...emptyLedger,
        fiscal_year_id: scopedYears[0]?.id ?? null,
      });
    }
    setShowLedgerForm(true);
  }

  return (<>
    <style>{rendicontoPrintStyles}</style>
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">Amministrazione contabile</span>
          <h1>Contabilità e rendiconto</h1>
          <p>
            Registro contabile, esercizi, fondi, adempimenti fiscali e contenzioso.
            I dati vengono salvati direttamente nel workspace Supabase.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          Condominio
          <select
            value={String(selectedCondominiumId)}
            onChange={(e) =>
              setSelectedCondominiumId(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
          >
            <option value="all">Tutti i condomini</option>
            {condominiums.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert error" style={{margin:"15px 0",padding:"16px",border:"2px solid #b42318",borderRadius:12,background:"#fff1f2",color:"#b42318",fontSize:22,fontWeight:900,letterSpacing:".08em",textAlign:"center"}}>ERRORE</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="quick-stats">
        <div className="quick-stat"><b>{money(totals.income)}</b><span>Entrate</span></div>
        <div className="quick-stat"><b>{money(totals.expenses)}</b><span>Uscite</span></div>
        <div className="quick-stat"><b>{money(totals.balance)}</b><span>Saldo movimenti</span></div>
        <div className="quick-stat"><b>{money(totals.due)}</b><span>Uscite non pagate</span></div>
        <div className="quick-stat"><b>{money(arrears)}</b><span>Residuo rate</span></div>
      </div>

      <div className="filter-bar">
        {([
          ["rendiconto", "Rendiconto"],
          ["movimenti", "Registro contabile"],
          ["ripartizioni", "Ripartizioni"],
          ["millesimi", "Tabelle millesimali"],
          ["consumi", "Consumi e riparti"],
          ["rate", "Rate e morosità"],
          ["fondi", "Fondi e riserve"],
          ["fiscale", "Adempimenti fiscali"],
          ["contenzioso", "Contenzioso"],
          ["impostazioni", "Impostazioni contabilità"],
        ] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "primary-button" : "secondary-button"}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card"><p>Caricamento contabilità…</p></div>
      ) : tab === "rendiconto" ? (
        <section className="cards-grid">
          <article className="card">
            <div className="section-heading">
              <div><h2>Rendiconto condominiale</h2><p>Prospetto economico e finanziario costruito sui movimenti dell'esercizio selezionato.</p></div>
              <select value={rendicontoYearId} onChange={(e) => setRendicontoYearId(e.target.value)}>
                <option value="all">Tutti gli esercizi</option>
                {scopedYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div className="quick-stats">
              <div className="quick-stat"><b>{money(rendicontoSummary.opening)}</b><span>Saldo iniziale</span></div>
              <div className="quick-stat"><b>{money(rendicontoSummary.income)}</b><span>Entrate</span></div>
              <div className="quick-stat"><b>{money(rendicontoSummary.expenses)}</b><span>Uscite</span></div>
              <div className="quick-stat"><b>{money(rendicontoSummary.closing)}</b><span>Saldo finale teorico</span></div>
            </div>
            <div className="permission-box"><b>Movimenti</b><span>{rendicontoLedger.length} registrati · pagato {money(rendicontoSummary.paidExpenses)} · da pagare {money(rendicontoSummary.unpaidExpenses)}</span></div>
            <div className="permission-box"><b>Ripartizioni</b><span>{money(rendicontoSummary.allocated)} attribuiti alle unità · pagato {money(rendicontoSummary.allocatedPaid)}</span></div>
            <div className="permission-box"><b>Rate</b><span>{money(rendicontoSummary.installmentsAmount)} dovuto · {money(rendicontoSummary.installmentsPaid)} pagato · residuo {money(rendicontoSummary.installmentsResidual)}</span></div>
          </article>

          <article className="card">
            <div className="section-heading">
              <div><h2>Preventivo vs consuntivo</h2><p>Confronto per categoria tra importi preventivati e movimenti di uscita registrati.</p></div>
              {isAdministrator && dbCondominiumId && <button className="primary-button" onClick={() => { setEditingBudget(null); setBudgetForm({ fiscal_year_id:rendicontoYearId === "all" ? scopedYears[0]?.id ?? "" : rendicontoYearId, category:"Manutenzione", description:"", amount:0, notes:"" }); setShowBudgetForm(true); }}>+ Voce preventivo</button>}
            </div>
            <div className="quick-stats">
              <div className="quick-stat"><b>{money(rendicontoBudgets.reduce((s,b)=>s+Number(b.amount||0),0))}</b><span>Preventivo</span></div>
              <div className="quick-stat"><b>{money(rendicontoLedger.filter(e=>e.direction==="Uscita").reduce((s,e)=>s+Number(e.amount||0),0))}</b><span>Consuntivo</span></div>
              <div className="quick-stat"><b>{money(rendicontoBudgets.reduce((s,b)=>s+Number(b.amount||0),0)-rendicontoLedger.filter(e=>e.direction==="Uscita").reduce((s,e)=>s+Number(e.amount||0),0))}</b><span>Scostamento</span></div>
            </div>
            {budgetSummary.length===0 ? <p>Nessuna voce di preventivo configurata.</p> : budgetSummary.map(row=><div className="row-card" key={row.category}><div><b>{row.category}</b><small>Preventivo {money(row.budget)} · Consuntivo {money(row.actual)}</small><span>Scostamento {money(row.variance)}</span></div></div>)}
            {rendicontoBudgets.length > 0 && <><h3>Voci di preventivo</h3>{rendicontoBudgets.map((item) => <div className="row-card" key={item.id}><div><b>{item.description}</b><small>{item.category} · {money(item.amount)}</small>{item.notes && <small>{item.notes}</small>}</div>{isAdministrator && <div className="row-actions"><button className="secondary-button small" onClick={() => { setEditingBudget(item); setBudgetForm({ fiscal_year_id:item.fiscal_year_id || "", category:item.category, description:item.description, amount:item.amount, notes:item.notes }); setShowBudgetForm(true); }}>Modifica</button><button className="mini-danger" onClick={() => remove("condominium_budgets", item.id, "la voce di preventivo")}>×</button></div>}</div>)}</>}
          </article>

          <article className="card">
            <h2>Confronto spese e ripartizioni</h2>
            <p>Il prospetto evidenzia eventuali importi ancora non attribuiti alle unità.</p>
            <div className="quick-stats">
              <div className="quick-stat"><b>{money(rendicontoSummary.expenses)}</b><span>Spese a registro</span></div>
              <div className="quick-stat"><b>{money(rendicontoSummary.allocated)}</b><span>Spese ripartite</span></div>
              <div className="quick-stat"><b>{money(Math.max(0,rendicontoSummary.expenses-rendicontoSummary.allocated))}</b><span>Da ripartire</span></div>
            </div>
            <h3>Fondi e riserve</h3>
            {scopedFunds.length === 0 ? <p>Nessun fondo configurato.</p> : scopedFunds.map((fund) => (
              <div className="row-card" key={fund.id}>
                <div><b>{fund.name}</b><small>{fund.purpose || "Finalità non indicata"}</small><span>Allocato {money(fund.allocated_amount)} · Utilizzato {money(fund.used_amount)} · Residuo {money(Math.max(0,Number(fund.allocated_amount)-Number(fund.used_amount)))}</span></div>
              </div>
            ))}
          </article>

          <article className="card rendiconto-actions">
            <div className="section-heading"><div><h2>Esporta rendiconto</h2><p>Genera una versione stampabile del prospetto selezionato, pronta per PDF tramite la stampa del dispositivo.</p></div><button className="primary-button" onClick={printRendiconto}>Stampa / PDF</button></div>
          </article>

          <article className="card">
            <h2>Controllo di quadratura</h2>
            <p>Verifica automatica delle principali corrispondenze contabili del periodo selezionato.</p>
            <div className="permission-box"><b>Registro → Ripartizioni</b><span>Spese {money(quadratura.expenses)} · Ripartito {money(quadratura.allocated)} · Differenza {money(quadratura.allocationGap)}</span></div>
            <div className="permission-box"><b>Ripartizioni → Rate</b><span>Ripartito {money(quadratura.allocated)} · Rate {money(quadratura.installments)} · Differenza {money(quadratura.installmentGap)}</span></div>
            <div className="permission-box"><b>Rate → Incassi</b><span>Dovuto {money(quadratura.installments)} · Incassato {money(quadratura.paidInstallments)} · Residuo {money(quadratura.collectionGap)}</span></div>
            <div className="permission-box"><b>Preventivo → Consuntivo</b><span>Preventivo {money(quadratura.budget)} · Consuntivo {money(quadratura.expenses)} · Scostamento {money(quadratura.budgetVariance)}</span></div>
            <div className="status-line">{quadratura.balancedAllocations ? "✓ Ripartizioni quadrate" : "⚠ Verificare ripartizioni"} · {quadratura.balancedInstallments ? "✓ Rate quadrate" : "⚠ Verificare rate"}</div>
          </article>

          <article className="card">
            <h2>Situazione per unità</h2>
            <p>Quote ripartite e rate registrate per ciascuna unità dell'esercizio.</p>
            {rendicontoByUnit.length === 0 ? <p>Nessuna posizione individuale disponibile.</p> : rendicontoByUnit.map((row) => (
              <div className="row-card" key={row.unitId}>
                <div><b>{row.unitCode}</b><small>Ripartito {money(row.allocated)} · Rate {money(row.installments)}</small><span>Pagato {money(row.paid)} · Residuo rate {money(row.residual)}</span></div>
              </div>
            ))}
          </article>

          <article className="card">
            <h2>Nota esplicativa</h2>
            <p>Il prospetto è calcolato automaticamente dai dati presenti nel registro contabile, nelle ripartizioni, nelle rate e nei fondi.</p>
            <div className="permission-box"><b>Formula saldo</b><span>Saldo iniziale + entrate − uscite = saldo finale teorico.</span></div>
            <div className="permission-box"><b>Controllo riparto</b><span>Le spese registrate sono confrontate con le quote attribuite alle unità.</span></div>
            <div className="permission-box"><b>Morosità</b><span>Il residuo delle rate deriva da importo dovuto meno pagamenti registrati.</span></div>
            <p className="small-note">Il prospetto costituisce uno strumento gestionale; prima della presentazione assembleare l'amministratore deve verificare documenti giustificativi, competenza dell'esercizio, saldi bancari e quadratura contabile.</p>
          </article>

          <article className="card">
            <h2>Esercizi</h2>
            {scopedYears.length === 0 ? <p>Nessun esercizio configurato.</p> : scopedYears.map((year) => (
              <div className="row-card" key={year.id}>
                <div><b>{year.name}</b><small>{year.start_date} → {year.end_date}</small><span>{year.status} · Apertura {money(year.opening_balance)}</span></div>
                {isAdministrator && dbCondominiumId && <div className="row-actions">{year.status !== "Chiuso" && <button className="secondary-button small" onClick={() => closeFiscalYear(year)}>Chiudi esercizio</button>}<button className="mini-danger" onClick={() => remove("condominium_fiscal_years", year.id, "l'esercizio")}>×</button></div>}
              </div>
            ))}
            {isAdministrator && dbCondominiumId && <button className="primary-button" onClick={() => setShowYearForm(true)}>+ Nuovo esercizio</button>}
          </article>
        </section>
      ) : tab === "movimenti" ? (
        <section className="card">
          <div className="section-heading">
            <div><h2>Registro contabile</h2><p>Entrate, uscite, stato dei pagamenti e collegamenti operativi.</p></div>
            {isAdministrator && dbCondominiumId && (
              <button className="primary-button" onClick={() => openLedger()}>+ Nuovo movimento</button>
            )}
          </div>
          {scopedLedger.length === 0 ? <p>Nessun movimento registrato.</p> : (
            <div className="cards-list">
              {scopedLedger.map((entry) => (
                <article className="row-card" key={entry.id}>
                  <div>
                    <b>{entry.description}</b>
                    <small>{entry.entry_date} · {entry.category} · {entry.payment_status}</small>
                    <span>{entry.direction === "Entrata" ? "+" : "−"} {money(entry.amount)}{entry.due_date ? " · scadenza " + entry.due_date : ""}</span>
                    {entry.notes && <small>{entry.notes}</small>}
                  </div>
                  {isAdministrator && (
                    <div className="row-actions">
                      <button className="secondary-button small" onClick={() => openLedger(entry)}>Modifica</button>
                      <button className="mini-danger" onClick={() => remove("condominium_ledger_entries", entry.id, "il movimento")}>×</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : tab === "ripartizioni" ? (
        <section className="card">
          <div className="section-heading">
            <div><h2>Ripartizione delle spese</h2><p>Associa una spesa alle unità e registra base di riparto, millesimi, importo e stato.</p></div>
            {isAdministrator && dbCondominiumId && <div className="row-actions"><button className="secondary-button" onClick={() => { (()=>{ const firstExpense=scopedLedger.find(e=>e.direction==="Uscita" && allocations.some(a=>a.ledger_entry_id===e.id)); const useOrd=firstExpense?.expense_type==="Ordinaria"; const dates=useOrd ? (accountingSettings?.ordinary_due_dates??[]) : []; setAllocationInstallmentForm({ ledger_entry_id:firstExpense?.id??"", title:firstExpense?.expense_type==="Straordinaria"?"Rate lavoro straordinario":"Rate condominiali", due_date:"", fiscal_year_id:scopedYears[0]?.id??"", installment_count:dates.length||accountingSettings?.ordinary_installment_count||1, due_dates:dates.join(", ") }); setShowInstallmentsFromAllocation(true); })(); }}>Genera rate</button><button className="secondary-button" onClick={() => { const firstExpense = scopedLedger.find((e) => e.direction === "Uscita"); setAutoAllocationForm({ ledger_entry_id: firstExpense?.id ?? "", table_id: scopedMillesimalTables.find(t => t.active)?.id ?? "", due_date: firstExpense?.due_date ?? "" }); setAutoPreview([]); setError(""); setShowAutoAllocationForm(true); }}>Riparto automatico</button><button className="primary-button" onClick={() => { setEditingAllocation(null); setAllocationForm({ ledger_entry_id: scopedLedger.find((e) => e.direction === "Uscita")?.id ?? "", unit_id: units.find((u) => u.condominium_id === dbCondominiumId)?.id ?? "", allocation_basis: "Millesimi generali", millesimi: 0, amount: 0, paid_amount: 0, due_date: "", status: "Da pagare", notes: "" }); setShowAllocationForm(true); }}>+ Nuova ripartizione</button></div>}
          </div>
          {scopedLedger.filter((e) => e.direction === "Uscita").length === 0 ? <p>Registra prima una spesa nel registro contabile.</p> : (<>
            <div className="permission-box" style={{marginBottom:12}}>
              <b>Acquisizione del riparto</b>
              <span>Inserimento manuale sempre disponibile. L'AI, quando inclusa nel piano o sbloccata come componente aggiuntivo, crea una proposta da verificare.</span>
              <div className="row-actions" style={{marginTop:8}}>
                {isAdministrator && <button className="secondary-button" onClick={openManualAllocationIntake}>＋ Inserimento manuale</button>}
                {isAdministrator && aiEnabled && <button className="secondary-button" onClick={openAIAllocationIntake}>✦ Acquisisci con AI</button>}
                {isAdministrator && !aiEnabled && <span className="small-note">Acquisizione AI disponibile con il modulo AI.</span>}
              </div>
            </div>
            {showAllocationIntakeForm && <div className="permission-box" style={{marginBottom:12}}>
              <b>{allocationIntakeForm.source === "AI" ? "Acquisizione AI — proposta da verificare" : "Inserimento manuale del riparto"}</b>
              <div className="form-grid" style={{marginTop:10}}>
                <label>Titolo<input value={allocationIntakeForm.title} onChange={e=>setAllocationIntakeForm({...allocationIntakeForm,title:e.target.value})}/></label>
                <label>Documento collegato<select value={allocationIntakeForm.document_id} onChange={e=>setAllocationIntakeForm({...allocationIntakeForm,document_id:e.target.value})}><option value="">Nessun documento</option>{documents.filter(d=>d.condominiumId===selectedCondominiumId).map(d=><option key={d.id} value={d.id}>{d.name} · {d.category}</option>)}</select></label>
                <label>Spesa<select value={allocationIntakeForm.ledger_entry_id} onChange={e=>{const x=scopedLedger.find(v=>v.id===e.target.value);setAllocationIntakeForm({...allocationIntakeForm,ledger_entry_id:e.target.value,expense_amount:Number(x?.amount||0)})}}>{scopedLedger.filter(e=>e.direction==="Uscita").map(e=><option key={e.id} value={e.id}>{e.description} · {money(e.amount)}</option>)}</select></label>
                <label>Tabella<select value={allocationIntakeForm.allocation_table_id} onChange={e=>setAllocationIntakeForm({...allocationIntakeForm,allocation_table_id:e.target.value})}>{scopedMillesimalTables.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.name} · {t.total_millesimi} millesimi</option>)}</select></label>
                <label>Importo<input type="number" min="0" step="0.01" value={allocationIntakeForm.expense_amount} onChange={e=>setAllocationIntakeForm({...allocationIntakeForm,expense_amount:Number(e.target.value)})}/></label>
              </div>
              {allocationIntakeForm.source==="AI" && <div className="row-actions" style={{marginTop:10}}><button className="secondary-button" onClick={buildAIAllocationProposal}>✦ Genera proposta</button></div>}
              {allocationIntakeForm.rows.length>0 && <div className="cards-list" style={{marginTop:10}}>{allocationIntakeForm.rows.map((row,i)=>{const unit=units.find(u=>u.id===row.unit_id);return <article className="row-card" key={row.unit_id}><div><b>{unit?.unit_code||row.unit_id}</b><small>Millesimi: {row.millesimi}</small><input type="number" min="0" step="0.01" value={row.amount} onChange={e=>setAllocationIntakeForm(f=>({...f,rows:f.rows.map((r,j)=>j===i?{...r,amount:Number(e.target.value)}:r)}))}/></div></article>})}</div>}
              <div className="row-actions" style={{marginTop:10}}><button className="primary-button" disabled={saving} onClick={saveAllocationIntake}>Salva proposta</button><button className="secondary-button" onClick={()=>setShowAllocationIntakeForm(false)}>Annulla</button></div>
            </div>}
            {allocationIntakes.length > 0 && <div className="cards-list" style={{marginBottom:12}}>
              {allocationIntakes.slice(0,10).map(intake => <article className="row-card" key={intake.id}>
                <div><b>{intake.title || "Acquisizione riparto"}</b><small>{intake.source} · {intake.status} · {intake.expense_amount != null ? money(intake.expense_amount) : "Importo non indicato"}</small>{intake.description && <span>{intake.description}</span>}</div>
                {isAdministrator && intake.status !== "Confermato" && intake.status !== "Annullato" && <button className="primary-button small" disabled={saving} onClick={()=>confirmAllocationIntake(intake)}>{intake.status==="Da verificare" ? "Verifica e conferma" : "Conferma riparto"}</button>}
              </article>)}
            </div>}
            <div className="cards-list">
              {allocationReconciliation.map(x => <article className="row-card" key={"reconciliation-"+x.id}><div><b>{x.description}</b><small>Spesa {money(x.amount)} · Ripartito {money(x.allocated)}</small><span>{x.balanced ? "✓ Ripartizione quadrata" : `⚠ Differenza ${money(x.difference)}`}</span></div></article>)}
            </div>
            <div className="cards-list">
              {allocations.filter((a) => !dbCondominiumId || a.condominium_id === dbCondominiumId).map((item) => {
                const unit = units.find((u) => u.id === item.unit_id);
                const expense = ledger.find((e) => e.id === item.ledger_entry_id);
                return <article className="row-card" key={item.id}>
                  <div>
                    <b>{unit?.unit_code || "Unità non trovata"}</b>
                    <small>{expense?.description || "Spesa"} · {item.allocation_basis} · {item.status}</small>
                    <span>{money(item.amount)} · millesimi {item.millesimi || 0} · pagato {money(item.paid_amount)}</span>
                    {item.due_date && <small>Scadenza {item.due_date}</small>}
                    {item.notes && <small>{item.notes}</small>}
                  </div>
                  {isAdministrator && <div className="row-actions">
                    <button className="secondary-button small" onClick={() => { setEditingAllocation(item); setAllocationForm({ ledger_entry_id: item.ledger_entry_id, unit_id: item.unit_id, allocation_basis: item.allocation_basis, millesimi: item.millesimi, amount: item.amount, paid_amount: item.paid_amount, due_date: item.due_date || "", status: item.status, notes: item.notes }); setShowAllocationForm(true); }}>Modifica</button>
                    <button className="mini-danger" onClick={() => remove("condominium_expense_allocations", item.id, "la ripartizione")}>×</button>
                  </div>}
                </article>;
              })}
            </div>
          </>)}
        </section>
      ) : tab === "millesimi" ? (
        <section className="cards-grid">
          <article className="card">
            <div className="section-heading"><div><h2>Tabelle millesimali</h2><p>Definisci le tabelle di riparto del condominio e il relativo totale.</p></div>{isAdministrator && dbCondominiumId && <button className="primary-button" onClick={()=>setShowMillesimalForm(true)}>+ Nuova tabella</button>}</div>
            {scopedMillesimalTables.length===0 ? <p>Nessuna tabella configurata.</p> : scopedMillesimalTables.map(t=><article className="row-card" key={t.id}><div><b>{t.name}</b><small>{t.description || "Nessuna descrizione"} · Totale {t.total_millesimi}</small><span>{t.active ? "Attiva" : "Disattivata"}</span><small>{(() => { const c=millesimalTableChecks.find(x=>x.id===t.id); return c?.complete ? "✓ Quote complete e quadrate" : `⚠ Quote incomplete o non quadrate (0/0)`; })()}</small></div>{isAdministrator&&<button className="mini-danger" onClick={()=>remove("condominium_millesimal_tables",t.id,"la tabella millesimale")}>×</button>}</article>)}
          </article>
          <article className="card"><div className="section-heading"><div><h2>Valori per unità</h2><p>{scopedMillesimalValues.length} valori registrati. I millesimi sono associati esclusivamente alle unità immobiliari.</p>{scopedMillesimalTables.length>0 && <p><b>Totale tabella:</b> {scopedMillesimalTables.reduce((s,t)=>s+Number(t.total_millesimi||0),0)} millesimi</p>}{isAdministrator && dbCondominiumId && scopedMillesimalTables.length>0 && <><button className="primary-button" onClick={()=>{const t=scopedMillesimalTables[0];const initial:Record<string,number>={};units.filter(u=>u.condominium_id===dbCondominiumId).forEach(u=>{initial[u.id]=scopedMillesimalValues.find(v=>v.table_id===t.id&&v.unit_id===u.id)?.value??0});setBulkMillesimalTableId(t.id);setBulkMillesimalValues(initial);setShowBulkMillesimalForm(true)}}>+ Compila quote</button><button className="secondary-button" onClick={()=>{setMillesimalValueForm({table_id:scopedMillesimalTables[0]?.id||"",unit_id:units.find(u=>u.condominium_id===dbCondominiumId)?.id||"",value:0,excluded:false,notes:""});setShowMillesimalValueForm(true)}}>+ Assegna quota</button></>}</div></div>{scopedMillesimalTables.length===0 ? <p>Nessuna tabella disponibile.</p> : scopedMillesimalTables.flatMap(t=>units.filter(u=>!dbCondominiumId||u.condominium_id===dbCondominiumId).map(u=>({t,u,v:scopedMillesimalValues.find(v=>v.table_id===t.id&&v.unit_id===u.id)}))).map(({t,u,v})=><div className="row-card" key={t.id+"-"+u.id}><div><b>Unità {u.unit_code}</b><small>{t.name}</small><span>{v ? (v.excluded ? "Esclusa" : v.value + " millesimi") : "Quota non ancora inserita"}</span></div></div>)}</article>
        </section>
      ) : tab === "consumi" ? (
        <section className="cards-grid">
          <article className="card">
            <div className="section-heading"><div><h2>Consumi e contabilizzazione</h2><p>Importa o inserisci i dati forniti dal gestore per riscaldamento, ACS e altri servizi a consumo.</p></div>{isAdministrator&&dbCondominiumId&&<label className="secondary-button" style={{cursor:"pointer"}}>Importa CSV<input type="file" accept=".csv,text/csv" onChange={importConsumptionCsv} style={{display:"none"}} /></label>}</div>
            <form onSubmit={saveConsumptionReading}><div className="form-grid">
              <label>Esercizio<select required value={consumptionForm.fiscal_year_id} onChange={e=>setConsumptionForm({...consumptionForm,fiscal_year_id:e.target.value})}><option value="">Seleziona</option>{scopedYears.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
              <label>Unità<select required value={consumptionForm.unit_id} onChange={e=>setConsumptionForm({...consumptionForm,unit_id:e.target.value})}><option value="">Seleziona</option>{units.filter(u=>!dbCondominiumId||u.condominium_id===dbCondominiumId).map(u=><option key={u.id} value={u.id}>{u.unit_code}</option>)}</select></label>
              <label>Servizio<input value={consumptionForm.service_type} onChange={e=>setConsumptionForm({...consumptionForm,service_type:e.target.value})} placeholder="Riscaldamento / ACS"/></label>
              <label>Matricola<input value={consumptionForm.meter_code} onChange={e=>setConsumptionForm({...consumptionForm,meter_code:e.target.value})}/></label>
              <label>Periodo inizio<input type="date" value={consumptionForm.period_start} onChange={e=>setConsumptionForm({...consumptionForm,period_start:e.target.value})}/></label>
              <label>Periodo fine<input type="date" value={consumptionForm.period_end} onChange={e=>setConsumptionForm({...consumptionForm,period_end:e.target.value})}/></label>
              <label>Lettura precedente<input type="number" step="0.0001" min="0" value={consumptionForm.previous_reading} onChange={e=>setConsumptionForm({...consumptionForm,previous_reading:e.target.value})}/></label>
              <label>Lettura attuale<input type="number" step="0.0001" min="0" value={consumptionForm.current_reading} onChange={e=>setConsumptionForm({...consumptionForm,current_reading:e.target.value})}/></label>
              <label>Consumo<input type="number" step="0.0001" min="0" value={consumptionForm.consumption} onChange={e=>setConsumptionForm({...consumptionForm,consumption:e.target.value})}/></label>
              <label>kWh<input type="number" step="0.0001" min="0" value={consumptionForm.kwh} onChange={e=>setConsumptionForm({...consumptionForm,kwh:e.target.value})}/></label>
              <label>Valore di riparto<input type="number" step="0.0001" min="0" value={consumptionForm.allocation_value} onChange={e=>setConsumptionForm({...consumptionForm,allocation_value:e.target.value})} placeholder="Se fornito dal gestore"/></label>
              <label>Importo quota<input type="number" step="0.01" min="0" value={consumptionForm.charge_amount} onChange={e=>setConsumptionForm({...consumptionForm,charge_amount:e.target.value})} placeholder="Se fornito dal gestore"/></label>
            </div><div className="form-grid"><label>Fonte<input value={consumptionForm.source} onChange={e=>setConsumptionForm({...consumptionForm,source:e.target.value})}/></label><label>Note<textarea value={consumptionForm.notes} onChange={e=>setConsumptionForm({...consumptionForm,notes:e.target.value})}/></label></div><div className="form-actions"><button className="primary-button" disabled={saving}>Salva rilevazione</button></div></form>
          </article>
          <article className="card"><div className="section-heading"><div><h2>Genera riparto da consumi</h2><p>BETHAG utilizza il valore di riparto/importo fornito dal gestore; in assenza, usa consumo o kWh come base proporzionale. Non sostituisce la verifica tecnica prevista dalla disciplina applicabile.</p></div></div>
            <div className="form-grid"><label>Spesa<select value={consumptionExpenseForm.ledger_entry_id} onChange={e=>setConsumptionExpenseForm({...consumptionExpenseForm,ledger_entry_id:e.target.value})}><option value="">Seleziona</option>{scopedLedger.filter(e=>e.direction==="Uscita").map(e=><option key={e.id} value={e.id}>{e.description} · {money(e.amount)}</option>)}</select></label><label>Esercizio<select value={consumptionExpenseForm.fiscal_year_id} onChange={e=>setConsumptionExpenseForm({...consumptionExpenseForm,fiscal_year_id:e.target.value})}><option value="">Seleziona</option>{scopedYears.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label><label>Servizio<input value={consumptionExpenseForm.service_type} onChange={e=>setConsumptionExpenseForm({...consumptionExpenseForm,service_type:e.target.value})}/></label></div>
            {isAdministrator&&<button className="primary-button" onClick={generateConsumptionAllocation} disabled={saving}>Genera riparto automatico</button>}
          </article>
          <article className="card"><div className="section-heading"><div><h2>Rilevazioni registrate</h2><p>{scopedConsumptionReadings.length} righe nel condominio selezionato.</p></div></div>{scopedConsumptionReadings.length===0?<p>Nessun dato di consumo registrato.</p>:scopedConsumptionReadings.map(r=><article className="row-card" key={r.id}><div><b>{units.find(u=>u.id===r.unit_id)?.unit_code||"Unità"}</b><small>{r.service_type} · {r.period_start||"periodo non indicato"} → {r.period_end||""} · {r.source}</small><span>{r.charge_amount!=null?money(r.charge_amount):"Quota gestore non indicata"} · consumo {r.consumption??"—"} · kWh {r.kwh??"—"}</span>{r.notes&&<small>{r.notes}</small>}</div>{isAdministrator&&<button className="mini-danger" onClick={()=>remove("condominium_consumption_readings",r.id,"la rilevazione di consumo")}>×</button>}</article>)}</article>
        </section>
      ) : tab === "rate" ? (
        <section className="card">
          <div className="section-heading"><div><h2>Rate e morosità</h2><p>Posizioni individuali, scadenze, pagamenti e residui da incassare.</p></div>{isAdministrator&&dbCondominiumId&&<button className="primary-button" onClick={()=>setShowInstallmentForm(true)}>+ Nuova rata</button>}</div>
          {scopedInstallments.length===0 ? <p>Nessuna rata registrata.</p> : scopedInstallments.map(i=><article className="row-card" key={i.id}><div><b>{i.title}</b><small>{units.find(u=>u.id===i.unit_id)?.unit_code || "Unità non associata"} · {i.due_date || "senza scadenza"} · {i.status}</small><span>Dovuto {money(i.amount)} · Pagato {money(i.paid_amount)} · Residuo {money(Math.max(0,i.amount-i.paid_amount))}</span>{isAdministrator && Number(i.amount)>Number(i.paid_amount) && <button className="secondary-button small" onClick={()=>{setPaymentInstallment(i);setPaymentForm({...paymentForm,amount:Math.max(0,Number(i.amount)-Number(i.paid_amount))});setShowPaymentForm(true)}}>Registra pagamento</button>}{i.notes&&<small>{i.notes}</small>}</div>{isAdministrator&&<button className="mini-danger" onClick={()=>remove("condominium_installments",i.id,"la rata")}>×</button>}</article>)}
        </section>
      ) : tab === "fondi" ? (
        <section className="card">
          <div className="section-heading">
            <div><h2>Fondi e riserve</h2><p>Fondi ordinari o destinati a lavori e spese specifiche.</p></div>
            {isAdministrator && dbCondominiumId && (
              <button className="primary-button" onClick={() => { setEditingFund(null); setShowFundForm(true); }}>+ Nuovo fondo</button>
            )}
          </div>
          {scopedFunds.length === 0 ? <p>Nessun fondo configurato.</p> : scopedFunds.map((fund) => (
            <article className="row-card" key={fund.id}>
              <div>
                <b>{fund.name}</b>
                <small>{fund.purpose || "Finalità non indicata"} · {fund.active ? "Attivo" : "Disattivato"}</small>
                <span>Obiettivo {money(fund.target_amount)} · Allocato {money(fund.allocated_amount)} · Utilizzato {money(fund.used_amount)}</span>
                {fund.notes && <small>{fund.notes}</small>}
              </div>
              {isAdministrator && (
                <div className="row-actions">
                  <button className="secondary-button small" onClick={() => { setEditingFund(fund); setFundForm({ name: fund.name, purpose: fund.purpose, target_amount: fund.target_amount, allocated_amount: fund.allocated_amount, used_amount: fund.used_amount, active: fund.active, notes: fund.notes }); setShowFundForm(true); }}>Modifica</button>
                  <button className="mini-danger" onClick={() => remove("condominium_funds", fund.id, "il fondo")}>×</button>
                </div>
              )}
            </article>
          ))}
        </section>
      ) : tab === "fiscale" ? (
        <section className="card">
          <div className="section-heading">
            <div><h2>Adempimenti fiscali</h2><p>Scadenze e importi da verificare e gestire.</p></div>
            {isAdministrator && dbCondominiumId && <button className="primary-button" onClick={() => { setEditingTax(null); setShowTaxForm(true); }}>+ Nuovo adempimento</button>}
          </div>
          {scopedTaxes.length === 0 ? <p>Nessun adempimento fiscale registrato.</p> : scopedTaxes.map((item) => (
            <article className="row-card" key={item.id}>
              <div>
                <b>{item.title}</b>
                <small>{item.category} · {item.due_date || "Data non definita"} · {item.status}</small>
                <span>{money(item.amount)}{item.notes ? " · " + item.notes : ""}</span>
              </div>
              {isAdministrator && <div className="row-actions">
                <button className="secondary-button small" onClick={() => { setEditingTax(item); setTaxForm({ title: item.title, category: item.category, due_date: item.due_date || "", amount: item.amount, status: item.status, notes: item.notes }); setShowTaxForm(true); }}>Modifica</button>
                <button className="mini-danger" onClick={() => remove("condominium_tax_obligations", item.id, "l'adempimento")}>×</button>
              </div>}
            </article>
          ))}
        </section>
      ) : tab === "impostazioni" ? (
        <section className="cards-grid"><article className="card"><div className="section-heading"><div><h2>Impostazioni contabilità</h2><p>Configura calendario, rate ordinarie e criteri per le spese straordinarie.</p></div></div>
          <form onSubmit={saveAccountingSettings}><h3>Esercizio contabile</h3><div className="form-grid"><label>Data inizio<input type="date" value={accountingSettingsForm.accounting_start_date} onChange={e=>setAccountingSettingsForm({...accountingSettingsForm,accounting_start_date:e.target.value})}/></label><label>Data fine<input type="date" value={accountingSettingsForm.accounting_end_date} onChange={e=>setAccountingSettingsForm({...accountingSettingsForm,accounting_end_date:e.target.value})}/></label></div>
          <h3>Spese ordinarie</h3><div className="form-grid"><label>Numero rate<input type="number" min="1" max="12" value={accountingSettingsForm.ordinary_installment_count} onChange={e=>setAccountingSettingsForm({...accountingSettingsForm,ordinary_installment_count:Math.max(1,Math.min(12,Number(e.target.value)||1))})}/></label><label>Scadenze<textarea placeholder="2026-01-31, 2026-02-28, ..." value={accountingSettingsForm.ordinary_due_dates} onChange={e=>setAccountingSettingsForm({...accountingSettingsForm,ordinary_due_dates:e.target.value})}/></label></div>
          <h3>Spese straordinarie</h3><label>Modalità<select value={accountingSettingsForm.extraordinary_mode} onChange={e=>setAccountingSettingsForm({...accountingSettingsForm,extraordinary_mode:e.target.value as "integrata"|"separata"})}><option value="separata">Gestione separata dalle ordinarie</option><option value="integrata">Integrare nelle rate ordinarie</option></select></label><label className="check-row"><input type="checkbox" checked={accountingSettingsForm.extraordinary_allow_multi_year} onChange={e=>setAccountingSettingsForm({...accountingSettingsForm,extraordinary_allow_multi_year:e.target.checked})}/> Consentire rate straordinarie su più esercizi</label>
          <div className="permission-box"><b>Regola</b><span>Massimo 12 rate per esercizio; i piani straordinari separati possono attraversare più annualità.</span></div><div className="form-actions"><button className="primary-button" disabled={saving}>Salva impostazioni</button></div></form>
        </article><article className="card"><h2>Regole automatiche di riparto</h2><p>Associa una categoria o un tipo di spesa a una tabella. Se nel riparto automatico non viene scelta una tabella, BETHAG utilizzerà la regola attiva con priorità più alta.</p>
<form onSubmit={saveAllocationRule}><div className="form-grid"><label>Nome<input required value={allocationRuleForm.name} onChange={e=>setAllocationRuleForm({...allocationRuleForm,name:e.target.value})} placeholder="Riscaldamento"/></label><label>Priorità<input type="number" min="0" value={allocationRuleForm.priority} onChange={e=>setAllocationRuleForm({...allocationRuleForm,priority:Number(e.target.value)})}/></label><label>Tipo spesa<select value={allocationRuleForm.expense_type} onChange={e=>setAllocationRuleForm({...allocationRuleForm,expense_type:e.target.value})}><option value="">Qualsiasi</option><option>Ordinaria</option><option>Straordinaria</option></select></label><label>Categoria<input value={allocationRuleForm.category} onChange={e=>setAllocationRuleForm({...allocationRuleForm,category:e.target.value})} placeholder="Ascensore"/></label><label>Tabella<select required value={allocationRuleForm.allocation_table_id} onChange={e=>setAllocationRuleForm({...allocationRuleForm,allocation_table_id:e.target.value})}><option value="">Seleziona</option>{scopedMillesimalTables.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div><label>Note<textarea value={allocationRuleForm.notes} onChange={e=>setAllocationRuleForm({...allocationRuleForm,notes:e.target.value})}/></label><div className="form-actions"><button className="primary-button" disabled={saving}>Salva regola</button></div></form>
{allocationRules.filter(r=>!dbCondominiumId||r.condominium_id===dbCondominiumId).map(r=><article className="row-card" key={r.id}><div><b>{r.name}</b><small>{r.expense_type||"Qualsiasi tipo"} · {r.category||"Qualsiasi categoria"} · priorità {r.priority}</small><span>{scopedMillesimalTables.find(t=>t.id===r.allocation_table_id)?.name||"Tabella non trovata"} · {r.active?"Attiva":"Disattivata"}</span></div>{isAdministrator&&<button className="mini-danger" onClick={()=>remove("condominium_allocation_rules",r.id,"la regola di riparto")}>×</button>}</article>)}</article></section>
      ) : (
        <section className="card">
          <div className="section-heading">
            <div><h2>Contenzioso</h2><p>Pratiche e procedimenti collegati al condominio.</p></div>
            {isAdministrator && dbCondominiumId && <button className="primary-button" onClick={() => { setEditingCase(null); setShowCaseForm(true); }}>+ Nuova pratica</button>}
          </div>
          {scopedCases.length === 0 ? <p>Nessuna pratica registrata.</p> : scopedCases.map((item) => (
            <article className="row-card" key={item.id}>
              <div>
                <b>{item.title}</b>
                <small>{item.counterpart || "Controparte non indicata"} · {item.status}</small>
                <span>Apertura {item.opened_date || "non indicata"}{item.closed_date ? " · chiusura " + item.closed_date : ""}</span>
                {item.notes && <small>{item.notes}</small>}
              </div>
              {isAdministrator && <div className="row-actions">
                <button className="secondary-button small" onClick={() => { setEditingCase(item); setCaseForm({ title: item.title, counterpart: item.counterpart, status: item.status, opened_date: item.opened_date || "", closed_date: item.closed_date || "", notes: item.notes }); setShowCaseForm(true); }}>Modifica</button>
                <button className="mini-danger" onClick={() => remove("condominium_legal_cases", item.id, "la pratica")}>×</button>
              </div>}
            </article>
          ))}
        </section>
      )}

      <div className="card"><div className="section-heading"><div><h2>Partite riportate</h2><p>Crediti e debiti individuali provenienti dagli esercizi precedenti.</p></div></div>{rendicontoCarryovers.length===0 ? <p>Nessuna partita riportata.</p> : <div className="cards-list">{rendicontoCarryovers.map(c=>{const unit=units.find(u=>u.id===c.unit_id); const source=scopedYears.find(y=>y.id===c.source_fiscal_year_id); return <article className="row-card" key={c.id}><div><b>{unit?.unit_code || "Unità non associata"} · {c.kind}</b><small>Da {source?.name || "esercizio precedente"} · {c.status}</small><span>{money(Math.abs(Number(c.balance||0)))}</span></div></article>})}</div>}<div className="permission-box"><span>Debiti riportati: {money(carryoverDebt)}</span><span>Crediti riportati: {money(carryoverCredit)}</span></div></div>

      {showYearForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveYear}>
          <h2>Nuovo esercizio</h2>
          <label>Nome<input required value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="Esercizio 2026" /></label>
          <div className="form-grid"><label>Inizio<input type="date" value={yearForm.start_date} onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })} /></label><label>Fine<input type="date" value={yearForm.end_date} onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })} /></label></div>
          <div className="form-grid"><label>Stato<select value={yearForm.status} onChange={(e) => setYearForm({ ...yearForm, status: e.target.value as FiscalYear["status"] })}><option>Aperto</option><option>Provvisorio</option><option>Chiuso</option></select></label><label>Saldo iniziale<input type="number" step="0.01" value={yearForm.opening_balance} onChange={(e) => setYearForm({ ...yearForm, opening_balance: Number(e.target.value) })} /></label></div>
          <label>Note<textarea value={yearForm.notes} onChange={(e) => setYearForm({ ...yearForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowYearForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

      {showLedgerForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveLedger}>
          <h2>{editingLedger ? "Modifica movimento" : "Nuovo movimento contabile"}</h2>
          <div className="form-grid">
            <label>Data<input type="date" required value={ledgerForm.entry_date} onChange={(e) => setLedgerForm({ ...ledgerForm, entry_date: e.target.value })} /></label>
            <label>Tipo<select value={ledgerForm.direction} onChange={(e) => setLedgerForm({ ...ledgerForm, direction: e.target.value as LedgerEntry["direction"] })}><option>Uscita</option><option>Entrata</option></select></label>
          </div>
          <div className="form-grid"><label>Tipo spesa<select value={ledgerForm.expense_type} onChange={(e) => setLedgerForm({ ...ledgerForm, expense_type: e.target.value as "Ordinaria" | "Straordinaria" })} disabled={ledgerForm.direction !== "Uscita"}><option value="Ordinaria">Ordinaria</option><option value="Straordinaria">Straordinaria</option></select></label><label>Categoria<input value={ledgerForm.category} onChange={(e) => setLedgerForm({ ...ledgerForm, category: e.target.value })} /></label><label>Importo<input type="number" min="0.01" step="0.01" required value={ledgerForm.amount} onChange={(e) => setLedgerForm({ ...ledgerForm, amount: Number(e.target.value) })} /></label></div>
          <label>Descrizione<input required value={ledgerForm.description} onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })} /></label>
          <div className="form-grid"><label>Esercizio<select value={ledgerForm.fiscal_year_id ?? ""} onChange={(e) => setLedgerForm({ ...ledgerForm, fiscal_year_id: e.target.value || null })}><option value="">Nessuno</option>{scopedYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label><label>Stato pagamento<select value={ledgerForm.payment_status} onChange={(e) => setLedgerForm({ ...ledgerForm, payment_status: e.target.value as LedgerEntry["payment_status"] })}><option>Da pagare</option><option>Parzialmente pagato</option><option>Pagato</option></select></label></div>
          <div className="form-grid"><label>Scadenza<input type="date" value={ledgerForm.due_date} onChange={(e) => setLedgerForm({ ...ledgerForm, due_date: e.target.value })} /></label><label>Fondo / Riserva<select value={ledgerForm.fund_id ?? ""} onChange={(e) => setLedgerForm({ ...ledgerForm, fund_id: e.target.value || null })} disabled={ledgerForm.direction !== "Uscita"}><option value="">Nessun fondo</option>{scopedFunds.filter(f=>f.active).map(f=><option key={f.id} value={f.id}>{f.name} · residuo {money(Math.max(0,Number(f.allocated_amount)-Number(f.used_amount)))}</option>)}</select></label></div>
          <label>Note<textarea value={ledgerForm.notes} onChange={(e) => setLedgerForm({ ...ledgerForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowLedgerForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

      {showBudgetForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveBudget}>
          <h2>{editingBudget ? "Modifica voce di preventivo" : "Nuova voce di preventivo"}</h2>
          <label>Esercizio<select value={budgetForm.fiscal_year_id} onChange={e=>setBudgetForm({...budgetForm,fiscal_year_id:e.target.value})}><option value="">Nessuno</option>{scopedYears.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
          <div className="form-grid"><label>Categoria<input value={budgetForm.category} onChange={e=>setBudgetForm({...budgetForm,category:e.target.value})}/></label><label>Importo<input type="number" min="0.01" step="0.01" required value={budgetForm.amount} onChange={e=>setBudgetForm({...budgetForm,amount:Number(e.target.value)})}/></label></div>
          <label>Descrizione<input required value={budgetForm.description} onChange={e=>setBudgetForm({...budgetForm,description:e.target.value})}/></label>
          <label>Note<textarea value={budgetForm.notes} onChange={e=>setBudgetForm({...budgetForm,notes:e.target.value})}/></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowBudgetForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

      {showPaymentForm && paymentInstallment && <div className="modal-backdrop"><form className="modal-card" onSubmit={savePayment}><h2>Registra pagamento</h2><p><b>{paymentInstallment.title}</b><br/>Residuo: {money(Math.max(0,Number(paymentInstallment.amount)-Number(paymentInstallment.paid_amount)))}</p><div className="form-grid"><label>Data<input type="date" required value={paymentForm.payment_date} onChange={e=>setPaymentForm({...paymentForm,payment_date:e.target.value})}/></label><label>Importo<input type="number" min="0.01" step="0.01" required value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:Number(e.target.value)})}/></label></div><label>Metodo<select value={paymentForm.method} onChange={e=>setPaymentForm({...paymentForm,method:e.target.value})}><option>Bonifico</option><option>Addebito</option><option>Assegno</option><option>Contanti</option><option>Altro</option></select></label><label>Riferimento<input value={paymentForm.reference} onChange={e=>setPaymentForm({...paymentForm,reference:e.target.value})}/></label><label>Note<textarea value={paymentForm.notes} onChange={e=>setPaymentForm({...paymentForm,notes:e.target.value})}/></label><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowPaymentForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Registra</button></div></form></div>}

      {showBulkMillesimalForm && <div className="modal-backdrop"><div className="modal-card"><h2>Compila quote millesimali</h2><p>Inserisci le quote di tutte le unità. La somma deve essere pari a {scopedMillesimalTables.find(t=>t.id===bulkMillesimalTableId)?.total_millesimi||0}.</p><label>Tabella<select value={bulkMillesimalTableId} onChange={e=>{const id=e.target.value;setBulkMillesimalTableId(id);const initial:Record<string,number>={};units.filter(u=>u.condominium_id===dbCondominiumId).forEach(u=>{initial[u.id]=scopedMillesimalValues.find(v=>v.table_id===id&&v.unit_id===u.id)?.value??0});setBulkMillesimalValues(initial)}}>{scopedMillesimalTables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>{units.filter(u=>u.condominium_id===dbCondominiumId).map(u=><label key={u.id}>Unità {u.unit_code}<input type="number" min="0" step="0.001" value={bulkMillesimalValues[u.id]??0} onChange={e=>setBulkMillesimalValues({...bulkMillesimalValues,[u.id]:Number(e.target.value)})}/></label>)}<div className="permission-box"><b>Somma</b><span>{units.filter(u=>u.condominium_id===dbCondominiumId).reduce((s,u)=>s+Number(bulkMillesimalValues[u.id]||0),0)} / {scopedMillesimalTables.find(t=>t.id===bulkMillesimalTableId)?.total_millesimi||0}</span></div><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowBulkMillesimalForm(false)}>Annulla</button><button type="button" className="primary-button" disabled={saving} onClick={saveBulkMillesimalValues}>Salva quote</button></div></div></div>}

      {showMillesimalValueForm && <div className="modal-backdrop"><form className="modal-card" onSubmit={saveMillesimalValue}><h2>Assegna quota millesimale</h2><label>Tabella<select required value={millesimalValueForm.table_id} onChange={e=>setMillesimalValueForm({...millesimalValueForm,table_id:e.target.value})}><option value="">Seleziona</option>{scopedMillesimalTables.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Unità<select required value={millesimalValueForm.unit_id} onChange={e=>setMillesimalValueForm({...millesimalValueForm,unit_id:e.target.value})}><option value="">Seleziona</option>{units.filter(u=>!dbCondominiumId||u.condominium_id===dbCondominiumId).map(u=><option key={u.id} value={u.id}>{u.unit_code}</option>)}</select></label><label>Millesimi<input type="number" step="0.001" min="0" value={millesimalValueForm.value} onChange={e=>setMillesimalValueForm({...millesimalValueForm,value:Number(e.target.value)})}/></label><label className="check-row"><input type="checkbox" checked={millesimalValueForm.excluded} onChange={e=>setMillesimalValueForm({...millesimalValueForm,excluded:e.target.checked})}/> Unità esclusa dal riparto</label><label>Note<textarea value={millesimalValueForm.notes} onChange={e=>setMillesimalValueForm({...millesimalValueForm,notes:e.target.value})}/></label><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowMillesimalValueForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div></form></div>}

      {showMillesimalForm && <div className="modal-backdrop"><form className="modal-card" onSubmit={saveMillesimalTable}><h2>Nuova tabella / criterio di riparto</h2><div className="form-grid"><label>Nome<input required value={millesimalForm.name} onChange={e=>setMillesimalForm({...millesimalForm,name:e.target.value})}/></label><label>Tipo criterio<select value={millesimalForm.basis_type} onChange={e=>setMillesimalForm({...millesimalForm,basis_type:e.target.value as MillesimalTable["basis_type"]})}><option>Millesimi</option><option>Quote personalizzate</option><option>Consumo</option><option>Misto</option></select></label></div><label>Descrizione<input value={millesimalForm.description} onChange={e=>setMillesimalForm({...millesimalForm,description:e.target.value})} placeholder="Es. Ascensore civico 12 / Riscaldamento"/></label><div className="form-grid"><label>Ambito<select value={millesimalForm.scope_mode} onChange={e=>setMillesimalForm({...millesimalForm,scope_mode:e.target.value as MillesimalTable["scope_mode"]})}><option value="all">Intero condominio</option><option value="units">Unità selezionate</option><option value="buildings">Fabbricati / civici</option></select></label><label>Totale millesimi<input type="number" step="0.001" min="0.001" value={millesimalForm.total_millesimi} onChange={e=>setMillesimalForm({...millesimalForm,total_millesimi:Number(e.target.value)})}/></label></div>{millesimalForm.scope_mode==="units"&&<div className="permission-box"><b>Unità partecipanti</b><div className="checkbox-grid">{units.filter(u=>!dbCondominiumId||u.condominium_id===dbCondominiumId).map(u=><label key={u.id} className="switch-row"><input type="checkbox" checked={millesimalForm.scope_unit_ids.includes(u.id)} onChange={e=>setMillesimalForm({...millesimalForm,scope_unit_ids:e.target.checked?[...millesimalForm.scope_unit_ids,u.id]:millesimalForm.scope_unit_ids.filter(id=>id!==u.id)})}/><span>{u.unit_code}</span></label>)}</div></div>}{millesimalForm.scope_mode==="buildings"&&<label>Fabbricati / civici<input value={millesimalForm.scope_building_codes} onChange={e=>setMillesimalForm({...millesimalForm,scope_building_codes:e.target.value})} placeholder="Es. 8, 10, 12"/></label>}<label>Note<textarea value={millesimalForm.notes} onChange={e=>setMillesimalForm({...millesimalForm,notes:e.target.value})}/></label><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowMillesimalForm(false)}>Annulla</button><button className="primary-button">Salva criterio</button></div></form></div>}

      {showInstallmentForm && <div className="modal-backdrop"><form className="modal-card" onSubmit={saveInstallment}><h2>Nuova rata</h2><label>Titolo<input required value={installmentForm.title} onChange={e=>setInstallmentForm({...installmentForm,title:e.target.value})} placeholder="Rata ordinaria 1/4"/></label><label>Unità<select value={installmentForm.unit_id} onChange={e=>setInstallmentForm({...installmentForm,unit_id:e.target.value})}><option value="">Seleziona</option>{units.filter(u=>!dbCondominiumId||u.condominium_id===dbCondominiumId).map(u=><option key={u.id} value={u.id}>{u.unit_code}</option>)}</select></label><div className="form-grid"><label>Importo<input type="number" min="0.01" step="0.01" value={installmentForm.amount} onChange={e=>setInstallmentForm({...installmentForm,amount:Number(e.target.value)})}/></label><label>Pagato<input type="number" min="0" step="0.01" value={0} readOnly disabled /></label></div><div className="form-grid"><label>Scadenza<input type="date" value={installmentForm.due_date} onChange={e=>setInstallmentForm({...installmentForm,due_date:e.target.value})}/></label><label>Stato<select value="Da pagare" disabled><option>Da pagare</option></select></label></div><p style={{margin:"6px 0 0",fontSize:13,opacity:.75}}>La rata viene creata non pagata. I pagamenti si registrano successivamente dal pulsante <b>Registra pagamento</b>.</p><label>Note<textarea value={installmentForm.notes} onChange={e=>setInstallmentForm({...installmentForm,notes:e.target.value})}/></label><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowInstallmentForm(false)}>Annulla</button><button className="primary-button">Salva</button></div></form></div>}

      {showInstallmentsFromAllocation && <div className="modal-backdrop"><div className="modal-card"><h2>Genera rate dal riparto</h2><p>Viene creata una rata per ogni quota della spesa. Le spese straordinarie possono essere separate e distribuire le scadenze su più esercizi. Le rate identiche già presenti non vengono duplicate.</p><label>Spesa<select value={allocationInstallmentForm.ledger_entry_id} onChange={e=>setAllocationInstallmentForm({...allocationInstallmentForm,ledger_entry_id:e.target.value})}><option value="">Seleziona</option>{scopedLedger.filter(e=>e.direction==="Uscita"&&allocations.some(a=>a.ledger_entry_id===e.id)).map(e=><option key={e.id} value={e.id}>{e.description} · {money(e.amount)}</option>)}</select></label><label>Titolo<input value={allocationInstallmentForm.title} onChange={e=>setAllocationInstallmentForm({...allocationInstallmentForm,title:e.target.value})}/></label><div className="form-grid"><label>Numero rate complessive<input type="number" min="1" max="12" value={allocationInstallmentForm.installment_count} onChange={e=>{const count=Math.max(1,Math.min(12,Number(e.target.value)||1));setAllocationInstallmentForm({...allocationInstallmentForm,installment_count:count,due_dates:Array.from({length:count},(_,i)=>allocationInstallmentForm.due_dates[i]||""),percentages:Array.from({length:count},()=>Number((100/count).toFixed(4)))})}}/></label><label>Esercizio<select value={allocationInstallmentForm.fiscal_year_id} onChange={e=>setAllocationInstallmentForm({...allocationInstallmentForm,fiscal_year_id:e.target.value})}><option value="">Nessuno</option>{scopedYears.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label></div><div className="permission-box"><b>Scadenze e percentuali</b><div className="form-grid">{Array.from({length:Math.max(1,Math.min(12,Number(allocationInstallmentForm.installment_count)||1))},(_,index)=><div key={index}><label>Rata {index+1} — scadenza<input type="date" value={allocationInstallmentForm.due_dates[index]||""} onChange={e=>setAllocationInstallmentForm({...allocationInstallmentForm,due_dates:allocationInstallmentForm.due_dates.map((date,i)=>i===index?e.target.value:date)})}/></label><label>Percentuale %<input type="number" min="0.01" step="0.01" value={allocationInstallmentForm.percentages[index]??0} onChange={e=>setAllocationInstallmentForm({...allocationInstallmentForm,percentages:allocationInstallmentForm.percentages.map((p,i)=>i===index?Number(e.target.value):p)})}/></label></div>)}</div><p style={{margin:"6px 0 0",fontSize:13,opacity:.75}}>Le percentuali devono sommare a 100%. È quindi possibile gestire, ad esempio, 30% + 30% + 40%.</p></div><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setShowInstallmentsFromAllocation(false)}>Annulla</button><button type="button" className="primary-button" disabled={saving} onClick={generateInstallmentsFromAllocation}>Genera rate</button></div></div></div>}

      {showAutoAllocationForm && <div className="modal-backdrop"><div className="modal-card">
        <h2>Riparto millesimale</h2>
        <label>Spesa<select value={autoAllocationForm.ledger_entry_id} onChange={e=>{setAutoAllocationForm({...autoAllocationForm,ledger_entry_id:e.target.value});setAutoPreview([])}}><option value="">Seleziona</option>{scopedLedger.filter(e=>e.direction==="Uscita").map(e=><option key={e.id} value={e.id}>{e.description} · {money(e.amount)}</option>)}</select></label>
        <label>Tabella<select value={autoAllocationForm.table_id} onChange={e=>{setAutoAllocationForm({...autoAllocationForm,table_id:e.target.value});setAutoPreview([])}}><option value="">Automatico da regola</option>{scopedMillesimalTables.filter(t=>t.active).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <button type="button" className="secondary-button" onClick={calculateAutomaticPreview}>Calcola anteprima</button>
        {autoPreview.length>0 && <div className="cards-list">{autoPreview.map(r=><div className="row-card" key={r.unit_id}><b>{r.unit_code}</b><span>{r.millesimi} · {money(r.amount)}</span></div>)}<div className="permission-box"><b>Totale</b><span>{money(autoPreview.reduce((s,r)=>s+r.amount,0))}</span></div></div>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={()=>{setShowAutoAllocationForm(false);setAutoPreview([])}}>Annulla</button><button type="button" className="primary-button" disabled={saving||!autoPreview.length} onClick={generateAutomaticAllocation}>Conferma</button></div>
      </div></div>}

      {showAllocationForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveAllocation}>
          <h2>{editingAllocation ? "Modifica ripartizione" : "Nuova ripartizione"}</h2>
          <label>Spesa
            <select required value={allocationForm.ledger_entry_id} onChange={(e) => setAllocationForm({ ...allocationForm, ledger_entry_id: e.target.value })}>
              <option value="">Seleziona una spesa</option>
              {scopedLedger.filter((e) => e.direction === "Uscita").map((e) => <option key={e.id} value={e.id}>{e.entry_date} · {e.description} · {money(e.amount)}</option>)}
            </select>
          </label>
          <label>Unità
            <select required value={allocationForm.unit_id} onChange={(e) => setAllocationForm({ ...allocationForm, unit_id: e.target.value })}>
              <option value="">Seleziona unità</option>
              {units.filter((u) => !dbCondominiumId || u.condominium_id === dbCondominiumId).map((u) => <option key={u.id} value={u.id}>{u.unit_code}</option>)}
            </select>
          </label>
          <div className="form-grid"><label>Base di riparto<input value={allocationForm.allocation_basis} onChange={(e) => setAllocationForm({ ...allocationForm, allocation_basis: e.target.value })} /></label><label>Millesimi<input type="number" step="0.001" value={allocationForm.millesimi} onChange={(e) => setAllocationForm({ ...allocationForm, millesimi: Number(e.target.value) })} /></label></div>
          <div className="form-grid"><label>Importo<input type="number" min="0.01" step="0.01" value={allocationForm.amount} onChange={(e) => setAllocationForm({ ...allocationForm, amount: Number(e.target.value) })} /></label><label>Pagato<input type="number" min="0" step="0.01" value={allocationForm.paid_amount} readOnly disabled /></label></div>
          <div className="form-grid"><label>Scadenza<input type="date" value={allocationForm.due_date} onChange={(e) => setAllocationForm({ ...allocationForm, due_date: e.target.value })} /></label><label>Stato<select value={allocationForm.status} disabled><option>Da pagare</option><option>Parzialmente pagato</option><option>Pagato</option></select></label></div>
          <p style={{margin:"6px 0 0",fontSize:13,opacity:.75}}>Il pagamento viene gestito tramite le rate e la funzione <b>Registra pagamento</b>.</p>
          <label>Note<textarea value={allocationForm.notes} onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowAllocationForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

      {showFundForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveFund}>
          <h2>{editingFund ? "Modifica fondo" : "Nuovo fondo"}</h2>
          <label>Nome<input required value={fundForm.name} onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })} /></label>
          <label>Finalità<input value={fundForm.purpose} onChange={(e) => setFundForm({ ...fundForm, purpose: e.target.value })} /></label>
          <div className="form-grid"><label>Obiettivo<input type="number" step="0.01" value={fundForm.target_amount} onChange={(e) => setFundForm({ ...fundForm, target_amount: Number(e.target.value) })} /></label><label>Allocato<input type="number" step="0.01" value={fundForm.allocated_amount} onChange={(e) => setFundForm({ ...fundForm, allocated_amount: Number(e.target.value) })} /></label></div>
          <label>Utilizzato<input type="number" step="0.01" value={fundForm.used_amount} onChange={(e) => setFundForm({ ...fundForm, used_amount: Number(e.target.value) })} /></label>
          <label className="check-row"><input type="checkbox" checked={fundForm.active} onChange={(e) => setFundForm({ ...fundForm, active: e.target.checked })} /> Fondo attivo</label>
          <label>Note<textarea value={fundForm.notes} onChange={(e) => setFundForm({ ...fundForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowFundForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

      {showTaxForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveTax}>
          <h2>{editingTax ? "Modifica adempimento fiscale" : "Nuovo adempimento fiscale"}</h2>
          <label>Titolo<input required value={taxForm.title} onChange={(e) => setTaxForm({ ...taxForm, title: e.target.value })} /></label>
          <div className="form-grid"><label>Categoria<input value={taxForm.category} onChange={(e) => setTaxForm({ ...taxForm, category: e.target.value })} /></label><label>Importo<input type="number" step="0.01" value={taxForm.amount} onChange={(e) => setTaxForm({ ...taxForm, amount: Number(e.target.value) })} /></label></div>
          <div className="form-grid"><label>Scadenza<input type="date" value={taxForm.due_date} onChange={(e) => setTaxForm({ ...taxForm, due_date: e.target.value })} /></label><label>Stato<input value={taxForm.status} onChange={(e) => setTaxForm({ ...taxForm, status: e.target.value })} /></label></div>
          <label>Note<textarea value={taxForm.notes} onChange={(e) => setTaxForm({ ...taxForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowTaxForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

      {showCaseForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveCase}>
          <h2>{editingCase ? "Modifica pratica" : "Nuova pratica di contenzioso"}</h2>
          <label>Titolo<input required value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} /></label>
          <label>Controparte<input value={caseForm.counterpart} onChange={(e) => setCaseForm({ ...caseForm, counterpart: e.target.value })} /></label>
          <div className="form-grid"><label>Stato<input value={caseForm.status} onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value })} /></label><label>Data apertura<input type="date" value={caseForm.opened_date} onChange={(e) => setCaseForm({ ...caseForm, opened_date: e.target.value })} /></label></div>
          <label>Data chiusura<input type="date" value={caseForm.closed_date} onChange={(e) => setCaseForm({ ...caseForm, closed_date: e.target.value })} /></label>
          <label>Note<textarea value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCaseForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}
    </>
  </>
  );
}

export default AccountingPage;
