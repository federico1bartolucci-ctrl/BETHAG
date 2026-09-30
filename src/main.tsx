import React, { useEffect, useMemo, useRef, useState } from "react";
import AccountingPage from "./AccountingPage";
import RegisterPage from "./RegisterPage";
import InsurancePoliciesSection from "./InsurancePoliciesSection";
import ReactDOM from "react-dom/client";
import { supabase, supabaseConfigured, supabasePublicAuth } from "./lib/supabase";
import { claimFirstWorkspaceAdmin, deleteCondominium as deleteCondominiumBackend, deleteCondominiumMember as deleteCondominiumMemberBackend, deleteCondominiumUnit as deleteCondominiumUnitBackend, deletePortalMember as deletePortalMemberBackend, deleteWorkspaceRecord as deleteWorkspaceRecordBackend, saveCondominiumMember as saveCondominiumMemberBackend, saveCondominiumUnit as saveCondominiumUnitBackend, getActiveWorkspaceId, loadBackendState, saveCondominium as saveCondominiumBackend, syncBackendState, updateCondominiumRequestStatus } from "./lib/bethagBackend";

/* =========================================================
   BETHAG
   Gestionale amministrazione condominiale

   VERSIONE:
   Free / Plus / Professional / Portal

   ARCHITETTURA FRONTEND:
   - Dashboard
   - Condomini
   - Scheda condominio
   - Documenti
   - Scadenze
   - Assemblee
   - Fornitori
   - Attività
   - Comunicazioni
   - BETHAG AI
   - Portale condomini
   - Collaboratori e ruoli
   - Piano / abbonamento
   - Profilo amministratore
   - Workspace

   NOTA:
   Autenticazione, isolamento degli account e persistenza
   dei dati principali sono integrati con Supabase.
   Le funzioni AI, OCR, trascrizione audio, pagamenti
   e alcune integrazioni operative restano predisposte
   a integrazioni backend/servizi dedicati.
   ========================================================= */


/* =========================================================
   TIPI
   ========================================================= */

type Page =
  | "homepage"
  | "condomini"
  | "archivio"
  | "contabilita"
  | "registro"
  | "documenti"
  | "scadenze"
  | "assemblee"
  | "fornitori"
  | "attivita"
  | "comunicazioni"
  | "ai"
  | "portale"
  | "abbonamento"
  | "amministratore"
  | "collaboratori"
  | "aiuto";

type PlanId =
  | "free"
  | "plus"
  | "professional"
  | "portal";

type UserRole =
  | "admin"
  | "collaborator"
  | "resident"
  | "council";

type CollaboratorPermission =
  | "condomini"
  | "documenti"
  | "scadenze"
  | "assemblee"
  | "fornitori"
  | "attivita"
  | "comunicazioni"
  | "ai"
  | "portale";

type CollaboratorStatus =
  | "Invitato"
  | "Attivo"
  | "Disattivato";

type Collaborator = {
  id: number;
  name: string;
  email: string;
  workspaceId: string;
  status: CollaboratorStatus;
  permissions: CollaboratorPermission[];
  userId?: string;
};

type DeadlineStatus =
  | "Da fare"
  | "In scadenza"
  | "Completata";

type AssemblyStatus =
  | "Programmato"
  | "Svolto"
  | "Annullato";

type ActivityPriority =
  | "Bassa"
  | "Media"
  | "Alta";

type ActivityStatus =
  | "Aperta"
  | "In corso"
  | "Completata";

type AIStatus =
  | "Non elaborato"
  | "In elaborazione"
  | "Da verificare"
  | "Confermato";

type DocumentSource =
  | "Manuale"
  | "PDF"
  | "Word"
  | "Excel"
  | "Immagine"
  | "Audio"
  | "AI";

type PublicationStatus =
  | "Privato"
  | "Condiviso";

type PortalPermission =
  | "documenti"
  | "verbali"
  | "regolamento"
  | "pagamenti_ordinari"
  | "pagamenti_straordinari"
  | "assemblee"
  | "comunicazioni";

type CommunicationStatus =
  | "Bozza"
  | "Pubblicata";

type CommunicationAudience =
  | "Tutti"
  | "Selezionati"
  | "Condomino"
  | "Consiglio";

type Condominium = {
  id: number;
  name: string;
  address: string;
  cap: string;
  city: string;
  province: string;
  fiscalCode: string;
  units: string;
  contact: string;
  email: string;
  phone: string;
  iban: string;
  bank: string;
  notes: string;
  archivedAt?: string;
  archivedBy?: string;
};

type ExternalUnitOwner = {
  id: string;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  email: string;
  phone: string;
  ownershipShare: string;
  notes: string;
};

type CondominiumUnit = {
  id: string;
  condominiumId: number;
  unitCode: string;
  unitType: "Abitazione" | "Garage" | "Cantina" | "Altro";
  cadastralCategory: string;
  cadastralAutonomous: boolean;
  millesimi: string;
  incorporatedInUnitId?: string;
  relationshipToResidentialUnit: "Nessuna" | "Pertinenza" | "Incorporata";
  ownerMode: "condominium_member" | "external" | "mixed" | "inherited";
  ownerMemberIds: number[];
  externalOwners: ExternalUnitOwner[];
  notes: string;
  active: boolean;
};

type CondominiumMember = {
  id: number;
  userId?: string;
  condominiumId: number;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  phone: string;
  email: string;
  apartment: string;
  role: "Proprietario" | "Inquilino";
  notes: string;
  active: boolean;
  unitId?: string;
};

type RequestStatus = "Nuova" | "In lavorazione" | "Risolta" | "Chiusa";
type RequestPriority = "Bassa" | "Media" | "Alta";

type CondominiumRequest = {
  id: number;
  condominiumId: number;
  memberId: number | null;
  requesterUserId?: string;
  category: string;
  description: string;
  priority: RequestPriority;
  date: string;
  status: RequestStatus;
  response: string;
  attachmentName: string;
  supplierId: number | null;
  activityId: number | null;
};

type Deadline = {
  id: number;
  title: string;
  condominiumId: number;
  dueDate: string;
  amount: string;
  status: DeadlineStatus;
  category: string;
  notes: string;
};

type DocumentItem = {
  id: number;
  name: string;
  condominiumId: number;
  category: string;
  date: string;
  size: string;
  notes: string;
  source: DocumentSource;
  mimeType: string;
  aiStatus: AIStatus;
  publication: PublicationStatus;
  aiSummary: string;
  extractedData: string;
};

type Assembly = {
  id: number;
  condominiumId: number;
  title: string;
  date: string;
  time: string;
  place: string;
  status: AssemblyStatus;
  notes: string;
  audioName: string;
  transcriptionStatus: AIStatus;
  minutesStatus: AIStatus;
  minutesDraft: string;
  publishedToPortal: boolean;
};

type Supplier = {
  id: number;
  name: string;
  service: string;
  phone: string;
  email: string;
  condominiumId: number | null;
  notes: string;
};

type Activity = {
  id: number;
  title: string;
  condominiumId: number | null;
  dueDate: string;
  priority: ActivityPriority;
  status: ActivityStatus;
  notes: string;
};

type AdminProfile = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  fiscalCode: string;
  vat: string;
  workspaceId: string;
};

type PortalMember = {
  id: number;
  userId?: string;
  name: string;
  email: string;
  condominiumId: number;
  role: UserRole;
  apartment: string;
  permissions: PortalPermission[];
  active: boolean;
};

type AddonId =
  | "condomini"
  | "documenti"
  | "scadenze"
  | "assemblee"
  | "fornitori"
  | "attivita"
  | "comunicazioni"
  | "ai"
  | "portale";

type Subscription = {
  plan: PlanId;
  status: "Attivo" | "Demo";
  renewalDate: string;
  addons: AddonId[];
};

type Communication = {
  id: number;
  deliveryMode?: "portal" | "email";
  title: string;
  condominiumId: number | null;
  audience: CommunicationAudience;
  recipientIds?: number[];
  date: string;
  status: CommunicationStatus;
  body: string;
  publishedToPortal: boolean;
  emailStatus?: "Non inviata" | "Predisposta" | "Inviata";
  emailPreparedAt?: string;
};


type PortalRegistrationRequest = {
  id: string;
  workspace_id: string | null;
  requested_user_id: string | null;
  matched_member_id: string | null;
  email: string;
  full_name: string;
  fiscal_code: string | null;
  condominium_name: string | null;
  status: "pending" | "email_mismatch" | "approved" | "rejected";
  note: string | null;
  created_at: string;
};

type WorkspaceSummary = {
  id: string;
  name: string;
  owner: string;
};


/* =========================================================
   PIANI
   ========================================================= */

const PLAN_NAMES: Record<PlanId, string> = {
  free: "BETHAG Free",
  plus: "BETHAG Plus",
  professional: "BETHAG Professional",
  portal: "BETHAG Portal",
};

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  free: "Gestionale essenziale per l'amministrazione.",
  plus: "Gestionale con strumenti di acquisizione AI.",
  professional:
    "Automazioni, generazione documenti e gestione assemblee avanzata.",
  portal:
    "Professional con portale dedicato ai condomini.",
};

const PLAN_LEVEL: Record<PlanId, number> = {
  free: 0,
  plus: 1,
  professional: 2,
  portal: 3,
};

const ADDON_NAMES: Record<AddonId, string> = {
  condomini: "Gestione Condomini",
  documenti: "Gestione Documenti",
  scadenze: "Scadenze",
  assemblee: "Assemblee avanzate",
  fornitori: "Fornitori",
  attivita: "Attività",
  comunicazioni: "Comunicazioni",
  ai: "BETHAG AI",
  portale: "Portale Condomini",
};

const ADDON_PRICES: Record<AddonId, string> = {
  condomini: "2,90 €/mese",
  documenti: "2,90 €/mese",
  scadenze: "1,90 €/mese",
  assemblee: "4,90 €/mese",
  fornitori: "1,90 €/mese",
  attivita: "1,90 €/mese",
  comunicazioni: "2,90 €/mese",
  ai: "5,90 €/mese",
  portale: "6,90 €/mese",
};

const ADDON_REQUIRED_PLAN: Record<AddonId, PlanId> = {
  condomini: "free",
  documenti: "plus",
  scadenze: "plus",
  assemblee: "professional",
  fornitori: "plus",
  attivita: "plus",
  comunicazioni: "plus",
  ai: "professional",
  portale: "portal",
};


/* =========================================================
   STORAGE
   ========================================================= */

const KEYS = {
  condominiums: "bethag-condominiums-v5",
  deadlines: "bethag-deadlines-v5",
  documents: "bethag-documents-v5",
  assemblies: "bethag-assemblies-v5",
  suppliers: "bethag-suppliers-v5",
  activities: "bethag-activities-v5",
  communications: "bethag-communications-v1",
  condominiumMembers: "bethag-condominium-members-v1",
  condominiumRequests: "bethag-condominium-requests-v1",
  session: "bethag-session-v1",
  sessionEmail: "bethag-session-email-v1",
  profile: "bethag-profile-v5",
  portalMembers: "bethag-portal-members-v2",
  subscription: "bethag-subscription-v2",
  collaborators: "bethag-collaborators-v1",
  page: "bethag-current-page-v1",
  selectedCondominium: "bethag-selected-condominium-v1",
};


/* =========================================================
   DATI INIZIALI
   ========================================================= */

const initialCondominiums: Condominium[] = [
  {
    id: 1,
    name: "Condominio Aurora",
    address: "Via Roma 10",
    cap: "40100",
    city: "Bologna",
    province: "BO",
    fiscalCode: "",
    units: "24",
    contact: "",
    email: "",
    phone: "",
    iban: "",
    bank: "",
    notes: "",
  },
  {
    id: 2,
    name: "Residenza Europa",
    address: "Via Europa 25",
    cap: "40100",
    city: "Bologna",
    province: "BO",
    fiscalCode: "",
    units: "18",
    contact: "",
    email: "",
    phone: "",
    iban: "",
    bank: "",
    notes: "",
  },
  {
    id: 3,
    name: "Condominio Verdi",
    address: "Via Verdi 8",
    cap: "40100",
    city: "Bologna",
    province: "BO",
    fiscalCode: "",
    units: "12",
    contact: "",
    email: "",
    phone: "",
    iban: "",
    bank: "",
    notes: "",
  },
];

const initialDeadlines: Deadline[] = [
  {
    id: 1,
    title: "Pagamento assicurazione",
    condominiumId: 1,
    dueDate: "2026-09-28",
    amount: "850",
    status: "In scadenza",
    category: "Assicurazione",
    notes: "",
  },
  {
    id: 2,
    title: "Invio convocazione assemblea",
    condominiumId: 2,
    dueDate: "2026-09-30",
    amount: "",
    status: "Da fare",
    category: "Assemblea",
    notes: "",
  },
  {
    id: 3,
    title: "Manutenzione ascensore",
    condominiumId: 3,
    dueDate: "2026-10-03",
    amount: "420",
    status: "Da fare",
    category: "Manutenzione",
    notes: "",
  },
  {
    id: 4,
    title: "Pagamento pulizia scale",
    condominiumId: 1,
    dueDate: "2026-10-05",
    amount: "310",
    status: "Da fare",
    category: "Fornitori",
    notes: "",
  },
  {
    id: 5,
    title: "Verifica estintori",
    condominiumId: 2,
    dueDate: "2026-10-08",
    amount: "",
    status: "Da fare",
    category: "Sicurezza",
    notes: "",
  },
  {
    id: 6,
    title: "Letture contatori",
    condominiumId: 3,
    dueDate: "2026-10-10",
    amount: "",
    status: "Da fare",
    category: "Gestione",
    notes: "",
  },
  {
    id: 7,
    title: "Pagamento energia parti comuni",
    condominiumId: 1,
    dueDate: "2026-10-12",
    amount: "540",
    status: "Da fare",
    category: "Utenze",
    notes: "",
  },
  {
    id: 8,
    title: "Rinnovo contratto giardino",
    condominiumId: 2,
    dueDate: "2026-10-20",
    amount: "650",
    status: "Da fare",
    category: "Fornitori",
    notes: "",
  },
];

const initialDocuments: DocumentItem[] = [
  {
    id: 1,
    name: "Regolamento condominiale.pdf",
    condominiumId: 1,
    category: "Regolamento",
    date: "2026-09-01",
    size: "1.2 MB",
    notes: "",
    source: "PDF",
    mimeType: "application/pdf",
    aiStatus: "Confermato",
    publication: "Condiviso",
    aiSummary: "Regolamento condominiale.",
    extractedData: "",
  },
  {
    id: 2,
    name: "Polizza assicurativa.pdf",
    condominiumId: 1,
    category: "Assicurazione",
    date: "2026-09-05",
    size: "840 KB",
    notes: "",
    source: "PDF",
    mimeType: "application/pdf",
    aiStatus: "Confermato",
    publication: "Privato",
    aiSummary: "",
    extractedData: "",
  },
  {
    id: 3,
    name: "Verbale assemblea.pdf",
    condominiumId: 2,
    category: "Assemblea",
    date: "2026-09-10",
    size: "560 KB",
    notes: "",
    source: "PDF",
    mimeType: "application/pdf",
    aiStatus: "Confermato",
    publication: "Condiviso",
    aiSummary: "Verbale assembleare.",
    extractedData: "",
  },
  {
    id: 4,
    name: "Contratto manutenzione.pdf",
    condominiumId: 3,
    category: "Contratti",
    date: "2026-09-12",
    size: "920 KB",
    notes: "",
    source: "PDF",
    mimeType: "application/pdf",
    aiStatus: "Non elaborato",
    publication: "Privato",
    aiSummary: "",
    extractedData: "",
  },
];

const initialAssemblies: Assembly[] = [
  {
    id: 1,
    condominiumId: 1,
    title: "Assemblea ordinaria",
    date: "2026-10-15",
    time: "18:30",
    place: "Sala condominiale",
    status: "Programmato",
    notes: "",
    audioName: "",
    transcriptionStatus: "Non elaborato",
    minutesStatus: "Non elaborato",
    minutesDraft: "",
    publishedToPortal: false,
  },
  {
    id: 2,
    condominiumId: 2,
    title: "Assemblea straordinaria",
    date: "2026-10-20",
    time: "19:00",
    place: "Videoconferenza",
    status: "Programmato",
    notes: "",
    audioName: "",
    transcriptionStatus: "Non elaborato",
    minutesStatus: "Non elaborato",
    minutesDraft: "",
    publishedToPortal: false,
  },
  {
    id: 3,
    condominiumId: 3,
    title: "Assemblea ordinaria",
    date: "2026-09-10",
    time: "18:00",
    place: "Sala riunioni",
    status: "Svolto",
    notes: "",
    audioName: "",
    transcriptionStatus: "Non elaborato",
    minutesStatus: "Non elaborato",
    minutesDraft: "",
    publishedToPortal: false,
  },
];

const initialSuppliers: Supplier[] = [
  {
    id: 1,
    name: "Servizi Pulizia Bologna",
    service: "Pulizie",
    phone: "",
    email: "",
    condominiumId: 1,
    notes: "",
  },
  {
    id: 2,
    name: "Ascensori Emilia",
    service: "Ascensori",
    phone: "",
    email: "",
    condominiumId: 3,
    notes: "",
  },
  {
    id: 3,
    name: "Verde & Giardini",
    service: "Giardinaggio",
    phone: "",
    email: "",
    condominiumId: 2,
    notes: "",
  },
];

const initialActivities: Activity[] = [
  {
    id: 1,
    title: "Verificare preventivo manutenzione",
    condominiumId: 1,
    dueDate: "2026-09-29",
    priority: "Alta",
    status: "Aperta",
    notes: "",
  },
  {
    id: 2,
    title: "Inviare convocazione assemblea",
    condominiumId: 2,
    dueDate: "2026-09-30",
    priority: "Alta",
    status: "In corso",
    notes: "",
  },
  {
    id: 3,
    title: "Archiviare fattura fornitore",
    condominiumId: 3,
    dueDate: "2026-10-02",
    priority: "Media",
    status: "Aperta",
    notes: "",
  },
];

const initialCondominiumMembers: CondominiumMember[] = [
  {
    id: 1,
    condominiumId: 1,
    firstName: "Mario",
    lastName: "Rossi",
    fiscalCode: "",
    phone: "",
    email: "mario@example.com",
    apartment: "Interno 4",
    role: "Proprietario",
    notes: "",
    active: true,
  },
];

const initialCondominiumRequests: CondominiumRequest[] = [];

const initialCommunications: Communication[] = [
  {
    id: 1,
    title: "Avviso manutenzione parti comuni",
    condominiumId: 1,
    audience: "Tutti",
    date: "2026-09-25",
    status: "Pubblicata",
    body:
      "Si informa che nei prossimi giorni verranno effettuati interventi di manutenzione nelle parti comuni.",
    publishedToPortal: true,
  },
  {
    id: 2,
    title: "Convocazione assemblea",
    condominiumId: 2,
    audience: "Tutti",
    date: "2026-09-26",
    status: "Bozza",
    body:
      "Convocazione dell'assemblea condominiale.",
    publishedToPortal: false,
  },
];

const initialPortalMembers: PortalMember[] = [
  {
    id: 1,
    name: "Mario Rossi",
    email: "mario@example.com",
    condominiumId: 1,
    role: "resident",
    apartment: "Interno 4",
    permissions: [
      "documenti",
      "verbali",
      "regolamento",
      "pagamenti_ordinari",
      "pagamenti_straordinari",
      "assemblee",
      "comunicazioni",
    ],
    active: true,
  },
];

const initialSubscription: Subscription = {
  plan: "free",
  status: "Demo",
  renewalDate: "",
  addons: [],
};

const initialCollaborators: Collaborator[] = [];


/* =========================================================
   LOCAL DATE HELPERS
   ========================================================= */

function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


/* =========================================================
   EMPTY
   ========================================================= */

const emptyCondominium: Condominium = {
  id: 0,
  name: "",
  address: "",
  cap: "",
  city: "",
  province: "",
  fiscalCode: "",
  units: "",
  contact: "",
  email: "",
  phone: "",
  iban: "",
  bank: "",
  notes: "",
};

const emptyDeadline: Deadline = {
  id: 0,
  title: "",
  condominiumId: 1,
  dueDate: "",
  amount: "",
  status: "Da fare",
  category: "Gestione",
  notes: "",
};

const emptyDocument: DocumentItem = {
  id: 0,
  name: "",
  condominiumId: 1,
  category: "Altro",
  date: localISODate(),
  size: "",
  notes: "",
  source: "Manuale",
  mimeType: "",
  aiStatus: "Non elaborato",
  publication: "Privato",
  aiSummary: "",
  extractedData: "",
};

const emptyAssembly: Assembly = {
  id: 0,
  condominiumId: 1,
  title: "",
  date: "",
  time: "",
  place: "",
  status: "Programmato",
  notes: "",
  audioName: "",
  transcriptionStatus: "Non elaborato",
  minutesStatus: "Non elaborato",
  minutesDraft: "",
  publishedToPortal: false,
};

const emptySupplier: Supplier = {
  id: 0,
  name: "",
  service: "",
  phone: "",
  email: "",
  condominiumId: null,
  notes: "",
};

const emptyActivity: Activity = {
  id: 0,
  title: "",
  condominiumId: null,
  dueDate: "",
  priority: "Media",
  status: "Aperta",
  notes: "",
};

const emptyCondominiumMember: CondominiumMember = {
  id: 0, condominiumId: 1, firstName: "", lastName: "", fiscalCode: "", phone: "", email: "", apartment: "", role: "Proprietario", notes: "", active: true, unitId: "",
};

const emptyCondominiumRequest: CondominiumRequest = {
  id: 0, condominiumId: 1, memberId: null, category: "Informazioni", description: "", priority: "Media", date: localISODate(), status: "Nuova", response: "", attachmentName: "", supplierId: null, activityId: null,
};

const emptyCommunication: Communication = {
  id: 0,
  deliveryMode: "portal",
  title: "",
  condominiumId: null,
  audience: "Tutti",
  recipientIds: [],
  date: localISODate(),
  status: "Bozza",
  body: "",
  publishedToPortal: false,
  emailStatus: "Non inviata",
  emailPreparedAt: "",
};

const emptyProfile: AdminProfile = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  fiscalCode: "",
  vat: "",
  workspaceId: "",
};


/* =========================================================
   HELPERS
   ========================================================= */

function load<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return (
    Date.now() +
    Math.floor(Math.random() * 1000)
  );
}

function makeWorkspaceId() {
  return `WS-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.floor(
    Math.random() * 9999
  )
    .toString()
    .padStart(4, "0")}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function currency(value: string) {
  if (!value) return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return value;

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(number);
}

function normalizeWords(value: string) {
  return value
    .toLocaleLowerCase("it-IT")
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase("it-IT"));
}

function normalizeSentence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trimStart();
  if (!cleaned) return cleaned;
  return cleaned.charAt(0).toLocaleUpperCase("it-IT") + cleaned.slice(1);
}

function normalizeByLabel(value: string, label = "", type = "text") {
  const l = label.toLocaleLowerCase("it-IT");
  if (type === "number" || l.includes("numero") && !l.includes("polizza")) {
    return value.replace(/[^0-9.,-]/g, "");
  }
  if (l.includes("codice fiscale")) {
    return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16);
  }
  if (l.includes("iban")) {
    return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 27);
  }
  if (type === "email" || l.includes("e-mail") || l.includes("email")) {
    return value.toLocaleLowerCase("it-IT").replace(/\s/g, "");
  }
  if (l.includes("cognome")) {
    return value.toLocaleUpperCase("it-IT").replace(/\s+/g, " ");
  }
  if (l.includes("nome e cognome") || l.includes("nome completo")) {
    const parts = normalizeWords(value).split(" ").filter(Boolean);
    if (parts.length > 1) {
      const surname = parts.pop()!.toLocaleUpperCase("it-IT");
      return [...parts, surname].join(" ");
    }
    return normalizeWords(value);
  }
  if (l.includes("nome") && !l.includes("condominio") && !l.includes("documento")) {
    return normalizeWords(value);
  }
  if (l.includes("cap")) {
    return value.replace(/\D/g, "").slice(0, 5);
  }
  return normalizeSentence(value);
}

function normalizeErrorText() {
  return "ERRORE";
}

function validateEmail(value: string) {
  if (!value) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function fileSource(
  fileName: string,
  mimeType: string
): DocumentSource {
  const name = fileName.toLowerCase();

  if (
    mimeType.includes("pdf") ||
    name.endsWith(".pdf")
  )
    return "PDF";

  if (
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    mimeType.includes("word")
  )
    return "Word";

  if (
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv") ||
    mimeType.includes("spreadsheet")
  )
    return "Excel";

  if (
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(name)
  )
    return "Immagine";

  if (
    mimeType.startsWith("audio/") ||
    /\.(mp3|wav|m4a|aac|ogg)$/i.test(name)
  )
    return "Audio";

  return "Manuale";
}

function hasFeature(
  plan: PlanId,
  required: PlanId
) {
  return PLAN_LEVEL[plan] >= PLAN_LEVEL[required];
}

function hasAddon(subscription: Subscription, addon: AddonId) {
  return subscription.addons.includes(addon);
}

function hasEntitlement(subscription: Subscription, required: PlanId, addon?: AddonId) {
  return hasFeature(subscription.plan, required) || Boolean(addon && hasAddon(subscription, addon));
}

function roleName(role: UserRole) {
  const labels: Record<UserRole, string> = {
    admin: "Amministratore",
    collaborator: "Collaboratore",
    resident: "Condomino",
    council: "Consigliere",
  };

  return labels[role];
}

function permissionName(
  permission: PortalPermission
) {
  const labels: Record<
    PortalPermission,
    string
  > = {
    documenti: "Documenti",
    verbali: "Verbali",
    regolamento: "Regolamento",
    pagamenti_ordinari: "Spese ordinarie",
    pagamenti_straordinari: "Spese straordinarie",
    assemblee: "Assemblee",
    comunicazioni: "Comunicazioni",
  };

  return labels[permission];
}


/* =========================================================
   PUBLIC HOME / ACCESSO / PORTALE CONDOMINO
   ========================================================= */

type PublicRole = "admin" | "collaborator" | "resident";

function PublicHome({
  onLogin,
  onRegisterAdmin,
  onRegisterResident,
  onResetPassword,
}: {
  onLogin: (role: PublicRole, email: string, password: string) => Promise<void> | void;
  onRegisterAdmin: (fullName: string, email: string, password: string) => Promise<void>;
  onRegisterResident: (fullName: string, email: string, fiscalCode: string, condominiumName: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}) {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return (
      <LoginPage
        onBack={() => setShowLogin(false)}
        onLogin={onLogin}
        onRegisterAdmin={onRegisterAdmin}
        onRegisterResident={onRegisterResident}
        onResetPassword={onResetPassword}
      />
    );
  }

  const openLogin = () => setShowLogin(true);

  return (
    <div className="public-home">
      <div className="public-home-inner">
        <header className="public-header">
          <BrandLogo />
          <button className="public-login-button" onClick={openLogin}>
            Accedi
          </button>
        </header>

        <main className="public-main">
          <section className="public-copy">
            <span className="public-kicker">BETHAG PLATFORM</span>
            <h1>Un'unica piattaforma.<br />Più professioni.</h1>
            <p>
              BETHAG nasce come piattaforma digitale modulare.
              Il primo ambiente disponibile è dedicato agli
              amministratori di condominio, con accessi distinti
              per amministratori, collaboratori e condòmini.
            </p>
          </section>

          <section className="platform-panel">
            <div className="platform-label">Piattaforme professionali</div>

            <button className="platform-card" onClick={openLogin}>
              <span className="platform-icon">
                <AppIcon name="building" size={25} />
              </span>
              <strong>Amministratori di Condominio</strong>
              <span>
                Gestionale completo per amministratori e collaboratori,
                con area riservata ai condòmini.
              </span>
              <b>Entra nella piattaforma →</b>
            </button>

            <div className="future-platform">
              <div>Professionisti e studi — prossimamente</div>
              <div>Altre piattaforme professionali — prossimamente</div>
            </div>
          </section>
        </main>

        <footer className="public-footer">
          BETHAG · piattaforma modulare per la gestione professionale
        </footer>
      </div>
    </div>
  );
}

function LoginPage({
  onBack,
  onLogin,
  onRegisterAdmin,
  onRegisterResident,
  onResetPassword,
}: {
  onBack: () => void;
  onLogin: (role: PublicRole, email: string, password: string) => Promise<void> | void;
  onRegisterAdmin: (fullName: string, email: string, password: string) => Promise<void>;
  onRegisterResident: (fullName: string, email: string, fiscalCode: string, condominiumName: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}) {
  const [role, setRole] = useState<PublicRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [condominiumName, setCondominiumName] = useState("");
  const [registerMode, setRegisterMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const roles: Array<{ id: PublicRole; title: string; description: string }> = [
    { id: "admin", title: "Amministratore", description: "Accesso completo al gestionale." },
    { id: "collaborator", title: "Collaboratore", description: "Accesso all'area gestionale del titolare." },
    { id: "resident", title: "Condomino", description: "Accesso al portale del proprio condominio." },
  ];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim()) {
      setError("Inserisci l'indirizzo e-mail.");
      return;
    }
    if (!recoveryMode && !password.trim()) {
      setError("Inserisci e-mail e password per continuare.");
      return;
    }
    if (recoveryMode) {
      setError("");
      setSubmitting(true);
      try {
        await onResetPassword(email.trim());
        setRecoverySent(true);
      } catch (resetError) {
        console.error("BETHAG password recovery failed", resetError);
        setError(resetError instanceof Error ? resetError.message : "Impossibile inviare il link di recupero.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (registerMode && role === "resident" && !fullName.trim()) {
      setError("Inserisci nome e cognome.");
      return;
    }

    if (registerMode && role === "admin" && !fullName.trim()) {
      setError("Inserisci nome e cognome.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      if (registerMode) {
        if (role === "admin") {
          await onRegisterAdmin(fullName.trim(), email.trim(), password);
        } else if (role === "resident") {
          await onRegisterResident(fullName.trim(), email.trim(), fiscalCode.trim(), condominiumName.trim(), password);
        } else {
          throw new Error("La registrazione autonoma dei collaboratori non è disponibile: il collaboratore viene invitato dall'amministratore.");
        }
      } else {
        await onLogin(role, email.trim(), password);
      }
    } catch (submitError) {
      console.error("BETHAG authentication action failed", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Operazione non completata."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <BrandLogo />
          <button className="secondary-button" onClick={onBack}>← Indietro</button>
        </div>

        <h1>{recoveryMode ? "Recupera password" : registerMode ? "Registrazione nuovo utente" : "Accedi a BETHAG"}</h1>
        <p className="login-intro">
          {recoveryMode
            ? "Inserisci l'e-mail del tuo account. Riceverai un link per impostare una nuova password."
            : registerMode
              ? "Per i condòmini BETHAG verifica prima l'anagrafica inserita dall'amministratore."
              : "Seleziona il profilo con cui vuoi entrare nella piattaforma."}
        </p>

        {!recoveryMode && <div className="login-role-grid">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              className={role === item.id ? "login-role active" : "login-role"}
              onClick={() => { setRole(item.id); setError(""); }}
            >
              {item.title}
            </button>
          ))}
        </div>}

        {!recoveryMode && <div className="login-role-description">
          {roles.find((item) => item.id === role)?.description}
        </div>}

        <form onSubmit={submit}>
          {!recoveryMode && registerMode && (
            <>
              <label>Nome e cognome</label>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" placeholder="Mario Rossi" autoComplete="name" />

              {role === "resident" && (
                <>
                  <label>Codice fiscale</label>
                  <input value={fiscalCode} onChange={(event) => setFiscalCode(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16))} type="text" placeholder="RSSMRA..." autoComplete="off" />

                  <label>Nome del condominio <span style={{fontWeight:400,color:"#94a3b8"}}>(se conosciuto)</span></label>
                  <input value={condominiumName} onChange={(event) => setCondominiumName(event.target.value)} type="text" placeholder="Condominio Aurora" />
                </>
              )}
            </>
          )}

          <label>E-mail</label>
          <input value={email} onChange={(event) => setEmail(event.target.value.toLocaleLowerCase("it-IT").replace(/\s/g, ""))} type="email" placeholder="nome@esempio.it" autoComplete="email" />

          {!recoveryMode && <>
            <label>Password</label>
            <div className="password-field-wrap">
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete={registerMode ? "new-password" : "current-password"} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Nascondi password" : "Mostra password"} title={showPassword ? "Nascondi password" : "Mostra password"}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </>}

          {!recoveryMode && registerMode && role === "resident" && (
            <small className="login-note">
              Se esiste un profilo con la stessa e-mail e dati anagrafici, BETHAG lo collega automaticamente al relativo condominio dopo la verifica dell'e-mail. In caso contrario la richiesta passa all'amministratore.
            </small>
          )}

          {recoverySent && !error && <div className="login-success" role="status">Se l'e-mail è associata a un account BETHAG, abbiamo inviato il link per reimpostare la password.</div>}
          {error && <div className="login-error" role="alert"><strong>{error}</strong></div>}
          <button className="primary-button login-submit" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Operazione in corso…" : recoveryMode ? "Invia link di recupero" : registerMode ? (role === "resident" ? "Registrati come condòmino" : "Crea account amministratore") : "Accedi"}
          </button>
        </form>
        {!recoveryMode && !registerMode && supabaseConfigured && (
          <button type="button" className="login-forgot-button" onClick={() => { setRecoveryMode(true); setRecoverySent(false); setError(""); setShowPassword(false); }}>
            Password dimenticata?
          </button>
        )}
        {supabaseConfigured && !recoveryMode && (
          <button type="button" className="secondary-button login-register-toggle" onClick={() => { setRegisterMode((current) => !current); setRole("admin"); setError(""); setRecoverySent(false); }}>
            {registerMode ? "Ho già un account: accedi" : "Registrazione nuovo utente"}
          </button>
        )}
        {recoveryMode && (
          <button type="button" className="secondary-button login-register-toggle" onClick={() => { setRecoveryMode(false); setRecoverySent(false); setError(""); }}>
            ← Torna all'accesso
          </button>
        )}

        <p className="login-disclaimer">
          Le credenziali sono gestite da Supabase Auth. L'accesso al portale viene concesso solo dopo l'associazione/autorizzazione del profilo condominiale.
        </p>
      </div>
    </div>
  );
}

function PasswordResetPage({ onComplete }: { onComplete: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onComplete(password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossibile aggiornare la password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header"><BrandLogo /></div>
        <h1>Reimposta la password</h1>
        <p className="login-intro">Inserisci la nuova password per il tuo account BETHAG.</p>
        <form onSubmit={submit}>
          <label>Nuova password</label>
          <div className="password-field-wrap">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Almeno 8 caratteri" />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Nascondi password" : "Mostra password"} title={showPassword ? "Nascondi password" : "Mostra password"}>{showPassword ? "🙈" : "👁️"}</button>
          </div>
          <label>Conferma nuova password</label>
          <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Ripeti la password" />
          {error && <div className="login-error" role="alert"><strong>{error}</strong></div>}
          <button className="primary-button login-submit" disabled={busy} type="submit">
            {busy ? "Aggiornamento in corso…" : "Salva nuova password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordSetupPage({ onComplete }: { onComplete: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onComplete(password);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Operazione non completata. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header"><BrandLogo /></div>
        <h1>Attiva il tuo account BETHAG</h1>
        <p className="login-intro">La tua e-mail è stata invitata dall'amministratore. Imposta ora la password personale per completare l'attivazione.</p>
        <form onSubmit={submit}>
          <label>Nuova password</label>
          <div className="password-field-wrap">
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Almeno 8 caratteri" />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Nascondi password" : "Mostra password"} title={showPassword ? "Nascondi password" : "Mostra password"}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <label>Conferma password</label>
          <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Ripeti la password" />
          {error && <div className="login-error" role="alert"><strong>{error}</strong></div>}
          <button className="primary-button login-submit" disabled={busy} type="submit">
            {busy ? "Attivazione in corso…" : "Attiva account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResidentPortalView({
  email,
  condominiums,
  portalMembers,
  condominiumMembers,
  documents,
  assemblies,
  communications,
  onLogout,
  requests,
  onCreateRequest,
}: {
  email: string;
  condominiums: Condominium[];
  portalMembers: PortalMember[];
  condominiumMembers: CondominiumMember[];
  documents: DocumentItem[];
  assemblies: Assembly[];
  communications: Communication[];
  requests: CondominiumRequest[];
  onLogout: () => void;
  onCreateRequest: (request: CondominiumRequest) => void;
}) {
  const member =
    portalMembers.find(
      (item) =>
        item.active &&
        (item.role === "resident" || item.role === "council") &&
        item.email.trim().toLowerCase() === email.trim().toLowerCase() &&
        condominiumMembers.some(
          (registryMember) =>
            registryMember.active &&
            registryMember.condominiumId === item.condominiumId &&
            registryMember.email.trim().toLowerCase() === email.trim().toLowerCase()
        )
    ) || null;

  const condominium = member
    ? condominiums.find((item) => item.id === member.condominiumId)
    : null;

  const hasPortalPermission = (permission: PortalPermission) => {
    const permissions = member?.permissions ?? [];
    if (permissions.includes(permission)) return true;
    // Compatibilità sicura con i vecchi accessi: il vecchio permesso
    // generico "pagamenti" viene ricondotto esclusivamente alle spese ordinarie.
    if (permission === "pagamenti_ordinari") {
      return (permissions as string[]).includes("pagamenti");
    }
    return false;
  };

  const sharedDocuments = member && hasPortalPermission("documenti")
    ? documents.filter(
        (item) =>
          item.publication === "Condiviso" &&
          item.condominiumId === member.condominiumId
      )
    : [];

  const visibleRegulations = member && hasPortalPermission("regolamento")
    ? documents.filter(
        (item) =>
          item.publication === "Condiviso" &&
          item.category.toLowerCase().includes("regolamento") &&
          item.condominiumId === member.condominiumId
      )
    : [];

  const visibleCommunications = member && hasPortalPermission("comunicazioni")
    ? communications.filter(
        (item) =>
          item.status === "Pubblicata" &&
          item.publishedToPortal &&
          item.condominiumId === member.condominiumId
      )
    : [];

  const publishedAssemblies = member &&
    (hasPortalPermission("assemblee") || hasPortalPermission("verbali"))
    ? assemblies
        .filter(
          (item) =>
            item.publishedToPortal &&
            item.condominiumId === member.condominiumId
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const [requestCategory, setRequestCategory] = useState("Informazioni");
  const [requestPriority, setRequestPriority] = useState<RequestPriority>("Media");
  const [requestDescription, setRequestDescription] = useState("");

  const ownRequests = member
    ? requests.filter((request) => request.memberId === member.id).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const submitRequest = () => {
    if (!member) return;
    if (!requestDescription.trim()) {
      alert("Inserisci la descrizione della richiesta.");
      return;
    }
    onCreateRequest({
      ...emptyCondominiumRequest,
      id: makeId(),
      condominiumId: member.condominiumId,
      memberId: member.id,
      category: requestCategory,
      description: requestDescription.trim(),
      priority: requestPriority,
      date: localISODate(),
      status: "Nuova",
    });
    setRequestDescription("");
    setRequestCategory("Informazioni");
    setRequestPriority("Media");
  };

  return (
    <div className="resident-portal">
      <header className="resident-header">
        <BrandLogo />
        <div className="resident-header-right">
          <div className="resident-identity">
            <strong>{member?.name || "Condomino"}</strong>
            <span>{member?.role === "council" ? "Area consigliere" : "Area condòmino"}</span>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            Esci
          </button>
        </div>
      </header>

      <main className="resident-main">
        <section className="resident-hero">
          <div className="eyebrow">Portale condòmino</div>
          <h1>{condominium?.name || "Profilo non associato"}</h1>
          <p>
            {member
              ? "Consultazione di documenti, comunicazioni e assemblee pubblicate dall'amministratore."
              : "Non è stato trovato un profilo condominiale attivo associato a questa e-mail."}
          </p>
        </section>

        <div className="resident-stats">
          <div><b>{sharedDocuments.length}</b><span>Documenti</span></div>
          <div><b>{visibleRegulations.length}</b><span>Regolamento</span></div>
          <div><b>{visibleCommunications.length}</b><span>Comunicazioni</span></div>
        </div>

        <div className="resident-grid">
          <section className="resident-card">
            <h2>Comunicazioni</h2>
            {visibleCommunications.length === 0 ? (
              <p className="empty-state">Nessuna comunicazione pubblicata.</p>
            ) : (
              visibleCommunications.map((item) => (
                <article className="resident-list-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <small>{formatDate(item.date)}</small>
                  <p>{item.body}</p>
                </article>
              ))
            )}
          </section>

          <section className="resident-card">
            <h2>Documenti disponibili</h2>
            {sharedDocuments.length === 0 ? (
              <p className="empty-state">Nessun documento disponibile.</p>
            ) : (
              sharedDocuments.map((item) => (
                <div className="resident-list-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.category} · {formatDate(item.date)}
                    </small>
                  </div>
                  <span>Consultabile</span>
                </div>
              ))
            )}
          </section>

          {member && hasPortalPermission("regolamento") && (
            <section className="resident-card">
              <h2>Regolamento condominiale</h2>
              {visibleRegulations.length === 0 ? (
                <p className="empty-state">Nessun regolamento pubblicato.</p>
              ) : (
                visibleRegulations.map((item) => (
                  <div className="resident-list-row" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.category} · {formatDate(item.date)}</small>
                    </div>
                    <span>Consultabile</span>
                  </div>
                ))
              )}
            </section>
          )}

          {member && (hasPortalPermission("pagamenti_ordinari") || hasPortalPermission("pagamenti_straordinari")) && (
            <section className="resident-card">
              <h2>Spese condominiali</h2>
              <div className="resident-list-item">
                {hasPortalPermission("pagamenti_ordinari") && (
                  <>
                    <strong>Spese ordinarie</strong>
                    <p>Accesso abilitato alle spese ordinarie dell'unità.</p>
                  </>
                )}
                {hasPortalPermission("pagamenti_straordinari") && (
                  <>
                    <strong>Spese straordinarie</strong>
                    <p>Accesso abilitato alle spese straordinarie dell'unità.</p>
                  </>
                )}
              </div>
            </section>
          )}

          <section className="resident-card">
            <h2>Assemblee</h2>
            {publishedAssemblies.length === 0 ? (
              <p className="empty-state">Nessuna assemblea pubblicata.</p>
            ) : (
              publishedAssemblies.map((item) => (
                <div className="resident-list-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <small>
                    {formatDate(item.date)}
                    {item.time ? " · " + item.time : ""}
                  </small>
                  {item.place && <p>{item.place}</p>}
                </div>
              ))
            )}
          </section>
        </div>

        {member && (
          <section className="resident-card resident-request-card">
            <h2>Segnala un problema o chiedi informazioni</h2>
            <p className="section-subtitle">Invia una richiesta direttamente all'amministratore.</p>
            <div className="resident-request-form">
              <select value={requestCategory} onChange={(e) => setRequestCategory(e.target.value)}>
                <option>Informazioni</option>
                <option>Manutenzione</option>
                <option>Segnalazione</option>
                <option>Amministrazione</option>
                <option>Altro</option>
              </select>
              <select value={requestPriority} onChange={(e) => setRequestPriority(e.target.value as RequestPriority)}>
                <option>Bassa</option>
                <option>Media</option>
                <option>Alta</option>
              </select>
              <textarea value={requestDescription} onChange={(e) => setRequestDescription(e.target.value)} placeholder="Descrivi la richiesta o il problema..." rows={4} />
              <button className="primary-button" onClick={submitRequest}>Invia richiesta</button>
            </div>
            {ownRequests.length > 0 && (
              <div className="resident-request-history">
                <strong>Le tue richieste</strong>
                {ownRequests.slice(0, 5).map((request) => (
                  <div className="resident-list-row" key={request.id}>
                    <div><strong>{request.category}</strong><small>{formatDate(request.date)} · {request.description}</small></div>
                    <Badge value={request.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="resident-readonly-note">
          Questa area è riservata alla consultazione. Le operazioni di
          gestione rimangono nell'area riservata all'amministratore e ai
          suoi collaboratori.
        </div>
      </main>
    </div>
  );
}


/* =========================================================
   APP
   ========================================================= */

function bethagFieldMeta(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const label = input.closest("label")?.textContent || "";
  return [input.name, input.id, input.placeholder, input.getAttribute("aria-label"), label]
    .filter(Boolean).join(" ").toLowerCase();
}

function bethagTitleCase(value: string): string {
  return value.toLocaleLowerCase("it-IT").replace(/(^|[\s'’-])([a-zà-öø-ÿ])/giu, (_m, prefix, letter) => prefix + letter.toLocaleUpperCase("it-IT"));
}

function bethagSentenceCase(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trimStart();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase("it-IT") + trimmed.slice(1);
}

function bethagSetNativeInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function bethagIsNumericField(meta: string, input: HTMLInputElement): boolean {
  if (input.type === "number") return true;
  // "Numero polizza", "numero pratica", ecc. possono essere alfanumerici:
  // rendiamo numerici solo i campi che rappresentano effettivamente valori numerici.
  return /(cap|codice postale|telefono|cellulare|numero civico|civico|quantità|quantita|importo|premio|franchigia|millesimi|percentuale|quota|progressivo|anno|giorni|ore|metri|superficie|prezzo|totale)/i.test(meta);
}

function bethagInstallGlobalFieldRules() {
  const timers = new WeakMap<HTMLInputElement, number>();

  const normalize = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const meta = bethagFieldMeta(input);
    if (!meta || input.type === "password" || input.type === "file" || input.type === "url" || input.type === "date" || input.type === "time" || input.type === "datetime-local") return;

    const numeric = input instanceof HTMLInputElement && bethagIsNumericField(meta, input);
    const isEmail = input.type === "email" || /(e-mail|email|posta elettronica)/i.test(meta);
    const isFiscalCode = /(codice fiscale|fiscal code|codicefiscale)/i.test(meta);
    const isIban = /\biban\b/i.test(meta);
    const isCap = /(cap|codice postale|postal code)/i.test(meta);
    const isSurname = /\b(cognome|surname|last name)\b/i.test(meta);
    const isFullName = /(nome e cognome|nome completo|full name)/i.test(meta);
    const isFirstName = !isFullName && /\b(nome|first name)\b/i.test(meta) && !isSurname;
    
    let value = input.value;
    if (numeric) {
      value = value.replace(/[^0-9.,-]/g, "");
      if (isCap) value = value.replace(/[^0-9]/g, "").slice(0, 5);
    } else if (isEmail) {
      value = value.toLocaleLowerCase("it-IT").trim();
    } else if (isFiscalCode) {
      value = value.replace(/\s/g, "").toLocaleUpperCase("it-IT").slice(0, 16);
    } else if (isIban) {
      value = value.replace(/\s/g, "").toLocaleUpperCase("it-IT").slice(0, 34);
    } else if (isSurname) {
      value = value.toLocaleUpperCase("it-IT");
    } else if (isFullName) {
      const words = value.trim().split(/\\s+/).filter(Boolean);
      if (words.length > 1) {
        const surname = words.pop()!.toLocaleUpperCase("it-IT");
        value = bethagTitleCase(words.join(" ")) + " " + surname;
      } else {
        value = bethagTitleCase(value);
      }
    } else if (isFirstName) {
      value = bethagTitleCase(value);
    } else {
      value = bethagSentenceCase(value);
    }

    if (isFiscalCode) input.maxLength = 16;
    if (isIban) {
      // BETHAG opera in Italia: l'IBAN italiano è composto da 27 caratteri.
      input.maxLength = 27;
      input.inputMode = "text";
    }
    if (isCap) { input.maxLength = 5; input.inputMode = "numeric"; }

    if (numeric) input.inputMode = "decimal";

    if (value !== input.value) bethagSetNativeInputValue(input, value);

    if (isCap && value.length === 5) {
      const previous = timers.get(input);
      if (previous) window.clearTimeout(previous);
      const timer = window.setTimeout(async () => {
        try {
          const response = await fetch("https://api.zippopotam.us/IT/" + encodeURIComponent(value));
          if (!response.ok) return;
          const data = await response.json();
          const place = Array.isArray(data.places) ? data.places[0] : null;
          if (!place) return;
          const scope = input.closest("form") || input.closest(".modal") || input.closest(".modal-content") || document.body;
          const fields = Array.from(scope.querySelectorAll<HTMLInputElement>("input, textarea"));
          const city = fields.find((el) => /(comune|città|citta|city)/i.test(bethagFieldMeta(el)));
          const province = fields.find((el) => /(provincia|province)/i.test(bethagFieldMeta(el)));
          if (city && place["place name"]) bethagSetNativeInputValue(city, bethagSentenceCase(String(place["place name"])));
          if (province && place["state abbreviation"]) bethagSetNativeInputValue(province, String(place["state abbreviation"]).toLocaleUpperCase("it-IT").slice(0, 2));
        } catch {
          // Il CAP resta comunque utilizzabile anche se il servizio di lookup non risponde.
        }
      }, 250);
      timers.set(input, timer);
    }
  };

  const onInput = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) normalize(target);
  };
  const onBlur = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) normalize(target);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const meta = bethagFieldMeta(target);
    if (!bethagIsNumericField(meta, target)) return;
    if (["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End","Enter","Escape","." ,",","-"].includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  };

  const onInvalid = (event: Event) => {
    // Evita i messaggi nativi del browser (che possono mostrare valori sensibili)
    // e uniforma tutti gli errori di validazione al messaggio BETHAG "ERRORE".
    event.preventDefault();
    window.alert("ERRORE");
  };

  document.addEventListener("input", onInput, true);
  document.addEventListener("blur", onBlur, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("invalid", onInvalid, true);
  return () => {
    document.removeEventListener("input", onInput, true);
    document.removeEventListener("blur", onBlur, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("invalid", onInvalid, true);
  };
}

function bethagInstallErrorDialog() {
  const nativeAlert = window.alert.bind(window);
  window.alert = (message?: unknown) => {
    const text = String(message ?? "");
    const isError = /@[^\s@]+\.[^\s@]+/i.test(text) || /\\berrore?\\b|error|impossibile|failed|invalid|non valido|not found|denied|unauthorized/i.test(text);
    if (!isError) {
      nativeAlert(text);
      return;
    }
    const existing = document.getElementById("bethag-error-dialog");
    existing?.remove();
    const overlay = document.createElement("div");
    overlay.id = "bethag-error-dialog";
    overlay.setAttribute("role", "alertdialog");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(10,18,35,.58);display:grid;place-items:center;padding:24px;";
    const card = document.createElement("div");
    card.style.cssText = "width:min(430px,100%);background:#fff;border:3px solid #b42318;border-radius:20px;padding:30px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.28);";
    card.innerHTML = '<div style="font-size:42px;line-height:1;margin-bottom:12px">⚠️</div><div style="font-size:30px;font-weight:900;letter-spacing:.08em;color:#b42318">ERRORE</div><div style="margin-top:10px;color:#667085;font-size:14px">L\'operazione non è stata completata. Controlla i dati inseriti e riprova.</div>';
    const button = document.createElement("button");
    button.textContent = "CHIUDI";
    button.style.cssText = "margin-top:22px;border:0;border-radius:12px;padding:12px 24px;background:#b42318;color:#fff;font-weight:900;cursor:pointer;";
    button.onclick = () => overlay.remove();
    overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };
    card.appendChild(button);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  };
  return () => { window.alert = nativeAlert; };
}

function App() {
  const [page, setPage] =
    useState<Page>(() => load<Page>(KEYS.page, "homepage"));

  useEffect(() => bethagInstallGlobalFieldRules(), []);
  useEffect(() => bethagInstallErrorDialog(), []);

  useEffect(() => {
    // KEYS.* viene letto tramite load(), che usa JSON.parse():
    // salviamo quindi anche la pagina come JSON per poterla ripristinare
    // correttamente dopo un refresh.
    localStorage.setItem(KEYS.page, JSON.stringify(page));
  }, [page]);

  const [sessionRole, setSessionRole] =
    useState<"admin" | "collaborator" | "resident" | null>(() =>
      supabaseConfigured ? null : load(KEYS.session, null)
    );

  const [sessionEmail, setSessionEmail] =
    useState<string>(() =>
      load(KEYS.sessionEmail, "")
    );

  const [serverCollaboratorPermissions, setServerCollaboratorPermissions] =
    useState<CollaboratorPermission[]>([]);

  const [condominiums, setCondominiums] =
    useState<Condominium[]>(
      () =>
        load(
          KEYS.condominiums,
          initialCondominiums
        )
    );

  const [deadlines, setDeadlines] =
    useState<Deadline[]>(
      () =>
        load(
          KEYS.deadlines,
          initialDeadlines
        )
    );

  const [documents, setDocuments] =
    useState<DocumentItem[]>(
      () =>
        load(
          KEYS.documents,
          initialDocuments
        )
    );

  const [assemblies, setAssemblies] =
    useState<Assembly[]>(
      () =>
        load(
          KEYS.assemblies,
          initialAssemblies
        )
    );

  const [suppliers, setSuppliers] =
    useState<Supplier[]>(
      () =>
        load(
          KEYS.suppliers,
          initialSuppliers
        )
    );

  const [activities, setActivities] =
    useState<Activity[]>(
      () =>
        load(
          KEYS.activities,
          initialActivities
        )
    );

  const [communications, setCommunications] =
    useState<Communication[]>(
      () =>
        load(
          KEYS.communications,
          initialCommunications
        )
    );

  const [condominiumUnits, setCondominiumUnits] = useState<CondominiumUnit[]>([]);
  const [selectedCondominiumUnit, setSelectedCondominiumUnit] = useState<CondominiumUnit | null>(null);
  const [condominiumUnitForm, setCondominiumUnitForm] = useState<CondominiumUnit>({
    id: "",
    condominiumId: 1,
    unitCode: "",
    unitType: "Abitazione",
    cadastralCategory: "",
    cadastralAutonomous: true,
    millesimi: "",
    incorporatedInUnitId: "",
    relationshipToResidentialUnit: "Nessuna",
    ownerMode: "condominium_member",
    ownerMemberIds: [],
    externalOwners: [],
    notes: "",
    active: true,
  });
  const [condominiumMembers, setCondominiumMembers] = useState<CondominiumMember[]>(() => load(KEYS.condominiumMembers, initialCondominiumMembers));
  const [condominiumRequests, setCondominiumRequests] = useState<CondominiumRequest[]>(() => load(KEYS.condominiumRequests, initialCondominiumRequests));
  const [registrationRequests, setRegistrationRequests] = useState<PortalRegistrationRequest[]>([]);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  const [profile, setProfile] =
    useState<AdminProfile>(() => {
      const stored = load(
        KEYS.profile,
        emptyProfile
      );

      return {
        ...emptyProfile,
        ...stored,
        workspaceId:
          stored.workspaceId ||
          makeWorkspaceId(),
      };
    });

  const [portalMembers, setPortalMembers] =
    useState<PortalMember[]>(
      () =>
        load(
          KEYS.portalMembers,
          initialPortalMembers
        )
    );

  const [collaborators, setCollaborators] =
    useState<Collaborator[]>(
      () =>
        load(
          KEYS.collaborators,
          initialCollaborators
        )
    );

  const [subscription, setSubscription] =
    useState<Subscription>(() => {
      const stored = load<Partial<Subscription>>(KEYS.subscription, initialSubscription);
      return {
        ...initialSubscription,
        ...stored,
        addons: Array.isArray(stored.addons) ? stored.addons : [],
      };
    });

  const [search, setSearch] =
    useState("");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [
    selectedCondominium,
    setSelectedCondominium,
  ] = useState<Condominium | null>(null);

  const selectedCondominiumPersistenceReady = useRef(false);

  const [
    editingCondominium,
    setEditingCondominium,
  ] = useState<Condominium | null>(
    null
  );

  // La selezione viene mantenuta al refresh, ma solo dopo che Supabase
  // ha completato l'hydration: in questo modo non viene mai renderizzata
  // una scheda costruita su dati locali incompleti o obsoleti.
  useEffect(() => {
    if (!backendHydrated.current || page !== "condomini" || selectedCondominiumPersistenceReady.current) return;

    const savedId = load<number | null>(KEYS.selectedCondominium, null);
    selectedCondominiumPersistenceReady.current = true;

    if (savedId == null) {
      return;
    }

    const restored = condominiums.find((item) => item.id === savedId);
    if (restored) {
      setSelectedCondominium(restored);
    } else {
      localStorage.removeItem(KEYS.selectedCondominium);
    }
  }, [page, condominiums, sessionRole]);

  useEffect(() => {
    if (selectedCondominium) {
      localStorage.setItem(KEYS.selectedCondominium, JSON.stringify(selectedCondominium.id));
    } else if (selectedCondominiumPersistenceReady.current) {
      localStorage.removeItem(KEYS.selectedCondominium);
    }
  }, [selectedCondominium]);


  const [selectedDeadline, setSelectedDeadline] =
    useState<Deadline | null>(null);

  const [
    selectedDocument,
    setSelectedDocument,
  ] = useState<DocumentItem | null>(
    null
  );

  const [
    selectedAssembly,
    setSelectedAssembly,
  ] = useState<Assembly | null>(null);

  const [
    selectedSupplier,
    setSelectedSupplier,
  ] = useState<Supplier | null>(null);

  const [
    selectedActivity,
    setSelectedActivity,
  ] = useState<Activity | null>(null);

  const [
    selectedCommunication,
    setSelectedCommunication,
  ] = useState<Communication | null>(null);

  const [showModal, setShowModal] =
    useState(false);

  const [modalType, setModalType] =
    useState("");

  const [
    selectedFileName,
    setSelectedFileName,
  ] = useState("");

  const [deadlineForm, setDeadlineForm] =
    useState<Deadline>(emptyDeadline);

  const [documentForm, setDocumentForm] =
    useState<DocumentItem>(emptyDocument);

  const [assemblyForm, setAssemblyForm] =
    useState<Assembly>(emptyAssembly);

  const [supplierForm, setSupplierForm] =
    useState<Supplier>(emptySupplier);

  const [activityForm, setActivityForm] =
    useState<Activity>(emptyActivity);

  const [
    communicationForm,
    setCommunicationForm,
  ] = useState<Communication>(emptyCommunication);
  const [selectedCondominiumMember, setSelectedCondominiumMember] = useState<CondominiumMember | null>(null);
  const [condominiumMemberForm, setCondominiumMemberForm] = useState<CondominiumMember>(emptyCondominiumMember);
  const [selectedCondominiumRequest, setSelectedCondominiumRequest] = useState<CondominiumRequest | null>(null);
  const [condominiumRequestForm, setCondominiumRequestForm] = useState<CondominiumRequest>(emptyCondominiumRequest);


  const handleRegisterResident = async (
    fullName: string,
    email: string,
    fiscalCode: string,
    condominiumName: string,
    password: string
  ) => {
    if (!supabaseConfigured || !supabasePublicAuth) {
      throw new Error("Il servizio di autenticazione BETHAG non è disponibile.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registration = {
      fullName: fullName.trim(),
      email: normalizedEmail,
      fiscalCode: fiscalCode.trim(),
      condominiumName: condominiumName.trim(),
    };

    sessionStorage.setItem("bethag-pending-resident-registration", JSON.stringify(registration));

    const { data, error } = await supabasePublicAuth.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: {
          full_name: fullName.trim(),
          bethag_role: "resident",
        },
      },
    });

    if (error) throw new Error(error.message || "Impossibile creare l'account condòmino.");
    if (!data.user) throw new Error("Registrazione non completata. Riprova.");

    if (data.session && supabase) {
      const { data: completion, error: completionError } = await supabase.rpc("complete_portal_registration", {
        p_full_name: registration.fullName,
        p_fiscal_code: registration.fiscalCode || null,
        p_condominium_name: registration.condominiumName || null,
      });
      if (completionError) throw completionError;
      sessionStorage.removeItem("bethag-pending-resident-registration");
      if (completion?.status === "approved") {
        alert("Registrazione completata. Il tuo account è stato collegato al condominio.");
        await handleLogin("resident", normalizedEmail, password);
      } else {
        await supabase.auth.signOut();
        alert("Account creato. Controlla la tua e-mail. Dopo la verifica, BETHAG completerà il collegamento oppure invierà la richiesta all'amministratore.");
      }
    } else {
      alert("Account creato. Controlla la tua e-mail e conferma l'indirizzo. Dopo la verifica BETHAG completerà automaticamente la procedura.");
    }
  };

  const handleRegisterAdmin = async (
    fullName: string,
    email: string,
    password: string
  ) => {
    if (!supabaseConfigured || !supabase) {
      alert("Il backend BETHAG non è configurato.");
      return;
    }

    if (!supabasePublicAuth) {
      throw new Error("Il servizio di autenticazione BETHAG non è disponibile.");
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(
        () =>
          reject(
            new Error(
              "Il servizio di registrazione non sta rispondendo. Verifica la connessione e riprova."
            )
          ),
        15000
      );
    });

    const { data, error } = await Promise.race([
      supabasePublicAuth.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      }),
      timeoutPromise,
    ]);

    if (error) {
      throw new Error(
        error.message ||
          "Impossibile creare l'account BETHAG."
      );
    }

    if (!data.user) {
      alert("Registrazione non completata. Riprova.");
      return;
    }

    if (!data.session) {
      alert(
        "Account creato. Controlla la tua e-mail e conferma l'indirizzo; dopo la conferma potrai accedere a BETHAG."
      );
      return;
    }

    try {
      await claimFirstWorkspaceAdmin();
      await handleLogin("admin", email, password);
    } catch (claimError) {
      console.error("BETHAG first-admin bootstrap failed", claimError);
      await supabase.auth.signOut();
      throw new Error(
        claimError instanceof Error
          ? claimError.message
          : "Impossibile inizializzare il workspace BETHAG."
      );
    }
  };

  const resolveSupabaseAccess = async (
    userId: string,
    email: string
  ) => {
    if (!supabase) return null;

    const membershipResult = await supabase
      .from("workspace_members")
      .select("workspace_id, role, active, permissions")
      .eq("user_id", userId)
      .eq("active", true)
      .order("workspace_id")
      .limit(1)
      .maybeSingle();

    if (membershipResult.error) throw membershipResult.error;

    if (membershipResult.data) {
      const mappedRole =
        membershipResult.data.role === "admin"
          ? "admin"
          : membershipResult.data.role === "collaborator"
            ? "collaborator"
            : "resident";

      return {
        role: mappedRole as "admin" | "collaborator" | "resident",
        workspaceId: membershipResult.data.workspace_id as string,
        permissions: Array.isArray(membershipResult.data.permissions)
          ? membershipResult.data.permissions as CollaboratorPermission[]
          : [],
      };
    }

    const portalResult = await supabase
      .from("portal_access")
      .select("workspace_id, role, active, email")
      .eq("active", true)
      .eq("role", "resident")
      .ilike("email", email.trim())
      .limit(1)
      .maybeSingle();

    if (portalResult.error) throw portalResult.error;

    if (portalResult.data) {
      return {
        role: "resident" as const,
        workspaceId: portalResult.data.workspace_id as string,
        permissions: [] as CollaboratorPermission[],
      };
    }

    return null;
  };

  const handleLogin = async (
    role: PublicRole,
    email: string,
    password: string
  ) => {
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || "Autenticazione non riuscita. Controlla e-mail e password.");
      }

      try {
        if (supabase.auth.mfa) {
          const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalError) throw aalError;
          if (aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;
            const factor = [...(factors?.totp ?? []), ...(factors?.phone ?? [])].find((item: any) => item.status === "verified");
            if (!factor) throw new Error("È richiesto il secondo fattore, ma non è disponibile un fattore verificato.");
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
            if (challengeError) throw challengeError;
            const code = window.prompt("Autenticazione a due fattori: inserisci il codice ricevuto o generato dall'app autenticatrice.");
            if (!code) { await supabase.auth.signOut({ scope: "local" }); throw new Error("Verifica a due fattori annullata."); }
            const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: code.trim() });
            if (verifyError) { await supabase.auth.signOut({ scope: "local" }); throw new Error("Codice di autenticazione a due fattori non valido."); }
          }
        }

        const access = await resolveSupabaseAccess(
          data.user.id,
          data.user.email || email
        );

        if (!access && role === "admin") {
          try {
            await claimFirstWorkspaceAdmin();
          } catch (claimError) {
            console.error("BETHAG admin bootstrap during login failed", claimError);
          }

          const bootstrappedAccess = await resolveSupabaseAccess(
            data.user.id,
            data.user.email || email
          );

          if (bootstrappedAccess) {
            if (bootstrappedAccess.role !== role) {
              await supabase.auth.signOut();
              alert("Il profilo selezionato non corrisponde al ruolo autorizzato.");
              return;
            }

            setProfile((current) => ({
              ...current,
              workspaceId: bootstrappedAccess.workspaceId,
              email: data.user.email || current.email,
              name: data.user.user_metadata?.full_name || current.name,
            }));
            setSessionRole(bootstrappedAccess.role);
            setServerCollaboratorPermissions(
              bootstrappedAccess.permissions ?? []
            );
            return;
          }
        }

        if (!access) {
          await supabase.auth.signOut();
          alert("Credenziali valide, ma nessun accesso BETHAG attivo è associato a questo account.");
          return;
        }

        if (access.role !== role) {
          await supabase.auth.signOut();
          alert("Il profilo selezionato non corrisponde al ruolo autorizzato per questo account.");
          return;
        }

        const normalizedEmail = (data.user.email || email).trim();
        setSessionRole(access.role);
        setSessionEmail(normalizedEmail);
        setServerCollaboratorPermissions(
          access.permissions ?? []
        );

        setProfile((current) => ({
          ...current,
          workspaceId: access.workspaceId,
          email: normalizedEmail || current.email,
        }));

        localStorage.setItem(KEYS.session, JSON.stringify(access.role));
        localStorage.setItem(KEYS.sessionEmail, JSON.stringify(normalizedEmail));
        setPage("homepage");
        return;
      } catch (authError) {
        console.error("BETHAG authorization lookup failed", authError);
        await supabase.auth.signOut();
        alert(
          authError instanceof Error
            ? authError.message
            : "Impossibile verificare le autorizzazioni dell'account."
        );
        return;
      }
    }

    const normalizedEmail = email.trim();
    const collaborator = collaborators.find(
      (item) =>
        item.email.trim().toLowerCase() ===
          normalizedEmail.toLowerCase() &&
        item.workspaceId === profile.workspaceId
    );

    if (
      role === "collaborator" &&
      (!collaborator || collaborator.status !== "Attivo")
    ) {
      alert(
        "Questo indirizzo non risulta ancora abilitato come Collaboratore attivo nel workspace BETHAG."
      );
      return;
    }

    if (
      role === "resident" &&
      !portalMembers.some(
        (item) =>
          item.active &&
          item.role === "resident" &&
          item.email.trim().toLowerCase() === normalizedEmail.toLowerCase()
      )
    ) {
      alert(
        "Questo indirizzo non risulta associato a un profilo condominiale attivo nel Portale BETHAG."
      );
      return;
    }

    setSessionRole(role);
    setSessionEmail(normalizedEmail);
    localStorage.setItem(KEYS.session, JSON.stringify(role));
    localStorage.setItem(KEYS.sessionEmail, JSON.stringify(normalizedEmail));
    setPage("homepage");
  };

  const resetPassword = async (email: string) => {
    if (!supabaseConfigured || !supabase) throw new Error("Il servizio di recupero password BETHAG non è disponibile.");
    const redirectTo = new URL(import.meta.env.BASE_URL || "/BETHAG/", window.location.origin).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw new Error(error.message || "Impossibile inviare il link di recupero password.");
  };

  const completePasswordRecovery = async (password: string) => {
    if (!supabase) throw new Error("Sessione BETHAG non disponibile.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message || "Impossibile aggiornare la password.");
    setPasswordRecoveryMode(false);
    await supabase.auth.signOut();
    alert("Password aggiornata correttamente. Ora puoi accedere a BETHAG con la nuova password.");
  };

  const completePasswordSetup = async (password: string) => {
    if (!supabase) throw new Error("Sessione BETHAG non disponibile.");
    const { error } = await supabase.auth.updateUser({
      password,
      data: { bethag_password_set: true },
    });
    if (error) throw new Error(error.message || "Impossibile impostare la password.");

    setRequiresPasswordSetup(false);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error("Sessione BETHAG non disponibile.");

    const access = await resolveSupabaseAccess(user.id, user.email || "");
    if (!access) {
      await supabase.auth.signOut();
      throw new Error("Account attivato, ma l'associazione al portale non è disponibile.");
    }

    setSessionRole(access.role);
    setSessionEmail(user.email || "");
    setServerCollaboratorPermissions(
      access.permissions ?? []
    );
    setProfile((current) => ({
      ...current,
      workspaceId: access.workspaceId,
      email: user.email || current.email,
      name: user.user_metadata?.full_name || current.name,
    }));
    setPage("homepage");
  };

  const logout = async () => {
    if (supabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setSessionRole(null);
    setSessionEmail("");
    setServerCollaboratorPermissions([]);
    localStorage.removeItem(KEYS.session);
    localStorage.removeItem(KEYS.sessionEmail);
    localStorage.removeItem(KEYS.page);
    setPage("homepage");
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!supabaseConfigured || !supabase || sessionRole !== "admin" || !profile.workspaceId) {
      setRegistrationRequests([]);
      return;
    }
    let cancelled = false;
    const loadRegistrationRequests = async () => {
      const { data, error } = await supabase
        .from("portal_registration_requests")
        .select("*")
        .eq("workspace_id", profile.workspaceId)
        .in("status", ["pending","email_mismatch"])
        .order("created_at", { ascending: false });
      if (!error && !cancelled) setRegistrationRequests((data || []) as PortalRegistrationRequest[]);
    };
    void loadRegistrationRequests();
  return () => { cancelled = true; };
  }, [sessionRole, profile.workspaceId]);

  const approvePortalRegistration = async (requestId: string, memberId: string) => {
    if (!supabase) return;
    const localMemberId = Number(memberId);
    const member = condominiumMembers.find((item) => item.id === localMemberId);
    if (!member) {
      alert("Profilo condòmino non trovato.");
      return;
    }
    const { data: dbMember, error: dbMemberError } = await supabase
      .from("condominium_members")
      .select("id")
      .eq("legacy_id", localMemberId)
      .maybeSingle();
    if (dbMemberError || !dbMember?.id) {
      alert("ERRORE");
      return;
    }
    const { error } = await supabase.rpc("admin_approve_portal_registration", {
      p_request_id: requestId,
      p_member_id: dbMember.id,
    });
    if (error) {
      alert("ERRORE");
      return;
    }
    setRegistrationRequests((current) => current.filter((item) => item.id !== requestId));
    try {
      const backend = await loadBackendState(profile.workspaceId);
      setCondominiumMembers(backend.condominiumMembers);
        setCondominiumUnits(Array.isArray(backend.condominiumUnits) ? backend.condominiumUnits : []);
      setPortalMembers(backend.portalMembers || []);
    } catch (refreshError) {
      console.error("BETHAG registration approval refresh failed", refreshError);
    }
    alert("Accesso condòmino autorizzato e collegato.");
  };

  /* =======================================================
     PERSISTENZA
     ======================================================= */

  /* =======================================================
     SESSIONE
     ======================================================= */

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;

    let cancelled = false;

    const applySupabaseSession = async (
      session: { user: { id: string; email?: string | null } } | null
    ) => {
      if (cancelled) return;
      if (!session?.user) {
        setSessionRole(null);
        setSessionEmail("");
        setServerCollaboratorPermissions([]);
        setRequiresPasswordSetup(false);
        setPasswordRecoveryMode(false);
        localStorage.removeItem(KEYS.session);
        localStorage.removeItem(KEYS.sessionEmail);
        localStorage.removeItem(KEYS.page);
        setPage("homepage");
        return;
      }

      try {
        const normalizedEmail = (session.user.email || "").trim();
        const invitedResident = session.user.user_metadata?.bethag_invited === true &&
          session.user.user_metadata?.bethag_password_set !== true;
        if (invitedResident) {
          setRequiresPasswordSetup(true);
          return;
        }
        const pendingRegistrationRaw = sessionStorage.getItem("bethag-pending-resident-registration");
        if (pendingRegistrationRaw && supabase) {
          try {
            const pendingRegistration = JSON.parse(pendingRegistrationRaw);
            const { data: completion, error: completionError } = await supabase.rpc("complete_portal_registration", {
              p_full_name: pendingRegistration.fullName || session.user.user_metadata?.full_name || "",
              p_fiscal_code: pendingRegistration.fiscalCode || null,
              p_condominium_name: pendingRegistration.condominiumName || null,
            });
            if (completionError) throw completionError;
            sessionStorage.removeItem("bethag-pending-resident-registration");
            if (completion?.status === "pending") {
              await supabase.auth.signOut();
              alert("Registrazione ricevuta. L'amministratore dovrà autorizzare l'accesso e collegarti al relativo profilo condominiale.");
              return;
            }
          } catch (registrationError) {
            console.error("BETHAG resident registration completion failed", registrationError);
            await supabase.auth.signOut();
            alert(registrationError instanceof Error ? registrationError.message : "Impossibile completare la registrazione condòmino.");
            return;
          }
        }
        const access = await resolveSupabaseAccess(
          session.user.id,
          normalizedEmail
        );

        if (!access || cancelled) {
          setSessionRole(null);
          setSessionEmail("");
          setServerCollaboratorPermissions([]);
          setRequiresPasswordSetup(false);
          setPasswordRecoveryMode(false);
          localStorage.removeItem(KEYS.session);
          localStorage.removeItem(KEYS.sessionEmail);
          setPage("homepage");
          return;
        }

        setSessionRole(access.role);
        setSessionEmail(normalizedEmail);
        localStorage.setItem(KEYS.session, JSON.stringify(access.role));
        localStorage.setItem(KEYS.sessionEmail, JSON.stringify(normalizedEmail));

        setProfile((current) => ({
          ...current,
          workspaceId: access.workspaceId,
          email: normalizedEmail || current.email,
        }));
        // Con una sessione già autenticata manteniamo la sezione salvata.
        // Il ritorno alla Homepage avviene esplicitamente nel flusso di login.
      } catch (error) {
        console.error("BETHAG auth session hydration failed", error);
        if (!cancelled) {
          setSessionRole(null);
          setSessionEmail("");
          localStorage.removeItem(KEYS.session);
          localStorage.removeItem(KEYS.sessionEmail);
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void applySupabaseSession(data.session);
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryMode(true);
        return;
      }
      window.setTimeout(() => {
        void applySupabaseSession(session);
      }, 0);
    });

    return () => {
      cancelled = true;
      authSubscription.unsubscribe();
    };
  }, []);

  /* =======================================================
     VALIDAZIONE SESSIONE BETHAG
     ======================================================= */

  useEffect(() => {
    if (!sessionRole || !supabaseConfigured || !supabase) return;

    let cancelled = false;

    const validateServerAuthorization = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        let authorized = false;

        if (sessionRole === "admin") {
          const { data: membership, error } = await supabase
            .from("workspace_members")
            .select("workspace_id, role, active")
            .eq("user_id", user.id)
            .eq("workspace_id", profile.workspaceId)
            .eq("role", "admin")
            .eq("active", true)
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          authorized = Boolean(membership);
        }

        if (sessionRole === "collaborator") {
          const { data: membership, error } = await supabase
            .from("workspace_members")
            .select("workspace_id, role, active, permissions")
            .eq("user_id", user.id)
            .eq("workspace_id", profile.workspaceId)
            .eq("role", "collaborator")
            .eq("active", true)
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          authorized = Boolean(membership);

          if (authorized) {
            const permissions = Array.isArray(membership?.permissions)
              ? membership.permissions.filter((permission): permission is CollaboratorPermission =>
                  Object.prototype.hasOwnProperty.call(
                    COLLABORATOR_PERMISSION_LABELS,
                    permission
                  )
                )
              : [];
            setServerCollaboratorPermissions(permissions);
          } else {
            setServerCollaboratorPermissions([]);
          }
        }

        if (passwordRecoveryMode) {
    return (
      <>
        <style>{styles}</style>
        <PasswordResetPage onComplete={completePasswordRecovery} />
      </>
    );
  }

  if (requiresPasswordSetup) {
    const restoreWorkspaceBackup = async (file: File) => {
    if (!isAdministrator) {
      alert("Il ripristino del backup è riservato all'Amministratore.");
      return;
    }
    try {
      const raw = await file.text();
      const backup = JSON.parse(raw);
      if (backup?.format !== "BETHAG_WORKSPACE_BACKUP" || backup?.version !== 1) {
        alert("File non riconosciuto: seleziona un backup BETHAG valido.");
        return;
      }
      if (!backup.workspaceId || backup.workspaceId !== profile.workspaceId) {
        alert("Il backup appartiene a un workspace diverso. Il ripristino è stato bloccato.");
        return;
      }
      const state = backup.frontendState || {};
      const counts = Object.entries(backup.backend || {}).reduce((sum: number, [, value]: any) => sum + (Array.isArray(value) ? value.length : 0), 0);
      const firstConfirm = window.confirm(
        "Backup BETHAG del " + new Date(backup.generatedAt || Date.now()).toLocaleString("it-IT") + ".\\n\\nRecord backend inclusi: " + counts + ".\\n\\nVuoi procedere con il ripristino controllato?"
      );
      if (!firstConfirm) return;
      if (!window.confirm("Conferma definitiva: i record presenti nel backup verranno aggiornati nel workspace corrente. I dati non presenti nel backup non verranno eliminati.")) return;

      const apply = <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>) => {
        if (state[key] !== undefined) setter(state[key] as T);
      };
      apply("condominiums", setCondominiums);
      apply("condominiumMembers", setCondominiumMembers);
      apply("condominiumUnits", setCondominiumUnits);
      apply("condominiumRequests", setCondominiumRequests);
      apply("deadlines", setDeadlines);
      apply("documents", setDocuments);
      apply("assemblies", setAssemblies);
      apply("suppliers", setSuppliers);
      apply("activities", setActivities);
      apply("communications", setCommunications);
      apply("portalMembers", setPortalMembers);
      apply("collaborators", setCollaborators);
      apply("subscription", setSubscription);
      if (state.profile) setProfile(state.profile as AdminProfile);

      Object.entries(state).forEach(([key, value]) => {
        const storageKey = (KEYS as Record<string,string>)[key];
        if (storageKey && value !== undefined && key !== "profile") {
          localStorage.setItem(storageKey, JSON.stringify(value));
        }
      });
      if (state.profile) localStorage.setItem(KEYS.profile, JSON.stringify(state.profile));

      // Ripristina anche lo snapshot locale incluso nel backup, mantenendo
      // escluse le chiavi di sessione/autenticazione. Questo completa il
      // ripristino delle preferenze e dello stato locale non duplicato nel
      // frontendState.
      if (backup.localStorageData && typeof backup.localStorageData === "object") {
        const excludedRestoreKeys = new Set([KEYS.session, KEYS.sessionEmail]);
        Object.entries(backup.localStorageData as Record<string, unknown>).forEach(([storageKey, value]) => {
          if (excludedRestoreKeys.has(storageKey) || value === undefined) return;
          try {
            localStorage.setItem(
              storageKey,
              typeof value === "string" ? value : JSON.stringify(value)
            );
          } catch {
            // Una singola chiave locale non deve interrompere il ripristino complessivo.
          }
        });
      }

      const restoreOrder = [
        "condominiums", "condominium_units", "condominium_members", "documents", "suppliers", "activities",
        "condominium_fiscal_years", "condominium_funds", "condominium_suppliers", "condominium_register_items",
        "condominium_budgets", "condominium_tax_obligations", "condominium_legal_cases",
        "condominium_millesimal_tables", "condominium_millesimal_values", "condominium_insurance_policies", "condominium_ledger_entries",
        "condominium_expense_allocations", "condominium_installments", "condominium_payment_movements",
        "condominium_works", "condominium_work_documents", "condominium_work_progress",
        "condominium_work_events", "condominium_audit_log", "condominium_requests",
        "deadlines", "assemblies", "communications", "portal_access",
        "workspace_members", "portal_registration_requests"
      ];
      const errors: string[] = [];
      if (supabase) {
        for (const table of restoreOrder) {
          const rows = Array.isArray(backup.backend?.[table]) ? backup.backend[table] : [];
          if (!rows.length) continue;
          const normalized = rows.map((row: any) => ({...row, workspace_id: profile.workspaceId}));
          const { error } = await supabase.from(table).upsert(normalized, { onConflict: "id" });
          if (error) errors.push(table + ": " + error.message);
        }
      }
      if (errors.length) {
        alert("Ripristino completato parzialmente. Le tabelle non ripristinate sono state segnalate: " + errors.join(" | "));
      } else {
        alert("Ripristino BETHAG completato. I dati non presenti nel backup non sono stati eliminati.");
      }
      window.location.reload();
    } catch (e: any) {
      alert("Impossibile ripristinare il backup: " + (e?.message || "file non valido"));
    }
  };

  const exportWorkspaceBackup = async () => {
    if (!isAdministrator) {
      alert("L'esportazione del backup è riservata all'Amministratore.");
      return;
    }
    const tableNames = [
      "condominiums", "condominium_members", "condominium_units", "documents", "suppliers", "activities",
      "condominium_fiscal_years", "condominium_ledger_entries", "condominium_funds", "condominium_expense_allocations",
      "condominium_installments", "condominium_payment_movements", "condominium_budgets", "condominium_tax_obligations",
      "condominium_legal_cases", "condominium_millesimal_tables", "condominium_millesimal_values", "condominium_insurance_policies",
      "condominium_register_items", "condominium_suppliers", "condominium_works", "condominium_work_documents",
      "condominium_work_progress", "condominium_work_events", "condominium_audit_log", "condominium_requests",
      "deadlines", "assemblies", "communications", "portal_access",
      "workspace_members", "portal_registration_requests"
    ];
    const backend: Record<string, unknown> = {};
    const errors: Record<string, string> = {};
    if (supabase && profile.workspaceId) {
      await Promise.all(tableNames.map(async (table) => {
        try {
          const { data, error } = await supabase.from(table).select("*").eq("workspace_id", profile.workspaceId);
          if (error) errors[table] = error.message;
          else backend[table] = data || [];
        } catch (e: any) {
          errors[table] = e?.message || "Errore di lettura";
        }
      }));
    }
    const localStorageData: Record<string, unknown> = {};
    const excludedKeys = new Set([KEYS.session, KEYS.sessionEmail]);
    Object.values(KEYS).forEach((key) => {
      if (excludedKeys.has(key)) return;
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      try { localStorageData[key] = JSON.parse(raw); } catch { localStorageData[key] = raw; }
    });
    const backup = {
      format: "BETHAG_WORKSPACE_BACKUP",
      version: 1,
      generatedAt: new Date().toISOString(),
      workspaceId: profile.workspaceId,
      administrator: { name: profile.name, company: profile.company, email: profile.email },
      frontendState: {
        condominiums, condominiumMembers, condominiumUnits, condominiumRequests, deadlines, documents,
        assemblies, suppliers, activities, communications, portalMembers, collaborators, subscription, profile
      },
      backend,
      backendReadErrors: errors,
      localStorageData,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `bethag-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (Object.keys(errors).length) {
      alert("Backup esportato. Alcune tabelle non sono state lette e sono state indicate nel campo backendReadErrors.");
    } else {
      alert("Backup BETHAG esportato correttamente.");
    }
  };

  return (
      <>
        <style>{styles}</style>
        <PasswordSetupPage onComplete={completePasswordSetup} />
      </>
    );
  }

  if (sessionRole === "resident") {
          const { data: portalAccess, error } = await supabase
            .from("portal_access")
            .select("workspace_id, role, active")
            .eq("workspace_id", profile.workspaceId)
            .eq("active", true)
            .eq("role", "resident")
            .ilike("email", user.email || "")
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          authorized = Boolean(portalAccess);
        }

        if (!authorized && !cancelled) {
          await supabase.auth.signOut();
          setSessionRole(null);
          setSessionEmail("");
          localStorage.removeItem(KEYS.session);
          localStorage.removeItem(KEYS.sessionEmail);
          setPage("homepage");
          setMobileMenuOpen(false);
        }
      } catch (error) {
        console.error("BETHAG server authorization validation failed", error);
      }
    };

    void validateServerAuthorization();

    return () => {
      cancelled = true;
    };
  }, [
    sessionRole,
    profile.workspaceId,
  ]);

  const backendHydrated = useRef(false);

  useEffect(() => {
    if (!supabaseConfigured || !supabase || !sessionRole) return;

    let cancelled = false;
    backendHydrated.current = false;

    const hydrateFromBackend = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user || cancelled) return;

        let workspaceId = profile.workspaceId;

        if (sessionRole !== "resident") {
          workspaceId = await getActiveWorkspaceId(
            session.user.id,
            profile.workspaceId
          );
        } else if (!workspaceId) {
          const { data: portalAccess, error: portalAccessError } = await supabase
            .from("portal_access")
            .select("workspace_id")
            .eq("active", true)
            .ilike("email", session.user.email || "")
            .limit(1)
            .maybeSingle();

          if (portalAccessError) throw portalAccessError;
          workspaceId = portalAccess?.workspace_id ?? null;
        }

        if (!workspaceId || cancelled) return;

        const backend = await loadBackendState(workspaceId);
        if (cancelled) return;

        setCondominiums(backend.condominiums);
        setCondominiumMembers(backend.condominiumMembers);
        setCondominiumUnits(Array.isArray(backend.condominiumUnits) ? backend.condominiumUnits : []);
        setDocuments(backend.documents);
        setDeadlines(backend.deadlines);
        setAssemblies(backend.assemblies);
        setSuppliers(backend.suppliers);
        setActivities(backend.activities);
        setCommunications(backend.communications);
        setCondominiumRequests(backend.condominiumRequests);
        setPortalMembers(
          Array.isArray(backend.portalMembers)
            ? backend.portalMembers
            : []
        );
        setCollaborators(
          Array.isArray(backend.collaborators) ? backend.collaborators : []
        );
        backendHydrated.current = true;

        setProfile((current) => ({
          ...current,
          workspaceId,
          email: session.user.email || current.email,
        }));
      } catch (error) {
        console.error("BETHAG backend hydration failed", error);
      }
    };

    void hydrateFromBackend();

    return () => {
      cancelled = true;
    };
  }, [sessionRole]);

  useEffect(() => {
    if (
      !supabaseConfigured ||
      !supabase ||
      !profile.workspaceId ||
      !backendHydrated.current ||
      (sessionRole !== "admin" && sessionRole !== "collaborator")
    ) return;

    const timer = window.setTimeout(() => {
      const allowedModules =
        sessionRole === "collaborator"
          ? serverCollaboratorPermissions
          : null;

      void syncBackendState(
        profile.workspaceId,
        {
          condominiums,
          condominiumMembers,
          documents,
          deadlines,
          assemblies,
          suppliers,
          activities,
          communications,
          condominiumRequests,
          portalMembers,
          collaborators,
        },
        allowedModules
      ).catch((error) => {
        console.error("BETHAG backend sync failed", error);
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    sessionRole,
    profile.workspaceId,
    serverCollaboratorPermissions,
    condominiums,
    condominiumMembers,
    documents,
    deadlines,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumRequests,
    portalMembers,
    collaborators,
  ]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.condominiums,
      JSON.stringify(condominiums)
    );
  }, [condominiums]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.deadlines,
      JSON.stringify(deadlines)
    );
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.documents,
      JSON.stringify(documents)
    );
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.assemblies,
      JSON.stringify(assemblies)
    );
  }, [assemblies]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.suppliers,
      JSON.stringify(suppliers)
    );
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.activities,
      JSON.stringify(activities)
    );
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.communications,
      JSON.stringify(communications)
    );
  }, [communications]);

  useEffect(() => {
    localStorage.setItem(KEYS.condominiumMembers, JSON.stringify(condominiumMembers));
  }, [condominiumMembers]);

  useEffect(() => {
    localStorage.setItem(KEYS.condominiumRequests, JSON.stringify(condominiumRequests));
  }, [condominiumRequests]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.profile,
      JSON.stringify(profile)
    );
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.portalMembers,
      JSON.stringify(portalMembers)
    );
  }, [portalMembers]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.subscription,
      JSON.stringify(subscription)
    );
  }, [subscription]);

  useEffect(() => {
    localStorage.setItem(
      KEYS.collaborators,
      JSON.stringify(collaborators)
    );
  }, [collaborators]);


  /* =======================================================
     HELPERS
     ======================================================= */

  const condominiumName = (
    id: number | null
  ) =>
    condominiums.find(
      (c) => c.id === id
    )?.name || "Tutti i condomini";

  const isAdministrator = sessionRole === "admin";
  const isCollaborator = sessionRole === "collaborator";

  const currentCollaborator = useMemo(
    () =>
      collaborators.find(
        (item) =>
          item.email.trim().toLowerCase() ===
            sessionEmail.trim().toLowerCase() &&
          item.workspaceId === profile.workspaceId &&
          item.status === "Attivo"
      ) || null,
    [collaborators, sessionEmail, profile.workspaceId]
  );

  const collaboratorPermissions =
    isCollaborator && supabaseConfigured
      ? serverCollaboratorPermissions
      : currentCollaborator?.permissions || [];

  const pageAddon: Partial<Record<Page, AddonId>> = {
    condomini: "condomini",
    contabilita: "condomini",
    documenti: "documenti",
    scadenze: "scadenze",
    assemblee: "assemblee",
    fornitori: "fornitori",
    attivita: "attivita",
    comunicazioni: "comunicazioni",
    ai: "ai",
    portale: "portale",
  };

  const pagePermission: Partial<
    Record<Page, CollaboratorPermission>
  > = {
    condomini: "condomini",
    documenti: "documenti",
    scadenze: "scadenze",
    assemblee: "assemblee",
    fornitori: "fornitori",
    attivita: "attivita",
    comunicazioni: "comunicazioni",
    ai: "ai",
    portale: "portale",
  };

  const canAccessPage = (target: Page) => {
    if (isAdministrator) {
      const addon = pageAddon[target];
      return !addon || hasEntitlement(
        subscription,
        ADDON_REQUIRED_PLAN[addon],
        addon
      );
    }

    if (isCollaborator) {
      if (
        target === "abbonamento" ||
        target === "amministratore" ||
        target === "collaboratori" ||
        target === "contabilita"
      ) {
        return false;
      }

      const requiredPermission = pagePermission[target];
      const hasRolePermission =
        !requiredPermission ||
        collaboratorPermissions.includes(requiredPermission);

      const addon = pageAddon[target];
      const hasPlanAccess =
        !addon ||
        hasEntitlement(
          subscription,
          ADDON_REQUIRED_PLAN[addon],
          addon
        );

      return hasRolePermission && hasPlanAccess;
    }

    return false;
  };

  const requireModulePermission = (
    permission: CollaboratorPermission,
    action: string
  ) => {
    if (isAdministrator) return true;

    if (
      isCollaborator &&
      collaboratorPermissions.includes(permission)
    ) {
      return true;
    }

    alert(
      action +
        " non è autorizzata per il tuo profilo o per le funzioni assegnate."
    );
    return false;
  };

  const requireAdministrator = (action: string) => {
    if (isAdministrator) return true;

    alert(action + " è riservata all'Amministratore.");
    return false;
  };

  const navigate = (target: Page) => {
    if (!canAccessPage(target)) {
      const addon = pageAddon[target];
      if (
        isAdministrator &&
        addon
      ) {
        const answer = confirm(
          ADDON_NAMES[addon] +
            " non è compreso nel tuo piano attuale. " +
            "Puoi sbloccarlo singolarmente senza passare al piano superiore.\n\nVuoi aprire Piano e upgrade?"
        );
        if (answer) {
          setPage("abbonamento");
          setSearch("");
          setMobileMenuOpen(false);
        }
      } else if (isCollaborator && addon) {
        alert(
          ADDON_NAMES[addon] +
            " non è disponibile nel piano attuale oppure non è tra le tue autorizzazioni."
        );
      } else {
        alert("Questa sezione è riservata all'Amministratore.");
      }
      return;
    }

    setPage(target);
    setSearch("");
    setMobileMenuOpen(false);
    setSelectedCondominium(null);
    localStorage.removeItem(KEYS.selectedCondominium);
    setSelectedDeadline(null);
    setSelectedDocument(null);
    setSelectedAssembly(null);
    setSelectedSupplier(null);
    setSelectedActivity(null);
    setSelectedCommunication(null);
  };

  const openModal = (type: string) => {
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType("");
    setSelectedFileName("");
  };

  const filteredCondominiums =
    useMemo(() => {
      const q = search.trim().toLowerCase();
      const activeCondominiums = condominiums.filter((item) => !item.archivedAt);
      if (!q) return activeCondominiums;
      return activeCondominiums.filter((c) =>
        [
          c.name,
          c.address,
          c.city,
          c.province,
          c.fiscalCode,
          c.contact,
          c.email,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }, [condominiums, search]);


  /* =======================================================
     GESTIONE PIANO
     ======================================================= */

  const requirePlan = (
    required: PlanId,
    feature: string,
    addon?: AddonId
  ) => {
    if (hasEntitlement(subscription, required, addon)) {
      return true;
    }

    const addonText = addon
      ? " Oppure puoi sbloccare singolarmente \"" + ADDON_NAMES[addon] + "\" (" + ADDON_PRICES[addon] + ")."
      : "";

    const answer = confirm(
      feature + " richiede " + PLAN_NAMES[required] + "." + addonText +
      "\n\nVuoi vedere piani e sblocchi singoli?"
    );

    if (answer) {
      navigate("abbonamento");
    }

    return false;
  };


  /* =======================================================
     CONDOMINI
     ======================================================= */

  const saveCondominiumUnit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireModulePermission("condomini", "La gestione delle unità immobiliari")) return;

    const data: CondominiumUnit = {
      ...condominiumUnitForm,
      unitCode: condominiumUnitForm.unitCode.trim(),
      cadastralCategory: condominiumUnitForm.cadastralCategory.trim(),
      millesimi: condominiumUnitForm.millesimi.trim(),
      notes: condominiumUnitForm.notes.trim(),
      incorporatedInUnitId: condominiumUnitForm.cadastralAutonomous ? "" : (condominiumUnitForm.incorporatedInUnitId || ""),
      relationshipToResidentialUnit: !condominiumUnitForm.cadastralAutonomous
        ? "Incorporata"
        : (condominiumUnitForm.incorporatedInUnitId ? "Pertinenza" : "Nessuna"),
      ownerMemberIds: Array.isArray(condominiumUnitForm.ownerMemberIds) ? condominiumUnitForm.ownerMemberIds : [],
      externalOwners: Array.isArray(condominiumUnitForm.externalOwners) ? condominiumUnitForm.externalOwners : [],
      ownerMode: !condominiumUnitForm.cadastralAutonomous
        ? "inherited"
        : condominiumUnitForm.ownerMode,
    };

    if (!data.unitCode) {
      alert("Inserisci il codice dell'unità.");
      return;
    }
    if (data.unitType === "Garage" && !data.cadastralCategory) data.cadastralCategory = "C/6";
    if (data.unitType === "Cantina" && !data.cadastralCategory) data.cadastralCategory = "C/2";

    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        const saved = await saveCondominiumUnitBackend(profile.workspaceId, data);
        const next: CondominiumUnit = {
          ...data,
          id: String(saved?.id || data.id || ("local-" + makeId())),
        };

        // La rinumerazione dell'unità viene applicata anche allo stato locale
        // dei condòmini collegati. Il backend aggiorna già il campo legacy
        // "apartment" dei record associati; senza questo allineamento React
        // potrebbe inviare al successivo sync il vecchio codice e ripristinarlo.
        if (!String(next.id).startsWith("local-")) {
          setCondominiumMembers((current) =>
            current.map((member) =>
              member.condominiumId === next.condominiumId &&
              (String(member.unitId ?? "") === String(next.id) ||
                (data.id && String(member.unitId ?? "") === String(data.id)))
                ? { ...member, apartment: next.unitCode }
                : member
            )
          );
        }

        setCondominiumUnits((current) => {
          // In modifica l'ID dell'unità è stabile anche quando cambia il codice.
          const existingById = current.find((unit) => String(unit.id) === String(next.id));
          if (existingById) {
            return current.map((unit) =>
              String(unit.id) === String(next.id) ? next : unit
            );
          }

          const sameCode = current.find((unit) =>
            unit.condominiumId === next.condominiumId &&
            unit.unitCode.trim().toLowerCase() === next.unitCode.trim().toLowerCase()
          );
          return sameCode
            ? current.map((unit) => unit.id === sameCode.id ? next : unit)
            : [...current, next];
        });
      } else {
        const next = { ...data, id: data.id || ("local-" + makeId()) };
        setCondominiumUnits((current) => current.some((unit) => unit.id === next.id)
          ? current.map((unit) => unit.id === next.id ? next : unit)
          : [...current, next]);
      }
    } catch (error) {
      alert(error instanceof Error ? ("Unità non salvata: " + error.message) : "Unità non salvata.");
      return;
    }

    setSelectedCondominiumUnit(null);
    closeModal();
  };

  const newCondominiumUnit = (condominiumId: number, unitType: CondominiumUnit["unitType"] = "Garage") => {
    setSelectedCondominiumUnit(null);
    setCondominiumUnitForm({
      id: "",
      condominiumId,
      unitCode: "",
      unitType,
      cadastralCategory: unitType === "Garage" ? "C/6" : unitType === "Cantina" ? "C/2" : "",
      cadastralAutonomous: true,
      millesimi: "",
      incorporatedInUnitId: "",
      relationshipToResidentialUnit: "Nessuna",
      ownerMode: "condominium_member",
      ownerMemberIds: [],
      externalOwners: [],
      notes: "",
      active: true,
    });
    openModal("condominium-unit");
  };

  const editCondominiumUnit = (unit: CondominiumUnit) => {
    setSelectedCondominiumUnit(unit);
    setCondominiumUnitForm(unit);
    openModal("condominium-unit");
  };

  const deleteCondominiumUnit = async (unit: CondominiumUnit) => {
    if (!requireModulePermission("condomini", "L'eliminazione di un'unità immobiliare")) return;

    const linkedMembers = condominiumMembers.filter(
      (member) =>
        member.condominiumId === unit.condominiumId &&
        (String(member.unitId ?? "") === String(unit.id) ||
          member.apartment.trim().toLowerCase() === unit.unitCode.trim().toLowerCase())
    );

    const linkedPertinences = condominiumUnits.filter(
      (candidate) =>
        candidate.condominiumId === unit.condominiumId &&
        candidate.id !== unit.id &&
        candidate.incorporatedInUnitId === unit.id
    );

    const warning = linkedMembers.length
      ? "L'unità è associata a uno o più condòmini."
      : linkedPertinences.length
        ? "L'unità è l'unità principale di una o più pertinenze."
        : "L'unità verrà rimossa dal patrimonio del condominio.";

    if (!confirm(`Eliminare l'unità ${unit.unitCode}?\n\n${warning} La cancellazione sarà eseguita solo se non esistono collegamenti che la rendano non eliminabile.`)) {
      return;
    }

    try {
      if (supabaseConfigured && supabase && profile.workspaceId && !String(unit.id).startsWith("local-")) {
        await deleteCondominiumUnitBackend(profile.workspaceId, unit.condominiumId, unit.id);
      } else {
        if (linkedMembers.length) throw new Error("L'unità è associata a uno o più condòmini e non può essere eliminata.");
        if (linkedPertinences.length) throw new Error("L'unità è collegata come unità principale di una o più pertinenze e non può essere eliminata.");
      }

      setCondominiumUnits((current) => current.filter((candidate) => candidate.id !== unit.id));
      setSelectedCondominiumUnit((current) => current?.id === unit.id ? null : current);
    } catch (error) {
      console.error("BETHAG condominium unit deletion failed", error);
      alert(
        error instanceof Error
          ? `Non è stato possibile eliminare l'unità: ${error.message}`
          : "Non è stato possibile eliminare l'unità. Nessun dato è stato rimosso."
      );
    }
  };

  const saveCondominium = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!requireModulePermission("condomini", "La modifica dei dati del condominio")) return;

    const isEditing =
      Boolean(editingCondominium && editingCondominium.id !== 0);

    const data =
      editingCondominium ||
      emptyCondominium;

    if (
      !data.name.trim() ||
      !data.address.trim() ||
      !data.units.trim()
    ) {
      alert(
        "Nome, indirizzo e numero di unità immobiliari sono obbligatori."
      );
      return;
    }

    const units = Number(data.units);

    if (
      !Number.isInteger(units) ||
      units <= 0
    ) {
      alert(
        "Il numero di unità immobiliari deve essere un numero intero positivo."
      );
      return;
    }

    if (!validateEmail(data.email)) {
      alert("Controlla l'indirizzo email.");
      return;
    }

    const nextCondominiums = isEditing
      ? condominiums.map((item) =>
          item.id === editingCondominium!.id
            ? { ...data, id: editingCondominium!.id }
            : item
        )
      : [
          ...condominiums,
          {
            ...data,
            id: makeId(),
          },
        ];

    const savedItem = isEditing
      ? nextCondominiums.find(
          (item) => item.id === editingCondominium!.id
        )!
      : nextCondominiums[nextCondominiums.length - 1];

    if (
      supabaseConfigured &&
      supabase &&
      (sessionRole === "admin" || sessionRole === "collaborator")
    ) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error("Sessione autenticata non disponibile. Accedi nuovamente a BETHAG.");
        }

        let workspaceId = profile.workspaceId;

        if (!workspaceId) {
          workspaceId = await getActiveWorkspaceId(
            session.user.id,
            null
          );
        }

        if (!workspaceId) {
          throw new Error("Workspace amministratore non trovato.");
        }

        await saveCondominiumBackend(workspaceId, savedItem);

        const refreshedBackend = await loadBackendState(workspaceId);
        setCondominiumUnits(
          Array.isArray(refreshedBackend.condominiumUnits)
            ? refreshedBackend.condominiumUnits
            : []
        );

        if (!profile.workspaceId) {
          setProfile((current) => ({
            ...current,
            workspaceId,
            email: session.user.email || current.email,
          }));
        }

        backendHydrated.current = true;
      } catch (error) {
        console.error("BETHAG condominium save failed", error);
        alert(
          error instanceof Error
            ? "Il condominio non è stato salvato sul server.\n\n" + error.message
            : "Il condominio non è stato salvato sul server. Riprova."
        );
        return;
      }
    }

    setCondominiums(nextCondominiums);
    setSelectedCondominium(savedItem);
    setEditingCondominium(null);
    closeModal();
  };


  const archiveCondominium = async (item: Condominium) => {
    if (!requireModulePermission("condomini", "L'archiviazione del condominio")) return;
    if (!window.confirm(`Archiviare "${item.name}"? Il condominio non sarà più mostrato nella gestione ordinaria, ma tutti i dati resteranno conservati nell'Archivio.`)) return;
    const archived = { ...item, archivedAt: new Date().toISOString() };
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await saveCondominiumBackend(profile.workspaceId, archived);
      }
      setCondominiums((current) => current.map((c) => c.id === item.id ? archived : c));
      setSelectedCondominium(null);
      localStorage.removeItem(KEYS.selectedCondominium);
    } catch (error) {
      console.error("BETHAG condominium archive failed", error);
      alert(error instanceof Error ? "Il condominio non è stato archiviato.\\n\\n" + error.message : "Il condominio non è stato archiviato.");
    }
  };

  const restoreCondominium = async (item: Condominium) => {
    if (!requireModulePermission("condomini", "Il ripristino del condominio")) return;
    if (!window.confirm(`Ripristinare "${item.name}" nella gestione ordinaria?`)) return;
    const restored = { ...item, archivedAt: undefined, archivedBy: undefined };
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await saveCondominiumBackend(profile.workspaceId, restored);
      }
      setCondominiums((current) => current.map((c) => c.id === item.id ? restored : c));
    } catch (error) {
      console.error("BETHAG condominium restore failed", error);
      alert(error instanceof Error ? "Il condominio non è stato ripristinato.\\n\\n" + error.message : "Il condominio non è stato ripristinato.");
    }
  };

  const requestPersonalSecurityCode = async (): Promise<string | undefined> => {
    if (!supabaseConfigured || !supabase || !profile.workspaceId) return undefined;
    const { data, error } = await supabase
      .from("user_security_settings")
      .select("personal_code_enabled")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();
    if (error) throw error;
    if (!data?.personal_code_enabled) return undefined;
    const code = window.prompt("Operazione ad alta sicurezza. Inserisci il tuo codice personale:");
    if (!code) throw new Error("Codice personale richiesto.");
    return code;
  };

  const deleteCondominium = async (item: Condominium) => {
    if (!requireModulePermission("condomini", "L'eliminazione del condominio")) return;

    const related =
      deadlines.filter((x) => x.condominiumId === item.id).length +
      documents.filter((x) => x.condominiumId === item.id).length +
      assemblies.filter((x) => x.condominiumId === item.id).length +
      suppliers.filter((x) => x.condominiumId === item.id).length +
      activities.filter((x) => x.condominiumId === item.id).length +
      communications.filter((x) => x.condominiumId === item.id).length +
      condominiumMembers.filter((x) => x.condominiumId === item.id).length +
      condominiumRequests.filter((x) => x.condominiumId === item.id).length +
      portalMembers.filter((x) => x.condominiumId === item.id).length;

    const message = related > 0
      ? `Sei sicuro di voler cancellare "${item.name}"? Il condominio ha ${related} elementi collegati e verranno rimossi anche i relativi collegamenti.`
      : `Sei sicuro di voler cancellare "${item.name}"?`;

    if (!window.confirm(message)) return;

    let securityCode: string | undefined;
    try {
      securityCode = await requestPersonalSecurityCode();
    } catch (securityError) {
      alert(securityError instanceof Error ? securityError.message : "Verifica di sicurezza non completata.");
      return;
    }

    if (supabaseConfigured && supabase && (sessionRole === "admin" || sessionRole === "collaborator")) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Sessione autenticata non disponibile. Accedi nuovamente a BETHAG.");

        const workspaceId = profile.workspaceId || await getActiveWorkspaceId(session.user.id, null);
        if (!workspaceId) throw new Error("Workspace amministratore non trovato.");

        await deleteCondominiumBackend(workspaceId, item.id, securityCode);
      } catch (error) {
        console.error("BETHAG condominium deletion failed", error);
        alert(error instanceof Error ? "Il condominio non è stato cancellato dal server.\n\n" + error.message : "Il condominio non è stato cancellato dal server. Riprova.");
        return;
      }
    }

    setCondominiums((current) => current.filter((c) => c.id !== item.id));
    setDeadlines((current) => current.filter((x) => x.condominiumId !== item.id));
    setDocuments((current) => current.filter((x) => x.condominiumId !== item.id));
    setAssemblies((current) => current.filter((x) => x.condominiumId !== item.id));
    setSuppliers((current) => current.filter((x) => x.condominiumId !== item.id));
    setActivities((current) => current.filter((x) => x.condominiumId !== item.id));
    setCommunications((current) => current.filter((x) => x.condominiumId !== item.id));
    setPortalMembers((current) => current.filter((x) => x.condominiumId !== item.id));
    setCondominiumMembers((current) => current.filter((member) => member.condominiumId !== item.id));
    setCondominiumRequests((current) => current.filter((request) => request.condominiumId !== item.id));
    setSelectedCondominium(null);
    localStorage.removeItem(KEYS.selectedCondominium);
  };


  /* =======================================================
     SCADENZE
     ======================================================= */

  const saveDeadline = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (!requireModulePermission("scadenze", "La gestione delle scadenze")) return;
    event.preventDefault();

    if (
      !deadlineForm.title.trim() ||
      !deadlineForm.dueDate
    ) {
      alert("Inserisci titolo e data.");
      return;
    }

    if (!deadlineForm.condominiumId) {
      alert("Seleziona un condominio.");
      return;
    }

    if (selectedDeadline) {
      setDeadlines((current) =>
        current.map((item) =>
          item.id === selectedDeadline.id
            ? {
                ...deadlineForm,
                id: selectedDeadline.id,
              }
            : item
        )
      );
    } else {
      setDeadlines((current) => [
        ...current,
        {
          ...deadlineForm,
          id: makeId(),
        },
      ]);
    }

    setDeadlineForm({
      ...emptyDeadline,
      condominiumId:
        condominiums[0]?.id || 0,
    });

    setSelectedDeadline(null);
    closeModal();
  };

  const editDeadline = (
    item: Deadline
  ) => {
    if (!requireModulePermission("scadenze", "La modifica di una scadenza")) return;
    setSelectedDeadline(item);
    setDeadlineForm(item);
    openModal("deadline");
  };

  const deleteDeadline = async (id: number) => {
    if (!requireModulePermission("scadenze", "L'eliminazione della scadenza")) return;
    if (!confirm("Eliminare questa scadenza?")) return;
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteWorkspaceRecordBackend(profile.workspaceId, "deadlines", id);
      }
      setDeadlines((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("BETHAG deadline deletion failed", error);
      alert(error instanceof Error ? "La scadenza non è stata eliminata dal server.\n\n" + error.message : "La scadenza non è stata eliminata dal server.");
    }
  };

  const updateDeadlineStatus = (
    id: number,
    status: DeadlineStatus
  ) => {
    if (!requireModulePermission("scadenze", "L'aggiornamento delle scadenze")) return;
    setDeadlines((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  };


  /* =======================================================
     DOCUMENTI
     ======================================================= */

  const saveDocument = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (!requireModulePermission("documenti", "La gestione dei documenti")) return;
    event.preventDefault();

    if (!documentForm.name.trim()) {
      alert(
        "Inserisci il nome del documento."
      );
      return;
    }

    if (!documentForm.condominiumId) {
      alert("Seleziona un condominio.");
      return;
    }

    if (
      selectedDocument &&
      selectedDocument.publication === "Condiviso" &&
      !isAdministrator
    ) {
      alert("La modifica di un documento già condiviso nel Portale è riservata all'Amministratore.");
      return;
    }

    const documentData = {
      ...documentForm,
      name: documentForm.name.trim(),
      size: selectedFileName
        ? documentForm.size ||
          "File locale"
        : documentForm.size,
    };

    if (selectedDocument) {
      setDocuments((current) =>
        current.map((item) =>
          item.id === selectedDocument.id
            ? {
                ...documentData,
                id: selectedDocument.id,
              }
            : item
        )
      );
    } else {
      setDocuments((current) => [
        {
          ...documentData,
          id: makeId(),
        },
        ...current,
      ]);
    }

    setDocumentForm({
      ...emptyDocument,
      condominiumId:
        condominiums[0]?.id || 0,
    });

    setSelectedDocument(null);
    setSelectedFileName("");
    closeModal();
  };

  const editDocument = (
    item: DocumentItem
  ) => {
    if (!requireModulePermission("documenti", "La modifica di un documento")) return;
    setSelectedDocument(item);
    setDocumentForm(item);
    setSelectedFileName("");
    openModal("document");
  };

  const deleteDocument = async (id: number) => {
    if (!requireModulePermission("documenti", "L'eliminazione del documento")) return;
    if (!confirm("Eliminare questo documento?")) return;
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteWorkspaceRecordBackend(profile.workspaceId, "documents", id);
      }
      setDocuments((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("BETHAG document deletion failed", error);
      alert(error instanceof Error ? "Il documento non è stato eliminato dal server.\n\n" + error.message : "Il documento non è stato eliminato dal server.");
    }
  };

  const toggleDocumentPublication = (
    id: number
  ) => {
    if (!isAdministrator) {
      alert("La condivisione dei documenti è riservata all'Amministratore.");
      return;
    }
    if (
      !requirePlan(
        "portal",
        "La condivisione con i condomini",
        "portale"
      )
    )
      return;

    setDocuments((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              publication:
                item.publication ===
                "Condiviso"
                  ? "Privato"
                  : "Condiviso",
            }
          : item
      )
    );
  };

  const processDocumentAI = (
    item: DocumentItem
  ) => {
    if (
      !requirePlan(
        "plus",
        "L'elaborazione automatica AI dei documenti",
        "ai"
      )
    )
      return;

    setDocuments((current) =>
      current.map((doc) =>
        doc.id === item.id
          ? {
              ...doc,
              aiStatus:
                "In elaborazione",
            }
          : doc
      )
    );

    setTimeout(() => {
      setDocuments((current) =>
        current.map((doc) =>
          doc.id === item.id
            ? {
                ...doc,
                aiStatus:
                  "Da verificare",
                aiSummary:
                  "Analisi automatica predisposta. Il contenuto dovrà essere verificato dall'amministratore prima della conferma.",
                extractedData:
                  "Dati strutturati predisposti per la successiva integrazione con il servizio AI.",
              }
            : doc
        )
      );
    }, 1200);
  };

  const confirmDocumentAI = (
    id: number
  ) => {
    if (!isAdministrator) {
      alert("La conferma dell'analisi AI è riservata all'Amministratore.");
      return;
    }
    setDocuments((current) =>
      current.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              aiStatus: "Confermato",
            }
          : doc
      )
    );
  };


  /* =======================================================
     ASSEMBLEE
     ======================================================= */

  const saveAssembly = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (!requireModulePermission("assemblee", "La gestione delle assemblee")) return;
    event.preventDefault();

    if (
      !assemblyForm.title.trim() ||
      !assemblyForm.date
    ) {
      alert(
        "Inserisci titolo e data."
      );
      return;
    }

    if (!assemblyForm.condominiumId) {
      alert("Seleziona un condominio.");
      return;
    }

    if (
      selectedAssembly &&
      selectedAssembly.publishedToPortal &&
      !isAdministrator
    ) {
      alert("La modifica di un'assemblea pubblicata nel Portale è riservata all'Amministratore.");
      return;
    }

    if (selectedAssembly) {
      setAssemblies((current) =>
        current.map((item) =>
          item.id === selectedAssembly.id
            ? {
                ...assemblyForm,
                id: selectedAssembly.id,
              }
            : item
        )
      );
    } else {
      setAssemblies((current) => [
        ...current,
        {
          ...assemblyForm,
          id: makeId(),
        },
      ]);
    }

    setAssemblyForm({
      ...emptyAssembly,
      condominiumId:
        condominiums[0]?.id || 0,
    });

    setSelectedAssembly(null);
    closeModal();
  };

  const editAssembly = (
    item: Assembly
  ) => {
    if (!requireModulePermission("assemblee", "La modifica di un'assemblea")) return;
    setSelectedAssembly(item);
    setAssemblyForm(item);
    openModal("assembly");
  };

  const deleteAssembly = async (id: number) => {
    if (!requireModulePermission("assemblee", "L'eliminazione dell'assemblea")) return;
    if (!confirm("Eliminare questa assemblea?")) return;
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteWorkspaceRecordBackend(profile.workspaceId, "assemblies", id);
      }
      setAssemblies((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("BETHAG assembly deletion failed", error);
      alert(error instanceof Error ? "L'assemblea non è stata eliminata dal server.\n\n" + error.message : "L'assemblea non è stata eliminata dal server.");
    }
  };

  const updateAssemblyStatus = (
    id: number,
    status: AssemblyStatus
  ) => {
    if (!requireModulePermission("assemblee", "L'aggiornamento delle assemblee")) return;
    setAssemblies((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  };

  const attachAssemblyAudio = (
    assembly: Assembly,
    file: File
  ) => {
    if (!isAdministrator) {
      alert("L'acquisizione dell'audio è riservata all'Amministratore.");
      return;
    }
    if (
      !requirePlan(
        "professional",
        "La gestione dell'audio delle assemblee",
        "assemblee"
      )
    )
      return;

    setAssemblies((current) =>
      current.map((item) =>
        item.id === assembly.id
          ? {
              ...item,
              audioName: file.name,
              transcriptionStatus:
                "In elaborazione",
              minutesStatus:
                "Non elaborato",
            }
          : item
      )
    );

    setTimeout(() => {
      setAssemblies((current) =>
        current.map((item) =>
          item.id === assembly.id
            ? {
                ...item,
                transcriptionStatus:
                  "Da verificare",
              }
            : item
        )
      );
    }, 1300);
  };

  const generateMinutes = (
    assembly: Assembly
  ) => {
    if (!isAdministrator) {
      alert("La generazione dei verbali è riservata all'Amministratore.");
      return;
    }
    if (
      !requirePlan(
        "professional",
        "La generazione automatica dei verbali",
        "assemblee"
      )
    )
      return;

    if (
      assembly.transcriptionStatus ===
      "Non elaborato"
    ) {
      alert(
        "Prima devi acquisire e trascrivere l'audio dell'assemblea."
      );
      return;
    }

    setAssemblies((current) =>
      current.map((item) =>
        item.id === assembly.id
          ? {
              ...item,
              minutesStatus:
                "In elaborazione",
            }
          : item
      )
    );

    setTimeout(() => {
      setAssemblies((current) =>
        current.map((item) =>
          item.id === assembly.id
            ? {
                ...item,
                minutesStatus:
                  "Da verificare",
                minutesDraft:
                  `BOZZA DI VERBALE\n\n${item.title}\nData: ${formatDate(
                    item.date
                  )}\nOra: ${
                    item.time ||
                    "da definire"
                  }\nLuogo: ${
                    item.place ||
                    "da definire"
                  }\n\nLa presente bozza è stata predisposta a partire dalla trascrizione dell'audio. Deve essere verificata e approvata dall'amministratore prima della pubblicazione.`,
              }
            : item
        )
      );
    }, 1300);
  };

  const confirmMinutes = (
    id: number
  ) => {
    if (!isAdministrator) {
      alert("La conferma del verbale è riservata all'Amministratore.");
      return;
    }
    setAssemblies((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              minutesStatus:
                "Confermato",
            }
          : item
      )
    );
  };

  const toggleAssemblyPublication = (
    id: number
  ) => {
    if (!isAdministrator) {
      alert("La pubblicazione dei verbali è riservata all'Amministratore.");
      return;
    }
    if (
      !requirePlan(
        "portal",
        "La pubblicazione dei verbali nel portale",
        "portale"
      )
    )
      return;

    setAssemblies((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              publishedToPortal:
                !item.publishedToPortal,
            }
          : item
      )
    );
  };


  /* =======================================================
     FORNITORI
     ======================================================= */

  const saveSupplier = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (!requireModulePermission("fornitori", "La gestione dei fornitori")) return;
    event.preventDefault();

    if (
      !supplierForm.name.trim() ||
      !supplierForm.service.trim()
    ) {
      alert(
        "Inserisci fornitore e servizio."
      );
      return;
    }

    if (!validateEmail(supplierForm.email)) {
      alert("Controlla l'indirizzo email.");
      return;
    }

    const normalizedSupplier = {
      ...supplierForm,
      name: supplierForm.name.trim(),
      service: supplierForm.service.trim(),
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      notes: supplierForm.notes.trim(),
    };

    if (selectedSupplier) {
      setSuppliers((current) =>
        current.map((item) =>
          item.id === selectedSupplier.id
            ? {
                ...normalizedSupplier,
                id: selectedSupplier.id,
              }
            : item
        )
      );
    } else {
      setSuppliers((current) => [
        ...current,
        {
          ...normalizedSupplier,
          id: makeId(),
        },
      ]);
    }

    setSupplierForm(emptySupplier);
    setSelectedSupplier(null);
    closeModal();
  };

  const editSupplier = (
    item: Supplier
  ) => {
    if (!requireModulePermission("fornitori", "La modifica di un fornitore")) return;
    setSelectedSupplier(item);
    setSupplierForm(item);
    openModal("supplier");
  };

  const deleteSupplier = async (id: number) => {
    if (!requireModulePermission("fornitori", "L'eliminazione del fornitore")) return;
    if (!confirm("Eliminare questo fornitore?")) return;
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteWorkspaceRecordBackend(profile.workspaceId, "suppliers", id);
      }
      setSuppliers((current) => current.filter((item) => item.id !== id));
      setCondominiumRequests((current) =>
        current.map((request) => request.supplierId === id ? { ...request, supplierId: null } : request)
      );
    } catch (error) {
      console.error("BETHAG supplier deletion failed", error);
      alert(error instanceof Error ? "Il fornitore non è stato eliminato dal server.\n\n" + error.message : "Il fornitore non è stato eliminato dal server.");
    }
  };

  const saveActivity = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (!requireModulePermission("attivita", "La gestione delle attività")) return;
    event.preventDefault();

    if (!activityForm.title.trim()) {
      alert(
        "Inserisci il titolo dell'attività."
      );
      return;
    }

    const normalizedActivity = {
      ...activityForm,
      title: activityForm.title.trim(),
      notes: activityForm.notes.trim(),
    };

    if (selectedActivity) {
      setActivities((current) =>
        current.map((item) =>
          item.id === selectedActivity.id
            ? {
                ...normalizedActivity,
                id: selectedActivity.id,
              }
            : item
        )
      );
    } else {
      setActivities((current) => [
        ...current,
        {
          ...normalizedActivity,
          id: makeId(),
        },
      ]);
    }

    setActivityForm(emptyActivity);
    setSelectedActivity(null);
    closeModal();
  };

  const editActivity = (
    item: Activity
  ) => {
    if (!requireModulePermission("attivita", "La modifica di un'attività")) return;
    setSelectedActivity(item);
    setActivityForm(item);
    openModal("activity");
  };

  const deleteActivity = async (id: number) => {
    if (!requireModulePermission("attivita", "L'eliminazione dell'attività")) return;
    if (!confirm("Eliminare questa attività?")) return;
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteWorkspaceRecordBackend(profile.workspaceId, "activities", id);
      }
      setActivities((current) => current.filter((item) => item.id !== id));
      setCondominiumRequests((current) =>
        current.map((request) => request.activityId === id ? { ...request, activityId: null } : request)
      );
    } catch (error) {
      console.error("BETHAG activity deletion failed", error);
      alert(error instanceof Error ? "L'attività non è stata eliminata dal server.\n\n" + error.message : "L'attività non è stata eliminata dal server.");
    }
  };

  const updateActivityStatus = (
    id: number,
    status: ActivityStatus
  ) => {
    if (!requireModulePermission("attivita", "L'aggiornamento delle attività")) return;
    setActivities((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  };


  /* =======================================================
     CONDOMINI - ANAGRAFICA E RICHIESTE
     ======================================================= */

  const saveCondominiumMember = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!requireModulePermission("condomini", "La gestione dell'anagrafica dei condòmini")) return;
    event.preventDefault();
    if (!condominiumMemberForm.firstName.trim() || !condominiumMemberForm.lastName.trim() || !condominiumMemberForm.apartment.trim()) {
      alert("Inserisci nome, cognome e interno/appartamento del condòmino.");
      return;
    }
    if (!validateEmail(condominiumMemberForm.email)) {
      alert("Controlla l'indirizzo email del condòmino.");
      return;
    }

    const normalizedEmail = condominiumMemberForm.email.trim().toLowerCase();
    const duplicate = Boolean(normalizedEmail) && condominiumMembers.some((member) =>
      member.condominiumId === condominiumMemberForm.condominiumId &&
      member.id !== selectedCondominiumMember?.id &&
      member.email.trim().toLowerCase() === normalizedEmail
    );

    if (duplicate) {
      alert("Esiste già un condòmino con questo indirizzo e-mail nello stesso condominio.");
      return;
    }

    const { millesimi: _legacyMillesimi, ...memberFormData } = condominiumMemberForm as CondominiumMember & { millesimi?: string };
    const data = {
      ...memberFormData,
      firstName: condominiumMemberForm.firstName.trim(),
      lastName: condominiumMemberForm.lastName.trim(),
      apartment: condominiumMemberForm.apartment.trim(),
      email: condominiumMemberForm.email.trim(),
    };

    if (selectedCondominiumMember) {
      const previousMember = selectedCondominiumMember;
      let persistedData = { ...data };

      if (supabaseConfigured && supabase && profile.workspaceId) {
        try {
          const saved = await saveCondominiumMemberBackend(profile.workspaceId, data);
          persistedData = {
            ...data,
            unitId: saved?.unit_id ?? data.unitId ?? "",
          };
        } catch (syncError) {
          console.error("BETHAG condominium member update sync failed", syncError);
          alert(
            syncError instanceof Error
              ? `Condòmino modificato localmente, ma il salvataggio sul server non è riuscito: ${syncError.message}`
              : "Condòmino modificato localmente, ma il salvataggio sul server non è riuscito."
          );
          return;
        }
      }

      setCondominiumMembers(
        condominiumMembers.map((member) =>
          member.id === previousMember.id
            ? { ...persistedData, id: previousMember.id }
            : member
        )
      );

      setPortalMembers((current) => {
        const previousEmail = previousMember.email.trim().toLowerCase();
        const previousUserId = previousMember.userId ?? "";

        const matchesPortalMember = (portalMember: PortalMember) =>
          portalMember.condominiumId === previousMember.condominiumId &&
          (previousUserId
            ? portalMember.userId === previousUserId
            : portalMember.email.trim().toLowerCase() === previousEmail &&
              portalMember.name.trim().toLowerCase() ===
                `${previousMember.firstName} ${previousMember.lastName}`.trim().toLowerCase() &&
              portalMember.apartment.trim().toLowerCase() === previousMember.apartment.trim().toLowerCase());

        if (!persistedData.active) {
          return current.filter((portalMember) => !matchesPortalMember(portalMember));
        }

        return current.map((portalMember) =>
          matchesPortalMember(portalMember)
            ? {
                ...portalMember,
                userId: persistedData.userId ?? portalMember.userId,
                name: `${persistedData.firstName} ${persistedData.lastName}`.trim(),
                email: persistedData.email,
                condominiumId: persistedData.condominiumId,
                apartment: persistedData.apartment,
              }
            : portalMember
        );
      });
    } else {
      let newMember = { ...data, id: makeId() };

      if (supabaseConfigured && supabase && profile.workspaceId) {
        try {
          // L'anagrafica deve essere persistita anche senza e-mail.
          // L'e-mail serve esclusivamente per l'eventuale invito al Portale.
          const saved = await saveCondominiumMemberBackend(profile.workspaceId, newMember);
          newMember = {
            ...newMember,
            unitId: saved?.unit_id ?? newMember.unitId ?? "",
          };

          if (!newMember.email.trim()) {
            // Nessun invito possibile senza e-mail, ma il condòmino è già
            // stato salvato correttamente nel database.
          } else {
          const { data: inviteResult, error: inviteError } = await supabase.functions.invoke("bethag-invite-resident", {
            body: {
              workspaceId: profile.workspaceId,
              condominiumId: newMember.condominiumId,
              legacyId: newMember.id,
            },
          });

          if (inviteError) {
            // Supabase restituisce una FunctionsHttpError per le risposte 4xx/5xx.
            // Leggiamo il payload della Edge Function per mostrare all'utente
            // la causa reale invece del generico "non-2xx status code".
            let detail = inviteError.message || "Invito/collegamento non riuscito.";

            try {
              const errorContext = (inviteError as any).context;
              if (errorContext?.json) {
                const payload = await errorContext.json();
                if (payload?.error) {
                  detail = String(payload.error);
                }
                if (payload?.code === "email_address_invalid") {
                  detail = "L'indirizzo e-mail non è accettato da Supabase Auth. Verifica l'indirizzo e utilizzane uno valido.";
                }
              }
            } catch {
              // Manteniamo il messaggio già disponibile se il payload non è leggibile.
            }

            throw new Error(detail);
          }

          // L'invito residente crea/aggiorna anche portal_access sul backend.
          // Allineiamo subito lo stato locale al record appena creato, così il
          // successivo sync debounced non lo considera "stale" e non lo rimuove.
          if (inviteResult?.portalAccess) {
            setPortalMembers((current) => {
              const existing = current.find(
                (portalMember) =>
                  portalMember.condominiumId === newMember.condominiumId &&
                  portalMember.email.trim().toLowerCase() === newMember.email.trim().toLowerCase()
              );

              const nextPortalMember: PortalMember = {
                id: existing?.id ?? newMember.id,
                userId: inviteResult.userId ?? existing?.userId,
                name: `${newMember.firstName} ${newMember.lastName}`.trim(),
                email: newMember.email,
                condominiumId: newMember.condominiumId,
                role: "resident",
                apartment: newMember.apartment,
                permissions: [
                  "documenti",
                  "verbali",
                  "regolamento",
                  "pagamenti_ordinari",
                  "pagamenti_straordinari",
                  "assemblee",
                  "comunicazioni",
                ],
                active: true,
              };

              return existing
                ? current.map((portalMember) =>
                    portalMember.id === existing.id ? nextPortalMember : portalMember
                  )
                : [...current, nextPortalMember];
            });
          }

          if (inviteResult?.invited) {
            alert("Condòmino inserito. È stata inviata automaticamente una e-mail per attivare l'accesso al Portale BETHAG.");
          } else {
            alert("Condòmino inserito. L'account BETHAG esistente è stato collegato al relativo profilo.");
          }
          }
        } catch (inviteError) {
          console.error("BETHAG resident invitation failed", inviteError);
          alert(
            inviteError instanceof Error
              ? `Condòmino inserito, ma l'invio/collegamento dell'accesso non è riuscito: ${inviteError.message}`
              : "Condòmino inserito, ma l'invio/collegamento dell'accesso non è riuscito."
          );
        }
      }
      setCondominiumMembers([...condominiumMembers, newMember]);
    }

    setCondominiumMemberForm({
      ...emptyCondominiumMember,
      condominiumId: condominiumMemberForm.condominiumId,
    });
    setSelectedCondominiumMember(null);
    closeModal();
  };

  const editCondominiumMember = (member: CondominiumMember) => {
    setSelectedCondominiumMember(member);
    setCondominiumMemberForm(member);
    openModal("condominium-member");
  };

  const deleteCondominiumMember = async (id: number) => {
    if (!requireModulePermission("condomini", "L'eliminazione del condòmino")) return;

    const member = condominiumMembers.find((item) => item.id === id);
    if (!member) return;

    const linkedPortalAccess = portalMembers.some(
      (portalMember) =>
        portalMember.condominiumId === member.condominiumId &&
        (member.userId
          ? portalMember.userId === member.userId
          : portalMember.email.trim().toLowerCase() === member.email.trim().toLowerCase() &&
            portalMember.name.trim().toLowerCase() ===
              `${member.firstName} ${member.lastName}`.trim().toLowerCase() &&
            portalMember.apartment.trim().toLowerCase() === member.apartment.trim().toLowerCase())
    );

    const confirmationMessage = linkedPortalAccess
      ? "Eliminare questo condòmino dall'anagrafica? L'eventuale accesso attivo al Portale associato verrà revocato."
      : "Eliminare questo condòmino dall'anagrafica?";

    if (!confirm(confirmationMessage)) return;

    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteCondominiumMemberBackend(
          profile.workspaceId,
          member.condominiumId,
          member.id
        );
      }

      setCondominiumMembers((current) =>
        current.filter((item) => item.id !== id)
      );

      if (linkedPortalAccess) {
        setPortalMembers((current) =>
          current.filter((portalMember) => {
            const samePerson = member.userId
              ? portalMember.userId === member.userId
              : portalMember.condominiumId === member.condominiumId &&
                portalMember.email.trim().toLowerCase() === member.email.trim().toLowerCase() &&
                portalMember.name.trim().toLowerCase() ===
                  `${member.firstName} ${member.lastName}`.trim().toLowerCase() &&
                portalMember.apartment.trim().toLowerCase() === member.apartment.trim().toLowerCase();
            return !samePerson;
          })
        );
      }
    } catch (error) {
      console.error("BETHAG condominium member deletion failed", error);
      alert(
        error instanceof Error
          ? `Non è stato possibile eliminare il condòmino: ${error.message}`
          : "Non è stato possibile eliminare il condòmino. Nessun dato è stato rimosso."
      );
    }
  };

  const saveCondominiumRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // I condòmini autenticati possono inviare le proprie richieste dal portale.
    // Per amministratori e collaboratori, invece, la gestione resta soggetta
    // al permesso del modulo "condomini".
    if (!sessionRole || sessionRole !== "resident") {
      if (!requireModulePermission("condomini", "La gestione delle segnalazioni o richieste")) return;
    }

    let currentAuthUserId = "";
    if (!isAdministrator && supabaseConfigured && supabase) {
      const { data: authState } = await supabase.auth.getUser();
      currentAuthUserId = authState.user?.id ?? "";
    }

    const portalMember = !isAdministrator
      ? portalMembers.find((member) =>
          member.active &&
          (currentAuthUserId
            ? member.userId === currentAuthUserId
            : member.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase())
        )
      : null;

    const portalCondominiumMember = portalMember
      ? condominiumMembers.find(
          (member) =>
            member.active &&
            member.condominiumId === portalMember.condominiumId &&
            (portalMember.userId && member.userId
              ? member.userId === portalMember.userId
              : member.email.trim().toLowerCase() === portalMember.email.trim().toLowerCase() &&
                member.firstName.trim().toLowerCase() ===
                  portalMember.name.trim().split(/\s+/)[0]?.toLowerCase() &&
                member.apartment.trim().toLowerCase() ===
                  portalMember.apartment.trim().toLowerCase())
        )
      : null;
    if (!isAdministrator && (!portalMember || !portalMember.condominiumId)) {
      alert("Il profilo del portale non è associato a un condominio attivo.");
      return;
    }
    if (!isAdministrator && !portalCondominiumMember) {
      alert("Il profilo del Portale non è associato a un condòmino attivo nell'anagrafica.");
      return;
    }
    if (selectedCondominiumRequest) {
      if (!isAdministrator) {
        alert("La modifica di una richiesta ricevuta è riservata all'Amministratore.");
        return;
      }
    }
    const requestForm = !isAdministrator
      ? {
          ...condominiumRequestForm,
          condominiumId: portalMember!.condominiumId,
          memberId: portalCondominiumMember?.id ?? null,
        }
      : condominiumRequestForm;

    if (!requestForm.condominiumId) { alert("Seleziona il condominio della segnalazione o richiesta."); return; }
    if (!requestForm.description.trim()) { alert("Inserisci la descrizione della segnalazione o richiesta."); return; }
    if (requestForm.memberId) {
      const member = condominiumMembers.find(
        (item) => item.id === requestForm.memberId
      );
      if (!member || member.condominiumId !== requestForm.condominiumId) {
        alert("Il condòmino indicato non appartiene al condominio selezionato.");
        return;
      }
    }
    const data = {
      ...requestForm,
      description: requestForm.description.trim(),
      response: requestForm.response.trim(),
    };
    const requestId = selectedCondominiumRequest?.id ?? makeId();
    const savedRequest = { ...data, id: requestId };

    setCondominiumRequests((current) =>
      selectedCondominiumRequest
        ? current.map((request) => request.id === requestId ? savedRequest : request)
        : [savedRequest, ...current]
    );

    if (supabaseConfigured && supabase) {
      try {
        const condominium = condominiums.find((item) => item.id === savedRequest.condominiumId);
        if (!condominium) throw new Error("Condominio non disponibile.");

        const { data: condominiumRow, error: condominiumError } = await supabase
          .from("condominiums")
          .select("id")
          .eq("workspace_id", profile.workspaceId)
          .eq("legacy_id", savedRequest.condominiumId)
          .maybeSingle();
        if (condominiumError) throw condominiumError;
        if (!condominiumRow) throw new Error("Condominio non disponibile nel workspace.");

        const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
        if (authUserError) throw authUserError;
        if (!authUserData.user) throw new Error("Sessione utente non disponibile.");

        let memberDbId: string | null = null;
        if (savedRequest.memberId) {
          const { data: memberRow, error: memberError } = await supabase
            .from("condominium_members")
            .select("id, user_id")
            .eq("condominium_id", condominiumRow.id)
            .eq("legacy_id", savedRequest.memberId)
            .maybeSingle();
          if (memberError) throw memberError;
          memberDbId = memberRow?.id ?? null;
        }

        const requesterUserId =
          selectedCondominiumRequest?.requesterUserId ??
          (savedRequest.requesterUserId || authUserData.user.id);

        const payload = {
          workspace_id: profile.workspaceId,
          legacy_id: savedRequest.id,
          condominium_id: condominiumRow.id,
          member_id: memberDbId,
          requester_user_id: requesterUserId,
          title: savedRequest.category,
          description: savedRequest.description,
          status: savedRequest.status,
          data: { ...savedRequest, requesterUserId },
          updated_at: new Date().toISOString(),
        };

        const { error: requestError } = await supabase
          .from("condominium_requests")
          .upsert(payload, { onConflict: "workspace_id,legacy_id" });
        if (requestError) throw requestError;
      } catch (error) {
        console.error("BETHAG request persistence failed", error);
        setCondominiumRequests((current) =>
          selectedCondominiumRequest
            ? current.map((request) => request.id === requestId ? selectedCondominiumRequest : request)
            : current.filter((request) => request.id !== requestId)
        );
        alert(
          error instanceof Error
            ? `Impossibile salvare la richiesta: ${error.message}`
            : "Impossibile salvare la richiesta."
        );
        return;
      }
    }

    setCondominiumRequestForm({ ...emptyCondominiumRequest, condominiumId: requestForm.condominiumId });
    setSelectedCondominiumRequest(null);
    closeModal();
  };

  const editCondominiumRequest = (request: CondominiumRequest) => {
    if (!requireModulePermission("condomini", "La modifica di una segnalazione o richiesta")) return;
    setSelectedCondominiumRequest(request); setCondominiumRequestForm(request); openModal("condominium-request");
  };
  const deleteCondominiumRequest = async (id: number) => {
    if (!requireModulePermission("condomini", "L'eliminazione della segnalazione o richiesta")) return;
    if (!confirm("Eliminare questa segnalazione o richiesta?")) return;

    const previousRequests = condominiumRequests;
    setCondominiumRequests((current) => current.filter((request) => request.id !== id));

    if (!supabaseConfigured || !supabase) return;

    try {
      const { error } = await supabase
        .from("condominium_requests")
        .delete()
        .eq("workspace_id", profile.workspaceId)
        .eq("legacy_id", id);
      if (error) throw error;
    } catch (error) {
      console.error("BETHAG request deletion persistence failed", error);
      setCondominiumRequests(previousRequests);
      alert(
        error instanceof Error
          ? `Impossibile eliminare la richiesta: ${error.message}`
          : "Impossibile eliminare la richiesta."
      );
    }
  };

  const updateCondominiumRequestStatus = async (id: number, status: RequestStatus) => {
    if (!requireModulePermission("condomini", "La gestione dello stato della segnalazione o richiesta")) return;

    const currentRequest = condominiumRequests.find((request) => request.id === id);
    if (!currentRequest) return;

    const updatedRequest = { ...currentRequest, status };
    setCondominiumRequests((current) =>
      current.map((request) =>
        request.id === id ? updatedRequest : request
      )
    );

    if (!supabaseConfigured || !supabase) return;

    try {
      await updateCondominiumRequestStatus(
        profile.workspaceId,
        updatedRequest
      );
    } catch (error) {
      console.error("BETHAG request status persistence failed", error);
      setCondominiumRequests((current) =>
        current.map((request) =>
          request.id === id ? currentRequest : request
        )
      );
      alert(
        error instanceof Error
          ? `Impossibile aggiornare la richiesta: ${error.message}`
          : "Impossibile aggiornare la richiesta."
      );
    }
  };

  const prepareCondominiumEmail = async (
    condominiumId: number,
    memberIds?: number[],
    communicationId?: number,
    emailSubject?: string,
    emailBody?: string,
    audience: CommunicationAudience = "Tutti"
  ) => {
    if (
      !isAdministrator &&
      !(
        isCollaborator &&
        collaboratorPermissions.includes("comunicazioni")
      )
    ) {
      alert("Non disponi dell'autorizzazione per gestire le comunicazioni.");
      return;
    }

    if (!supabaseConfigured || !supabase) {
      alert("Il servizio e-mail BETHAG non è disponibile perché Supabase non è configurato.");
      return;
    }

    const condominium = condominiums.find((item) => item.id === condominiumId);

    const recipientEmails =
      audience === "Consiglio"
        ? portalMembers
            .filter(
              (member) =>
                member.condominiumId === condominiumId &&
                member.role === "council" &&
                member.active &&
                member.email.trim()
            )
            .map((member) => member.email.trim())
        : condominiumMembers
            .filter(
              (member) =>
                member.condominiumId === condominiumId &&
                member.active &&
                member.email.trim() &&
                (!memberIds || memberIds.includes(member.id))
            )
            .map((member) => member.email.trim());

    const uniqueRecipients = Array.from(
      new Map(
        recipientEmails.map((email) => [email.toLowerCase(), email])
      ).values()
    );

    if (!uniqueRecipients.length) {
      alert(
        audience === "Consiglio"
          ? "Non ci sono consiglieri attivi con un indirizzo e-mail disponibile per questo condominio."
          : "Non ci sono condòmini attivi con un indirizzo e-mail disponibile."
      );
      return;
    }

    const subject =
      emailSubject?.trim() ||
      `Comunicazione - ${condominium?.name || "Condominio"}`;
    const body =
      emailBody?.trim() ||
      "Inserisci qui il testo della comunicazione.";

    try {
      const { data, error } = await supabase.functions.invoke(
        "bethag-send-email",
        {
          body: {
            workspaceId: profile.workspaceId,
            communicationId,
            condominiumId,
            recipients: uniqueRecipients,
            subject,
            body,
            audience,
          },
        }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Invio e-mail non riuscito.");
      }

      if (communicationId) {
        setCommunications((current) =>
          current.map((communication) =>
            communication.id === communicationId
              ? {
                  ...communication,
                  emailStatus: "Inviata",
                  emailPreparedAt: new Date().toISOString(),
                }
              : communication
          )
        );
      }

      alert(
        `E-mail inviata correttamente a ${data.recipients ?? uniqueRecipients.length} destinatari.`
      );
    } catch (error) {
      console.error("BETHAG email send failed", error);
      alert(
        error instanceof Error
          ? error.message
          : "Invio e-mail non riuscito. Verifica la configurazione del servizio e-mail."
      );
    }
  };

  /* =======================================================
     COMUNICAZIONI
     ======================================================= */

  const saveCommunication = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    if (!requireModulePermission("comunicazioni", "La gestione delle comunicazioni")) return;
    event.preventDefault();

    if (
      !communicationForm.title.trim() ||
      !communicationForm.body.trim()
    ) {
      alert(
        "Inserisci titolo e contenuto della comunicazione."
      );
      return;
    }

    if (!communicationForm.condominiumId) {
      alert("Seleziona il condominio destinatario della comunicazione.");
      return;
    }

    if (
      selectedCommunication &&
      (selectedCommunication.publishedToPortal ||
        selectedCommunication.status === "Pubblicata") &&
      !isAdministrator
    ) {
      alert("La modifica di una comunicazione pubblicata è riservata all'Amministratore.");
      return;
    }

    if (
      communicationForm.audience === "Selezionati" &&
      !(communicationForm.recipientIds || []).length
    ) {
      alert("Seleziona almeno un condòmino destinatario.");
      return;
    }

    if (communicationForm.publishedToPortal) {
      if (!isAdministrator) {
        alert("La pubblicazione delle comunicazioni nel portale è riservata all'Amministratore.");
        return;
      }
      if (
        !requirePlan(
          "portal",
          "La pubblicazione delle comunicazioni nel portale",
          "portale"
        )
      ) {
        return;
      }
    }

    const recipientIds = communicationForm.recipientIds || [];
    if (communicationForm.audience === "Selezionati") {
      const selectedMembers = condominiumMembers.filter(
        (member) =>
          member.condominiumId === communicationForm.condominiumId &&
          member.active &&
          recipientIds.includes(member.id)
      );
      if (selectedMembers.length !== recipientIds.length) {
        alert("Alcuni destinatari selezionati non sono più disponibili o non appartengono al condominio indicato.");
        return;
      }
    }

    const data = {
      ...communicationForm,
      title: communicationForm.title.trim(),
      body: communicationForm.body.trim(),
      recipientIds,
      emailStatus: communicationForm.emailStatus || "Non inviata",
      emailPreparedAt: communicationForm.emailPreparedAt || "",
    };

    if (selectedCommunication) {
      setCommunications((current) =>
        current.map((item) =>
          item.id ===
          selectedCommunication.id
            ? {
                ...data,
                id:
                  selectedCommunication.id,
              }
            : item
        )
      );
    } else {
      setCommunications((current) => [
        {
          ...data,
          id: makeId(),
        },
        ...current,
      ]);
    }

    setCommunicationForm(
      emptyCommunication
    );
    setSelectedCommunication(null);
    closeModal();
  };

  const editCommunication = (
    item: Communication
  ) => {
    if (!requireModulePermission("comunicazioni", "La modifica delle comunicazioni")) return;
    setSelectedCommunication(item);
    setCommunicationForm(item);
    openModal("communication");
  };

  const deleteCommunication = async (id: number) => {
    if (!requireModulePermission("comunicazioni", "L'eliminazione della comunicazione")) return;
    if (!confirm("Eliminare questa comunicazione?")) return;
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        await deleteWorkspaceRecordBackend(profile.workspaceId, "communications", id);
      }
      setCommunications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("BETHAG communication deletion failed", error);
      alert(error instanceof Error ? "La comunicazione non è stata eliminata dal server.\n\n" + error.message : "La comunicazione non è stata eliminata dal server.");
    }
  };

  const toggleCommunicationPublication = (
    id: number
  ) => {
    if (!isAdministrator) {
      alert("La pubblicazione delle comunicazioni è riservata all'Amministratore.");
      return;
    }
    if (
      !requirePlan(
        "portal",
        "La pubblicazione delle comunicazioni",
        "portale"
      )
    )
      return;

    setCommunications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              publishedToPortal:
                !item.publishedToPortal,
              status:
                item.publishedToPortal
                  ? "Bozza"
                  : "Pubblicata",
            }
          : item
      )
    );
  };


  /* =======================================================
     PORTALE
     ======================================================= */

  const addPortalMember = (
    member: PortalMember
  ) => {
    if (!requireModulePermission("portale", "La gestione degli accessi al Portale condomini")) return;
    if (
      !requirePlan(
        "portal",
        "Il portale condomini",
        "portale"
      )
    )
      return;

    const normalizedEmail = member.email.trim().toLowerCase();
    const duplicate = portalMembers.some(
      (currentMember) =>
        currentMember.condominiumId === member.condominiumId &&
        currentMember.email.trim().toLowerCase() === normalizedEmail
    );

    if (duplicate) {
      alert("Esiste già un accesso al Portale per questo indirizzo e-mail nello stesso condominio.");
      return;
    }

    const condominiumMember = condominiumMembers.find(
      (currentMember) =>
        currentMember.active &&
        currentMember.condominiumId === member.condominiumId &&
        currentMember.email.trim().toLowerCase() === normalizedEmail
    );

    if (!condominiumMember) {
      alert("Prima di abilitare il Portale, inserisci un condòmino attivo nell'anagrafica del condominio con lo stesso indirizzo e-mail.");
      return;
    }

    setPortalMembers((current) => [
      ...current,
      {
        ...member,
        id: makeId(),
        name: member.name.trim(),
        email: member.email.trim(),
        condominiumId: member.condominiumId,
        apartment: member.apartment.trim(),
      },
    ]);
  };

  const togglePortalMember = (
    id: number
  ) => {
    if (!requireModulePermission("portale", "La modifica dello stato di accesso al Portale condomini")) return;
    setPortalMembers((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              active: !member.active,
            }
          : member
      )
    );
  };

  const deletePortalMember = async (
    id: number
  ) => {
    if (!requireModulePermission("portale", "L'eliminazione dell'accesso al Portale condomini")) return;
    if (!confirm("Eliminare l'accesso del condomino?")) return;

    const previousPortalMembers = portalMembers;
    setPortalMembers((current) => current.filter((member) => member.id !== id));

    if (!supabaseConfigured || !supabase || !profile.workspaceId) return;

    try {
      await deletePortalMemberBackend(profile.workspaceId, id);
    } catch (error) {
      console.error("BETHAG portal member deletion failed", error);
      setPortalMembers(previousPortalMembers);
      alert(error instanceof Error ? "L'accesso al Portale non è stato eliminato dal server.\\n\\n" + error.message : "L'accesso al Portale non è stato eliminato dal server.");
    }
  };


  /* =======================================================
     NUOVI ELEMENTI
     ======================================================= */

  const newDeadline = (condominiumId?: number) => {
    if (!requireModulePermission("scadenze", "La creazione di una scadenza")) return;
    setSelectedDeadline(null);

    setDeadlineForm({
      ...emptyDeadline,
      condominiumId: condominiumId ?? (condominiums[0]?.id || 0),
    });

    openModal("deadline");
  };

  const newDocument = (condominiumId?: number) => {
    if (!requireModulePermission("documenti", "La creazione di un documento")) return;
    setSelectedDocument(null);

    setDocumentForm({
      ...emptyDocument,
      condominiumId: condominiumId ?? (condominiums[0]?.id || 0),
    });

    setSelectedFileName("");

    openModal("document");
  };

  const newAssembly = (condominiumId?: number) => {
    if (!requireModulePermission("assemblee", "La creazione di un'assemblea")) return;
    setSelectedAssembly(null);

    setAssemblyForm({
      ...emptyAssembly,
      condominiumId: condominiumId ?? (condominiums[0]?.id || 0),
    });

    openModal("assembly");
  };

  const newSupplier = (condominiumId?: number) => {
    if (!requireModulePermission("fornitori", "La creazione di un fornitore")) return;
    setSelectedSupplier(null);
    setSupplierForm({ ...emptySupplier, condominiumId: condominiumId ?? emptySupplier.condominiumId });
    openModal("supplier");
  };

  const newActivity = (condominiumId?: number) => {
    if (!requireModulePermission("attivita", "La creazione di un'attività")) return;
    setSelectedActivity(null);
    setActivityForm({ ...emptyActivity, condominiumId: condominiumId ?? emptyActivity.condominiumId });
    openModal("activity");
  };

  const newCondominiumMember = (condominiumId: number, apartment = "") => { if (!requireModulePermission("condomini", "La gestione dell’anagrafica dei condòmini")) return; setSelectedCondominiumMember(null); setCondominiumMemberForm({ ...emptyCondominiumMember, condominiumId, apartment }); openModal("condominium-member"); };
  const newCondominiumRequest = (condominiumId: number) => {
    if (!requireModulePermission("condomini", "La creazione di una segnalazione o richiesta")) return;
    setSelectedCondominiumRequest(null); setCondominiumRequestForm({ ...emptyCondominiumRequest, condominiumId }); openModal("condominium-request");
  };

  const newCommunication = (condominiumId?: number) => {
    if (!requireModulePermission("comunicazioni", "La creazione delle comunicazioni")) return;
    setSelectedCommunication(null);

    setCommunicationForm({
      ...emptyCommunication,
      condominiumId:
        condominiumId ?? (condominiums[0]?.id || null),
      recipientIds: [],
      emailStatus: "Non inviata",
      emailPreparedAt: "",
      deliveryMode: "portal",
      publishedToPortal: true,
      status: "Pubblicata",
    });

    openModal("communication");
  };


  const openCondominiumEmailComposer = (
    condominiumId: number,
    memberIds?: number[],
    audience: CommunicationAudience = "Tutti"
  ) => {
    if (
      !isAdministrator &&
      !(isCollaborator && collaboratorPermissions.includes("comunicazioni"))
    ) {
      alert("Non disponi dell'autorizzazione per gestire le comunicazioni.");
      return;
    }

    setSelectedCommunication(null);
    setCommunicationForm({
      ...emptyCommunication,
      condominiumId,
      title: "",
      body: "",
      audience,
      recipientIds: audience === "Selezionati" ? (memberIds || []) : [],
      status: "Bozza",
      publishedToPortal: false,
      emailStatus: "Non inviata",
      emailPreparedAt: "",
      deliveryMode: "email",
    });
    openModal("communication");
  };


  /* =======================================================
     DASHBOARD
     ======================================================= */

  const upcoming = [...deadlines]
    .filter(
      (d) =>
        d.status !==
        "Completata"
    )
    .sort((a, b) =>
      a.dueDate.localeCompare(
        b.dueDate
      )
    )
    .slice(0, 5);

  const openActivities =
    activities.filter(
      (a) =>
        a.status !==
        "Completata"
    ).length;

  const urgentDeadlines =
    deadlines.filter(
      (d) =>
        d.status ===
        "In scadenza"
    ).length;

  const completedDeadlines =
    deadlines.filter(
      (d) =>
        d.status ===
        "Completata"
    ).length;

  const completedActivities =
    activities.filter(
      (a) =>
        a.status ===
        "Completata"
    ).length;

  const visibleCommunications =
    communications.filter(
      (c) =>
        c.publishedToPortal
    ).length;

  const todayISO = localISODate();
  const overdueDeadlines = deadlines.filter(
    (d) => d.status !== "Completata" && d.dueDate && d.dueDate < todayISO
  ).length;
  const pendingRequests = condominiumRequests.filter(
    (request) => request.status !== "Risolta" && request.status !== "Chiusa"
  ).length;
  const documentsToVerify = documents.filter(
    (document) => document.aiStatus === "Da verificare"
  ).length;


  if (!sessionRole) {
    return (
      <>
        <style>{styles}</style>
        <PublicHome onLogin={handleLogin} onRegisterAdmin={handleRegisterAdmin} onRegisterResident={handleRegisterResident} onResetPassword={resetPassword} />
      </>
    );
  }

  if (sessionRole === "resident") {
    return (
      <>
        <style>{styles}</style>
        <ResidentPortalView
          email={sessionEmail}
          condominiums={condominiums.filter((c) => !c.archivedAt)}
          portalMembers={portalMembers}
          condominiumMembers={condominiumMembers}
          documents={documents}
          assemblies={assemblies}
          communications={communications}
          requests={condominiumRequests}
          onCreateRequest={async (request) => {
            if (supabaseConfigured && supabase) {
              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                  throw new Error("Sessione BETHAG non disponibile.");
                }

                const { data: condominium, error: condominiumError } =
                  await supabase
                    .from("condominiums")
                    .select("id, workspace_id, legacy_id")
                    .eq("workspace_id", profile.workspaceId)
                    .eq("legacy_id", request.condominiumId)
                    .maybeSingle();

                if (condominiumError) throw condominiumError;
                if (!condominium) {
                  throw new Error("Il condominio associato al profilo non è disponibile.");
                }

                const { error: requestError } = await supabase
                  .from("condominium_requests")
                  .insert({
                    workspace_id: condominium.workspace_id,
                    condominium_id: condominium.id,
                    legacy_id: request.id,
                    requester_user_id: user.id,
                    title: request.category,
                    description: request.description,
                    status: request.status,
                    data: request,
                  });

                if (requestError) throw requestError;
              } catch (requestError) {
                console.error("BETHAG resident request persistence failed", requestError);
                alert(
                  requestError instanceof Error
                    ? requestError.message
                    : "Impossibile inviare la richiesta all'amministratore."
                );
                return;
              }
            }

            setCondominiumRequests((current) => [request, ...current]);
          }}
          onLogout={logout}
        />
      </>
    );
  }

  const handleGlobalInputChangeCapture = (event: React.FormEvent<HTMLElement>) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (!target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")) return;
    if (target.type === "password" || target.type === "date" || target.type === "time" || target.type === "checkbox" || target.type === "file") return;
    const labelElement = target.closest(".field, label")?.querySelector("label") || target.closest("label");
    const labelText = labelElement?.textContent || "";
    const next = normalizeByLabel(target.value, labelText, target.type || "text");
    if (next !== target.value) {
      target.value = next;
    }
  };

  return (
    <>
      <style>{styles}</style>

      <div className="app" onChangeCapture={handleGlobalInputChangeCapture}>

        {/* =================================================
            SIDEBAR
           ================================================= */}

        <aside className="sidebar">

          <BrandLogo />

          <div className="plan-sidebar">
            <span>
              {PLAN_NAMES[
                subscription.plan
              ]}
            </span>

            <small>
              {profile.workspaceId}
            </small>

            <small className="role-badge">
              {sessionRole === "admin"
                ? "Amministratore"
                : "Collaboratore"}
            </small>
          </div>

          <nav className="nav">

            <NavButton
              active={false}
              onClick={logout}
            >
              <span className="nav-icon">
                <AppIcon name="menu" size={18} />
              </span>
              <span>Esci</span>
            </NavButton>


            <NavButton
              active={
                page === "homepage"
              }
              onClick={() =>
                navigate("homepage")
              }
            >
              <span className="nav-icon"><AppIcon name="dashboard" size={18} /></span>
              <span>Homepage</span>
            </NavButton>

            <NavButton
              active={page === "condomini"}
              onClick={() => navigate("condomini")}
            >
              <span className="nav-icon"><AppIcon name="building" size={18} /></span>
              <span>Condomini</span>
              {!canAccessPage("condomini") && <span className="nav-lock">PRO</span>}
            </NavButton>
            {isAdministrator && (
              <NavButton active={page === "archivio"} onClick={() => navigate("archivio")}>
                <span className="nav-icon"><AppIcon name="folder" size={18} /></span>
                <span>Archivio</span>
              </NavButton>
            )}

            {isAdministrator && (
            <NavButton
              active={page === "contabilita"}
              onClick={() => navigate("contabilita")}
            >
              <span className="nav-icon"><AppIcon name="wallet" size={18} /></span>
              <span>Contabilità</span>
            </NavButton>
            )}

            <NavButton
              active={page === "registro"}
              onClick={() => navigate("registro")}
            >
              <span className="nav-icon"><AppIcon name="wrench" size={18} /></span>
              <span>Registro e sicurezza</span>
            </NavButton>

            <NavButton
              active={
                page === "documenti"
              }
              onClick={() =>
                navigate("documenti")
              }
            >
              <span className="nav-icon"><AppIcon name="folder" size={18} /></span>
              <span>Documenti</span>
            </NavButton>

            <NavButton
              active={
                page === "scadenze"
              }
              onClick={() =>
                navigate("scadenze")
              }
            >
              <span className="nav-icon"><AppIcon name="calendar" size={18} /></span>
              <span>Scadenze</span>
            </NavButton>

            <NavButton
              active={
                page === "assemblee"
              }
              onClick={() =>
                navigate("assemblee")
              }
            >
              <span className="nav-icon"><AppIcon name="users" size={18} /></span>
              <span>Assemblee</span>
            </NavButton>

            <NavButton
              active={
                page === "fornitori"
              }
              onClick={() =>
                navigate("fornitori")
              }
            >
              <span className="nav-icon"><AppIcon name="wrench" size={18} /></span>
              <span>Fornitori</span>
            </NavButton>

            <NavButton
              active={
                page === "attivita"
              }
              onClick={() =>
                navigate("attivita")
              }
            >
              <span className="nav-icon"><AppIcon name="check" size={18} /></span>
              <span>Attività</span>
            </NavButton>

            <NavButton
              active={
                page === "comunicazioni"
              }
              onClick={() =>
                navigate("comunicazioni")
              }
            >
              <span className="nav-icon"><AppIcon name="megaphone" size={18} /></span>
              <span>Comunicazioni</span>
            </NavButton>

            <NavButton
              active={
                page === "ai"
              }
              onClick={() =>
                navigate("ai")
              }
            >
              <span className="nav-icon"><AppIcon name="sparkles" size={18} /></span>
              <span>BETHAG AI</span>
            </NavButton>

            <NavButton
              active={
                page === "portale"
              }
              onClick={() =>
                navigate("portale")
              }
            >
              <span className="nav-icon"><AppIcon name="portal" size={18} /></span>
              <span>Portale condomini</span>
            </NavButton>

            {canAccessPage("abbonamento") && (
              <NavButton
                active={
                  page === "abbonamento"
                }
                onClick={() =>
                  navigate(
                    "abbonamento"
                  )
                }
              >
                <span className="nav-icon"><AppIcon name="star" size={18} /></span>
                <span>Piano e upgrade</span>
              </NavButton>
            )}

            {canAccessPage("collaboratori") && (
              <NavButton
                active={page === "collaboratori"}
                onClick={() => navigate("collaboratori")}
              >
                <span className="nav-icon"><AppIcon name="users" size={18} /></span>
                <span>Collaboratori</span>
              </NavButton>
            )}

            {canAccessPage("amministratore") && (
              <NavButton
                active={
                  page ===
                  "amministratore"
                }
                onClick={() =>
                  navigate(
                    "amministratore"
                  )
                }
              >
                <span className="nav-icon"><AppIcon name="user" size={18} /></span>
                <span>Amministratore</span>
              </NavButton>
            )}

            {canAccessPage("aiuto") && (
              <NavButton
                active={page === "aiuto"}
                onClick={() => navigate("aiuto")}
              >
                <span className="nav-icon"><AppIcon name="help" size={18} /></span>
                <span>Aiuto e guida</span>
              </NavButton>
            )}

          </nav>

          <div className="sidebar-bottom">
            <BrandLogo compact />
            <br />
            <small>
              Gestione intelligente
              dell'amministrazione
              condominiale
            </small>
          </div>

        </aside>


        {/* =================================================
            CONTENUTO
           ================================================= */}

        <main className="content">

          <header className="mobile-header">

            <button
              className="icon-button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              aria-label="Apri menu"
            >
              <AppIcon name="menu" size={21} />
            </button>

            <b>BETHAG</b>

            <button
              className="icon-button"
              onClick={() =>
                navigate(
                  isAdministrator ? "amministratore" : "aiuto"
                )
              }
              aria-label={isAdministrator ? "Apri profilo amministratore" : "Apri Aiuto"}
            >
              <AppIcon name={isAdministrator ? "settings" : "help"} size={19} />
            </button>

          </header>


          {page === "homepage" && (
            <Dashboard
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              deadlines={
                deadlines
              }
              documents={
                documents
              }
              activities={
                activities
              }
              communications={
                communications
              }
              upcoming={
                upcoming
              }
              openActivities={
                openActivities
              }
              urgentDeadlines={
                urgentDeadlines
              }
              completedDeadlines={
                completedDeadlines
              }
              completedActivities={
                completedActivities
              }
              visibleCommunications={
                visibleCommunications
              }
              overdueDeadlines={overdueDeadlines}
              pendingRequests={pendingRequests}
              documentsToVerify={documentsToVerify}
              onNavigate={
                navigate
              }
              condominiumName={
                condominiumName
              }
              subscription={
                subscription
              }
              isAdministrator={isAdministrator}
              registrationRequests={registrationRequests}
              condominiumMembers={condominiumMembers}
              onApproveRegistration={approvePortalRegistration}
            />
          )}


          {page === "condomini" && (
            <CondominiumsErrorBoundary>
              <CondominiumsPage
              condominiums={
                filteredCondominiums
              }
              allCount={
                condominiums.filter((item) => !item.archivedAt).length
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              selected={
                selectedCondominium
              }
              setSelected={
                setSelectedCondominium
              }
              onNew={() => {
                setEditingCondominium(
                  null
                );

                openModal(
                  "condominium"
                );
              }}
              onEdit={(
                item: Condominium
              ) => {
                setEditingCondominium(
                  item
                );

                openModal(
                  "condominium"
                );
              }}
              onDelete={
                deleteCondominium
              }
              deadlines={
                deadlines
              }
              documents={
                documents
              }
              assemblies={
                assemblies
              }
              suppliers={
                suppliers
              }
              activities={
                activities
              }
              communications={
                communications
              }
              condominiumName={
                condominiumName
              }
              onEditDeadline={
                editDeadline
              }
              onEditDocument={
                editDocument
              }
              onEditAssembly={
                editAssembly
              }
              onEditSupplier={
                editSupplier
              }
              onEditActivity={
                editActivity
              }
              onEditCommunication={
                editCommunication
              }
              onDeleteDeadline={
                deleteDeadline
              }
              onDeleteDocument={
                deleteDocument
              }
              onDeleteAssembly={
                deleteAssembly
              }
              onDeleteSupplier={
                deleteSupplier
              }
              onDeleteActivity={
                deleteActivity
              }
              onDeleteCommunication={
                deleteCommunication
              }
              onStatusDeadline={
                updateDeadlineStatus
              }
              onStatusAssembly={
                updateAssemblyStatus
              }
              onStatusActivity={updateActivityStatus}
              condominiumMembers={condominiumMembers}
              condominiumUnits={condominiumUnits}
              onNewUnit={newCondominiumUnit}
              onEditUnit={editCondominiumUnit}
              condominiumRequests={condominiumRequests}
              onNewMember={newCondominiumMember}
              onEditMember={editCondominiumMember}
              onDeleteMember={deleteCondominiumMember}
              onNewRequest={newCondominiumRequest}
              onEditRequest={editCondominiumRequest}
              onDeleteRequest={deleteCondominiumRequest}
              onStatusRequest={updateCondominiumRequestStatus}
              onNewCommunication={newCommunication}
              onPrepareEmail={prepareCondominiumEmail}
              openCondominiumEmailComposer={openCondominiumEmailComposer}
              onNewDeadline={newDeadline}
              onNewDocument={newDocument}
              onNewAssembly={newAssembly}
              onNewSupplier={newSupplier}
              onNewActivity={newActivity}
              isAdministrator={
                isAdministrator ||
                (isCollaborator && collaboratorPermissions.includes("condomini"))
              }
              />
            </CondominiumsErrorBoundary>
          )}


          {page === "registro" && (
            <RegisterPage
              workspaceId={profile.workspaceId}
              condominiums={condominiums.filter((c) => !c.archivedAt).map((c) => ({ id: c.id, name: c.name }))}
              isAdministrator={isAdministrator}
            />
          )}

          {page === "documenti" && (
            <DocumentsPage
              documents={
                documents
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              onNew={
                newDocument
              }
              onEdit={
                editDocument
              }
              onDelete={
                deleteDocument
              }
              condominiumName={
                condominiumName
              }
              onAI={
                processDocumentAI
              }
              onConfirmAI={
                confirmDocumentAI
              }
              onPublication={
                toggleDocumentPublication
              }
              plan={subscription.plan}
              isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("documenti"))}
            />
          )}


          {page === "scadenze" && (
            <DeadlinesPage
              deadlines={
                deadlines
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              onNew={
                newDeadline
              }
              onEdit={
                editDeadline
              }
              onDelete={
                deleteDeadline
              }
              onStatus={
                updateDeadlineStatus
              }
              condominiumName={condominiumName}
              isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("scadenze"))}
            />
          )}


          {page === "assemblee" && (
            <AssembliesPage
              assemblies={
                assemblies
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              onNew={
                newAssembly
              }
              onEdit={
                editAssembly
              }
              onDelete={
                deleteAssembly
              }
              onStatus={
                updateAssemblyStatus
              }
              condominiumName={
                condominiumName
              }
              onAudio={
                attachAssemblyAudio
              }
              onGenerateMinutes={
                generateMinutes
              }
              onConfirmMinutes={
                confirmMinutes
              }
              onPublication={toggleAssemblyPublication}
              isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("assemblee"))}
            />
          )}


          {page === "fornitori" && (
            <SuppliersPage
              suppliers={
                suppliers
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              onNew={
                newSupplier
              }
              onEdit={
                editSupplier
              }
              onDelete={
                deleteSupplier
              }
              condominiumName={condominiumName}
              isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("fornitori"))}
            />
          )}


          {page === "attivita" && (
            <ActivitiesPage
              activities={
                activities
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              onNew={
                newActivity
              }
              onEdit={
                editActivity
              }
              onDelete={
                deleteActivity
              }
              onStatus={updateActivityStatus}
              condominiumName={condominiumName}
              isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("attivita"))}
            />
          )}


          {page === "comunicazioni" && (
            <CommunicationsPage
              communications={
                communications
              }
              search={
                search
              }
              setSearch={
                setSearch
              }
              condominiumName={
                condominiumName
              }
              onNew={
                newCommunication
              }
              onEdit={
                editCommunication
              }
              onDelete={
                deleteCommunication
              }
              onPublication={
                toggleCommunicationPublication
              }
              isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("comunicazioni"))}
            />
          )}


          {page === "ai" && (
            <AIPage
              documents={
                documents
              }
              assemblies={
                assemblies
              }
              plan={
                subscription.plan
              }
              onNavigate={
                navigate
              }
              onAI={
                processDocumentAI
              }
              onAudio={
                attachAssemblyAudio
              }
            />
          )}


          {page === "portale" && (
            <PortalPage
              members={
                portalMembers
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              documents={
                documents
              }
              assemblies={
                assemblies
              }
              communications={
                communications
              }
              plan={
                subscription.plan
              }
              portalEnabled={hasEntitlement(
                subscription,
                "portal",
                "portale"
              )}
              onAdd={
                addPortalMember
              }
              onToggle={
                togglePortalMember
              }
              onDelete={
                deletePortalMember
              }
              onNavigate={navigate}
              isAdministrator={isAdministrator}
              condominiumMembers={condominiumMembers}
              condominiumRequests={condominiumRequests}
              sessionEmail={sessionEmail}
              onPortalRequest={(member: PortalMember) => {
                const condominiumMember = condominiumMembers.find((item) =>
                  item.condominiumId === member.condominiumId &&
                  item.email.trim().toLowerCase() === member.email.trim().toLowerCase()
                );
                setSelectedCondominiumRequest(null);
                setCondominiumRequestForm({
                  ...emptyCondominiumRequest,
                  condominiumId: member.condominiumId,
                  memberId: condominiumMember?.id ?? null,
                  date: localISODate(),
                });
                openModal("condominium-request");
              }}
            />
          )}



          {page === "archivio" && (
            <section>
              <PageHeader eyebrow="Condomini" title="Archivio" />
              <div className="section-subtitle">Condomini archiviati: i dati restano disponibili e possono essere ripristinati in qualsiasi momento.</div>
              <div className="card-grid">
                {condominiums.filter((item) => Boolean(item.archivedAt)).map((item) => (
                  <article className="card" key={item.id}>
                    <div className="eyebrow">Archiviato</div>
                    <h2>{item.name}</h2>
                    <p>{item.address}{item.city ? `, ${item.city}` : ""}{item.province ? ` (${item.province})` : ""}</p>
                    <small className="muted-text">Archiviato il {item.archivedAt ? new Date(item.archivedAt).toLocaleString("it-IT") : ""}</small>
                    <div className="form-actions" style={{marginTop:12}}>
                      <button className="primary-button" type="button" onClick={() => void restoreCondominium(item)}>Ripristina</button>
                      <button className="danger-button" type="button" onClick={() => void deleteCondominium(item)}>Elimina definitivamente</button>
                    </div>
                  </article>
                ))}
                {!condominiums.some((item) => item.archivedAt) && <div className="card"><h2>Archivio vuoto</h2><p>Nessun condominio è stato archiviato.</p></div>}
              </div>
            </section>
          )}

          {page === "contabilita" && (
            <AccountingPage
              workspaceId={profile.workspaceId}
              condominiums={condominiums.filter((c) => !c.archivedAt).map((c) => ({ id: c.id, name: c.name }))}
              isAdministrator={isAdministrator}
            />
          )}

          {page === "aiuto" && (
            <HelpPage
              sessionRole={sessionRole}
              onNavigate={navigate}
            />
          )}

          {page === "abbonamento" && (
            <SubscriptionPage
              subscription={
                subscription
              }
              setSubscription={
                setSubscription
              }
              isAdministrator={isAdministrator}
            />
          )}


          {page === "collaboratori" && (
            <CollaboratorsPage
              collaborators={collaborators}
              setCollaborators={setCollaborators}
              workspaceId={profile.workspaceId}
              isAdministrator={isAdministrator}
            />
          )}

          {page === "amministratore" && (
            <ProfilePage
              profile={
                profile
              }
              setProfile={
                setProfile
              }
              subscription={
                subscription
              }
              portalMembers={
                portalMembers
              }
              isAdministrator={isAdministrator}
              onExportBackup={exportWorkspaceBackup}
              onRestoreBackup={restoreWorkspaceBackup}
              onLogout={logout}
            />
          )}

        </main>
      </div>


      {/* =================================================
          MOBILE BOTTOM NAV
         ================================================= */}

      <div className="mobile-bottom-nav">

        <button
          className={
            page === "homepage"
              ? "mobile-bottom-active"
              : ""
          }
          onClick={() =>
            navigate("homepage")
          }
        >
          <span><AppIcon name="dashboard" size={19} /></span>
          <small>Home</small>
        </button>

        <button
          className={
            page === "condomini"
              ? "mobile-bottom-active"
              : ""
          }
          onClick={() =>
            navigate("condomini")
          }
        >
          <span><AppIcon name="building" size={19} /></span>
          <small>Condomini</small>
        </button>

        <button
          className="mobile-ai-button"
          onClick={() =>
            navigate("ai")
          }
          aria-label="Apri BETHAG AI"
        >
          <AppIcon name="sparkles" size={21} />
        </button>

        <button
          className={
            page === "scadenze"
              ? "mobile-bottom-active"
              : ""
          }
          onClick={() =>
            navigate("scadenze")
          }
        >
          <span><AppIcon name="calendar" size={19} /></span>
          <small>Scadenze</small>
        </button>

        <button
          className={
            page === (isAdministrator ? "amministratore" : "aiuto")
              ? "mobile-bottom-active"
              : ""
          }
          onClick={() =>
            navigate(
              isAdministrator ? "amministratore" : "aiuto"
            )
          }
        >
          <span><AppIcon name={isAdministrator ? "user" : "help"} size={19} /></span>
          <small>{isAdministrator ? "Profilo" : "Aiuto"}</small>
        </button>

      </div>


      {/* =================================================
          MENU MOBILE
         ================================================= */}

      {mobileMenuOpen && (
        <div
          className="mobile-menu-backdrop"
          onMouseDown={() =>
            setMobileMenuOpen(false)
          }
        >
          <div
            className="mobile-menu"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >

            <div className="mobile-menu-header">

              <BrandLogo compact />

              <button
                className="modal-close"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
                aria-label="Chiudi menu"
              >
                ×
              </button>

            </div>

            <div className="mobile-plan">

              <b>
                {
                  PLAN_NAMES[
                    subscription.plan
                  ]
                }
              </b>

              <small>
                {profile.workspaceId}
              </small>

            </div>

            <div className="mobile-nav">

              {(
                [
                  ["homepage", "Homepage", "dashboard"],
                  ["condomini", "Condomini", "building"],
                  ["documenti", "Documenti", "folder"],
                  ["scadenze", "Scadenze", "calendar"],
                  ["assemblee", "Assemblee", "users"],
                  ["fornitori", "Fornitori", "wrench"],
                  ["attivita", "Attività", "check"],
                  ["comunicazioni", "Comunicazioni", "megaphone"],
                  ["ai", "BETHAG AI", "sparkles"],
                  ["portale", "Portale condomini", "portal"],
                  ["abbonamento", "Piano e upgrade", "star"],
                  ["collaboratori", "Collaboratori", "users"],
                  ["amministratore", "Amministratore", "user"],
                  ["aiuto", "Aiuto", "help"],
                ] as [
                  Page,
                  string,
                  string
                ][]
              )
              .filter(([target]) =>
                canAccessPage(target)
              )
              .map(
                ([target, label, icon]) => (
                  <NavButton
                    key={target}
                    active={
                      page === target
                    }
                    onClick={() =>
                      navigate(
                        target
                      )
                    }
                  >
                    <span className="nav-icon">
                      <AppIcon name={icon} size={18} />
                    </span>
                    <span>{label}</span>
                  </NavButton>
                )
              )}

            </div>
          </div>
        </div>
      )}


      {/* =================================================
          MODALI
         ================================================= */}

      {showModal && (
        <Modal
          onClose={closeModal}
        >

          {modalType ===
            "condominium" && (
            <CondominiumForm
              value={
                editingCondominium ||
                {
                  ...emptyCondominium,
                  id: 0,
                }
              }
              onChange={
                setEditingCondominium
              }
              onSubmit={
                saveCondominium
              }
              onCancel={
                closeModal
              }
              editing={
                Boolean(
                  editingCondominium &&
                  editingCondominium.id !== 0
                )
              }
            />
          )}

          {modalType ===
            "deadline" && (
            <DeadlineForm
              value={
                deadlineForm
              }
              setValue={
                setDeadlineForm
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              onSubmit={
                saveDeadline
              }
              onCancel={
                closeModal
              }
              editing={
                !!selectedDeadline
              }
            />
          )}

          {modalType ===
            "document" && (
            <DocumentForm
              value={
                documentForm
              }
              setValue={
                setDocumentForm
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              onSubmit={
                saveDocument
              }
              onCancel={
                closeModal
              }
              selectedFileName={
                selectedFileName
              }
              setSelectedFileName={
                setSelectedFileName
              }
              editing={
                !!selectedDocument
              }
            />
          )}

          {modalType ===
            "assembly" && (
            <AssemblyForm
              value={
                assemblyForm
              }
              setValue={
                setAssemblyForm
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              onSubmit={
                saveAssembly
              }
              onCancel={
                closeModal
              }
              editing={
                !!selectedAssembly
              }
            />
          )}

          {modalType ===
            "supplier" && (
            <SupplierForm
              value={
                supplierForm
              }
              setValue={
                setSupplierForm
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              onSubmit={
                saveSupplier
              }
              onCancel={
                closeModal
              }
              editing={
                !!selectedSupplier
              }
            />
          )}

          {modalType ===
            "activity" && (
            <ActivityForm
              value={
                activityForm
              }
              setValue={
                setActivityForm
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              onSubmit={
                saveActivity
              }
              onCancel={
                closeModal
              }
              editing={
                !!selectedActivity
              }
            />
          )}

          {modalType === "condominium-unit" && (
            <CondominiumUnitForm
              value={condominiumUnitForm}
              setValue={setCondominiumUnitForm}
              units={condominiumUnits.filter((u) => u.condominiumId === condominiumUnitForm.condominiumId)}
              members={condominiumMembers.filter((m) => m.condominiumId === condominiumUnitForm.condominiumId && m.active)}
              onSubmit={saveCondominiumUnit}
              onCancel={closeModal}
              editing={!!selectedCondominiumUnit}
            />
          )}

          {modalType === "condominium-member" && (
            <CondominiumMemberForm value={condominiumMemberForm} setValue={setCondominiumMemberForm} condominiums={condominiums.filter((c) => !c.archivedAt)} members={condominiumMembers} units={condominiumUnits} onSubmit={saveCondominiumMember} onCancel={closeModal} editing={!!selectedCondominiumMember} />
          )}

          {modalType === "condominium-request" && (
            <CondominiumRequestForm value={condominiumRequestForm} setValue={setCondominiumRequestForm} condominiums={condominiums.filter((c) => !c.archivedAt)} members={condominiumMembers} suppliers={suppliers} activities={activities} onSubmit={saveCondominiumRequest} onCancel={closeModal} editing={!!selectedCondominiumRequest} />
          )}

          {modalType ===
            "communication" && (
            <CommunicationForm
              value={
                communicationForm
              }
              setValue={
                setCommunicationForm
              }
              condominiums={condominiums.filter((c) => !c.archivedAt)}
              members={condominiumMembers}
              onPrepareEmail={prepareCondominiumEmail}
              onSubmit={
                saveCommunication
              }
              onCancel={
                closeModal
              }
              editing={
                !!selectedCommunication
              }
            />
          )}

        </Modal>
      )}

    </>
  );
}


function BrandLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className={`brand-logo ${compact ? "brand-logo-compact" : ""}`} aria-label="BETHAG">
      <img
        className="brand-logo-image"
        src={`${import.meta.env.BASE_URL}bethag.svg`}
        alt="BETHAG"
      />
    </div>
  );
}

function AppIcon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "building":
      return <svg {...common}><path d="M4 21V6.5L12 3l8 3.5V21" /><path d="M8 9h1M8 13h1M8 17h1M15 9h1M15 13h1M15 17h1" /><path d="M10 21v-4h4v4" /></svg>;
    case "folder":
      return <svg {...common}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M3.5 9h17" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></svg>;
    case "help":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-.9.8-1.9 1.2-1.9 2.6" /><path d="M12 17h.01" /></svg>;
    case "users":
      return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17 14a4.5 4.5 0 0 1 3.5 4.4" /></svg>;
    case "wrench":
      return <svg {...common}><path d="M14.7 6.2a4.2 4.2 0 0 0-5.5 5.5L4 16.9a2.1 2.1 0 1 0 3 3l5.2-5.2a4.2 4.2 0 0 0 5.5-5.5l-3 3-2.9-.9-.9-2.9z" /></svg>;
    case "check":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="m8 12 2.6 2.6L16.5 9" /></svg>;
    case "megaphone":
      return <svg {...common}><path d="M4 13V9l12-4v12L4 13z" /><path d="M16 8.5 20 7v8l-4-1.5M7 13l1.5 6h3L10 14" /></svg>;
    case "sparkles":
      return <svg {...common}><path d="m12 3-1.1 4.4L7 9l3.9 1.6L12 15l1.1-4.4L17 9l-3.9-1.6z" /><path d="m19 14-.6 2.4L16 17l2.4.6L19 20l.6-2.4L22 17l-2.4-.6zM5 3v3M3.5 4.5h3" /></svg>;
    case "portal":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5C9.8 18.1 8.7 15.3 8.7 12S9.8 5.9 12 3.5z" /></svg>;
    case "star":
      return <svg {...common}><path d="m12 3 2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.3 6-.9z" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2A2 2 0 0 0 5.8 18l-.1.1a2 2 0 0 1-2.8-2.8L3 15a2 2 0 0 0-1.4-3.4h-.2a2 2 0 0 1 0-4h.2A2 2 0 0 0 3 4.2l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A2 2 0 0 0 9.2 0h.2a2 2 0 0 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1A2 2 0 0 0 21 7.8v.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.4 3.4z" transform="scale(.8) translate(3 3)" /></svg>;
    case "alert":
      return <svg {...common}><path d="M12 4 3.8 19h16.4L12 4z" /><path d="M12 9v4M12 16h.01" /></svg>;
    case "trash":
      return <svg {...common}><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
    case "microphone":
      return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></svg>;
    case "file":
      return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
    case "image":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m5 17 5-5 3 3 2-2 4 4" /></svg>;
    case "pdf":
      return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 14h6M9 17h4" /></svg>;
    case "wallet":
      return <svg {...common}><path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14v3" /><path d="M17 13h4" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z" /><path d="M4 5.5V22M8 7h8M8 11h8" /></svg>;
    case "rocket":
      return <svg {...common}><path d="M14 4c3-2 5-1 6-1 0 1 1 3-1 6l-5 5-4-1-1-4z" /><path d="m10 14-4 4M7 17l-1 3 3-1M14 9h.01" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /></svg>;
  }
}


/* =========================================================
   NAV BUTTON
   ========================================================= */

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`nav-item ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function PortalRegistrationRequestsPanel({
  requests,
  condominiumMembers,
  onApprove,
}: {
  requests: PortalRegistrationRequest[];
  condominiumMembers: CondominiumMember[];
  onApprove: (requestId: string, memberId: string) => Promise<void>;
}) {
  return (
    <section className="card" style={{marginBottom:18,borderColor:"#c7d2fe",background:"#f8faff"}}>
      <SectionTitle title="Richieste di accesso condòmini" action={`${requests.length} da gestire`} />
      <p className="section-subtitle">
        Verifica le richieste prima di collegare l'account al profilo condòmino.
      </p>
      {requests.map((request) => {
        const nameCandidates = condominiumMembers.filter((member) =>
          member.active &&
          `${member.firstName} ${member.lastName}`.trim().toLowerCase() === request.full_name.trim().toLowerCase()
        );
        const allMembers = condominiumMembers.filter((member) => member.active);
        const candidates = request.status === "email_mismatch" && nameCandidates.length
          ? nameCandidates
          : request.status === "email_mismatch"
            ? allMembers
            : condominiumMembers.filter((member) =>
                member.active &&
                member.email.trim().toLowerCase() === request.email.trim().toLowerCase()
              );
        const defaultId = candidates[0]?.id ? String(candidates[0].id) : "";
        const mismatch = request.status === "email_mismatch";

        return (
          <div key={request.id} className="list-row" style={{display:"block",marginBottom:12,padding:"14px 0"}}>
            <div style={{marginBottom:10}}>
              <b>{request.full_name}</b>
              <small style={{display:"block"}}>E-mail registrata: {request.email}</small>
              {mismatch && (
                <div className="notice" style={{marginTop:8}}>
                  ⚠️ <b>Incongruenza e-mail:</b> il profilo individuato nell'anagrafica contiene un indirizzo e-mail diverso. Verifica se vuoi procedere comunque oppure modificare l'associazione.
                </div>
              )}
              {!mismatch && request.condominium_name && (
                <small style={{display:"block"}}>Condominio indicato: {request.condominium_name}</small>
              )}
            </div>

            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <select
                defaultValue={defaultId}
                style={{minWidth:280,maxWidth:"100%"}}
                id={`registration-member-${request.id}`}
              >
                {candidates.length === 0
                  ? <option value="">Nessun profilo compatibile</option>
                  : candidates.map((member) => (
                    <option key={member.id} value={String(member.id)}>
                      {member.firstName} {member.lastName} · {member.apartment || "unità"} · {member.email || "senza e-mail"}
                    </option>
                  ))}
              </select>

              <button
                className="primary-button"
                disabled={candidates.length === 0}
                onClick={() => {
                  const select = document.getElementById(`registration-member-${request.id}`) as HTMLSelectElement | null;
                  const memberId = select?.value || "";
                  if (!memberId) return;
                  if (mismatch && !confirm("L'e-mail dell'account è diversa da quella presente nel profilo condòmino. Vuoi procedere comunque con questa associazione?")) return;
                  void onApprove(request.id, memberId);
                }}
              >
                {mismatch ? "Procedi comunque" : "Autorizza"}
              </button>

              {mismatch && (
                <span className="muted-text">
                  Per modificare l'associazione, seleziona un altro profilo dall'elenco.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}


function Dashboard({
  condominiums,
  deadlines,
  documents,
  activities,
  communications,
  upcoming,
  openActivities,
  urgentDeadlines,
  completedDeadlines,
  completedActivities,
  visibleCommunications,
  overdueDeadlines,
  pendingRequests,
  documentsToVerify,
  onNavigate,
  condominiumName,
  subscription,
  isAdministrator,
  registrationRequests,
  condominiumMembers,
  onApproveRegistration,
}: any) {
  return (
    <>
      <header className="topbar">

        <div>

          <div className="eyebrow">
            {PLAN_NAMES[
              subscription.plan
            ]}
          </div>

          <h1>
            Homepage
          </h1>

          <p className="dashboard-subtitle">
            Il centro operativo di BETHAG
            per la gestione dei tuoi condomini.
          </p>

        </div>

        <button
          className="profile"
          onClick={() =>
            onNavigate(
              "amministratore"
            )
          }
        >
          Amministratore
        </button>

      </header>


      {isAdministrator && registrationRequests.length > 0 && (
        <PortalRegistrationRequestsPanel
          requests={registrationRequests}
          condominiumMembers={condominiumMembers}
          onApprove={onApproveRegistration}
        />
      )}

      <section className="stats">

        <button
          className="stat-card"
          onClick={() =>
            onNavigate(
              "condomini"
            )
          }
        >
          <span><AppIcon name="building" size={22} /></span>

          <strong>
            {condominiums.length}
          </strong>

          <small>
            Condomini
          </small>
        </button>

        <button
          className="stat-card"
          onClick={() =>
            onNavigate(
              "scadenze"
            )
          }
        >
          <span><AppIcon name="calendar" size={22} /></span>

          <strong>
            {deadlines.length}
          </strong>

          <small>
            Scadenze
          </small>
        </button>

        <button
          className="stat-card"
          onClick={() =>
            onNavigate(
              "documenti"
            )
          }
        >
          <span><AppIcon name="folder" size={22} /></span>

          <strong>
            {documents.length}
          </strong>

          <small>
            Documenti
          </small>
        </button>

        <button
          className="stat-card"
          onClick={() =>
            onNavigate(
              "attivita"
            )
          }
        >
          <span>✓</span>

          <strong>
            {openActivities}
          </strong>

          <small>
            Attività aperte
          </small>
        </button>

      </section>


      <section className="mini-stats">

        <div className="mini-stat">
          <b>
            {urgentDeadlines}
          </b>

          <span>
            Scadenze urgenti
          </span>
        </div>

        <div className="mini-stat">
          <b>
            {completedDeadlines}
          </b>

          <span>
            Scadenze completate
          </span>
        </div>

        <div className="mini-stat">
          <b>
            {completedActivities}
          </b>

          <span>
            Attività completate
          </span>
        </div>

        <div className="mini-stat">
          <b>
            {visibleCommunications}
          </b>

          <span>
            Comunicazioni pubblicate
          </span>
        </div>

        <div className="mini-stat">
          <b>{overdueDeadlines}</b>
          <span>Scadenze oltre termine</span>
        </div>

        <div className="mini-stat">
          <b>{pendingRequests}</b>
          <span>Richieste aperte</span>
        </div>

        <div className="mini-stat">
          <b>{documentsToVerify}</b>
          <span>Documenti da verificare</span>
        </div>

      </section>


      <section className="dashboard-grid">

        <div className="card">

          <SectionTitle
            title="Prossime scadenze"
            action="Vedi tutte"
            onClick={() =>
              onNavigate(
                "scadenze"
              )
            }
          />

          {upcoming.length ===
          0 ? (
            <Empty text="Nessuna scadenza aperta." />
          ) : (
            upcoming.map(
              (item: Deadline) => (
                <div
                  className="list-row"
                  key={item.id}
                >

                  <div>
                    <b>
                      {item.title}
                    </b>

                    <small>
                      {condominiumName(
                        item.condominiumId
                      )}
                    </small>

                    <Badge
                      value={
                        item.status
                      }
                    />
                  </div>

                  <strong>
                    {formatDate(
                      item.dueDate
                    )}
                  </strong>

                </div>
              )
            )
          )}

          {urgentDeadlines >
            0 && (
            <div className="notice">
              <AppIcon name="alert" size={16} />{" "}
              {
                urgentDeadlines
              }{" "}
              scadenza/e richiedono
              attenzione.
            </div>
          )}

        </div>


        <div className="card">

          <SectionTitle
            title="Attività recenti"
            action="Vedi tutte"
            onClick={() =>
              onNavigate(
                "attivita"
              )
            }
          />

          {activities.length ===
          0 ? (
            <Empty text="Nessuna attività." />
          ) : (
            activities
              .slice(-5)
              .reverse()
              .map(
                (
                  a: Activity
                ) => (
                  <div
                    className="activity"
                    key={a.id}
                  >

                    <b>
                      {a.title}
                    </b>

                    <small>
                      {condominiumName(
                        a.condominiumId
                      )}{" "}
                      ·{" "}
                      {a.status}
                    </small>

                  </div>
                )
              )
          )}

        </div>

      </section>


      <section className="homepage-focus-grid">
        <button className="focus-card focus-card-warning" onClick={() => onNavigate("scadenze")}>
          <span className="focus-icon">!</span>
          <div>
            <strong>{overdueDeadlines}</strong>
            <span>Scadenze oltre termine</span>
          </div>
          <small>Controlla →</small>
        </button>

        <button className="focus-card" onClick={() => onNavigate("condomini")}>
          <span className="focus-icon">⌂</span>
          <div>
            <strong>{pendingRequests}</strong>
            <span>Richieste da gestire</span>
          </div>
          <small>Apri →</small>
        </button>

        <button className="focus-card" onClick={() => onNavigate("documenti")}>
          <span className="focus-icon">✓</span>
          <div>
            <strong>{documentsToVerify}</strong>
            <span>Documenti da verificare</span>
          </div>
          <small>Verifica →</small>
        </button>

        <button className="focus-card focus-card-plan" onClick={() => onNavigate("abbonamento")}>
          <span className="focus-icon">✦</span>
          <div>
            <strong>{PLAN_NAMES[subscription.plan]}</strong>
            <span>
              {subscription.addons.length
                ? subscription.addons.length + " add-on attivi"
                : "Gestisci piano e moduli"}
            </span>
          </div>
          <small>Gestisci →</small>
        </button>
      </section>

      <section className="dashboard-grid dashboard-secondary">

        <div className="card">

          <SectionTitle
            title="Comunicazioni"
            action="Apri"
            onClick={() =>
              onNavigate(
                "comunicazioni"
              )
            }
          />

          {communications.length ===
          0 ? (
            <Empty text="Nessuna comunicazione." />
          ) : (
            communications
              .slice(0, 4)
              .map(
                (
                  c: Communication
                ) => (
                  <div
                    className="list-row"
                    key={c.id}
                  >
                    <div>
                      <b>
                        {c.title}
                      </b>

                      <small>
                        {c.condominiumId
                          ? condominiumName(
                              c.condominiumId
                            )
                          : "Tutti i condomini"}
                      </small>

                      <Badge
                        value={
                          c.status
                        }
                      />
                    </div>

                    <strong>
                      {formatDate(
                        c.date
                      )}
                    </strong>
                  </div>
                )
              )
          )}

        </div>


        <div className="card">

          <SectionTitle
            title="Accessi rapidi"
          />

          <div className="quick-grid">

            <button
              className="quick-action"
              onClick={() =>
                onNavigate(
                  "condomini"
                )
              }
            >
              <AppIcon name="building" size={21} />
              <span>
                Schede condominio
              </span>
            </button>

            <button
              className="quick-action"
              onClick={() =>
                onNavigate(
                  "documenti"
                )
              }
            >
              <AppIcon name="folder" size={21} />
              <span>
                Archivio
              </span>
            </button>

            <button
              className="quick-action"
              onClick={() =>
                onNavigate(
                  "assemblee"
                )
              }
            >
              <AppIcon name="users" size={21} />
              <span>
                Assemblee
              </span>
            </button>

            <button
              className="quick-action"
              onClick={() =>
                onNavigate(
                  "ai"
                )
              }
            >
              <AppIcon name="sparkles" size={21} />
              <span>
                BETHAG AI
              </span>
            </button>

          </div>

        </div>

      </section>


      <section className="ai-card">

        <div>

          <span className="ai-kicker">
            BETHAG AI
          </span>

          <h2>
            Il centro di controllo
            dell'amministratore.
          </h2>

          <p>
            Documenti, scadenze,
            assemblee, attività,
            comunicazioni e automazioni
            possono essere collegati in un
            unico sistema.
          </p>

        </div>

        <button
          className="ai-button"
          onClick={() =>
            onNavigate("ai")
          }
        >
          Apri BETHAG AI
        </button>

      </section>
    </>
  );
}


/* =========================================================
   COMPONENTI GENERALI
   ========================================================= */

function SectionTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">

      <h2>
        {title}
      </h2>

      {action && (
        <button
          className="link"
          onClick={onClick}
        >
          {action}
        </button>
      )}

    </div>
  );
}

function Badge({
  value,
}: {
  value: string;
}) {
  const urgent =
    value ===
      "In scadenza" ||
    value === "Alta";

  const done =
    value ===
      "Completata" ||
    value === "Svolto" ||
    value === "Confermato" ||
    value === "Pubblicata" ||
    value === "Attivo";

  return (
    <span
      className={`badge ${
        urgent
          ? "urgent"
          : done
          ? "done"
          : ""
      }`}
    >
      {value}
    </span>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="empty">
      {text}
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-header">

      <div>

        <div className="eyebrow">
          {eyebrow}
        </div>

        <h1>
          {title}
        </h1>

      </div>

      {action && (
        <button
          className="primary-button"
          onClick={onAction}
        >
          {action}
        </button>
      )}

    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder = "Cerca...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-card">

      <input
        className="search-input"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
      />

    </div>
  );
}


/* =========================================================
   CONDOMINI
   ========================================================= */

class CondominiumsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Errore inatteso nella sezione Condomini.",
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("BETHAG Condomini error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <section className="card" style={{ borderColor: "#fecaca", marginTop: 10 }}>
        <div className="eyebrow">BETHAG · Condomini</div>
        <h1 style={{ color: "#b42318", fontSize: 24 }}>Errore nella sezione Condomini</h1>
        <p>La sezione è stata isolata per evitare una pagina bianca.</p>
        <pre style={{ whiteSpace: "pre-wrap", color: "#7f1d1d", background: "#fff7f7", padding: 12, borderRadius: 10 }}>
          {this.state.message}
        </pre>
        <button type="button" className="secondary-button" onClick={() => this.setState({ hasError: false, message: "" })}>
          Riprova
        </button>
      </section>
    );
  }
}

function CondominiumsPage(
  props: any
) {
  const {
    condominiums,
    allCount,
    search,
    setSearch,
    selected,
    setSelected,
    onNew,
    onEdit,
    onDelete,
    onArchive,
    deadlines,
    documents,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumName,
    onEditDeadline,
    onEditDocument,
    onEditAssembly,
    onEditSupplier,
    onEditActivity,
    onEditCommunication,
    onDeleteDeadline,
    onDeleteDocument,
    onDeleteAssembly,
    onDeleteSupplier,
    onDeleteActivity,
    onDeleteCommunication,
    onStatusDeadline,
    onStatusAssembly,
    onStatusActivity,
    condominiumMembers,
    condominiumUnits = [],
    onNewUnit,
    onEditUnit,
    onDeleteUnit,
    condominiumRequests,
    onNewMember,
    onEditMember,
    onDeleteMember,
    onNewRequest,
    onEditRequest,
    onDeleteRequest,
    onStatusRequest,
    onNewCommunication,
    onPrepareEmail,
    openCondominiumEmailComposer,
    onNewDeadline,
    onNewDocument,
    onNewAssembly,
    onNewSupplier,
    onNewActivity,
    isAdministrator,
  } = props;

  const canManageCondominium = Boolean(isAdministrator);

  useEffect(() => {
    if (selected) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [selected]);

  if (selected) {
    return (
      <div className="condominium-detail-page">

        <div className="detail-page-header">

          <button
            type="button"
            className="back-button"
            onClick={() => {
              setSelected(null);

              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            ← Torna ai condomini
          </button>


          <div className="detail-page-heading">

            <div className="detail-page-icon">
              <AppIcon name="building" size={28} />
            </div>

            <div className="detail-page-heading-text">

              <div className="eyebrow">
                Scheda condominio
              </div>

              <h1>
                {selected.name}
              </h1>

              <p>
                {selected.address}
                {selected.cap
                  ? `, ${selected.cap}`
                  : ""}
                {selected.city
                  ? ` ${selected.city}`
                  : ""}
                {selected.province
                  ? ` (${selected.province})`
                  : ""}
              </p>

            </div>

          </div>


          <div className="detail-page-actions">

            {canManageCondominium && (
              <>
                <button
                  className="secondary-button"
                  onClick={() =>
                    onEdit(selected)
                  }
                >
                  <><AppIcon name="settings" size={16} /> Modifica</>
                </button>

                <button
                  className="secondary-button"
                  onClick={() => onArchive(selected)}
                >
                  <><AppIcon name="folder" size={16} /> Archivia</>
                </button>

                <button
                  className="danger-button"
                  onClick={() =>
                    onDelete(selected)
                  }
                >
                  <><AppIcon name="trash" size={16} /> Elimina</>
                </button>
              </>
            )}

          </div>

        </div>


        <CondominiumDetails
          item={selected}
          onClose={() =>
            setSelected(null)
          }
          onEdit={() =>
            onEdit(selected)
          }
          onDelete={() =>
            onDelete(selected)
          }
          deadlines={deadlines.filter(
            (x: Deadline) =>
              x.condominiumId ===
              selected.id
          )}
          documents={documents.filter(
            (x: DocumentItem) =>
              x.condominiumId ===
              selected.id
          )}
          assemblies={assemblies.filter(
            (x: Assembly) =>
              x.condominiumId ===
              selected.id
          )}
          suppliers={suppliers.filter(
            (x: Supplier) =>
              x.condominiumId ===
              selected.id
          )}
          activities={activities.filter(
            (x: Activity) =>
              x.condominiumId ===
              selected.id
          )}
          communications={communications.filter(
            (x: Communication) =>
              x.condominiumId ===
              selected.id
          )}
          condominiumMembers={condominiumMembers.filter((x: CondominiumMember) => x.condominiumId === selected.id)}
          condominiumUnits={condominiumUnits.filter((x: CondominiumUnit) => x.condominiumId === selected.id)}
          onNewUnit={onNewUnit}
          onEditUnit={onEditUnit}
          onDeleteUnit={onDeleteUnit}
          condominiumRequests={condominiumRequests.filter((x: CondominiumRequest) => x.condominiumId === selected.id)}
          onNewMember={onNewMember}
          onEditMember={onEditMember}
          onDeleteMember={onDeleteMember}
          onNewRequest={onNewRequest}
          onEditRequest={onEditRequest}
          onDeleteRequest={onDeleteRequest}
          onStatusRequest={onStatusRequest}
          onNewCommunication={onNewCommunication}
          onPrepareEmail={onPrepareEmail}
          openCondominiumEmailComposer={openCondominiumEmailComposer}
          onNewDeadline={() => onNewDeadline(selected.id)}
          onNewDocument={() => onNewDocument(selected.id)}
          onNewAssembly={() => onNewAssembly(selected.id)}
          onNewSupplier={() => onNewSupplier(selected.id)}
          onNewActivity={() => onNewActivity(selected.id)}
          condominiumName={
            condominiumName
          }
          onEditDeadline={
            onEditDeadline
          }
          onEditDocument={
            onEditDocument
          }
          onEditAssembly={
            onEditAssembly
          }
          onEditSupplier={
            onEditSupplier
          }
          onEditActivity={
            onEditActivity
          }
          onEditCommunication={
            onEditCommunication
          }
          onDeleteDeadline={
            onDeleteDeadline
          }
          onDeleteDocument={
            onDeleteDocument
          }
          onDeleteAssembly={
            onDeleteAssembly
          }
          onDeleteSupplier={
            onDeleteSupplier
          }
          onDeleteActivity={
            onDeleteActivity
          }
          onDeleteCommunication={
            onDeleteCommunication
          }
          onStatusDeadline={
            onStatusDeadline
          }
          onStatusAssembly={
            onStatusAssembly
          }
          onStatusActivity={
            onStatusActivity
          }
          isAdministrator={
            isAdministrator ||
            (isCollaborator && collaboratorPermissions.includes("condomini"))
          }
        />

      </div>
    );
  }

  return (
    <>

      <PageHeader
        eyebrow="Gestione patrimonio"
        title="Condomìni"
        action={canManageCondominium ? "+ Nuovo condominio" : undefined}
        onAction={canManageCondominium ? onNew : undefined}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca per nome, indirizzo, comune, referente..."
      />

      <div className="results-info">
        {condominiums.length} di{" "}
        {allCount} condomini
        visualizzati
      </div>

      <section className="cards-grid">

        {condominiums.length ===
        0 ? (
          <Empty text="Nessun condominio trovato." />
        ) : (
          condominiums.map(
            (c: Condominium) => (
              <article
                className="entity-card"
                key={c.id}
              >

                <div className="entity-icon">
                  <AppIcon name="building" size={26} />
                </div>

                <h2>
                  {c.name}
                </h2>

                <p>
                  {c.address}
                  <br />
                  {c.cap}{" "}
                  {c.city}{" "}
                  {c.province &&
                    `(${c.province})`}
                </p>

                <div className="meta">
                  <><AppIcon name="building" size={15} /> {c.units} unità</>
                </div>

                <div className="button-row">

                  <button
                    className="primary-button"
                    onClick={() =>
                      setSelected(c)
                    }
                  >
                    Dettagli
                  </button>

                  {canManageCondominium && (
                    <button
                      className="secondary-button"
                      onClick={() =>
                        onEdit(c)
                      }
                    >
                      Modifica
                    </button>
                  )}

                </div>

              </article>
            )
          )
        )}

      </section>
    </>
  );
}


/* =========================================================
   DETTAGLIO CONDOMINIO
   ========================================================= */

function CondominiumDetails(
  props: any
) {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<CondominiumMember | null>(null);
  const {
    item,
    onClose,
    onEdit,
    onDelete,
    deadlines,
    documents,
    assemblies,
    suppliers,
    activities,
    communications,
    condominiumMembers,
    condominiumUnits = [],
    onNewUnit,
    onEditUnit,
    condominiumRequests,
    onNewMember,
    onEditMember,
    onDeleteMember,
    onNewRequest,
    onEditRequest,
    onDeleteRequest,
    onStatusRequest,
    onNewCommunication,
    onPrepareEmail,
    openCondominiumEmailComposer,
    onNewDeadline,
    onNewDocument,
    onNewAssembly,
    onNewSupplier,
    onNewActivity,
    onEditDeadline,
    onEditDocument,
    onEditAssembly,
    onEditSupplier,
    onEditActivity,
    onEditCommunication,
    onDeleteDeadline,
    onDeleteDocument,
    onDeleteAssembly,
    onDeleteSupplier,
    onDeleteActivity,
    onDeleteCommunication,
    onStatusDeadline,
    onStatusAssembly,
    onStatusActivity,
    isAdministrator = false,
  } = props;

  const openDeadlines =
    deadlines.filter(
      (x: Deadline) =>
        x.status !==
        "Completata"
    ).length;

  const openActivities =
    activities.filter(
      (x: Activity) =>
        x.status !==
        "Completata"
    ).length;

  const visibleDocuments =
    documents.filter(
      (x: DocumentItem) =>
        x.publication ===
        "Condiviso"
    ).length;

  const visibleCommunications =
    communications.filter(
      (x: Communication) =>
        x.publishedToPortal
    ).length;

  const activeMembers = condominiumMembers.filter((member: CondominiumMember) => member.active);
  const openRequests = condominiumRequests.filter((request: CondominiumRequest) => request.status !== "Risolta" && request.status !== "Chiusa").length;

  return (
    <section className="detail-card">

      <div className="section-title">

        <div>

          <div className="eyebrow">
            Dati del condominio
          </div>

          <h2>
            {item.name}
          </h2>

        </div>

        <button
          className="link"
          onClick={onClose}
        >
          Torna all'elenco
        </button>

      </div>


      <div className="condominium-overview">

        <div className="overview-stat">
          <b>
            {openDeadlines}
          </b>
          <span>
            Scadenze aperte
          </span>
        </div>

        <div className="overview-stat">
          <b>
            {documents.length}
          </b>
          <span>
            Documenti
          </span>
        </div>

        <div className="overview-stat">
          <b>
            {assemblies.length}
          </b>
          <span>
            Assemblee
          </span>
        </div>

        <div className="overview-stat">
          <b>
            {openActivities}
          </b>
          <span>
            Attività aperte
          </span>
        </div>

        <div className="overview-stat">
          <b>{activeMembers.length}</b>
          <span>Condòmini attivi</span>
        </div>

        <div className="overview-stat">
          <b>{openRequests}</b>
          <span>Segnalazioni aperte</span>
        </div>

        <div className="overview-stat">
          <b>
            {visibleDocuments}
          </b>
          <span>
            Documenti condivisi
          </span>
        </div>

        <div className="overview-stat">
          <b>
            {visibleCommunications}
          </b>
          <span>
            Comunicazioni pubblicate
          </span>
        </div>

      </div>


      <InsurancePoliciesSection condominiumId={item.id} isAdministrator={isAdministrator} />

      <div className="detail-grid">

        <Detail
          label="Indirizzo"
          value={`${item.address}, ${item.cap} ${item.city}${
            item.province
              ? ` (${item.province})`
              : ""
          }`}
        />

        <Detail
          label="Codice fiscale"
          value={
            item.fiscalCode ||
            "Non inserito"
          }
        />

        <Detail
          label="Unità immobiliari"
          value={item.units}
        />

        <Detail
          label="Referente"
          value={
            item.contact ||
            "Non inserito"
          }
        />

        <Detail
          label="Email"
          value={
            item.email ||
            "Non inserita"
          }
        />

        <Detail
          label="Telefono"
          value={
            item.phone ||
            "Non inserito"
          }
        />

        <Detail
          label="Banca"
          value={
            item.bank ||
            "Non inserita"
          }
        />

        <Detail
          label="IBAN"
          value={
            item.iban ||
            "Non inserito"
          }
        />

      </div>


      <div className="notes">

        <div className="detail-label">
          Note
        </div>

        <p>
          {item.notes ||
            "Nessuna nota inserita."}
        </p>

      </div>


      <div className="button-row">

        <button
          className="primary-button"
          onClick={onEdit}
        >
          Modifica
        </button>

        <button
          className="danger-button"
          onClick={onDelete}
        >
          Elimina
        </button>

      </div>


      {isAdministrator && (
        <section className="condominium-section-card condominium-quick-actions">
          <div className="section-title">
            <div>
              <div className="eyebrow">Azioni rapide</div>
              <h2>Gestione del condominio</h2>
              <p className="section-subtitle">Crea direttamente dalla scheda le attività collegate a questo condominio.</p>
            </div>
          </div>
          <div className="quick-action-grid">
            <button className="quick-action-card" onClick={onNewDeadline}>📅<strong>Nuova scadenza</strong><span>Gestisci gli adempimenti</span></button>
            <button className="quick-action-card" onClick={onNewDocument}>📄<strong>Nuovo documento</strong><span>Archivia e condividi</span></button>
            <button className="quick-action-card" onClick={onNewAssembly}>👥<strong>Nuova assemblea</strong><span>Programma una riunione</span></button>
            <button className="quick-action-card" onClick={onNewSupplier}>🔧<strong>Nuovo fornitore</strong><span>Aggiungi un servizio</span></button>
            <button className="quick-action-card" onClick={onNewActivity}>✓<strong>Nuova attività</strong><span>Organizza il lavoro</span></button>
            <button className="quick-action-card" onClick={() => onNewCommunication(item.id)}>✉️<strong>Nuova comunicazione</strong><span>Comunica ai condòmini</span></button>
          </div>
        </section>
      )}

      <section className="condominium-section-card">
        <div className="section-title">
          <div>
            <div className="eyebrow">Patrimonio catastale e anagrafica</div>
            <h2>Unità immobiliari, pertinenze e persone associate</h2>
            <p className="section-subtitle">
              Tutte le unità previste dal condominio sono mantenute qui, anche quando non hanno ancora persone associate.
              Ogni unità può avere più proprietari e/o inquilini e le pertinenze autonome possono essere collegate all'abitazione.
            </p>
          </div>
          <div className="button-row compact">
            <span className="badge">{condominiumUnits.filter((unit: CondominiumUnit) => unit.active).length} unità</span>
            {isAdministrator && (
              <>
                <button className="secondary-button" type="button" onClick={() => onNewUnit(item.id, "Garage")}>+ Garage</button>
                <button className="secondary-button" type="button" onClick={() => onNewUnit(item.id, "Cantina")}>+ Cantina</button>
              </>
            )}
          </div>
        </div>

        <div className="related-list">
          {condominiumUnits.filter((unit: CondominiumUnit) => unit.active).length === 0 ? (
            <Empty text="Nessuna unità immobiliare disponibile." />
          ) : (
            condominiumUnits
              .filter((unit: CondominiumUnit) => unit.active)
              .map((unit: CondominiumUnit) => {
                const linkedMembers = activeMembers.filter(
                  (member: CondominiumMember) =>
                    member.unitId === unit.id ||
                    member.apartment.trim().toLowerCase() === unit.unitCode.trim().toLowerCase()
                );
                const owners = linkedMembers.filter((member: CondominiumMember) => member.role === "Proprietario");
                const tenants = linkedMembers.filter((member: CondominiumMember) => member.role === "Inquilino");
                const ownerMembers = activeMembers.filter(
                  (member: CondominiumMember) =>
                    Array.isArray(unit.ownerMemberIds) && unit.ownerMemberIds.includes(member.id)
                );
                const externalOwners = Array.isArray(unit.externalOwners) ? unit.externalOwners : [];
                const incorporated = unit.incorporatedInUnitId
                  ? condominiumUnits.find((parent: CondominiumUnit) => parent.id === unit.incorporatedInUnitId)
                  : null;
                const ownerLabels = [
                  ...ownerMembers.map((m: CondominiumMember) => m.firstName + " " + m.lastName),
                  ...externalOwners
                    .map((o: ExternalUnitOwner) => [o.firstName, o.lastName].filter(Boolean).join(" "))
                    .filter(Boolean),
                ];

                return (
                  <div className="request-card" key={unit.id}>
                    <div className="request-main">
                      <b>
                        {unit.unitType === "Garage"
                          ? "🚗"
                          : unit.unitType === "Cantina"
                            ? "📦"
                            : "🏠"}{" "}
                        Unità {unit.unitCode}
                      </b>
                      <span>
                        {unit.unitType} · {unit.cadastralCategory || "Categoria non inserita"} ·{" "}
                        {unit.millesimi ? unit.millesimi + " millesimi" : "Millesimi non inseriti"}
                      </span>
                      <small>
                        {unit.cadastralAutonomous
                          ? "Unità catastalmente autonoma"
                          : "Incorporata catastalmente"}
                        {incorporated ? " · collegata a " + incorporated.unitCode : ""}
                      </small>

                      <p>
                        <strong>
                          {linkedMembers.length}{" "}
                          {linkedMembers.length === 1 ? "persona associata" : "persone associate"}
                        </strong>
                        {" · "}
                        {owners.length} proprietari · {tenants.length} inquilini
                      </p>

                      {ownerLabels.length > 0 && (
                        <p>
                          <strong>Proprietari:</strong> {ownerLabels.join(" | ")}
                        </p>
                      )}

                      {linkedMembers.length > 0 && (
                        <p>
                          {linkedMembers
                            .map(
                              (member: CondominiumMember) =>
                                `${member.firstName} ${member.lastName} · ${member.role}${member.email ? ` · ${member.email}` : ""}`
                            )
                            .join(" | ")}
                        </p>
                      )}

                      {linkedMembers.length === 0 && ownerLabels.length === 0 && (
                        <p style={{ color: "#b45309" }}>
                          <strong>Nessuna persona associata.</strong> L'unità è comunque già presente nel patrimonio del condominio.
                        </p>
                      )}
                    </div>

                    <div className="request-actions">
                      <button
                        className="secondary-button small"
                        type="button"
                        onClick={() => setSelectedUnit(unit.id)}
                      >
                        Dettagli
                      </button>
                      {isAdministrator && (
                        <>
                          <button
                            className="secondary-button small"
                            type="button"
                            onClick={() => onEditUnit(unit)}
                          >
                            Modifica unità
                          </button>
                          <button
                            className="primary-button small"
                            type="button"
                            onClick={() => onNewMember(item.id, unit.unitCode)}
                          >
                            + Aggiungi persona
                          </button>
                          <button
                            className="secondary-button small"
                            type="button"
                            onClick={() => onDeleteUnit(unit)}
                            title="Elimina unità"
                          >
                            Elimina unità
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>

      {selectedUnit && (() => {
        const detailUnit = condominiumUnits.find((u: CondominiumUnit) => u.id === selectedUnit);
        if (!detailUnit) return null;
        const detailPeople = activeMembers.filter((m: CondominiumMember) =>
          m.unitId === detailUnit.id || m.apartment.trim().toLowerCase() === detailUnit.unitCode.trim().toLowerCase()
        );
        return (
          <Modal onClose={() => setSelectedUnit(null)}>
            <ModalTitle title={`Dettagli unità ${detailUnit.unitCode}`} />
            <div className="detail-grid">
              <Detail label="Unità" value={detailUnit.unitCode} />
              <Detail label="Tipologia" value={detailUnit.unitType} />
              <Detail label="Categoria catastale" value={detailUnit.cadastralCategory || "Non inserita"} />
              <Detail label="Millesimi" value={detailUnit.millesimi || "Non inseriti"} />
              <Detail label="Autonomia catastale" value={detailUnit.cadastralAutonomous ? "Sì" : "No"} />
              <Detail label="Persone associate" value={String(detailPeople.length)} />
            </div>
            <div className="notes">
              <div className="detail-label">Persone associate</div>
              {detailPeople.length ? (
                <p>{detailPeople.map((m: CondominiumMember) => `${m.firstName} ${m.lastName} · ${m.role}${m.email ? ` · ${m.email}` : ""}`).join(" | ")}</p>
              ) : (
                <p>Nessuna persona associata.</p>
              )}
            </div>
            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={() => setSelectedUnit(null)}>Chiudi</button>
              {isAdministrator && (
                <>
                  <button className="primary-button" type="button" onClick={() => { setSelectedUnit(null); onNewMember(item.id, detailUnit.unitCode); }}>
                    + Aggiungi persona
                  </button>
                  <button className="secondary-button" type="button" onClick={() => { setSelectedUnit(null); onDeleteUnit(detailUnit); }}>
                    Elimina unità
                  </button>
                </>
              )}
            </div>
          </Modal>
        );
      })()}

      <section className="condominium-section-card">
        <div className="section-title">
          <div><div className="eyebrow">Anagrafica</div><h2>Condòmini</h2><p className="section-subtitle">Gestisci anagrafica, recapiti, interno e qualifica.</p></div>
          <div className="button-row compact condominium-members-actions">
            <button className="secondary-button" onClick={() => onNewCommunication(item.id)}>📢 Nuova comunicazione</button>
            <button className="primary-button" type="button" onClick={() => openCondominiumEmailComposer(item.id, undefined, "Tutti")}>
              ✉️ Scrivi a tutti
            </button>
            <button
              className="secondary-button condominium-add-member-button"
              type="button"
              onClick={() => onNewMember(item.id)}
            >
              + Aggiungi condòmino
            </button>
          </div>
        </div>
        <div className="condominium-member-list">
          {activeMembers.length === 0 ? <Empty text="Nessun condòmino presente nell'anagrafica." /> : activeMembers.map((member: CondominiumMember) => (
            <div className="condominium-member-card" key={member.id}>
              <button
                type="button"
                className="member-main member-main-button"
                onClick={() => setSelectedMemberDetail(member)}
                aria-label={`Visualizza il dettaglio di ${member.firstName} ${member.lastName}`}
              >
                <b>{member.firstName} {member.lastName}</b>
                <span>{member.apartment} · {member.role}</span>
                <small>{member.phone || "Telefono non inserito"}{member.email ? ` · ${member.email}` : " · E-mail non inserita"}</small>
              </button>
              <div className="related-actions">
                <button className="secondary-button small" type="button" onClick={() => setSelectedMemberDetail(member)}>Dettagli</button>
                <button className="secondary-button small" type="button" onClick={() => openCondominiumEmailComposer(item.id, [member.id], "Selezionati")}>
                  ✉️ Scrivi
                </button>
                <button className="secondary-button small" type="button" onClick={() => onEditMember(member)}>
                  Modifica
                </button>
                <button className="mini-danger" type="button" onClick={() => onDeleteMember(member.id)} aria-label="Elimina condòmino">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedMemberDetail && (
        <Modal onClose={() => setSelectedMemberDetail(null)}>
          <ModalTitle title="Dettaglio condòmino" />
          <div className="detail-grid">
            <Detail label="Nome e cognome" value={`${selectedMemberDetail.firstName} ${selectedMemberDetail.lastName}`} />
            <Detail label="Qualifica" value={selectedMemberDetail.role} />
            <Detail label="Unità abitativa" value={selectedMemberDetail.apartment || "Non associata"} />
            <Detail label="Codice fiscale" value={selectedMemberDetail.fiscalCode || "Non inserito"} />
            <Detail label="Telefono" value={selectedMemberDetail.phone || "Non inserito"} />
            <Detail label="E-mail" value={selectedMemberDetail.email || "Non inserita"} />
            <Detail label="Stato" value={selectedMemberDetail.active ? "Attivo" : "Disattivato"} />
          </div>
          <div className="notes">
            <div className="detail-label">Accesso Portale</div>
            <p>{selectedMemberDetail.userId ? "Attivo e associato all'account BETHAG." : "Non ancora attivato."}</p>
          </div>
          <div className="notes">
            <div className="detail-label">Note</div>
            <p>{selectedMemberDetail.notes || "Nessuna nota inserita."}</p>
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => setSelectedMemberDetail(null)}>Chiudi</button>
            <button className="secondary-button" type="button" onClick={() => openCondominiumEmailComposer(item.id, [selectedMemberDetail.id], "Selezionati")}>
              ✉️ Scrivi
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                const member = selectedMemberDetail;
                setSelectedMemberDetail(null);
                onEditMember(member);
              }}
            >
              Modifica condòmino
            </button>
          </div>
        </Modal>
      )}

      <section className="condominium-section-card">
        <div className="section-title"><div><div className="eyebrow">Assistenza</div><h2>Segnalazioni e richieste</h2><p className="section-subtitle">Raccogli le richieste dei condòmini e gestiscine lo stato fino alla chiusura.</p></div>{isAdministrator && <button className="primary-button" onClick={() => onNewRequest(item.id)}>+ Nuova segnalazione</button>}</div>
        <div className="request-summary"><span><b>{openRequests}</b> aperte</span><span><b>{condominiumRequests.length}</b> totali</span></div>
        <div className="related-list">
          {condominiumRequests.length === 0 ? <Empty text="Nessuna segnalazione o richiesta ricevuta." /> : condominiumRequests.map((request: CondominiumRequest) => {
            const member = condominiumMembers.find((x: CondominiumMember) => x.id === request.memberId);
            return <div className="request-card" key={request.id}>
              <div className="request-main"><b>{request.category}</b><span>{member ? `${member.firstName} ${member.lastName}` : "Richiedente non indicato"}{` · ${formatDate(request.date)}`}</span><p>{request.description}</p>{(request.supplierId || request.activityId) && <small style={{display:"block",marginTop:8,color:"#64748b"}}>{request.supplierId ? `🔧 Fornitore: ${suppliers.find((s: Supplier) => s.id === request.supplierId)?.name ?? "non disponibile"}` : ""}{request.supplierId && request.activityId ? " · " : ""}{request.activityId ? `✓ Attività: ${activities.find((a: Activity) => a.id === request.activityId)?.title ?? "non disponibile"}` : ""}</small>}{request.response && <div className="request-response"><strong>Risposta amministratore:</strong> {request.response}</div>}</div>
              <div className="request-actions"><Badge value={request.status} /><Badge value={`Priorità ${request.priority}`} />{isAdministrator && <><select value={request.status} onChange={(e) => onStatusRequest(request.id, e.target.value as RequestStatus)}><option>Nuova</option><option>In lavorazione</option><option>Risolta</option><option>Chiusa</option></select><button className="secondary-button small" onClick={() => onEditRequest(request)}>Dettagli / modifica</button><button className="mini-danger" onClick={() => onDeleteRequest(request.id)}>×</button></>}</div>
            </div>;
          })}
        </div>
      </section>

      <RelatedSection
        title="Scadenze"
        count={deadlines.length}
      >

        {deadlines.length ===
        0 ? (
          <Empty text="Nessuna scadenza collegata." />
        ) : (
          deadlines.map(
            (d: Deadline) => (
              <RelatedRow
              canManage={isAdministrator}
                key={d.id}
                title={d.title}
                subtitle={`${formatDate(
                  d.dueDate
                )} · ${
                  d.category
                } · ${
                  d.amount
                    ? currency(
                        d.amount
                      )
                    : "Nessun importo"
                }`}
                badge={d.status}
                onEdit={() =>
                  onEditDeadline(
                    d
                  )
                }
                onDelete={() =>
                  onDeleteDeadline(
                    d.id
                  )
                }
              >

                <select
                  value={d.status}
                  onChange={(e) =>
                    onStatusDeadline(
                      d.id,
                      e.target
                        .value as DeadlineStatus
                    )
                  }
                >
                  <option>
                    Da fare
                  </option>

                  <option>
                    In scadenza
                  </option>

                  <option>
                    Completata
                  </option>

                </select>

              </RelatedRow>
            )
          )
        )}

      </RelatedSection>


      <RelatedSection
        title="Documenti"
        count={documents.length}
      >

        {documents.length ===
        0 ? (
          <Empty text="Nessun documento collegato." />
        ) : (
          documents.map(
            (d: DocumentItem) => (
              <RelatedRow
              canManage={isAdministrator}
                key={d.id}
                title={d.name}
                subtitle={`${d.category} · ${formatDate(
                  d.date
                )} · ${
                  d.size ||
                  "Dimensione non disponibile"
                }`}
                badge={
                  d.publication
                }
                onEdit={() =>
                  onEditDocument(
                    d
                  )
                }
                onDelete={() =>
                  onDeleteDocument(
                    d.id
                  )
                }
              />
            )
          )
        )}

      </RelatedSection>


      <RelatedSection
        title="Assemblee"
        count={assemblies.length}
      >

        {assemblies.length ===
        0 ? (
          <Empty text="Nessuna assemblea collegata." />
        ) : (
          assemblies.map(
            (a: Assembly) => (
              <RelatedRow
              canManage={isAdministrator}
                key={a.id}
                title={a.title}
                subtitle={`${formatDate(
                  a.date
                )} · ${
                  a.time ||
                  "Ora non definita"
                } · ${
                  a.place ||
                  "Luogo non definito"
                }`}
                badge={a.status}
                onEdit={() =>
                  onEditAssembly(
                    a
                  )
                }
                onDelete={() =>
                  onDeleteAssembly(
                    a.id
                  )
                }
              />
            )
          )
        )}

      </RelatedSection>


      <RelatedSection
        title="Fornitori"
        count={suppliers.length}
      >

        {suppliers.length ===
        0 ? (
          <Empty text="Nessun fornitore collegato." />
        ) : (
          suppliers.map(
            (s: Supplier) => (
              <RelatedRow
              canManage={isAdministrator}
                key={s.id}
                title={s.name}
                subtitle={`${s.service} · ${
                  s.phone ||
                  "Telefono non inserito"
                }`}
                onEdit={() =>
                  onEditSupplier(
                    s
                  )
                }
                onDelete={() =>
                  onDeleteSupplier(
                    s.id
                  )
                }
              />
            )
          )
        )}

      </RelatedSection>


      <RelatedSection
        title="Attività"
        count={activities.length}
      >

        {activities.length ===
        0 ? (
          <Empty text="Nessuna attività collegata." />
        ) : (
          activities.map(
            (a: Activity) => (
              <RelatedRow
              canManage={isAdministrator}
                key={a.id}
                title={a.title}
                subtitle={`Scadenza ${formatDate(
                  a.dueDate
                )}`}
                badge={
                  a.priority
                }
                onEdit={() =>
                  onEditActivity(
                    a
                  )
                }
                onDelete={() =>
                  onDeleteActivity(
                    a.id
                  )
                }
              >

                <select
                  value={a.status}
                  onChange={(e) =>
                    onStatusActivity(
                      a.id,
                      e.target
                        .value as ActivityStatus
                    )
                  }
                >
                  <option>
                    Aperta
                  </option>

                  <option>
                    In corso
                  </option>

                  <option>
                    Completata
                  </option>

                </select>

              </RelatedRow>
            )
          )
        )}

      </RelatedSection>


      <RelatedSection
        title="Comunicazioni"
        count={communications.length}
      >

        {communications.length ===
        0 ? (
          <Empty text="Nessuna comunicazione collegata." />
        ) : (
          communications.map(
            (
              c: Communication
            ) => (
              <RelatedRow
              canManage={isAdministrator}
                key={c.id}
                title={c.title}
                subtitle={`${formatDate(
                  c.date
                )} · ${
                  c.audience
                }`}
                badge={
                  c.status
                }
                onEdit={() =>
                  onEditCommunication(
                    c
                  )
                }
                onDelete={() =>
                  onDeleteCommunication(
                    c.id
                  )
                }
              />
            )
          )
        )}

      </RelatedSection>

    </section>
  );
}


function RelatedSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="related-section">

      <div className="related-title">

        <h3>
          {title}
        </h3>

        <span>
          {count}
        </span>

      </div>

      <div className="related-list">
        {children}
      </div>

    </div>
  );
}


function RelatedRow({
  title,
  subtitle,
  badge,
  onEdit,
  onDelete,
  canManage = true,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onEdit: () => void;
  onDelete: () => void;
  canManage?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="related-row">

      <div className="related-main">

        <b>
          {title}
        </b>

        <small>
          {subtitle}
        </small>

        {badge && (
          <Badge
            value={badge}
          />
        )}

      </div>

      <div className="related-actions">

        {canManage && children}

        {canManage && (
          <>
            <button
              className="secondary-button small"
              onClick={onEdit}
            >
              Modifica
            </button>

            <button
              className="mini-danger"
              onClick={onDelete}
            >
              ×
            </button>
          </>
        )}

      </div>

    </div>
  );
}


function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <div className="detail-label">
        {label}
      </div>

      <div className="detail-value">
        {value}
      </div>

    </div>
  );
}


/* =========================================================
   DOCUMENTI
   ========================================================= */

function DocumentsPage({
  documents,
  search,
  setSearch,
  onNew,
  onEdit,
  onDelete,
  condominiumName,
  onAI,
  onConfirmAI,
  onPublication,
  plan,
  isAdministrator = false,
}: any) {
  const [categoryFilter, setCategoryFilter] = useState("Tutte");
  const [sourceFilter, setSourceFilter] = useState("Tutti");
  const [publicationFilter, setPublicationFilter] = useState("Tutte");
  const [aiFilter, setAiFilter] = useState("Tutti");

  const filtered = documents.filter((d: DocumentItem) => {
    const textMatch = `${d.name} ${d.category} ${condominiumName(d.condominiumId)} ${d.notes} ${d.source}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return textMatch &&
      (categoryFilter === "Tutte" || d.category === categoryFilter) &&
      (sourceFilter === "Tutti" || d.source === sourceFilter) &&
      (publicationFilter === "Tutte" || d.publication === publicationFilter) &&
      (aiFilter === "Tutti" || d.aiStatus === aiFilter);
  });
  const categories = Array.from(new Set(documents.map((d: DocumentItem) => d.category).filter(Boolean))).sort();
  const totalShared = documents.filter((d: DocumentItem) => d.publication === "Condiviso").length;
  const totalVerify = documents.filter((d: DocumentItem) => d.aiStatus === "Da verificare").length;
  const totalAI = documents.filter((d: DocumentItem) => d.aiStatus !== "Non elaborato").length;

  return (
    <>

      {isAdministrator ? (
        <PageHeader eyebrow="Archivio digitale" title="Documenti" action="+ Nuovo documento" onAction={onNew} />
      ) : (
        <PageHeader eyebrow="Archivio digitale" title="Documenti" />
      )}

      <div className="feature-banner">

        <div>

          <b>
            ✨ Acquisizione intelligente
          </b>

          <span>
            PDF · Word · Excel · immagini
            · altri formati
          </span>

        </div>

        <span className="feature-plan">
          {hasFeature(
            plan,
            "plus"
          )
            ? "AI disponibile"
            : "Da Plus"}
        </span>

      </div>


      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca documento, categoria o condominio..."
      />

      <div className="quick-stats">
        <div className="quick-stat"><b>{documents.length}</b><span>Documenti</span></div>
        <div className="quick-stat"><b>{totalShared}</b><span>Condivisi</span></div>
        <div className="quick-stat"><b>{totalAI}</b><span>Analizzati AI</span></div>
        <div className="quick-stat"><b>{totalVerify}</b><span>Da verificare</span></div>
      </div>

      <div className="filter-bar">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option>Tutte</option>
          {categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option>Tutti</option>
          {(["Manuale", "PDF", "Word", "Excel", "Immagine", "Audio", "AI"] as DocumentSource[]).map((source) => <option key={source}>{source}</option>)}
        </select>
        <select value={publicationFilter} onChange={(e) => setPublicationFilter(e.target.value)}>
          <option>Tutte</option><option>Privato</option><option>Condiviso</option>
        </select>
        <select value={aiFilter} onChange={(e) => setAiFilter(e.target.value)}>
          <option>Tutti</option><option>Non elaborato</option><option>In elaborazione</option><option>Da verificare</option><option>Confermato</option>
        </select>
      </div>

      <div className="document-grid">

        {filtered.map(
          (d: DocumentItem) => (
            <article
              className="document-card"
              key={d.id}
            >

              <div className="document-icon">
                {d.source ===
                "Immagine"
                  ? "🖼️"
                  : d.source ===
                    "Word"
                  ? "📝"
                  : d.source ===
                    "Excel"
                  ? "📊"
                  : d.source ===
                    "PDF"
                  ? "📕"
                  : "📄"}
              </div>

              <h3>
                {d.name}
              </h3>

              <p>
                {condominiumName(
                  d.condominiumId
                )}
              </p>

              <div className="document-meta">

                <span>
                  {d.category}
                </span>

                <span>
                  {d.source}
                </span>

                <span>
                  {formatDate(
                    d.date
                  )}
                </span>

              </div>


              <div className="document-status">

                <Badge
                  value={
                    d.aiStatus
                  }
                />

                <Badge
                  value={
                    d.publication
                  }
                />

              </div>


              {d.aiSummary && (
                <div className="ai-summary">

                  <b>
                    Analisi AI
                  </b>

                  <p>
                    {d.aiSummary}
                  </p>

                </div>
              )}


              {isAdministrator && (
                <div className="button-row">
                  <button className="secondary-button" onClick={() => onEdit(d)}>Modifica</button>
                  <button className="secondary-button" onClick={() => onAI(d)}>✨ AI</button>
                </div>
              )}


              {isAdministrator && d.aiStatus === "Da verificare" && (
                <button
                  className="primary-button full-button"
                  onClick={() =>
                    onConfirmAI(
                      d.id
                    )
                  }
                >
                  Conferma dati AI
                </button>
              )}


              {isAdministrator && (
                <div className="document-bottom">

                <button
                  className="link"
                  onClick={() =>
                    onPublication(
                      d.id
                    )
                  }
                >
                  {d.publication ===
                  "Condiviso"
                    ? <><AppIcon name="lock" size={16} /> Rendi privato</>
                    : <><AppIcon name="users" size={16} /> Condividi con condomini</>}
                </button>

                <button
                  className="mini-danger"
                  onClick={() =>
                    onDelete(d.id)
                  }
                >
                  Elimina
                </button>
                </div>
              )}


            </article>
          )
        )}

      </div>


      {filtered.length ===
        0 && (
        <div className="card">
          <Empty text="Nessun documento trovato." />
        </div>
      )}

    </>
  );
}


/* =========================================================
   SCADENZE
   ========================================================= */

function DeadlinesPage({
  deadlines,
  search,
  setSearch,
  onNew,
  onEdit,
  onDelete,
  onStatus,
  condominiumName,
  isAdministrator = false,
}: any) {
  const [statusFilter, setStatusFilter] = useState("Tutti");
  const [categoryFilter, setCategoryFilter] = useState("Tutte");
  const todayISO = localISODate();
  const filtered = deadlines
      .filter((d: Deadline) => {
        const textMatch = `${d.title} ${d.category} ${condominiumName(d.condominiumId)} ${d.notes}`.toLowerCase().includes(search.toLowerCase());
        const effectiveStatus = d.status !== "Completata" && d.dueDate && d.dueDate < todayISO ? "Scaduta" : d.status;
        return textMatch && (statusFilter === "Tutti" || effectiveStatus === statusFilter) && (categoryFilter === "Tutte" || d.category === categoryFilter);
      })
      .sort(
        (
          a: Deadline,
          b: Deadline
        ) =>
          a.dueDate.localeCompare(
            b.dueDate
          )
      );

  return (
    <>

      {isAdministrator ? (
        <PageHeader eyebrow="Pianificazione" title="Scadenze" action="+ Nuova scadenza" onAction={onNew} />
      ) : (
        <PageHeader eyebrow="Pianificazione" title="Scadenze" />
      )}

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca scadenza, categoria o condominio..."
      />

      <div className="quick-stats">
        <div className="quick-stat"><b>{deadlines.length}</b><span>Totali</span></div>
        <div className="quick-stat"><b>{deadlines.filter((d: Deadline) => d.status === "Completata").length}</b><span>Completate</span></div>
        <div className="quick-stat"><b>{deadlines.filter((d: Deadline) => d.status !== "Completata" && d.dueDate < todayISO).length}</b><span>Scadute</span></div>
        <div className="quick-stat"><b>{deadlines.filter((d: Deadline) => d.status === "In scadenza").length}</b><span>In scadenza</span></div>
      </div>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Tutti</option><option>Da fare</option><option>In scadenza</option><option>Scaduta</option><option>Completata</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option>Tutte</option>
          {Array.from(new Set(deadlines.map((d: Deadline) => d.category).filter(Boolean))).sort().map((category) => <option key={category}>{category}</option>)}
        </select>
      </div>

      <div className="cards-list">

        {filtered.map(
          (d: Deadline) => (
            <article
              className="row-card"
              key={d.id}
            >

              <div>

                <b>
                  {d.title}
                </b>

                <small>
                  {condominiumName(
                    d.condominiumId
                  )}{" "}
                  ·{" "}
                  {d.category}
                </small>

                <span>
                  {d.amount
                    ? currency(
                        d.amount
                      )
                    : "Nessun importo"}{" "}
                  ·{" "}
                  {formatDate(
                    d.dueDate
                  )}
                </span>

                {d.notes && (
                  <small>
                    {d.notes}
                  </small>
                )}

              </div>


              <div className="row-actions">
                <Badge
                  value={
                    d.status !== "Completata" && d.dueDate && d.dueDate < todayISO
                      ? "Scaduta"
                      : d.status
                  }
                />
                {isAdministrator && (
                  <>
                    <select
                  value={d.status}
                  onChange={(e) =>
                    onStatus(
                      d.id,
                      e.target
                        .value as DeadlineStatus
                    )
                  }
                >
                  <option>
                    Da fare
                  </option>
                  <option>
                    In scadenza
                  </option>
                  <option>
                    Completata
                  </option>
                </select>

                <button
                  className="secondary-button small"
                  onClick={() =>
                    onEdit(d)
                  }
                >
                  Modifica
                </button>

                <button
                  className="mini-danger"
                  onClick={() =>
                    onDelete(d.id)
                  }
                >
                  ×
                    </button>
                  </>
                )}
              </div>

            </article>
          )
        )}

        {filtered.length ===
          0 && (
          <Empty text="Nessuna scadenza trovata." />
        )}

      </div>

    </>
  );
}


/* =========================================================
   ASSEMBLEE
   ========================================================= */

function AssembliesPage({
  assemblies,
  search,
  setSearch,
  onNew,
  onEdit,
  onDelete,
  onStatus,
  condominiumName,
  onAudio,
  onGenerateMinutes,
  onConfirmMinutes,
  onPublication,
  isAdministrator = false,
}: any) {
  const filtered =
    assemblies
      .filter(
        (a: Assembly) =>
          `${a.title} ${
            a.place
          } ${a.status} ${
            condominiumName(
              a.condominiumId
            )
          } ${
            a.notes
          }`
            .toLowerCase()
            .includes(
              search.toLowerCase()
            )
      )
      .sort(
        (
          a: Assembly,
          b: Assembly
        ) =>
          a.date.localeCompare(
            b.date
          )
      );

  return (
    <>

      {isAdministrator ? (
        <PageHeader eyebrow="Riunioni" title="Assemblee" action="+ Nuova assemblea" onAction={onNew} />
      ) : (
        <PageHeader eyebrow="Riunioni" title="Assemblee" />
      )}

      <div className="feature-banner">

        <div>

          <b>
            🎙️ Assemblee intelligenti
          </b>

          <span>
            Audio → trascrizione → bozza
            verbale → verifica → pubblicazione
          </span>

        </div>

        <span className="feature-plan">
          Professional
        </span>

      </div>


      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca assemblea, luogo o condominio..."
      />


      <div className="cards-list">

        {filtered.map(
          (a: Assembly) => (
            <article
              className="row-card assembly-card"
              key={a.id}
            >

              <div className="assembly-main">

                <b>
                  {a.title}
                </b>

                <small>
                  {condominiumName(
                    a.condominiumId
                  )}
                </small>

                <span>
                  📅{" "}
                  {formatDate(
                    a.date
                  )}{" "}
                  ·{" "}
                  {a.time ||
                    "Ora non definita"}{" "}
                  ·{" "}
                  {a.place ||
                    "Luogo da definire"}
                </span>


                <div className="assembly-statuses">

                  <Badge
                    value={
                      a.status
                    }
                  />

                  <Badge
                    value={
                      a.transcriptionStatus
                    }
                  />

                  <Badge
                    value={
                      a.minutesStatus
                    }
                  />

                </div>


                {a.audioName && (
                  <small>
                    🎙️{" "}
                    {a.audioName}
                  </small>
                )}


                {a.minutesDraft && (
                  <div className="minutes-preview">

                    <b>
                      Bozza verbale
                    </b>

                    <p>
                      {
                        a.minutesDraft
                      }
                    </p>

                  </div>
                )}

              </div>


              {isAdministrator && (
                <div className="assembly-actions">

                <select
                  value={a.status}
                  onChange={(e) =>
                    onStatus(
                      a.id,
                      e.target
                        .value as AssemblyStatus
                    )
                  }
                >
                  <option>
                    Programmato
                  </option>

                  <option>
                    Svolto
                  </option>

                  <option>
                    Annullato
                  </option>
                </select>


                <label className="file-button">

                  🎙️ Acquisisci audio

                  <input
                    type="file"
                    accept="audio/*,.m4a,.mp3,.wav"
                    onChange={(e) => {

                      const file =
                        e.target
                          .files?.[0];

                      if (file) {
                        onAudio(
                          a,
                          file
                        );
                      }

                      e.currentTarget.value =
                        "";

                    }}
                  />

                </label>


                <button
                  className="secondary-button small"
                  onClick={() =>
                    onGenerateMinutes(
                      a
                    )
                  }
                >
                  ✨ Genera verbale
                </button>


                {a.minutesStatus ===
                  "Da verificare" && (
                  <button
                    className="primary-button small-button"
                    onClick={() =>
                      onConfirmMinutes(
                        a.id
                      )
                    }
                  >
                    Conferma verbale
                  </button>
                )}


                <button
                  className="secondary-button small"
                  onClick={() =>
                    onPublication(
                      a.id
                    )
                  }
                >
                  {a.publishedToPortal
                    ? <><AppIcon name="lock" size={16} /> Nascondi</>
                    : <><AppIcon name="users" size={16} /> Pubblica</>}
                </button>


                <button
                  className="secondary-button small"
                  onClick={() =>
                    onEdit(a)
                  }
                >
                  Modifica
                </button>


                <button
                  className="mini-danger"
                  onClick={() =>
                    onDelete(a.id)
                  }
                >
                  ×
                </button>

              </div>
              )}

            </article>
          )
        )}


        {filtered.length ===
          0 && (
          <Empty text="Nessuna assemblea trovata." />
        )}

      </div>

    </>
  );
}


/* =========================================================
   FORNITORI
   ========================================================= */

function SuppliersPage({
  suppliers,
  search,
  setSearch,
  onNew,
  onEdit,
  onDelete,
  condominiumName,
  isAdministrator = false,
}: any) {
  const filtered =
    suppliers.filter(
      (s: Supplier) =>
        `${s.name} ${
          s.service
        } ${s.phone} ${
          s.email
        } ${condominiumName(
          s.condominiumId
        )} ${
          s.notes
        }`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  return (
    <>

      {isAdministrator ? (
        <PageHeader eyebrow="Gestione fornitori" title="Fornitori" action="+ Nuovo fornitore" onAction={onNew} />
      ) : (
        <PageHeader eyebrow="Gestione fornitori" title="Fornitori" />
      )}

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca fornitore, servizio o condominio..."
      />

      <div className="quick-stats">
        <div className="quick-stat"><b>{suppliers.length}</b><span>Fornitori</span></div>
        <div className="quick-stat"><b>{suppliers.filter((s: Supplier) => s.condominiumId).length}</b><span>Associati</span></div>
        <div className="quick-stat"><b>{suppliers.filter((s: Supplier) => s.email.trim()).length}</b><span>Con e-mail</span></div>
        <div className="quick-stat"><b>{suppliers.filter((s: Supplier) => s.phone.trim()).length}</b><span>Con telefono</span></div>
      </div>

      <div className="cards-grid">

        {filtered.map(
          (s: Supplier) => (
            <article
              className="entity-card"
              key={s.id}
            >

              <div className="entity-icon">
                🔧
              </div>

              <h2>
                {s.name}
              </h2>

              <p>
                {s.service}
              </p>

              <div className="meta">
                {s.phone ||
                  "Telefono non inserito"}
                <br />
                {s.email ||
                  "Email non inserita"}
              </div>

              <small>
                {s.condominiumId
                  ? condominiumName(
                      s.condominiumId
                    )
                  : "Tutti i condomini"}
              </small>

              {s.notes && (
                <p className="small-note">
                  {s.notes}
                </p>
              )}

              {isAdministrator && (
                <div className="button-row">
                  <button className="secondary-button" onClick={() => onEdit(s)}>Modifica</button>
                  <button className="danger-button" onClick={() => onDelete(s.id)}>Elimina</button>
                </div>
              )}

            </article>
          )
        )}

      </div>


      {filtered.length ===
        0 && (
        <div className="card">
          <Empty text="Nessun fornitore trovato." />
        </div>
      )}

    </>
  );
}


/* =========================================================
   ATTIVITÀ
   ========================================================= */

function ActivitiesPage({
  activities,
  search,
  setSearch,
  onNew,
  onEdit,
  onDelete,
  onStatus,
  condominiumName,
  isAdministrator = false,
}: any) {
  const [statusFilter, setStatusFilter] = useState("Tutti");
  const [priorityFilter, setPriorityFilter] = useState("Tutte");
  const filtered = activities
      .filter((a: Activity) => {
        const textMatch = `${a.title} ${a.priority} ${a.status} ${condominiumName(a.condominiumId)} ${a.notes}`.toLowerCase().includes(search.toLowerCase());
        return textMatch && (statusFilter === "Tutti" || a.status === statusFilter) && (priorityFilter === "Tutte" || a.priority === priorityFilter);
      })
      .sort(
        (
          a: Activity,
          b: Activity
        ) =>
          (
            a.dueDate ||
            "9999"
          ).localeCompare(
            b.dueDate ||
              "9999"
          )
      );

  return (
    <>

      {isAdministrator ? (
        <PageHeader eyebrow="Organizzazione" title="Attività" action="+ Nuova attività" onAction={onNew} />
      ) : (
        <PageHeader eyebrow="Organizzazione" title="Attività" />
      )}

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca attività, priorità o condominio..."
      />

      <div className="quick-stats">
        <div className="quick-stat"><b>{activities.length}</b><span>Totali</span></div>
        <div className="quick-stat"><b>{activities.filter((a: Activity) => a.status === "Aperta").length}</b><span>Aperte</span></div>
        <div className="quick-stat"><b>{activities.filter((a: Activity) => a.status === "In corso").length}</b><span>In corso</span></div>
        <div className="quick-stat"><b>{activities.filter((a: Activity) => a.priority === "Alta" && a.status !== "Completata").length}</b><span>Alta priorità</span></div>
      </div>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>Tutti</option><option>Aperta</option><option>In corso</option><option>Completata</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option>Tutte</option><option>Bassa</option><option>Media</option><option>Alta</option>
        </select>
      </div>

      <div className="cards-list">

        {filtered.map(
          (a: Activity) => (
            <article
              className="row-card"
              key={a.id}
            >

              <div>

                <b>
                  {a.title}
                </b>

                <small>
                  {condominiumName(
                    a.condominiumId
                  )}{" "}
                  · Scadenza{" "}
                  {formatDate(
                    a.dueDate
                  )}
                </small>

                <span>
                  <Badge
                    value={
                      a.priority
                    }
                  />{" "}
                  {a.notes ||
                    "Nessuna nota"}
                </span>

              </div>


              {isAdministrator && (
                <div className="row-actions">
                <select
                  value={a.status}
                  onChange={(e) =>
                    onStatus(
                      a.id,
                      e.target
                        .value as ActivityStatus
                    )
                  }
                >
                  <option>
                    Aperta
                  </option>

                  <option>
                    In corso
                  </option>

                  <option>
                    Completata
                  </option>
                </select>


                <button
                  className="secondary-button small"
                  onClick={() =>
                    onEdit(a)
                  }
                >
                  Modifica
                </button>


                <button
                  className="mini-danger"
                  onClick={() => onDelete(a.id)}
                >
                  ×
                </button>
                </div>
              )}


            </article>
          )
        )}


        {filtered.length ===
          0 && (
          <Empty text="Nessuna attività trovata." />
        )}

      </div>

    </>
  );
}


/* =========================================================
   COMUNICAZIONI
   ========================================================= */

function CommunicationsPage({
  communications,
  search,
  setSearch,
  condominiumName,
  onNew,
  onEdit,
  onDelete,
  onPublication,
}: any) {
  const filtered =
    communications.filter(
      (c: Communication) =>
        `${c.title} ${
          c.body
        } ${
          c.audience
        } ${
          c.status
        } ${
          c.condominiumId
            ? condominiumName(
                c.condominiumId
              )
            : "Tutti"
        }`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  return (
    <>

      {isAdministrator ? (
        <PageHeader
          eyebrow="Comunicazioni"
          title="Comunicazioni"
          action="+ Nuova comunicazione"
          onAction={onNew}
        />
      ) : (
        <PageHeader
          eyebrow="Comunicazioni"
          title="Comunicazioni"
        />
      )}


      <div className="feature-banner">

        <div>

          <b>
            <AppIcon name="megaphone" size={18} /> Comunicazioni ai condomini
          </b>

          <span>
            Crea, verifica e pubblica
            comunicazioni dal gestionale.
          </span>

        </div>

        <span className="feature-plan">
          Portal
        </span>

      </div>


      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca comunicazione, condominio o contenuto..."
      />

      <div className="quick-stats">
        <div className="quick-stat"><b>{communications.length}</b><span>Totali</span></div>
        <div className="quick-stat"><b>{communications.filter((c: Communication) => c.status === "Pubblicata").length}</b><span>Pubblicate</span></div>
        <div className="quick-stat"><b>{communications.filter((c: Communication) => c.status === "Bozza").length}</b><span>Bozze</span></div>
        <div className="quick-stat"><b>{communications.filter((c: Communication) => c.publishedToPortal).length}</b><span>Nel portale</span></div>
        <div className="quick-stat"><b>{communications.filter((c: Communication) => c.emailStatus === "Predisposta").length}</b><span>E-mail predisposte</span></div>
      </div>

      <div className="cards-list">

        {filtered.map(
          (c: Communication) => (
            <article
              className="row-card communication-card"
              key={c.id}
            >

              <div className="communication-main">

                <b>
                  {c.title}
                </b>

                <small>
                  {c.condominiumId
                    ? condominiumName(
                        c.condominiumId
                      )
                    : "Tutti i condomini"}{" "}
                  ·{" "}
                  {c.audience}{" "}
                  ·{" "}
                  {formatDate(
                    c.date
                  )}
                </small>

                <p>
                  {c.body}
                </p>

                <div className="assembly-statuses">

                  <Badge
                    value={
                      c.status
                    }
                  />

                  {c.publishedToPortal && (
                    <Badge
                      value="Condiviso"
                    />
                  )}

                  {c.emailStatus === "Predisposta" && (
                    <Badge value="E-mail predisposta" />
                  )}

                </div>

              </div>


              {isAdministrator && (
                <div className="row-actions">

                  <button
                    className="secondary-button small"
                    onClick={() =>
                      onEdit(c)
                    }
                  >
                    Modifica
                  </button>

                  <button
                    className="secondary-button small"
                    onClick={() =>
                      onPublication(
                        c.id
                      )
                    }
                  >
                    {c.publishedToPortal
                      ? <><AppIcon name="lock" size={16} /> Ritira</>
                      : <><AppIcon name="users" size={16} /> Pubblica</>}
                  </button>

                  <button
                    className="mini-danger"
                    onClick={() =>
                      onDelete(c.id)
                    }
                  >
                    ×
                  </button>

                </div>
              )}

            </article>
          )
        )}


        {filtered.length ===
          0 && (
          <Empty text="Nessuna comunicazione trovata." />
        )}

      </div>

    </>
  );
}


/* =========================================================
   BETHAG AI
   ========================================================= */

function AIPage({
  documents,
  assemblies,
  plan,
  onNavigate,
  onAI,
  onAudio,
}: any) {
  const aiDocuments =
    documents.filter(
      (d: DocumentItem) =>
        d.aiStatus !==
        "Confermato"
    );

  const audioAssemblies =
    assemblies.filter(
      (a: Assembly) =>
        a.audioName
    );

  return (
    <>

      <PageHeader
        eyebrow="Automazione intelligente"
        title="BETHAG AI"
      />


      <section className="ai-hero">

        <div>

          <span className="ai-kicker">
            INTELLIGENZA ARTIFICIALE
          </span>

          <h2>
            Trasforma i documenti
            in dati organizzati.
          </h2>

          <p>
            BETHAG prepara oggi il flusso operativo per l'intelligenza artificiale: acquisizione, analisi, dati estratti e verifica dell'amministratore. Le funzioni AI reali richiederanno il collegamento a un servizio backend.
          </p>

        </div>


        <div className="ai-plan-box">

          <b>
            {PLAN_NAMES[plan]}
          </b>

          <span>
            {hasFeature(
              plan,
              "plus"
            )
              ? "Funzioni AI predisposte"
              : "Upgrade necessario"}
          </span>

          <button
            className="primary-button"
            onClick={() =>
              onNavigate(
                "abbonamento"
              )
            }
          >
            Gestisci piano
          </button>

        </div>

      </section>


      <section className="ai-tools-grid">

        <article className="ai-tool">

          <div className="tool-icon">
            📄
          </div>

          <h3>
            Document Intelligence
          </h3>

          <p>
            PDF, Word, Excel, immagini
            e altri documenti possono
            essere analizzati e
            trasformati in dati
            strutturati.
          </p>

          <span className="tool-flow">
            File → OCR → AI → dati →
            verifica
          </span>

        </article>


        <article className="ai-tool">

          <div className="tool-icon">
            🎙️
          </div>

          <h3>
            Assemblee Audio
          </h3>

          <p>
            Acquisizione del file audio,
            trascrizione e successiva
            predisposizione della bozza
            di verbale.
          </p>

          <span className="tool-flow">
            Audio → trascrizione →
            verbale → verifica
          </span>

        </article>


        <article className="ai-tool">

          <div className="tool-icon">
            ✍️
          </div>

          <h3>
            Generazione documenti
          </h3>

          <p>
            In una fase successiva
            BETHAG potrà predisporre
            convocazioni, comunicazioni,
            lettere e altri documenti.
          </p>

          <span className="tool-flow">
            Dati → modello → documento
          </span>

        </article>

      </section>


      <section className="dashboard-grid">

        <div className="card">

          <SectionTitle
            title="Documenti da verificare"
            action="Apri archivio"
            onClick={() =>
              onNavigate(
                "documenti"
              )
            }
          />

          {aiDocuments.length ===
          0 ? (
            <Empty text="Non ci sono documenti da verificare." />
          ) : (
            aiDocuments
              .slice(0, 5)
              .map(
                (
                  d: DocumentItem
                ) => (
                  <div
                    className="list-row"
                    key={d.id}
                  >

                    <div>

                      <b>
                        {d.name}
                      </b>

                      <small>
                        {
                          d.aiStatus
                        }
                      </small>

                    </div>

                    <button
                      className="secondary-button small"
                      onClick={() =>
                        onAI(d)
                      }
                    >
                      Analizza
                    </button>

                  </div>
                )
              )
          )}

        </div>


        <div className="card">

          <SectionTitle
            title="Assemblee con audio"
            action="Apri assemblee"
            onClick={() =>
              onNavigate(
                "assemblee"
              )
            }
          />

          {audioAssemblies.length ===
          0 ? (
            <Empty text="Nessun audio acquisito." />
          ) : (
            audioAssemblies
              .slice(0, 5)
              .map(
                (
                  a: Assembly
                ) => (
                  <div
                    className="activity"
                    key={a.id}
                  >

                    <b>
                      {a.title}
                    </b>

                    <small>
                      {
                        a.audioName
                      }
                    </small>

                  </div>
                )
              )
          )}

        </div>

      </section>

    </>
  );
}


/* =========================================================
   PORTALE CONDOMINI
   ========================================================= */

function PortalPage({
  members,
  condominiums,
  documents,
  assemblies,
  communications,
  condominiumMembers,
  condominiumRequests,
  onPortalRequest,
  sessionEmail,
  plan,
  portalEnabled,
  onAdd,
  onToggle,
  onDelete,
  onNavigate,
  isAdministrator = false,
}: any) {
  const [showAdd, setShowAdd] =
    useState(false);

  const [form, setForm] =
    useState<PortalMember>({
      id: 0,
      name: "",
      email: "",
      condominiumId:
        condominiums[0]?.id ||
        0,
      role: "resident",
      apartment: "",
      permissions: [
        "documenti",
        "verbali",
        "regolamento",
        "assemblee",
        "comunicazioni",
      ],
      active: true,
    });

  const currentPortalMember = members.find(
    (member: PortalMember) =>
      member.active &&
      member.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase()
  );
  const residentCondominiumId = !isAdministrator ? currentPortalMember?.condominiumId : null;
  const visibleDocuments = documents.filter((d: DocumentItem) =>
    d.publication === "Condiviso" &&
    (
      isAdministrator ||
      (
        residentCondominiumId != null &&
        d.condominiumId === residentCondominiumId &&
        Boolean(currentPortalMember?.permissions.includes("documenti"))
      )
    )
  );
  const visibleMinutes = assemblies.filter((a: Assembly) =>
    a.publishedToPortal &&
    (
      isAdministrator ||
      (
        residentCondominiumId != null &&
        a.condominiumId === residentCondominiumId &&
        Boolean(
          currentPortalMember?.permissions.includes("verbali") ||
          currentPortalMember?.permissions.includes("assemblee")
        )
      )
    )
  );
  const visibleCommunications = communications.filter((communication: Communication) =>
    communication.publishedToPortal &&
    (
      isAdministrator ||
      (
        residentCondominiumId != null &&
        communication.condominiumId === residentCondominiumId &&
        Boolean(currentPortalMember?.permissions.includes("comunicazioni"))
      )
    )
  );