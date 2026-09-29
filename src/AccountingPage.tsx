import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type Condominium = {
  id: number;
  name: string;
};

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
  category: string;
  description: string;
  amount: number;
  payment_status: "Da pagare" | "Parzialmente pagato" | "Pagato";
  due_date: string;
  supplier_id: string | null;
  unit_id: string | null;
  member_id: string | null;
  document_id: string | null;
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

type Tab = "rendiconto" | "movimenti" | "ripartizioni" | "fondi" | "fiscale" | "contenzioso";

const emptyLedger: Omit<LedgerEntry, "id" | "condominium_id"> = {
  fiscal_year_id: null,
  entry_date: new Date().toISOString().slice(0, 10),
  direction: "Uscita",
  category: "Manutenzione",
  description: "",
  amount: 0,
  payment_status: "Da pagare",
  due_date: "",
  supplier_id: null,
  unit_id: null,
  member_id: null,
  document_id: null,
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
}: {
  workspaceId: string;
  condominiums: Condominium[];
  isAdministrator?: boolean;
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
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
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

  const scopedCases = useMemo(
    () =>
      dbCondominiumId
        ? legalCases.filter((c) => c.condominium_id === dbCondominiumId)
        : legalCases,
    [dbCondominiumId, legalCases]
  );

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
      const [yearsResult, ledgerResult, fundsResult, taxResult, caseResult, allocationsResult, unitsResult] =
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
            .from("condominium_units")
            .select("id, condominium_id, unit_code, data")
            .eq("workspace_id", workspaceId)
            .order("unit_code"),
        ]);
      for (const result of [
        yearsResult,
        ledgerResult,
        fundsResult,
        taxResult,
        caseResult,
        allocationsResult,
        unitsResult,
      ]) {
        if (result.error) throw result.error;
      }
      setFiscalYears((yearsResult.data ?? []) as FiscalYear[]);
      setLedger((ledgerResult.data ?? []) as LedgerEntry[]);
      setFunds((fundsResult.data ?? []) as Fund[]);
      setTaxes((taxResult.data ?? []) as TaxObligation[]);
      setLegalCases((caseResult.data ?? []) as LegalCase[]);
      setAllocations((allocationsResult.data ?? []) as Allocation[]);
      setUnits((unitsResult.data ?? []) as UnitOption[]);
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

  async function saveYear(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        ...yearForm,
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
    if (!ledgerForm.description.trim() || Number(ledgerForm.amount) <= 0) {
      setError("Inserisci descrizione e importo maggiore di zero.");
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
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        name: fundForm.name.trim(),
        purpose: fundForm.purpose,
        target_amount: Number(fundForm.target_amount),
        allocated_amount: Number(fundForm.allocated_amount),
        used_amount: Number(fundForm.used_amount),
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
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        title: taxForm.title.trim(),
        category: taxForm.category,
        due_date: taxForm.due_date || null,
        amount: Number(taxForm.amount),
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

  async function saveAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !dbCondominiumId) return;
    if (!allocationForm.ledger_entry_id || !allocationForm.unit_id || Number(allocationForm.amount) <= 0) {
      setError("Seleziona un movimento, un'unità e un importo maggiore di zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        ledger_entry_id: allocationForm.ledger_entry_id,
        unit_id: allocationForm.unit_id,
        member_id: null,
        allocation_basis: allocationForm.allocation_basis,
        millesimi: Number(allocationForm.millesimi),
        amount: Number(allocationForm.amount),
        paid_amount: Number(allocationForm.paid_amount),
        due_date: allocationForm.due_date || null,
        status: allocationForm.status,
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

  async function remove(table: string, id: string, label: string) {
    if (!supabase) return;
    if (!window.confirm("Sei sicuro di voler cancellare " + label + "?")) return;
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (deleteError) {
      setError(deleteError.message);
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

  return (
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

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <div className="quick-stats">
        <div className="quick-stat"><b>{money(totals.income)}</b><span>Entrate</span></div>
        <div className="quick-stat"><b>{money(totals.expenses)}</b><span>Uscite</span></div>
        <div className="quick-stat"><b>{money(totals.balance)}</b><span>Saldo movimenti</span></div>
        <div className="quick-stat"><b>{money(totals.due)}</b><span>Uscite non pagate</span></div>
      </div>

      <div className="filter-bar">
        {([
          ["rendiconto", "Rendiconto"],
          ["movimenti", "Registro contabile"],
          ["ripartizioni", "Ripartizioni"],
          ["fondi", "Fondi e riserve"],
          ["fiscale", "Adempimenti fiscali"],
          ["contenzioso", "Contenzioso"],
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
            <h2>Situazione economica</h2>
            <p>Periodo e movimenti registrati per {selectedName}.</p>
            <div className="quick-stats">
              <div className="quick-stat"><b>{money(totals.income)}</b><span>Entrate registrate</span></div>
              <div className="quick-stat"><b>{money(totals.expenses)}</b><span>Spese registrate</span></div>
              <div className="quick-stat"><b>{money(totals.balance)}</b><span>Differenza</span></div>
            </div>
            <h3>Esercizi</h3>
            {scopedYears.length === 0 ? (
              <p>Nessun esercizio configurato.</p>
            ) : scopedYears.map((year) => (
              <div className="row-card" key={year.id}>
                <div>
                  <b>{year.name}</b>
                  <small>{year.start_date} → {year.end_date}</small>
                  <span>{year.status} · Apertura {money(year.opening_balance)}</span>
                </div>
                {isAdministrator && dbCondominiumId && (
                  <button className="mini-danger" onClick={() => remove("condominium_fiscal_years", year.id, "l'esercizio")}>×</button>
                )}
              </div>
            ))}
            {isAdministrator && dbCondominiumId && (
              <button className="primary-button" onClick={() => setShowYearForm(true)}>+ Nuovo esercizio</button>
            )}
          </article>

          <article className="card">
            <h2>Rendiconto</h2>
            <p>
              Il modulo costituisce la base del registro contabile e della situazione
              finanziaria. La nota esplicativa e il prospetto definitivo potranno
              essere generati sui dati verificati dell'esercizio.
            </p>
            <div className="permission-box">
              <b>Registro contabile</b>
              <span>{scopedLedger.length} movimenti registrati.</span>
            </div>
            <div className="permission-box">
              <b>Fondi e riserve</b>
              <span>{scopedFunds.length} fondi configurati.</span>
            </div>
            <div className="permission-box">
              <b>Adempimenti fiscali</b>
              <span>{scopedTaxes.length} adempimenti registrati.</span>
            </div>
            <div className="permission-box">
              <b>Contenzioso</b>
              <span>{scopedCases.length} pratiche registrate.</span>
            </div>
            <p className="small-note">
              La contabilità non cancella automaticamente le unità o i condòmini:
              i dati anagrafici restano persistenti e le cancellazioni sono esplicite.
            </p>
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
            {isAdministrator && dbCondominiumId && <button className="primary-button" onClick={() => { setEditingAllocation(null); setAllocationForm({ ledger_entry_id: scopedLedger.find((e) => e.direction === "Uscita")?.id ?? "", unit_id: units.find((u) => u.condominium_id === dbCondominiumId)?.id ?? "", allocation_basis: "Millesimi generali", millesimi: 0, amount: 0, paid_amount: 0, due_date: "", status: "Da pagare", notes: "" }); setShowAllocationForm(true); }}>+ Nuova ripartizione</button>}
          </div>
          {scopedLedger.filter((e) => e.direction === "Uscita").length === 0 ? <p>Registra prima una spesa nel registro contabile.</p> : (
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
          )}
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
          <div className="form-grid"><label>Categoria<input value={ledgerForm.category} onChange={(e) => setLedgerForm({ ...ledgerForm, category: e.target.value })} /></label><label>Importo<input type="number" min="0.01" step="0.01" required value={ledgerForm.amount} onChange={(e) => setLedgerForm({ ...ledgerForm, amount: Number(e.target.value) })} /></label></div>
          <label>Descrizione<input required value={ledgerForm.description} onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })} /></label>
          <div className="form-grid"><label>Esercizio<select value={ledgerForm.fiscal_year_id ?? ""} onChange={(e) => setLedgerForm({ ...ledgerForm, fiscal_year_id: e.target.value || null })}><option value="">Nessuno</option>{scopedYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label><label>Stato pagamento<select value={ledgerForm.payment_status} onChange={(e) => setLedgerForm({ ...ledgerForm, payment_status: e.target.value as LedgerEntry["payment_status"] })}><option>Da pagare</option><option>Parzialmente pagato</option><option>Pagato</option></select></label></div>
          <label>Scadenza<input type="date" value={ledgerForm.due_date} onChange={(e) => setLedgerForm({ ...ledgerForm, due_date: e.target.value })} /></label>
          <label>Note<textarea value={ledgerForm.notes} onChange={(e) => setLedgerForm({ ...ledgerForm, notes: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowLedgerForm(false)}>Annulla</button><button className="primary-button" disabled={saving}>Salva</button></div>
        </form></div>
      )}

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
          <div className="form-grid"><label>Importo<input type="number" min="0.01" step="0.01" value={allocationForm.amount} onChange={(e) => setAllocationForm({ ...allocationForm, amount: Number(e.target.value) })} /></label><label>Pagato<input type="number" min="0" step="0.01" value={allocationForm.paid_amount} onChange={(e) => setAllocationForm({ ...allocationForm, paid_amount: Number(e.target.value) })} /></label></div>
          <div className="form-grid"><label>Scadenza<input type="date" value={allocationForm.due_date} onChange={(e) => setAllocationForm({ ...allocationForm, due_date: e.target.value })} /></label><label>Stato<select value={allocationForm.status} onChange={(e) => setAllocationForm({ ...allocationForm, status: e.target.value })}><option>Da pagare</option><option>Parzialmente pagato</option><option>Pagato</option></select></label></div>
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
  );
}

export default AccountingPage;
