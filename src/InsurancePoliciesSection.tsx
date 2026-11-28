import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { deleteInsurancePolicy, updateInsurancePolicy } from "./lib/insurancePolicyMutations.mjs";
import { applyInsurancePoliciesLoadFailure, selectVisibleInsurancePolicies } from "./lib/insurancePolicyLoadState.mjs";
import { createLatestRequestGuard } from "./lib/latestRequestGuard.mjs";
import { resolveInsurancePolicyCondominium } from "./lib/insurancePolicyCondominiumScope.mjs";
import { validateInsurancePolicyForm } from "./lib/insurancePolicyValidation.mjs";

type InsurancePolicy = {
  id: string;
  policy_number: string;
  company_name: string;
  policy_type: string;
  contact_name: string;
  coverage: string;
  premium: number | null;
  deductible: number | null;
  start_date: string;
  end_date: string;
  active: boolean;
  notes: string;
};

const emptyPolicy: Omit<InsurancePolicy, "id"> = {
  policy_number: "",
  company_name: "",
  policy_type: "Globale fabbricati",
  contact_name: "",
  coverage: "",
  premium: null,
  deductible: null,
  start_date: "",
  end_date: "",
  active: true,
  notes: "",
};

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function effectiveStatus(endDate: string, active: boolean) {
  if (!active) return "Sospesa";
  if (!endDate) return "Attiva";
  const today = localDate();
  if (endDate < today) return "Scaduta";
  const soon = new Date();
  soon.setDate(soon.getDate() + 60);
  if (endDate <= localDate(soon)) return "In scadenza";
  return "Attiva";
}

function money(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value));
}

export default function InsurancePoliciesSection({
  workspaceId,
  condominiumId,
  isAdministrator = false,
}: {
  workspaceId: string | null;
  condominiumId: number;
  isAdministrator?: boolean;
}) {
  const [dbCondominiumId, setDbCondominiumId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [policiesCondominiumId, setPoliciesCondominiumId] = useState<number | null>(null);
  const [policiesWorkspaceId, setPoliciesWorkspaceId] = useState<string | null>(null);
  const visiblePolicies = policiesWorkspaceId === workspaceId
    ? selectVisibleInsurancePolicies({ policies, policiesCondominiumId, condominiumId })
    : [];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [form, setForm] = useState<Omit<InsurancePolicy, "id">>(emptyPolicy);

  const loadGuardRef = useRef(createLatestRequestGuard());
  const currentWorkspaceIdRef = useRef(workspaceId);
  const currentCondominiumIdRef = useRef(condominiumId);
  currentWorkspaceIdRef.current = workspaceId;
  currentCondominiumIdRef.current = condominiumId;

  const load = async (clearForContextChange = false) => {
    if (currentWorkspaceIdRef.current !== workspaceId || currentCondominiumIdRef.current !== condominiumId) return;
    const request = loadGuardRef.current.begin();
    const isCurrent = () =>
      request.isCurrent()
      && currentWorkspaceIdRef.current === workspaceId
      && currentCondominiumIdRef.current === condominiumId;
    if (clearForContextChange) {
      setPolicies([]);
      setPoliciesCondominiumId(null);
      setPoliciesWorkspaceId(null);
      setDbCondominiumId(null);
    }
    if (isCurrent()) setLoading(true);
    setError("");
    try {
      if (!supabaseConfigured || !supabase) throw new Error("Servizio polizze assicurative non disponibile.");
      if (!workspaceId) throw new Error("Workspace del condominio non disponibile.");
      const condominium = await resolveInsurancePolicyCondominium({
        client: supabase,
        workspaceId,
        legacyCondominiumId: condominiumId,
      });
      if (!isCurrent()) return;
      setDbCondominiumId(condominium.id);
      const { data, error: policyError } = await supabase
        .from("condominium_insurance_policies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("condominium_id", condominium.id)
        .order("end_date", { ascending: true });
      if (!isCurrent()) return;
      if (policyError) throw policyError;
      if (!Array.isArray(data)) throw new Error("Risposta polizze non valida.");
      setPolicies((data ?? []).map((row: any) => ({
        ...row,
        premium: row.premium === null ? null : Number(row.premium),
        deductible: row.deductible === null ? null : Number(row.deductible),
        active: row.active !== false,
        notes: row.notes || "",
      })));
      setPoliciesCondominiumId(condominiumId);
      setPoliciesWorkspaceId(workspaceId);
    } catch (e) {
      if (isCurrent()) {
        applyInsurancePoliciesLoadFailure({
          error: e,
          isCurrent,
          requestedCondominiumId: condominiumId,
          setPolicies,
          setPoliciesCondominiumId,
          setLoadError: setError,
          setLoadErrorCondominiumId: () => {},
        });
        setPoliciesWorkspaceId(workspaceId);
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  useEffect(() => {
    setOpenForm(false);
    setEditing(null);
    setForm(emptyPolicy);
    void load(true);
    return () => loadGuardRef.current.invalidate();
  }, [workspaceId, condominiumId]);

  const closeForm = () => {
    setOpenForm(false);
    setEditing(null);
    setForm(emptyPolicy);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !workspaceId || !dbCondominiumId) return;
    const validationError = validateInsurancePolicyForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        policy_number: form.policy_number.trim(),
        company_name: form.company_name.trim(),
        policy_type: form.policy_type.trim(),
        contact_name: form.contact_name.trim(),
        coverage: form.coverage.trim(),
        premium: form.premium === null ? null : Number(form.premium),
        deductible: form.deductible === null ? null : Number(form.deductible),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        active: form.active,
        notes: form.notes.trim(),
      };
      if (editing) {
        await updateInsurancePolicy({
          supabase,
          policyId: editing.id,
          workspaceId,
          condominiumId: dbCondominiumId,
          payload,
        });
      } else {
        const { error: saveError } = await supabase
          .from("condominium_insurance_policies")
          .insert(payload);
        if (saveError) throw saveError;
      }
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Polizza non salvata.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (policy: InsurancePolicy) => {
    if (!supabase || !workspaceId || !dbCondominiumId) {
      setError("Contesto condominio non disponibile. Aggiorna la pagina e riprova.");
      return;
    }
    if (!window.confirm(`Sei sicuro di voler cancellare la polizza "${policy.policy_number}"?`)) return;
    try {
      await deleteInsurancePolicy({
        supabase,
        policyId: policy.id,
        workspaceId,
        condominiumId: dbCondominiumId,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Polizza non cancellata.");
    }
  };

  const summary = useMemo(() => ({
    active: visiblePolicies.filter((p) => effectiveStatus(p.end_date || "", p.active) === "Attiva").length,
    expiring: visiblePolicies.filter((p) => effectiveStatus(p.end_date || "", p.active) === "In scadenza").length,
    expired: visiblePolicies.filter((p) => effectiveStatus(p.end_date || "", p.active) === "Scaduta").length,
  }), [visiblePolicies]);

  return (
    <section className="condominium-section-card insurance-section">
      <div className="section-title">
        <div>
          <div className="eyebrow">Protezione</div>
          <h2>Polizze assicurative</h2>
          <p className="section-subtitle">Gestisci coperture, compagnia, premio, franchigia e scadenze direttamente nella scheda del condominio.</p>
        </div>
        {isAdministrator && (
          <button className="primary-button" type="button" onClick={() => { setEditing(null); setForm(emptyPolicy); setOpenForm(true); }}>
            + Nuova polizza
          </button>
        )}
      </div>

      <div className="quick-stats insurance-stats">
        <div className="quick-stat"><b>{visiblePolicies.length}</b><span>Polizze</span></div>
        <div className="quick-stat"><b>{summary.active}</b><span>Attive</span></div>
        <div className="quick-stat"><b>{summary.expiring}</b><span>In scadenza</span></div>
        <div className="quick-stat"><b>{summary.expired}</b><span>Scadute</span></div>
      </div>

      {error && <div className="permission-box" style={{ marginBottom: 12 }}>{error}</div>}
      {!supabaseConfigured && <div className="permission-box">Configura Supabase per rendere persistenti le polizze.</div>}
      {loading ? <div className="empty-state">Caricamento polizze…</div> : error ? null : visiblePolicies.length === 0 ? (
        <div className="empty-state">Nessuna polizza assicurativa inserita.</div>
      ) : (
        <div className="related-list">
          {visiblePolicies.map((policy) => (
            <article className="request-card" key={policy.id}>
              <div className="request-main">
                <b>🛡️ {policy.company_name} · {policy.policy_number}</b>
                <span>{policy.policy_type || "Tipologia non indicata"}{policy.contact_name ? ` · Contraente: ${policy.contact_name}` : ""}</span>
                <small>
                  Decorrenza: {policy.start_date || "—"} · Scadenza: {policy.end_date || "—"} · Premio: {money(policy.premium)} · Franchigia: {money(policy.deductible)}
                </small>
                {policy.coverage && <p><strong>Copertura:</strong> {policy.coverage}</p>}
                {policy.notes && <small>{policy.notes}</small>}
              </div>
              <div className="request-actions">
                <span className="badge">{effectiveStatus(policy.end_date || "", policy.active)}</span>
                {isAdministrator && <>
                  <button className="secondary-button small" type="button" onClick={() => {
                    setEditing(policy);
                    setForm({
                      policy_number: policy.policy_number,
                      company_name: policy.company_name,
                      policy_type: policy.policy_type,
                      contact_name: policy.contact_name,
                      coverage: policy.coverage,
                      premium: policy.premium,
                      deductible: policy.deductible,
                      start_date: policy.start_date || "",
                      end_date: policy.end_date || "",
                      active: policy.active,
                      notes: policy.notes,
                    });
                    setOpenForm(true);
                  }}>Modifica</button>
                  <button className="mini-danger" type="button" onClick={() => void remove(policy)}>×</button>
                </>}
              </div>
            </article>
          ))}
        </div>
      )}

      {openForm && isAdministrator && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={save}>
            <h2>{editing ? "Modifica polizza assicurativa" : "Nuova polizza assicurativa"}</h2>
            <div className="form-grid">
              <label>Compagnia assicurativa<input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>
              <label>Numero polizza<input required value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} /></label>
            </div>
            <div className="form-grid">
              <label>Tipologia<input value={form.policy_type} onChange={(e) => setForm({ ...form, policy_type: e.target.value })} /></label>
              <label>Referente<input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></label>
            </div>
            <label>Copertura<textarea value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} /></label>
            <div className="form-grid">
              <label>Premio annuo<input type="number" min="0" step="0.01" value={form.premium ?? ""} onChange={(e) => setForm({ ...form, premium: e.target.value === "" ? null : Number(e.target.value) })} /></label>
              <label>Franchigia<input type="number" min="0" step="0.01" value={form.deductible ?? ""} onChange={(e) => setForm({ ...form, deductible: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            </div>
            <div className="form-grid">
              <label>Decorrenza<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
              <label>Scadenza<input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
            </div>
            <label>Stato<select value={form.active ? "Attiva" : "Sospesa"} onChange={(e) => setForm({ ...form, active: e.target.value === "Attiva" })}><option>Attiva</option><option>Sospesa</option></select></label>
            <label>Note<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={closeForm}>Annulla</button>
              <button className="primary-button" disabled={saving}>{saving ? "Salvataggio…" : "Salva"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
