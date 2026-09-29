import React, { useEffect, useMemo, useRef, useState } from "react";
import AccountingPage from "./AccountingPage";
import RegisterPage from "./RegisterPage";
import InsurancePoliciesSection from "./InsurancePoliciesSection";
import ReactDOM from "react-dom/client";
import { supabase, supabaseConfigured, supabasePublicAuth } from "./lib/supabase";
import { claimFirstWorkspaceAdmin, deleteCondominium as deleteCondominiumBackend, deleteCondominiumMember as deleteCondominiumMemberBackend, saveCondominiumMember as saveCondominiumMemberBackend, saveCondominiumUnit as saveCondominiumUnitBackend, getActiveWorkspaceId, loadBackendState, saveCondominium as saveCondominiumBackend, syncBackendState, updateCondominiumRequestStatus } from "./lib/bethagBackend";

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
  millesimi: string;
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
    millesimi: "42,50",
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
  id: 0, condominiumId: 1, firstName: "", lastName: "", fiscalCode: "", phone: "", email: "", apartment: "", role: "Proprietario", millesimi: "", notes: "", active: true, unitId: "",
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

  const [
    editingCondominium,
    setEditingCondominium,
  ] = useState<Condominium | null>(
    null
  );

  // La scheda del condominio non viene ripristinata automaticamente al refresh.
  // Dopo un refresh si apre sempre l'elenco: l'amministratore sceglie esplicitamente
  // la scheda da aprire. Questo evita che una selezione locale obsoleta o incompleta
  // renda inutilizzabile la sezione Condomini prima dell'hydration da Supabase.

  useEffect(() => {
    if (selectedCondominium) {
      localStorage.setItem(KEYS.selectedCondominium, JSON.stringify(selectedCondominium.id));
    } else {
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
      .select("workspace_id, role, active")
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
      if (!session?.user || cancelled) return;

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

      const restoreOrder = [
        "condominiums", "condominium_units", "condominium_members", "documents", "suppliers", "activities",
        "condominium_fiscal_years", "condominium_funds", "condominium_suppliers", "condominium_register_items",
        "condominium_budgets", "condominium_tax_obligations", "condominium_legal_cases",
        "condominium_millesimal_tables", "condominium_millesimal_values", "condominium_insurance_policies", "condominium_ledger_entries",
        "condominium_expense_allocations", "condominium_installments", "condominium_payment_movements",
        "condominium_works", "condominium_work_documents", "condominium_work_progress",
        "condominium_work_events", "condominium_audit_log", "condominium_requests"
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
      "condominium_work_progress", "condominium_work_events", "condominium_audit_log", "condominium_requests"
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
      sessionRole !== "admin" ||
      !profile.workspaceId ||
      !backendHydrated.current
    ) return;

    const timer = window.setTimeout(() => {
      void syncBackendState(profile.workspaceId, {
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
      }).catch((error) => {
        console.error("BETHAG backend sync failed", error);
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    sessionRole,
    profile.workspaceId,
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
      const q =
        search.trim().toLowerCase();

      if (!q) return condominiums;

      return condominiums.filter((c) =>
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
        setCondominiumUnits((current) => {
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

    if (supabaseConfigured && supabase && (sessionRole === "admin" || sessionRole === "collaborator")) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Sessione autenticata non disponibile. Accedi nuovamente a BETHAG.");

        const workspaceId = profile.workspaceId || await getActiveWorkspaceId(session.user.id, null);
        if (!workspaceId) throw new Error("Workspace amministratore non trovato.");

        await deleteCondominiumBackend(workspaceId, item.id);
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

  const deleteDeadline = (
    id: number
  ) => {
    if (!requireModulePermission("scadenze", "L'eliminazione della scadenza")) return;

    if (
      !confirm(
        "Eliminare questa scadenza?"
      )
    )
      return;

    setDeadlines((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const updateDeadlineStatus = (
    id: number,
    status: DeadlineStatus
  ) => {
    if (!isAdministrator) {
      alert("L'aggiornamento delle scadenze è riservato all'Amministratore.");
      return;
    }
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

  const deleteDocument = (
    id: number
  ) => {
    if (!requireModulePermission("documenti", "L'eliminazione del documento")) return;

    if (
      !confirm(
        "Eliminare questo documento?"
      )
    )
      return;

    setDocuments((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
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

  const deleteAssembly = (
    id: number
  ) => {
    if (!requireModulePermission("assemblee", "L'eliminazione dell'assemblea")) return;

    if (
      !confirm(
        "Eliminare questa assemblea?"
      )
    )
      return;

    setAssemblies((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const updateAssemblyStatus = (
    id: number,
    status: AssemblyStatus
  ) => {
    if (!isAdministrator) {
      alert("L'aggiornamento delle assemblee è riservato all'Amministratore.");
      return;
    }
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

  const deleteSupplier = (
    id: number
  ) => {
    if (!requireModulePermission("fornitori", "L'eliminazione del fornitore")) return;

    if (
      !confirm(
        "Eliminare questo fornitore?"
      )
    )
      return;

    setSuppliers((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );

    setCondominiumRequests((current) =>
      current.map((request) =>
        request.supplierId === id
          ? { ...request, supplierId: null }
          : request
      )
    );
  };


  /* =======================================================
     ATTIVITÀ
     ======================================================= */

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

  const deleteActivity = (
    id: number
  ) => {
    if (!requireModulePermission("attivita", "L'eliminazione dell'attività")) return;

    if (
      !confirm(
        "Eliminare questa attività?"
      )
    )
      return;

    setActivities((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );

    setCondominiumRequests((current) =>
      current.map((request) =>
        request.activityId === id
          ? { ...request, activityId: null }
          : request
      )
    );
  };

  const updateActivityStatus = (
    id: number,
    status: ActivityStatus
  ) => {
    if (!isAdministrator) {
      alert("L'aggiornamento delle attività è riservato all'Amministratore.");
      return;
    }
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

    const data = {
      ...condominiumMemberForm,
      firstName: condominiumMemberForm.firstName.trim(),
      lastName: condominiumMemberForm.lastName.trim(),
      apartment: condominiumMemberForm.apartment.trim(),
      email: condominiumMemberForm.email.trim(),
    };

    if (selectedCondominiumMember) {
      const previousMember = selectedCondominiumMember;
      const nextMembers = condominiumMembers.map((member) =>
        member.id === previousMember.id
          ? { ...data, id: previousMember.id }
          : member
      );

      setCondominiumMembers(nextMembers);

      if (supabaseConfigured && supabase && profile.workspaceId) {
        try {
          await saveCondominiumMemberBackend(profile.workspaceId, data);
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

      setPortalMembers((current) => {
        const previousEmail = previousMember.email.trim().toLowerCase();
        const nextEmail = data.email.trim().toLowerCase();

        if (!data.active) {
          return current.filter(
            (portalMember) =>
              !(
                portalMember.condominiumId === previousMember.condominiumId &&
                portalMember.email.trim().toLowerCase() === previousEmail
              )
          );
        }

        return current.map((portalMember) =>
          portalMember.condominiumId === previousMember.condominiumId &&
          (
            portalMember.email.trim().toLowerCase() === previousEmail ||
            portalMember.email.trim().toLowerCase() === nextEmail
          )
            ? {
                ...portalMember,
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                condominiumId: data.condominiumId,
                apartment: data.apartment,
              }
            : portalMember
        );
      });
    } else {
      const newMember = { ...data, id: makeId() };
      const nextMembers = [...condominiumMembers, newMember];
      setCondominiumMembers(nextMembers);

      if (supabaseConfigured && supabase && profile.workspaceId && newMember.email.trim()) {
        try {
          await saveCondominiumMemberBackend(profile.workspaceId, newMember);
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
        } catch (inviteError) {
          console.error("BETHAG resident invitation failed", inviteError);
          alert(
            inviteError instanceof Error
              ? `Condòmino inserito, ma l'invio/collegamento dell'accesso non è riuscito: ${inviteError.message}`
              : "Condòmino inserito, ma l'invio/collegamento dell'accesso non è riuscito."
          );
        }
      }
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
        portalMember.email.trim().toLowerCase() === member.email.trim().toLowerCase()
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
          current.filter(
            (portalMember) =>
              !(
                portalMember.condominiumId === member.condominiumId &&
                portalMember.email.trim().toLowerCase() === member.email.trim().toLowerCase()
              )
          )
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

    const portalMember = !isAdministrator
      ? portalMembers.find((member) => member.active && member.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase())
      : null;
    const portalCondominiumMember = portalMember
      ? condominiumMembers.find(
          (member) =>
            member.active &&
            member.condominiumId === portalMember.condominiumId &&
            member.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase()
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