import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

type UnitOption = { id: string; condominium_id: string; unit_code: string; building_code?: string | null; data: any };
type MemberOption = { id: string; condominium_id: string; unit_id: string | null; active: boolean; name?: string; email?: string | null; data: any };
type TransferRow = {
  id: string; unit_id: string; outgoing_member_id: string; incoming_member_id: string | null;
  transfer_date: string; transfer_type: string; status: string; notes: string; data: any;
};

function memberRole(member?: MemberOption | null) {
  if (!member) return "";
  const d = member.data || {};
  return String(d.role ?? d.condominiumRole ?? (member as any).role ?? "").trim();
}
function memberIsCurrentOwner(member?: MemberOption | null) {
  if (!member) return false;
  const d = member.data || {};
  const currentOwner = d.current_owner ?? d.currentOwner ?? (member as any).current_owner ?? (member as any).currentOwner;
  const status = String(d.position_status ?? d.positionStatus ?? (member as any).position_status ?? (member as any).positionStatus ?? "Attivo").trim();
  return currentOwner !== false && currentOwner !== "false" && status !== "In chiusura" && status !== "Archiviato";
}
function memberName(member?: MemberOption | null) {
  if (!member) return "Condòmino non disponibile";
  const d = member.data || {};
  const storedName = typeof member.name === "string" ? member.name.trim() : "";
  // I record creati dai subentri possono avere il placeholder "Condòmino":
  // in quel caso il nome reale del nuovo proprietario è conservato nei dati del subentro.
  const incoming = [d.incoming_name, d.incomingName].find(v => typeof v === "string" && v.trim());
  if (incoming && (!storedName || storedName.toLowerCase() === "condòmino" || storedName.toLowerCase() === "condomino")) {
    return String(incoming).trim();
  }
  if (storedName) return storedName;
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
  const [transferScope, setTransferScope] = useState<"whole_property" | "ownership_share">("whole_property");
  const [ownershipShare, setOwnershipShare] = useState("");
  const [incomingOwners, setIncomingOwners] = useState<Array<{ name: string; email: string; share: string }>>([{ name: "", email: "", share: "100" }]);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const incomingOwnersValid = useMemo(() => incomingOwners.filter(o => o.name.trim()), [incomingOwners]);
  const incomingOwnersTotalShare = useMemo(() => incomingOwnersValid.reduce((sum, o) => sum + (Number(o.share) || 0), 0), [incomingOwnersValid]);
  const incomingDisplayName = useMemo(() => incomingOwnersValid.map(o => o.name.trim()).join(" · "), [incomingOwnersValid]);

  const scopedUnits = useMemo(() => units.filter(u => !condominiumId || u.condominium_id === condominiumId), [units, condominiumId]);
  const scopedMembers = useMemo(() => members.filter(m => m.active && (!condominiumId || m.condominium_id === condominiumId)), [members, condominiumId]);
  const unitMembers = useMemo(() => scopedMembers.filter(m => m.unit_id === unitId && memberRole(m) === "Proprietario" && memberIsCurrentOwner(m)), [scopedMembers, unitId]);
  const currentUnitOwners = useMemo(() => unitMembers, [unitMembers]);
  const selectedOutgoing = useMemo(() => scopedMembers.find(m => m.id === outgoingId) ?? null, [scopedMembers, outgoingId]);
  const selectedOutgoingShare = useMemo(() => { const raw = selectedOutgoing?.data?.ownership_share ?? selectedOutgoing?.data?.ownershipShare; const value = Number(raw); return Number.isFinite(value) && value > 0 ? value : null; }, [selectedOutgoing]);
  const wholePropertyOutgoingIds = useMemo(() => currentUnitOwners.map(m => m.id), [currentUnitOwners]);
  const selectedUnit = scopedUnits.find(u => u.id === unitId);
  const selectedCondominium = condominiums.find(c => c.id === selectedCondominiumId);
  const previewIsCurrent = !!preview && preview.unit_id === unitId && preview.outgoing_member_id === outgoingId && preview.transfer_date === transferDate;
  const condominiumLabel = (id?: string | number | null) => {
    if (id == null) return "Condominio non disponibile";
    const match = condominiums.find(c => String(c.id) === String(id));
    if (match) return match.name;
    if (String(id) === String(condominiumId) && selectedCondominium?.name) return selectedCondominium.name;
    return "Condominio";
  };
  const unitLabel = (id: string) => {
    const unit = scopedUnits.find(u => u.id === id);
    if (!unit) return "Unità";
    const d = unit.data || {};
    const civic = d.civicCode ?? d.civic_code ?? d.civic ?? "";
    const building = unit.building_code ?? d.buildingCode ?? d.building_code ?? d.building ?? "";
    const staircase = d.staircaseCode ?? d.staircase_code ?? d.staircase ?? "";
    const internal = d.internalCode ?? d.internal_code ?? d.internal ?? d.interno ?? "";
    const type = d.unitType ?? d.unit_type ?? d.type ?? "";
    const hierarchy = [
      civic ? `Civico ${civic}` : "",
      building ? `Palazzina ${building}` : "",
      staircase ? `Scala ${staircase}` : "",
      internal ? `Interno ${internal}` : "",
    ].filter(Boolean).join(" · ");
    return [condominiumLabel(unit.condominium_id), `Unità ${unit.unit_code}`, hierarchy, type].filter(Boolean).join(" · ");
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

  async function makePreviewFor(nextUnitId: string, nextOutgoingId: string, nextTransferDate: string) {
    if (!supabase || !condominiumId || !nextUnitId || !nextOutgoingId || !nextTransferDate) {
      setPreview(null);
      return;
    }
    setBusy(true); setError(""); setMessage(""); setSnapshot({});
    try {
      const previewOwnerIds = transferScope === "whole_property"
        ? currentUnitOwners.map(m => m.id)
        : [nextOutgoingId];
      const uniqueOwnerIds = Array.from(new Set(previewOwnerIds.filter(Boolean)));
      if (!uniqueOwnerIds.length) {
        setPreview(null);
        return;
      }

      const results = await Promise.all(uniqueOwnerIds.map(async ownerId => {
        const { data, error: e } = await supabase.rpc("preview_condominium_member_transfer", {
          p_unit_id: nextUnitId,
          p_outgoing_member_id: ownerId,
          p_transfer_date: nextTransferDate
        });
        if (e) throw e;
        return data || {};
      }));

      const byId = new Map<string, any>();
      const mergeArray = (key: string) => {
        for (const result of results) {
          for (const item of Array.isArray(result?.[key]) ? result[key] : []) {
            const id = String(item?.id ?? item?.allocation_id ?? item?.ledger_entry_id ?? "");
            const fallback = JSON.stringify(item);
            byId.set(key + "::" + (id || fallback), item);
          }
        }
        return Array.from(byId.entries())
          .filter(([entry]) => entry.startsWith(key + "::"))
          .map(([, item]) => item);
      };

      const installmentsBefore = mergeArray("installments_before");
      const installmentsAfter = mergeArray("installments_after");
      const extraordinary = mergeArray("extraordinary_deliberated_before_due_after");

      const outstandingBefore = installmentsBefore.reduce((sum, item) => sum + Math.max(0, Number(item?.residual) || 0), 0);
      const paidBefore = installmentsBefore.reduce((sum, item) => sum + (Number(item?.paid_amount) || 0), 0);
      const outstandingTotal = [...installmentsBefore, ...installmentsAfter]
        .reduce((sum, item) => sum + Math.max(0, Number(item?.residual) || 0), 0);
      const outstandingDueAfter = installmentsAfter
        .reduce((sum, item) => sum + Math.max(0, Number(item?.residual) || 0), 0);

      const base = results[0];
      const merged = {
        ...base,
        transfer_date: nextTransferDate,
        unit_id: nextUnitId,
        outgoing_member_id: nextOutgoingId,
        outstanding_before: outstandingBefore,
        paid_before: paidBefore,
        installments_before: installmentsBefore,
        installments_after: installmentsAfter,
        outstanding_total: outstandingTotal,
        outstanding_due_after: outstandingDueAfter,
        extraordinary_deliberated_before_due_after: extraordinary,
        review_flags: {
          ...(base?.review_flags || {}),
          unpaid_before_transfer: results.some(r => !!r?.review_flags?.unpaid_before_transfer),
          extraordinary_deliberated_before_due_after: results.some(r => !!r?.review_flags?.extraordinary_deliberated_before_due_after),
          unit_unassigned_carryovers: results.some(r => !!r?.review_flags?.unit_unassigned_carryovers),
          legal_liability_review_required: true
        }
      };
      setPreview(merged);
    } catch (e: any) {
      setPreview(null);
      setError(e?.message || "Impossibile calcolare la situazione contabile.");
    } finally { setBusy(false); }
  }

  async function makePreview() {
    if (!supabase || !condominiumId || !unitId || !outgoingId || !transferDate) {
      setError("Seleziona condominio, unità, cedente e data del trasferimento.");
      return;
    }
    await makePreviewFor(unitId, outgoingId, transferDate);
  }
  function openConfirmation() {
    if (!unitId || !outgoingId || !transferDate || !incomingOwnersValid.length) {
      setError("Inserisci almeno un nuovo proprietario.");
      return;
    }
    if (transferScope === "ownership_share") {
      const share = Number(ownershipShare);
      if (!Number.isFinite(share) || share <= 0 || share > 100) { setError("Indica una quota valida da trasferire, compresa tra 0,01% e 100%."); return; }
      if (!selectedOutgoingShare) { setError("Il proprietario selezionato non ha una quota di proprietà registrata. Inserisci prima la quota nella scheda anagrafica."); return; }
      if (share > selectedOutgoingShare + 0.0001) { setError("La quota da trasferire supera la quota attualmente posseduta dal cedente."); return; }
    } else if (!currentUnitOwners.length) {
      setError("Nessun proprietario attivo trovato per l'unità selezionata.");
      return;
    }
    for (const owner of incomingOwnersValid) {
      if (owner.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim())) {
        setError("Inserisci un indirizzo email valido per ciascun nuovo proprietario.");
        return;
      }
    }
    if (transferScope === "whole_property" && Math.abs(incomingOwnersTotalShare - 100) > 0.0001) {
      setError("Per il trasferimento dell'intera proprietà, le quote dei nuovi comproprietari devono sommare esattamente il 100%.");
      return;
    }
    if (transferScope === "ownership_share" && (incomingOwnersValid.some(o => !Number.isFinite(Number(o.share)) || Number(o.share) <= 0) || incomingOwnersTotalShare <= 0 || incomingOwnersTotalShare > Number(ownershipShare) + 0.0001)) {
      setError("Le quote dei nuovi comproprietari devono essere positive e la loro somma non può superare la quota trasferita.");
      return;
    }
    if (!previewIsCurrent) {
      setError("Aggiorna prima l'anteprima contabile.");
      return;
    }
    setError("");
    setShowConfirmation(true);
  }

  async function confirmTransfer() {
    if (!supabase || !condominiumId || !unitId || !outgoingId || !transferDate || !incomingOwnersValid.length) { setError("Inserisci almeno un nuovo proprietario."); return; }
    if (transferScope === "ownership_share") {
      const share = Number(ownershipShare);
      if (!Number.isFinite(share) || share <= 0 || share > 100) { setError("Indica una quota valida da trasferire, compresa tra 0,01% e 100%."); return; }
      if (!selectedOutgoingShare) { setError("Il proprietario selezionato non ha una quota di proprietà registrata. Inserisci prima la quota nella scheda anagrafica."); return; }
      if (share > selectedOutgoingShare + 0.0001) { setError("La quota da trasferire supera la quota attualmente posseduta dal cedente."); return; }
    } else if (!currentUnitOwners.length) { setError("Nessun proprietario attivo trovato per l'unità selezionata."); return; }
    if (!previewIsCurrent) { setError("L'anteprima contabile non è aggiornata."); return; }
    for (const owner of incomingOwnersValid) { if (owner.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email.trim())) { setError("Inserisci un indirizzo email valido per ciascun nuovo proprietario."); return; } }
    if (transferScope === "whole_property" && Math.abs(incomingOwnersTotalShare - 100) > 0.0001) { setError("Per il trasferimento dell'intera proprietà, le quote dei nuovi comproprietari devono sommare esattamente il 100%."); return; }
    if (transferScope === "ownership_share" && (incomingOwnersValid.some(o => !Number.isFinite(Number(o.share)) || Number(o.share) <= 0) || incomingOwnersTotalShare <= 0 || incomingOwnersTotalShare > Number(ownershipShare) + 0.0001)) { setError("Le quote dei nuovi comproprietari devono essere positive e la loro somma non può superare la quota trasferita."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: e } = await supabase.rpc("confirm_condominium_member_transfer", {
        p_unit_id: unitId, p_outgoing_member_id: outgoingId, p_incoming_name: incomingOwnersValid[0].name.trim(),
        p_incoming_email: incomingOwnersValid[0].email.trim().toLowerCase(), p_incoming_user_id: null,
        p_transfer_date: transferDate, p_transfer_type: transferType, p_notes: notes.trim(), p_data: {
          outgoing_name: memberName(scopedMembers.find(m => m.id === outgoingId)),
          outgoing_email: scopedMembers.find(m => m.id === outgoingId)?.email || null,
          incoming_name: incomingDisplayName,
          incoming_email: incomingOwnersValid[0].email.trim().toLowerCase() || null,
          incoming_members: incomingOwnersValid.map(o => ({ name: o.name.trim(), email: o.email.trim().toLowerCase() || null, ownership_share: Number(o.share) })),
          transfer_scope: transferScope,
          outgoing_member_ids: transferScope === "whole_property" ? wholePropertyOutgoingIds : [outgoingId],
          incoming_share: transferScope === "whole_property" ? 100 : incomingOwnersTotalShare,
          outgoing_share: transferScope === "ownership_share" ? Number(selectedOutgoingShare) : null
        }
      });
      if (e) throw e;
      setMessage("Trasferimento registrato. La nuova identità dovrà completare la verifica prevista dal portale.");
      setShowConfirmation(false);
      setIncomingOwners([{ name: "", email: "", share: "100" }]); setNotes(""); setPreview(null);
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
    if (!supabase) return;
    const transfer = rows.find(r => r.id === id);
    if (!transfer) return;
    const ok = window.confirm("Confermi la chiusura della posizione del cedente? La chiusura è consentita solo quando tutte le posizioni contabili risultano pari a zero.");
    if (!ok) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { data: check, error: checkError } = await supabase.rpc("check_condominium_member_transfer_closure", { p_transfer_id: id });
      if (checkError) throw checkError;
      const financial = check || {};
      const openTotal = Number(financial.open_total || 0);
      if (openTotal > 0.005) {
        setError(`Chiusura non consentita: risultano ancora ${openTotal.toFixed(2)} € di posizioni contabili aperte (rate ${Number(financial.open_installments || 0).toFixed(2)} €, spese ${Number(financial.open_allocations || 0).toFixed(2)} €, riporti cedente ${Number(financial.open_member_carryovers || 0).toFixed(2)} €, riporti unità ${Number(financial.open_unit_carryovers || 0).toFixed(2)} €).`);
        return;
      }
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
        <label>Unità immobiliare<select value={unitId} onChange={e=>{
          const nextUnitId = e.target.value;
          const owners = scopedMembers.filter(m =>
            m.unit_id === nextUnitId &&
            memberRole(m) === "Proprietario" &&
            memberIsCurrentOwner(m)
          );
          const nextOutgoingId = owners[0]?.id || "";
          setUnitId(nextUnitId);
          setOutgoingId(nextOutgoingId);
          setPreview(null);
          setSnapshot({});
          if (nextOutgoingId) void makePreviewFor(nextUnitId, nextOutgoingId, transferDate);
        }} disabled={!condominiumId}><option value="">Seleziona unità</option>{scopedUnits.map(u=><option key={u.id} value={u.id}>{unitLabel(u.id)}</option>)}</select></label>
        <label>Proprietario/i uscente/i{transferScope === "whole_property" ? <div className="permission-box" style={{ marginTop: 6, marginBottom: 0 }}><b>{currentUnitOwners.length ? currentUnitOwners.map(m => memberName(m)).join(" · ") : "Nessun proprietario attivo"}</b><small>Con il trasferimento dell'intera proprietà vengono trasferiti tutti i proprietari attivi dell'unità.</small></div> : <select value={outgoingId} onChange={e=>{
          const nextOutgoingId = e.target.value;
          setOutgoingId(nextOutgoingId);
          setPreview(null);
          setSnapshot({});
          if (nextOutgoingId && unitId && transferDate) void makePreviewFor(unitId, nextOutgoingId, transferDate);
        }} disabled={!unitId}><option value="">Seleziona cedente</option>{unitMembers.map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>}</label>
        <label>Data rogito / trasferimento<input type="date" value={transferDate} onChange={e=>{
          const nextDate = e.target.value;
          setTransferDate(nextDate);
          setPreview(null);
          if (nextDate && unitId && outgoingId) void makePreviewFor(unitId, outgoingId, nextDate);
        }} required /></label>
        <label>Tipo trasferimento<select value={transferType} onChange={e=>setTransferType(e.target.value)}><option>Vendita</option><option>Acquisto</option><option>Donazione</option><option>Successione</option><option>Altro</option></select></label>        <label>Modalità trasferimento<select value={transferScope} onChange={e=>{
          const next = e.target.value as "whole_property" | "ownership_share";
          setTransferScope(next); setPreview(null); setSnapshot({}); setError("");
          if (next === "whole_property" && currentUnitOwners.length) setOutgoingId(currentUnitOwners[0].id);
          if (next === "ownership_share" && currentUnitOwners.length > 1 && !currentUnitOwners.some(m => m.id === outgoingId)) setOutgoingId(currentUnitOwners[0]?.id || "");
        }}>
          <option value="whole_property">Trasferimento dell'intera proprietà</option>
          <option value="ownership_share">Trasferimento di una quota</option>
        </select></label>
        {transferScope === "ownership_share" && <label>Quota da trasferire (%)<input type="number" min="0.01" max="100" step="0.01" value={ownershipShare} onChange={e=>{setOwnershipShare(e.target.value);setPreview(null);}} placeholder={selectedOutgoingShare ? String(selectedOutgoingShare) : "es. 50"} /><small>{selectedOutgoingShare ? "Quota attuale del cedente: " + selectedOutgoingShare + "%" : "La quota del cedente deve essere presente nell'anagrafica."}</small></label>}
        <div style={{ gridColumn: "1 / -1" }}>
          <b>Nuovi proprietari / comproprietari</b>
          <small style={{ display: "block", marginBottom: 8 }}>Puoi inserire uno o più subentranti. Per l'intera proprietà, le quote devono sommare il 100%.</small>
          {incomingOwners.map((owner, index) => <div key={index} className="form-grid" style={{ marginBottom: 8 }}>
            <label>Nome e cognome<input value={owner.name} onChange={e=>setIncomingOwners(prev=>prev.map((o,i)=>i===index?{...o,name:e.target.value}:o))} required maxLength={160} placeholder="Nome e cognome" /></label>
            <label>Email<input type="email" value={owner.email} onChange={e=>setIncomingOwners(prev=>prev.map((o,i)=>i===index?{...o,email:e.target.value}:o))} maxLength={254} placeholder="nome@esempio.it" /></label>
            <label>Quota %<input type="number" min="0.01" max="100" step="0.01" value={owner.share} onChange={e=>setIncomingOwners(prev=>prev.map((o,i)=>i===index?{...o,share:e.target.value}:o))} placeholder="es. 50" /></label>
            {incomingOwners.length > 1 && <button type="button" className="secondary-button" onClick={()=>setIncomingOwners(prev=>prev.filter((_,i)=>i!==index))}>Rimuovi</button>}
          </div>)}
          <button type="button" className="secondary-button" onClick={()=>setIncomingOwners(prev=>prev.length === 1 && prev[0].share === "100" ? [{...prev[0],share:"50"},{name:"",email:"",share:"50"}] : [...prev,{name:"",email:"",share:""}])}>+ Aggiungi comproprietario</button>
          <span style={{ display:"block", marginTop:8 }}>Totale quote inserite: <b>{incomingOwnersTotalShare.toFixed(2)}%</b></span>
        </div>
      </div>
      <label>Note<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} /></label>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={()=>void makePreview()} disabled={busy || !unitId || !outgoingId || !transferDate}>
          {busy ? "Calcolo in corso…" : "Aggiorna anteprima contabile"}
        </button>
        <button type="button" className="primary-button" onClick={openConfirmation} disabled={busy || !previewIsCurrent || !incomingOwnersValid.length}>
          Verifica e conferma dati
        </button>
      </div>
      {showConfirmation && (
        <div className="permission-box" style={{ marginTop: 16, border: "2px solid #526dfe", background: "#f8faff" }}>
          <h3 style={{ marginTop: 0 }}>Conferma i dati del subentro</h3>
          <p style={{ marginTop: 0 }}>Controlla attentamente i dati prima della registrazione definitiva.</p>
          <div className="detail-grid">
            <div><div className="detail-label">Condominio</div><div className="detail-value">{selectedCondominium?.name || "—"}</div></div>
            <div><div className="detail-label">Unità</div><div className="detail-value">{unitLabel(unitId)}</div></div>
            <div><div className="detail-label">Modalità</div><div className="detail-value">{transferScope === "whole_property" ? "Intera proprietà" : "Quota " + ownershipShare + "%"}</div></div>
            <div><div className="detail-label">Proprietario/i uscente/i</div><div className="detail-value">{transferScope === "whole_property" ? currentUnitOwners.map(m => memberName(m)).join(" · ") : memberLabel(outgoingId)}</div></div>
            <div><div className="detail-label">Nuovo/i proprietario/i</div><div className="detail-value">{incomingOwnersValid.map(o => o.name.trim() + " · " + Number(o.share || 0).toFixed(2) + "%").join(" | ")}</div></div>
            <div><div className="detail-label">E-mail</div><div className="detail-value">{incomingOwnersValid.map(o => o.email.trim().toLowerCase() || "Non indicata").join(" · ")}</div></div>
            <div><div className="detail-label">Data rogito / trasferimento</div><div className="detail-value">{transferDate}</div></div>
            <div><div className="detail-label">Tipo trasferimento</div><div className="detail-value">{transferType}</div></div>
          </div>
          <div className="permission-box" style={{ marginTop: 14 }}>
            <b>Situazione contabile al rogito</b>
            <span>Residuo complessivo cedente: {euro(preview?.outstanding_total)}</span>
            <span>Residuo con scadenza successiva: {euro(preview?.outstanding_due_after)}</span>
            <span>Rate entro il rogito: {(preview?.installments_before || []).length}</span>
            <span>Rate successive già intestate al cedente: {(preview?.installments_after || []).length}</span>
            <span>Spese straordinarie deliberate prima del rogito con scadenza successiva: {(preview?.extraordinary_deliberated_before_due_after || []).length}</span>
          </div>
          {error && <div className="permission-box" style={{ marginTop: 14, border: "2px solid #d33", background: "#fff7f7" }}>
            <b>Trasferimento non registrato</b>
            <span>{error === "TRANSFER_ALREADY_EXISTS" ? "Esiste già un trasferimento confermato per questa unità nella stessa data. Modifica la data del rogito/trasferimento oppure apri lo storico dei trasferimenti." : error === "ACTIVE_INCOMING_OWNER_ALREADY_PRESENT" ? "L'unità ha altri proprietari attivi. Se si tratta di comproprietà, scegli 'Trasferimento dell'intera proprietà' oppure 'Trasferimento di una quota'." : error === "OWNERSHIP_SHARE_REQUIRED" ? "Per trasferire una quota devi indicare una quota valida e avere la quota del cedente registrata in anagrafica." : error === "OWNERSHIP_SHARE_EXCEEDS_OUTGOING" || error === "OUTGOING_OWNERSHIP_SHARE_NOT_AVAILABLE" ? "La quota indicata supera la quota effettivamente posseduta dal cedente." : error}</span>
          </div>}
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={()=>setShowConfirmation(false)} disabled={busy}>Modifica dati</button>
            <button type="button" className="primary-button" onClick={()=>void confirmTransfer()} disabled={busy}>
              {busy ? "Registrazione in corso…" : "Conferma definitivamente il trasferimento"}
            </button>
          </div>
        </div>
      )}
      {outgoingId && <div className="permission-box"><b>Cedente selezionato</b><span>{transferScope === "whole_property" ? currentUnitOwners.map(m => memberName(m)).join(" · ") : memberLabel(outgoingId)} · anteprima contabile {previewIsCurrent ? "disponibile" : "da aggiornare"}</span></div>}
      {currentUnitOwners.length > 1 && <div className="permission-box" style={{ marginTop: 12, border: "2px solid #f59e0b", background: "#fffbeb" }}>
        <b>Comproprietà rilevata: scegli il tipo di trasferimento</b>
        <span>Risultano {currentUnitOwners.length} proprietari attivi. Prima di continuare devi indicare se il rogito riguarda l'intera proprietà oppure soltanto la quota di uno dei comproprietari.</span>
        <div className="form-actions" style={{ marginTop: 12 }}>
          <button type="button" className={transferScope === "whole_property" ? "primary-button" : "secondary-button"} onClick={() => {
            setTransferScope("whole_property"); setPreview(null); setSnapshot({}); setError("");
            setOutgoingId(currentUnitOwners[0]?.id || "");
            if (currentUnitOwners[0]?.id && unitId && transferDate) void makePreviewFor(unitId, currentUnitOwners[0].id, transferDate);
          }}>
            Trasferire intera proprietà
          </button>
          <button type="button" className={transferScope === "ownership_share" ? "primary-button" : "secondary-button"} onClick={() => {
            setTransferScope("ownership_share"); setPreview(null); setSnapshot({}); setError("");
            setOutgoingId(outgoingId && currentUnitOwners.some(m => m.id === outgoingId) ? outgoingId : (currentUnitOwners[0]?.id || ""));
          }}>
            Trasferire una quota
          </button>
        </div>
        <small>{currentUnitOwners.map(m => {
          const share = Number(m.data?.ownership_share ?? m.data?.ownershipShare);
          return memberName(m) + (Number.isFinite(share) && share > 0 ? " · quota " + share + "%" : "");
        }).join(" · ")}</small>
      </div>}
      {previewIsCurrent && <div className="permission-box"><b>Anteprima al {transferDate}</b><span>Rate scadute residue: {euro(preview.outstanding_before)}</span><span>Rate pagate: {euro(preview.paid_before)}</span><span>Rate analitiche entro la data del rogito: {(preview.installments_before || []).length}</span><span>Rate future già intestate al cedente: {(preview.installments_after || []).length}</span><span>Residuo complessivo del cedente: {euro(preview.outstanding_total)}</span><span>Residuo con scadenza successiva: {euro(preview.outstanding_due_after)}</span><span>Spese straordinarie deliberate prima del rogito con scadenza successiva: {(preview.extraordinary_deliberated_before_due_after || []).length}</span><span>Riporti fiscali dell’unità non attribuiti a un condomino: {(preview.unit_unassigned_carryovers || []).length} · esposizione {euro((preview.unit_unassigned_carryovers || []).reduce((sum:number,c:any)=>sum+Math.abs(Number(c.balance||0)),0))}</span>{(preview.unit_unassigned_carryovers || []).length>0 && <ul>{preview.unit_unassigned_carryovers.map((c:any)=><li key={c.id}>Riporto {c.kind || "fiscale"} · {c.status || "—"} · saldo {euro(c.balance)}</li>)}</ul>}{(preview.installments_before || []).length > 0 && <><b>Rate con scadenza entro il rogito</b><ul>{preview.installments_before.map((i:any)=><li key={i.id}>{i.assignment_scope === "unit_unassigned" ? "[Rata associata all’unità, non attribuita] " : ""}{i.title} · scadenza {i.due_date} · residuo {euro(i.residual)}</li>)}</ul></>}{(preview.installments_after || []).length > 0 && <><b>Rate con scadenza successiva (da verificare prima della ripartizione)</b><ul>{preview.installments_after.map((i:any)=><li key={i.id}>{i.assignment_scope === "unit_unassigned" ? "[Rata associata all’unità, non attribuita] " : ""}{i.title} · scadenza {i.due_date || "non indicata"} · residuo {euro(i.residual)}</li>)}</ul></>}{(preview.extraordinary_deliberated_before_due_after || []).length > 0 && <><b>Spese straordinarie deliberate prima del rogito</b><ul>{preview.extraordinary_deliberated_before_due_after.map((a:any)=><li key={a.id}>{a.description || "Spesa straordinaria"} · deliberata {a.deliberation_date} · scadenza {a.due_date || "non indicata"} · residuo {euro(Number(a.amount||0)-Number(a.paid_amount||0))}</li>)}</ul></>}{preview.review_flags?.legal_liability_review_required && <small>La ripartizione delle responsabilità giuridiche tra cedente e acquirente richiede verifica documentale e normativa.</small>}</div>}
    </section>
    <section className="card">
      <div className="section-heading"><div><h2>Trasferimenti registrati</h2><p>Storico dei subentri del condominio selezionato.</p></div></div>
      {rows.length===0 ? <p>Nessun trasferimento registrato.</p> : rows.map(r=><article className="row-card" key={r.id}><div><b>{unitLabel(r.unit_id)} · {r.transfer_type}</b><small>{r.transfer_date} · {r.data?.outgoing_name || memberLabel(r.outgoing_member_id)} → {r.data?.incoming_name || (r.incoming_member_id ? memberLabel(r.incoming_member_id) : "Nuovo proprietario in attesa di associazione")}</small><span>Stato: {r.status}</span>{r.notes && <small>{r.notes}</small>}</div><div className="row-actions"><button className="secondary-button small" onClick={()=>void loadSnapshot(r.id)} disabled={busy}>Prospetto</button>{r.status==="Confermato" && r.data?.transfer_scope !== "ownership_share" && <button className="secondary-button small" onClick={()=>void closeTransfer(r.id)} disabled={busy}>Chiudi posizione</button>}</div></article>)}
      {Object.keys(snapshot).length>0 && <div className="permission-box"><b>Prospetto contabile acquisito</b><div><b>Trasferimento</b><span>Data: {snapshot.transfer?.transfer_date || "—"} · Stato: {snapshot.transfer?.status || "—"}</span><span>Rate scadute al rogito: {euro(snapshot.captured_accounting_snapshot?.installments_due_before)}</span><span>Pagato al rogito: {euro(snapshot.captured_accounting_snapshot?.installments_paid_before)}</span><span>Residuo rate scadute: {euro(snapshot.captured_accounting_snapshot?.installments_residual)}</span><span>Residuo complessivo: {euro(snapshot.captured_accounting_snapshot?.outstanding_total)}</span><span>Residuo con scadenza successiva: {euro(snapshot.captured_accounting_snapshot?.outstanding_due_after)}</span><span>Riporti fiscali dell’unità non attribuiti: {(snapshot.captured_accounting_snapshot?.unit_unassigned_carryovers || []).length} · esposizione {euro((snapshot.captured_accounting_snapshot?.unit_unassigned_carryovers || []).reduce((sum:number,c:any)=>sum+Math.abs(Number(c.balance||0)),0))}</span>{(snapshot.captured_accounting_snapshot?.unit_unassigned_carryovers || []).length>0 && <ul>{snapshot.captured_accounting_snapshot.unit_unassigned_carryovers.map((c:any)=><li key={c.id}>Riporto {c.kind || "fiscale"} · {c.status || "—"} · saldo {euro(c.balance)}</li>)}</ul>}</div>{(snapshot.captured_accounting_snapshot?.installments_after || []).length>0 && <><b>Rate future registrate al momento del trasferimento</b><ul>{snapshot.captured_accounting_snapshot.installments_after.map((i:any)=><li key={i.id}>{i.assignment_scope === "unit_unassigned" ? "[Rata associata all’unità, non attribuita] " : ""}{i.title} · scadenza {i.due_date || "non indicata"} · residuo {euro(i.residual)}</li>)}</ul></>}{(snapshot.captured_accounting_snapshot?.extraordinary_deliberated_before_due_after || []).length>0 && <><b>Spese straordinarie deliberate prima del rogito</b><ul>{snapshot.captured_accounting_snapshot.extraordinary_deliberated_before_due_after.map((a:any)=><li key={a.allocation_id || a.id}>{a.description || "Spesa straordinaria"} · deliberata {a.deliberation_date || "—"} · scadenza {a.due_date || "non indicata"} · residuo {euro(a.residual ?? (Number(a.amount||0)-Number(a.paid_amount||0)))}</li>)}</ul></>}<details><summary>Dettagli tecnici avanzati</summary><div style={{marginTop:10,fontSize:12,color:"#64748b"}}>Informazioni tecniche dello snapshot storico, utili per assistenza e verifiche amministrative.</div><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12,maxHeight:360,overflow:"auto",marginTop:10}}>{JSON.stringify(snapshot,null,2)}</pre></details></div>}
    </section>
    {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
  </div>;
}
