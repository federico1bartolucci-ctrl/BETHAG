import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type UnitOption = { id: string; condominium_id: string; unit_code: string; building_code?: string | null; data: any };
type MemberOption = { id: string; condominium_id: string; unit_id: string | null; active: boolean; name?: string; email?: string | null; data: any };
type TransferRow = {
  id: string; unit_id: string; outgoing_member_id: string; incoming_member_id: string | null;
  transfer_date: string; transfer_type: string; status: string; notes: string; data: any;
};

function memberName(member?: MemberOption | null) {
  if (!member) return "Condòmino non disponibile";
  if (typeof member.name === "string" && member.name.trim()) return member.name.trim();
  const d = member.data || {};
  const direct = [d.full_name, d.fullName, d.display_name, d.nome_completo, d.name].find(v => typeof v === "string" && v.trim());
  if (direct) return direct.trim();
  const first = d.first_name || d.firstName || d.nome || "";
  const last = d.last_name || d.lastName || d.cognome || "";
  const composed = [first, last].filter(Boolean).join(" ").trim();
  return composed || "Condòmino " + member.id.slice(0, 8);
}
function euro(value: unknown) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

export default function MemberTransferPanel({ workspaceId, condominiumId, units, members, isAdministrator, condominiums = [], selectedCondominiumId = "all", onCondominiumChange }: {
  workspaceId: string;
  condominiumId: string | null;
  units: UnitOption[];
  members: MemberOption[];
  isAdministrator: boolean;
  condominiums?: Array<{ id: number; name: string; address?: string; cap?: string; city?: string; province?: string }>;
  selectedCondominiumId?: number | "all";
  onCondominiumChange?: (id: number | "all") => void;
}) {
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [unitId, setUnitId] = useState("");
  const [outgoingId, setOutgoingId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [transferType, setTransferType] = useState("Vendita");
  const [incomingName, setIncomingName] = useState("");
  const [incomingEmail, setIncomingEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const scopedUnits = useMemo(() => units.filter(u => !condominiumId || u.condominium_id === condominiumId), [units, condominiumId]);
  const scopedMembers = useMemo(() => members.filter(m => m.active && (!condominiumId || m.condominium_id === condominiumId)), [members, condominiumId]);
  const unitMembers = useMemo(() => scopedMembers.filter(m => m.unit_id === unitId && String(m.data?.role || "").trim() === "Proprietario" && m.data?.current_owner !== false && m.data?.position_status !== "In chiusura"), [scopedMembers, unitId]);
  const selectedUnit = scopedUnits.find(u => u.id === unitId);
  const selectedCondominium = condominiums.find(c => c.id === selectedCondominiumId);
  const previewIsCurrent = !!preview && preview.unit_id === unitId && preview.outgoing_member_id === outgoingId && preview.transfer_date === transferDate;
  const unitLabel = (id: string) => {
    const unit = scopedUnits.find(u => u.id === id);
    if (!unit) return "Unità";
    const d = unit.data || {};
    const civic = d.civicCode ?? d.civic_code ?? "";
    const building = unit.building_code ?? d.buildingCode ?? d.building_code ?? "";
    const staircase = d.staircaseCode ?? d.staircase_code ?? "";
    const type = d.unitType ?? d.unit_type ?? "";
    const hierarchy = [
      civic ? `Civico ${civic}` : "",
      building ? `Palazzina ${building}` : "",
      staircase ? `Scala ${staircase}` : "",
    ].filter(Boolean).join(" · ");
    return [`Unità ${unit.unit_code}`, hierarchy, type].filter(Boolean).join(" · ");
  };
  const memberLabel = (id: string) => memberName(scopedMembers.find(m => m.id === id));

  const loadRows = useCallback(async () => {
    if (!supabase || !condominiumId) { setRows([]); return; }
    const { data, error: e } = await supabase.from("condominium_member_transfers").select("id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data").eq("workspace_id", workspaceId).eq("condominium_id", condominiumId).order("transfer_date", { ascending: false });
    if (e) throw e;
    setRows((data || []) as TransferRow[]);
  }, [workspaceId, condominiumId]);

  useEffect(() => {
    let active = true;
    if (!supabase || !condominiumId) { setRows([]); return; }
    supabase.from("condominium_member_transfers").select("id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,data").eq("workspace_id", workspaceId).eq("condominium_id", condominiumId).order("transfer_date", { ascending: false }).then(({data,error:e}) => {
      if (!active) return;
      if (e) setError(e.message); else setRows((data || []) as TransferRow[]);
    });
    return () => { active = false; };
  }, [workspaceId, condominiumId]);

  async function makePreview() {
    if (!supabase || !condominiumId || !unitId || !outgoingId || !transferDate) { setError("Seleziona condominio, unità, cedente e data del trasferimento."); return; }
    setBusy(true); setError(""); setMessage(""); setSnapshot({});
    try {
      const { data, error: e } = await supabase.rpc("preview_condominium_member_transfer", { p_unit_id: unitId, p_outgoing_member_id: outgoingId, p_transfer_date: transferDate });
      if (e) throw e;
      setPreview(data);
    } catch (e: any) { setError(e?.message || "Impossibile calcolare la situazione contabile."); }
    finally { setBusy(false); }
  }
  async function confirmTransfer() {
    if (!supabase || !condominiumId || !unitId || !outgoingId || !transferDate || !incomingName.trim()) { setError("Completa i dati obbligatori del trasferimento."); return; }
    if (incomingEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(incomingEmail.trim())) { setError("Inserisci un indirizzo email valido."); return; }
    if (!window.confirm("Confermare il trasferimento? La posizione storica del cedente sarà conservata e il subentro verrà registrato.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: e } = await supabase.rpc("confirm_condominium_member_transfer", {
        p_unit_id: unitId, p_outgoing_member_id: outgoingId, p_incoming_name: incomingName.trim(),
        p_incoming_email: incomingEmail.trim().toLowerCase(), p_incoming_user_id: null,
        p_transfer_date: transferDate, p_transfer_type: transferType, p_notes: notes.trim(), p_data: { outgoing_name: memberName(scopedMembers.find(m => m.id === outgoingId)), outgoing_email: scopedMembers.find(m => m.id === outgoingId)?.email || null, incoming_name: incomingName.trim(), incoming_email: incomingEmail.trim().toLowerCase() || null }
      });
      if (e) throw e;
      setMessage("Trasferimento registrato. La nuova identità dovrà completare la verifica prevista dal portale.");
      setIncomingName(""); setIncomingEmail(""); setNotes(""); setPreview(null);
      await loadRows();
      if (data) await loadSnapshot(String(data));
    } catch (e: any) { setError(e?.message || "Impossibile confermare il trasferimento."); }
    finally { setBusy(false); }
  }
  async function loadSnapshot(id: string) {
    if (!supabase) return;
    setBusy(true); setError("");
    try {
      const { data, error: e } = await supabase.rpc("get_member_transfer_accounting_snapshot", { p_transfer_id: id });
      if (e) throw e;
      setSnapshot(data || {});
    } catch (e: any) { setError(e?.message || "Impossibile recuperare il prospetto del trasferimento."); }
    finally { setBusy(false); }
  }
  async function closeTransfer(id: string) {
    if (!supabase || !window.confirm("Chiudere il trasferimento? L'operazione è consentita solo quando tutte le posizioni contabili del cedente risultano chiuse.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: e } = await supabase.rpc("close_condominium_member_transfer", { p_transfer_id: id });
      if (e) throw e;
      setMessage("Trasferimento chiuso e posizione del cedente archiviata.");
      await loadRows();
    } catch (e: any) { setError(e?.message || "Chiusura non consentita."); }
    finally { setBusy(false); }
  }

  if (!isAdministrator) return <section className="card"><h2>Subentri e trasferimenti</h2><p>La gestione dei trasferimenti è riservata agli amministratori.</p></section>;
  if (!condominiumId) return <section className="card"><h2>Subentri e trasferimenti</h2><p>Seleziona un singolo condominio per gestire i passaggi di proprietà e le relative posizioni contabili.</p></section>;

  return <div className="cards-grid">
    <section className="card">
      <div className="section-heading"><div><h2>Nuovo subentro</h2><p>Consulta la situazione contabile alla data del rogito prima di registrare il trasferimento.</p></div></div>
      {selectedCondominiumId !== "all" && selectedCondominium && <div className="permission-box"><b>Contesto del subentro</b><span>Condominio: {selectedCondominium.name}</span><span>Indirizzo: {[selectedCondominium.address, selectedCondominium.cap && selectedCondominium.city ? `${selectedCondominium.cap} ${selectedCondominium.city}` : selectedCondominium.city, selectedCondominium.province ? `(${selectedCondominium.province})` : ""].filter(Boolean).join(", ")}</span><small>Le unità sono mostrate con civico, palazzina e scala quando questi dati sono presenti nell'anagrafica.</small></div>}
      <div className="form-grid">
        <label>Condominio<select value={String(selectedCondominiumId)} onChange={e=>{const value=e.target.value === "all" ? "all" : Number(e.target.value); onCondominiumChange?.(value); setUnitId(""); setOutgoingId(""); setPreview(null); setSnapshot({});}} disabled={!onCondominiumChange}><option value="all">Tutti i condomini</option>{condominiums.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Unità immobiliare<select value={unitId} onChange={e=>{setUnitId(e.target.value);setOutgoingId("");setPreview(null);setSnapshot({});}} disabled={!condominiumId}><option value="">Seleziona unità</option>{scopedUnits.map(u=><option key={u.id} value={u.id}>{unitLabel(u.id)}</option>)}</select></label>
        <label>Proprietario uscente<select value={outgoingId} onChange={e=>{setOutgoingId(e.target.value);setPreview(null);}} disabled={!unitId}><option value="">Seleziona cedente</option>{unitMembers.map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select></label>
        <label>Data rogito / trasferimento<input type="date" value={transferDate} onChange={e=>{setTransferDate(e.target.value);setPreview(null);}} required /></label>
        <label>Tipo trasferimento<select value={transferType} onChange={e=>setTransferType(e.target.value)}><option>Vendita</option><option>Acquisto</option><option>Donazione</option><option>Successione</option><option>Altro</option></select></label>
        <label>Nuovo proprietario<input value={incomingName} onChange={e=>setIncomingName(e.target.value)} required maxLength={160} placeholder="Nome e cognome" /></label>
        <label>Email nuovo proprietario<input type="email" value={incomingEmail} onChange={e=>setIncomingEmail(e.target.value)} maxLength={254} placeholder="nome@esempio.it" /></label>
      </div>
      <label>Note<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} /></label>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={()=>void makePreview()} disabled={busy || !unitId || !outgoingId || !transferDate}>Anteprima situazione contabile</button><button type="button" className="primary-button" onClick={()=>void confirmTransfer()} disabled={busy || !previewIsCurrent || !incomingName.trim()}>Conferma trasferimento</button></div>
      {previewIsCurrent && <div className="permission-box"><b>Anteprima al {transferDate}</b><span>Rate scadute residue: {euro(preview.outstanding_before)}</span><span>Rate pagate: {euro(preview.paid_before)}</span><span>Rate analitiche entro la data del rogito: {(preview.installments_before || []).length}</span><span>Rate future già intestate al cedente: {(preview.installments_after || []).length}</span><span>Residuo complessivo del cedente: {euro(preview.outstanding_total)}</span><span>Residuo con scadenza successiva: {euro(preview.outstanding_due_after)}</span><span>Spese straordinarie deliberate prima del rogito con scadenza successiva: {(preview.extraordinary_deliberated_before_due_after || []).length}</span><span>Riporti fiscali dell’unità non attribuiti a un condomino: {(preview.unit_unassigned_carryovers || []).length} · esposizione {euro((preview.unit_unassigned_carryovers || []).reduce((sum:number,c:any)=>sum+Math.abs(Number(c.balance||0)),0))}</span>{(preview.unit_unassigned_carryovers || []).length>0 && <ul>{preview.unit_unassigned_carryovers.map((c:any)=><li key={c.id}>Riporto {c.kind || "fiscale"} · {c.status || "—"} · saldo {euro(c.balance)}</li>)}</ul>}{(preview.installments_before || []).length > 0 && <><b>Rate con scadenza entro il rogito</b><ul>{preview.installments_before.map((i:any)=><li key={i.id}>{i.assignment_scope === "unit_unassigned" ? "[Rata associata all’unità, non attribuita] " : ""}{i.title} · scadenza {i.due_date} · residuo {euro(i.residual)}</li>)}</ul></>}{(preview.installments_after || []).length > 0 && <><b>Rate con scadenza successiva (da verificare prima della ripartizione)</b><ul>{preview.installments_after.map((i:any)=><li key={i.id}>{i.assignment_scope === "unit_unassigned" ? "[Rata associata all’unità, non attribuita] " : ""}{i.title} · scadenza {i.due_date || "non indicata"} · residuo {euro(i.residual)}</li>)}</ul></>}{(preview.extraordinary_deliberated_before_due_after || []).length > 0 && <><b>Spese straordinarie deliberate prima del rogito</b><ul>{preview.extraordinary_deliberated_before_due_after.map((a:any)=><li key={a.id}>{a.description || "Spesa straordinaria"} · deliberata {a.deliberation_date} · scadenza {a.due_date || "non indicata"} · residuo {euro(Number(a.amount||0)-Number(a.paid_amount||0))}</li>)}</ul></>}{preview.review_flags?.legal_liability_review_required && <small>La ripartizione delle responsabilità giuridiche tra cedente e acquirente richiede verifica documentale e normativa.</small>}</div>}
    </section>
    <section className="card">
      <div className="section-heading"><div><h2>Trasferimenti registrati</h2><p>Storico dei subentri del condominio selezionato.</p></div></div>
      {rows.length===0 ? <p>Nessun trasferimento registrato.</p> : rows.map(r=><article className="row-card" key={r.id}><div><b>{unitLabel(r.unit_id)} · {r.transfer_type}</b><small>{r.transfer_date} · {r.data?.outgoing_name || memberLabel(r.outgoing_member_id)} → {r.data?.incoming_name || (r.incoming_member_id ? memberLabel(r.incoming_member_id) : "Nuovo proprietario in attesa di associazione")}</small><span>Stato: {r.status}</span>{r.notes && <small>{r.notes}</small>}</div><div className="row-actions"><button className="secondary-button small" onClick={()=>void loadSnapshot(r.id)} disabled={busy}>Prospetto</button>{r.status==="Confermato" && <button className="secondary-button small" onClick={()=>void closeTransfer(r.id)} disabled={busy}>Chiudi posizione</button>}</div></article>)}
      {Object.keys(snapshot).length>0 && <div className="permission-box"><b>Prospetto contabile acquisito</b><div><b>Trasferimento</b><span>Data: {snapshot.transfer?.transfer_date || "—"} · Stato: {snapshot.transfer?.status || "—"}</span><span>Rate scadute al rogito: {euro(snapshot.captured_accounting_snapshot?.installments_due_before)}</span><span>Pagato al rogito: {euro(snapshot.captured_accounting_snapshot?.installments_paid_before)}</span><span>Residuo rate scadute: {euro(snapshot.captured_accounting_snapshot?.installments_residual)}</span><span>Residuo complessivo: {euro(snapshot.captured_accounting_snapshot?.outstanding_total)}</span><span>Residuo con scadenza successiva: {euro(snapshot.captured_accounting_snapshot?.outstanding_due_after)}</span><span>Riporti fiscali dell’unità non attribuiti: {(snapshot.captured_accounting_snapshot?.unit_unassigned_carryovers || []).length} · esposizione {euro((snapshot.captured_accounting_snapshot?.unit_unassigned_carryovers || []).reduce((sum:number,c:any)=>sum+Math.abs(Number(c.balance||0)),0))}</span>{(snapshot.captured_accounting_snapshot?.unit_unassigned_carryovers || []).length>0 && <ul>{snapshot.captured_accounting_snapshot.unit_unassigned_carryovers.map((c:any)=><li key={c.id}>Riporto {c.kind || "fiscale"} · {c.status || "—"} · saldo {euro(c.balance)}</li>)}</ul>}</div>{(snapshot.captured_accounting_snapshot?.installments_after || []).length>0 && <><b>Rate future registrate al momento del trasferimento</b><ul>{snapshot.captured_accounting_snapshot.installments_after.map((i:any)=><li key={i.id}>{i.assignment_scope === "unit_unassigned" ? "[Rata associata all’unità, non attribuita] " : ""}{i.title} · scadenza {i.due_date || "non indicata"} · residuo {euro(i.residual)}</li>)}</ul></>}{(snapshot.captured_accounting_snapshot?.extraordinary_deliberated_before_due_after || []).length>0 && <><b>Spese straordinarie deliberate prima del rogito</b><ul>{snapshot.captured_accounting_snapshot.extraordinary_deliberated_before_due_after.map((a:any)=><li key={a.allocation_id || a.id}>{a.description || "Spesa straordinaria"} · deliberata {a.deliberation_date || "—"} · scadenza {a.due_date || "non indicata"} · residuo {euro(a.residual ?? (Number(a.amount||0)-Number(a.paid_amount||0)))}</li>)}</ul></>}<details><summary>Dettaglio tecnico completo</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12,maxHeight:360,overflow:"auto"}}>{JSON.stringify(snapshot,null,2)}</pre></details></div>}
    </section>
    {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
  </div>;
}
