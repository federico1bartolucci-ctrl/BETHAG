import React, { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type InsurancePolicy = {
  id: string;
  policy_number: string;
  insurer: string;
  policy_type: string;
  policyholder: string;
  coverage: string;
  premium: number | null;
  deductible: number | null;
  start_date: string;
  expiry_date: string;
  status: "Attiva" | "In scadenza" | "Scaduta" | "Sospesa";
  notes: string;
};

const emptyPolicy: Omit<InsurancePolicy, "id"> = {
  policy_number: "",
  insurer: "",
  policy_type: "Globale fabbricati",
  policyholder: "",
  coverage: "",
  premium: null,
  deductible: null,
  start_date: "",
  expiry_date: "",
  status: "Attiva",
  notes: "",
};

function localDate() {
  return new Date().toISOString().slice(0, 10);
}

function effectiveStatus(expiryDate: string, current: InsurancePolicy["status"]) {
  if (current === "Sospesa") return current;
  if (!expiryDate) return current;
  const today = localDate();
  if (expiryDate < today) return "Scaduta";
  const soon = new Date();
  soon.setDate(soon.getDate() + 60);
  if (expiryDate <= soon.toISOString().slice(0, 10)) return "In scadenza";
  return "Attiva";
}

function money(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value));
}

export default function InsurancePoliciesSection({
  condominiumId,
  isAdministrator = false,
}: {
  condominiumId: number;
  isAdministrator?: boolean;
}) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [dbCondominiumId, setDbCondominiumId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicy | null>(null);
  const [form, setForm] = useState<Omit<InsurancePolicy, "id">>(emptyPolicy);

  const load = async () => {
    if (!supabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: condominium, error: condominiumError } = await supabase
        .from("condominiums")
        .select("id, workspace_id")
        .eq("legacy_id", condominiumId)
        .maybeSingle();
      if (condominiumError) throw condominiumError;
      if (!condominium?.id) {
        setPolicies([]);
        setLoading(false);
        return;
      }
      setDbCondominiumId(condominium.id);
      setWorkspaceId(condominium.workspace_id);
      const { data, error: policyError } = await supabase
        .from("condominium_insurance_policies")
        .select("*")
        .eq("condominium_id", condominium.id)
        .order("expiry_date", { ascending: true });
      if (policyError) throw policyError;
      setPolicies((data ?? []).map((row: any) => ({
        ...row,
        premium: row.premium === null ? null : Number(row.premium),
        deductible: row.deductible === null ? null : Number(row.deductible),
        status: effectiveStatus(row.expiry_date || "", row.status || "Attiva"),
        notes: row.notes || "",
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile caricare le polizze.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [condominiumId]);

  const closeForm = () => {
    setOpenForm(false);
    setEditing(null);
    setForm(emptyPolicy);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !workspaceId || !dbCondominiumId) return;
    if (!form.insurer.trim() || !form.policy_number.trim()) {
      setError("Compila compagnia assicurativa e numero polizza.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        workspace_id: workspaceId,
        condominium_id: dbCondominiumId,
        policy_number: form.policy_number.trim(),
        insurer: form.insurer.trim(),
        policy_type: form.policy_type.trim(),
        policyholder: form.policyholder.trim(),
        coverage: form.coverage.trim(),
        premium: form.premium === null || form.premium === "" as any ? null : Number(form.premium),
        deductible: form.deductible === null || form.deductible === "" as any ? null : Number(form.deductible),
        start_date: form.start_date || null,
        expiry_date: form.expiry_date || null,
        status: effectiveStatus(form.expiry_date, form.status),
        notes: form.notes.trim(),
      };
      const query = editing
        ? supabase.from("condominium_insurance_policies").update(payload).eq("id", editing.id)
        : supabase.from("condominium_insurance_policies").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      closeForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Polizza non salvata.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (policy: InsurancePolicy) => {
    if (!supabase) return;
    if (!window.confirm(`Sei sicuro di voler cancellare la polizza "${policy.policy_number}"?`)) return;
    try {
      const { error: deleteError } = await supabase
        .from("condominium_insurance_policies")
        .delete()
        .eq("id", policy.id);
      if (deleteError) throw deleteError;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Polizza non cancellata.");
    }
  };

  const summary = useMemo(() => ({
    active: policies.filter((p) => p.status === "Attiva").length,
    expiring: policies.filter((p) => p.status === "In scadenza").length,
    expired: policies.filter((p) => p.status === "Scaduta").length,
  }), [policies]);

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
        <div className="quick-stat"><b>{policies.length}</b><span>Polizze</span></div>
        <div className="quick-stat"><b>{summary.active}</b><span>Attive</span></div>
        <div className="quick-stat"><b>{summary.expiring}</b><span>In scadenza</span></div>
        <div className="quick-stat"><b>{summary.expired}</b><span>Scadute</span></div>
      </div>

      {error && <div className="permission-box" style={{ marginBottom: 12 }}>{error}</div>}
      {!supabaseConfigured && <div className="permission-box">Configura Supabase per rendere persistenti le polizze.</div>}
      {loading ? <div className="empty-state">Caricamento polizze…</div> : policies.length === 0 ? (
        <div className="empty-state">Nessuna polizza assicurativa inserita.</div>
      ) : (
        <div className="related-list">
          {policies.map((policy) => (
            <article className="request-card" key={policy.id}>
              <div className="request-main">
                <b>🛡️ {policy.insurer} · {policy.policy_number}</b>
                <span>{policy.policy_type || "Tipologia non indicata"}{policy.policyholder ? ` · Contraente: ${policy.policyholder}` : ""}</span>
                <small>
                  Decorrenza: {policy.start_date || "—"} · Scadenza: {policy.expiry_date || "—"} · Premio: {money(policy.premium)} · Franchigia: {money(policy.deductible)}
                </small>
                {policy.coverage && <p><strong>Copertura:</strong> {policy.coverage}</p>}
                {policy.notes && <small>{policy.notes}</small>}
              </div>
              <div className="request-actions">
                <span className="badge">{policy.status}</span>
                {isAdministrator && <>
                  <button className="secondary-button small" type="button" onClick={() => {
                    setEditing(policy);
                    setForm({
                      policy_number: policy.policy_number,
                      insurer: policy.insurer,
                      policy_type: policy.policy_type,
                      policyholder: policy.policyholder,
                      coverage: policy.coverage,
                      premium: policy.premium,
                      deductible: policy.deductible,
                      start_date: policy.start_date || "",
                      expiry_date: policy.expiry_date || "",
                      status: policy.status,
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
              <label>Compagnia assicurativa<input required value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} /></label>
              <label>Numero polizza<input required value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} /></label>
            </div>
            <div className="form-grid">
              <label>Tipologia<input value={form.policy_type} onChange={(e) => setForm({ ...form, policy_type: e.target.value })} /></label>
              <label>Contraente<input value={form.policyholder} onChange={(e) => setForm({ ...form, policyholder: e.target.value })} /></label>
            </div>
            <label>Copertura<textarea value={form.coverage} onChange={(e) => setForm({ ...form, coverage: e.target.value })} /></label>
            <div className="form-grid">
              <label>Premio annuo<input type="number" min="0" step="0.01" value={form.premium ?? ""} onChange={(e) => setForm({ ...form, premium: e.target.value === "" ? null : Number(e.target.value) })} /></label>
              <label>Franchigia<input type="number" min="0" step="0.01" value={form.deductible ?? ""} onChange={(e) => setForm({ ...form, deductible: e.target.value === "" ? null : Number(e.target.value) })} /></label>
            </div>
            <div className="form-grid">
              <label>Decorrenza<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label>
              <label>Scadenza<input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></label>
            </div>
            <label>Stato<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InsurancePolicy["status"] })}><option>Attiva</option><option>In scadenza</option><option>Scaduta</option><option>Sospesa</option></select></label>
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
