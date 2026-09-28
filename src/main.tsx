import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { supabase, supabaseConfigured, supabasePublicAuth } from "./lib/supabase";
import { claimFirstWorkspaceAdmin, deleteCondominium as deleteCondominiumBackend, getActiveWorkspaceId, loadBackendState, saveCondominium as saveCondominiumBackend, syncBackendState, updateCondominiumRequestStatus } from "./lib/bethagBackend";

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
}: {
  onLogin: (role: PublicRole, email: string, password: string) => void;
  onRegisterAdmin: (fullName: string, email: string, password: string) => Promise<void>;
  onRegisterResident: (fullName: string, email: string, fiscalCode: string, condominiumName: string, password: string) => Promise<void>;
}) {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return (
      <LoginPage
        onBack={() => setShowLogin(false)}
        onLogin={onLogin}
        onRegisterAdmin={onRegisterAdmin}
        onRegisterResident={onRegisterResident}
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
}: {
  onBack: () => void;
  onLogin: (role: PublicRole, email: string, password: string) => Promise<void> | void;
  onRegisterAdmin: (fullName: string, email: string, password: string) => Promise<void>;
  onRegisterResident: (fullName: string, email: string, fiscalCode: string, condominiumName: string, password: string) => Promise<void>;
}) {
  const [role, setRole] = useState<PublicRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [condominiumName, setCondominiumName] = useState("");
  const [registerMode, setRegisterMode] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const roles: Array<{ id: PublicRole; title: string; description: string }> = [
    { id: "admin", title: "Amministratore", description: "Accesso completo al gestionale." },
    { id: "collaborator", title: "Collaboratore", description: "Accesso all'area gestionale del titolare." },
    { id: "resident", title: "Condomino", description: "Accesso al portale del proprio condominio." },
  ];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password.trim()) {
      setError("Inserisci e-mail e password per continuare.");
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
      setError(submitError instanceof Error ? submitError.message : "Operazione non completata. Riprova.");
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

        <h1>{registerMode ? "Registrazione nuovo utente" : "Accedi a BETHAG"}</h1>
        <p className="login-intro">
          {registerMode
            ? "Per i condòmini BETHAG verifica prima l'anagrafica inserita dall'amministratore."
            : "Seleziona il profilo con cui vuoi entrare nella piattaforma."}
        </p>

        <div className="login-role-grid">
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
        </div>

        <div className="login-role-description">
          {roles.find((item) => item.id === role)?.description}
        </div>

        <form onSubmit={submit}>
          {registerMode && (
            <>
              <label>Nome e cognome</label>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} type="text" placeholder="Mario Rossi" autoComplete="name" />

              {role === "resident" && (
                <>
                  <label>Codice fiscale</label>
                  <input value={fiscalCode} onChange={(event) => setFiscalCode(event.target.value.toUpperCase())} type="text" placeholder="RSSMRA..." autoComplete="off" />

                  <label>Nome del condominio <span style={{fontWeight:400,color:"#94a3b8"}}>(se conosciuto)</span></label>
                  <input value={condominiumName} onChange={(event) => setCondominiumName(event.target.value)} type="text" placeholder="Condominio Aurora" />
                </>
              )}
            </>
          )}

          <label>E-mail</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="nome@esempio.it" autoComplete="email" />

          <label>Password</label>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" autoComplete={registerMode ? "new-password" : "current-password"} />

          {registerMode && role === "resident" && (
            <small className="login-note">
              Se esiste un profilo con la stessa e-mail e dati anagrafici, BETHAG lo collega automaticamente al relativo condominio dopo la verifica dell'e-mail. In caso contrario la richiesta passa all'amministratore.
            </small>
          )}

          {error && <div className="login-error">{error}</div>}

          <button className="primary-button login-submit" type="submit" disabled={submitting} aria-busy={submitting}>
            {submitting ? "Operazione in corso…" : registerMode ? (role === "resident" ? "Registrati come condòmino" : "Crea account amministratore") : "Accedi"}
          </button>
        </form>

        {supabaseConfigured && (
          <button
            type="button"
            className="secondary-button login-register-toggle"
            onClick={() => {
              setRegisterMode((current) => !current);
              setRole("admin");
              setError("");
            }}
          >
            {registerMode ? "Ho già un account: accedi" : "Registrazione nuovo utente"}
          </button>
        )}

        <p className="login-disclaimer">
          Le credenziali sono gestite da Supabase Auth. L'accesso al portale viene concesso solo dopo l'associazione/autorizzazione del profilo condominiale.
        </p>
      </div>
    </div>
  );
}

function PasswordSetupPage({ onComplete }: { onComplete: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setError(error instanceof Error ? error.message : "Impossibile impostare la password.");
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
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Almeno 8 caratteri" />
          <label>Conferma password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Ripeti la password" />
          {error && <div className="login-error">{error}</div>}
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

function App() {
  const [page, setPage] =
    useState<Page>(() => load<Page>(KEYS.page, "homepage"));

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

  const [condominiumMembers, setCondominiumMembers] = useState<CondominiumMember[]>(() => load(KEYS.condominiumMembers, initialCondominiumMembers));
  const [condominiumRequests, setCondominiumRequests] = useState<CondominiumRequest[]>(() => load(KEYS.condominiumRequests, initialCondominiumRequests));
  const [registrationRequests, setRegistrationRequests] = useState<PortalRegistrationRequest[]>([]);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);

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
        alert(error?.message || "Impossibile completare l'accesso a BETHAG.");
        return;
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
      alert(dbMemberError?.message || "Profilo condòmino non ancora sincronizzato. Riprova tra qualche secondo.");
      return;
    }
    const { error } = await supabase.rpc("admin_approve_portal_registration", {
      p_request_id: requestId,
      p_member_id: dbMember.id,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setRegistrationRequests((current) => current.filter((item) => item.id !== requestId));
    try {
      const backend = await loadBackendState(profile.workspaceId);
      setCondominiumMembers(backend.condominiumMembers);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

        if (requiresPasswordSetup) {
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
        target === "collaboratori"
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
      sessionRole === "admin"
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

    if (supabaseConfigured && supabase && sessionRole === "admin") {
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
    const duplicate = condominiumMembers.some((member) =>
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

      setCondominiumMembers((current) =>
        current.map((member) =>
          member.id === previousMember.id
            ? { ...data, id: previousMember.id }
            : member
        )
      );

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
          await syncBackendState(profile.workspaceId, {
            condominiums,
            condominiumMembers: nextMembers,
            documents,
            deadlines,
            assemblies,
            suppliers,
            activities,
            communications,
            condominiumRequests,
            portalMembers,
            collaborators,
          });
          const { data: inviteResult, error: inviteError } = await supabase.functions.invoke("bethag-invite-resident", {
            body: {
              workspaceId: profile.workspaceId,
              condominiumId: newMember.condominiumId,
              legacyId: newMember.id,
            },
          });
          if (inviteError) throw inviteError;

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

  const deleteCondominiumMember = (id: number) => {
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
    if (!isAdministrator) {
      alert("La modifica delle comunicazioni è riservata all'Amministratore.");
      return;
    }
    setSelectedCommunication(item);
    setCommunicationForm(item);
    openModal("communication");
  };

  const deleteCommunication = (
    id: number
  ) => {
    if (!requireModulePermission("comunicazioni", "L'eliminazione della comunicazione")) return;

    if (
      !confirm(
        "Eliminare questa comunicazione?"
      )
    )
      return;

    setCommunications((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
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

  const deletePortalMember = (
    id: number
  ) => {
    if (!requireModulePermission("portale", "L'eliminazione dell'accesso al Portale condomini")) return;
    if (
      !confirm(
        "Eliminare l'accesso del condomino?"
      )
    )
      return;

    setPortalMembers((current) =>
      current.filter(
        (member) => member.id !== id
      )
    );
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
    if (!isAdministrator) {
      alert("La creazione delle comunicazioni è riservata all'Amministratore.");
      return;
    }
    setSelectedCommunication(null);

    setCommunicationForm({
      ...emptyCommunication,
      condominiumId:
        condominiumId ?? (condominiums[0]?.id || null),
      recipientIds: [],
      emailStatus: "Non inviata",
      emailPreparedAt: "",
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
        <PublicHome onLogin={handleLogin} onRegisterAdmin={handleRegisterAdmin} onRegisterResident={handleRegisterResident} />
      </>
    );
  }

  if (sessionRole === "resident") {
    return (
      <>
        <style>{styles}</style>
        <ResidentPortalView
          email={sessionEmail}
          condominiums={condominiums}
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

  return (
    <>
      <style>{styles}</style>

      <div className="app">

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
              condominiums={
                condominiums
              }
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
            <CondominiumsPage
              condominiums={
                filteredCondominiums
              }
              allCount={
                condominiums.length
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
              isAdministrator={isAdministrator}
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
              isAdministrator={isAdministrator}
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
              isAdministrator={isAdministrator}
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
              isAdministrator={isAdministrator}
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
              isAdministrator={isAdministrator}
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
              isAdministrator={isAdministrator}
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
              condominiums={
                condominiums
              }
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
              condominiums={
                condominiums
              }
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
              condominiums={
                condominiums
              }
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
              condominiums={
                condominiums
              }
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
              condominiums={
                condominiums
              }
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
              condominiums={
                condominiums
              }
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

          {modalType === "condominium-member" && (
            <CondominiumMemberForm value={condominiumMemberForm} setValue={setCondominiumMemberForm} condominiums={condominiums} members={condominiumMembers} onSubmit={saveCondominiumMember} onCancel={closeModal} editing={!!selectedCondominiumMember} />
          )}

          {modalType === "condominium-request" && (
            <CondominiumRequestForm value={condominiumRequestForm} setValue={setCondominiumRequestForm} condominiums={condominiums} members={condominiumMembers} suppliers={suppliers} activities={activities} onSubmit={saveCondominiumRequest} onCancel={closeModal} editing={!!selectedCondominiumRequest} />
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
              condominiums={
                condominiums
              }
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
    onNewDeadline,
    onNewDocument,
    onNewAssembly,
    onNewSupplier,
    onNewActivity,
    isAdministrator,
  } = props;

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

            {isAdministrator && (
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
        />

      </div>
    );
  }

  return (
    <>

      <PageHeader
        eyebrow="Gestione patrimonio"
        title="Condomìni"
        action="+ Nuovo condominio"
        onAction={onNew}
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

                  <button
                    className="secondary-button"
                    onClick={() =>
                      onEdit(c)
                    }
                  >
                    Modifica
                  </button>

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
          <div><div className="eyebrow">Unità abitative</div><h2>Unità e persone associate</h2><p className="section-subtitle">Ogni unità può avere più proprietari e/o inquilini, mantenendo una sola identità abitativa.</p></div>
          <span className="badge">{activeMembers.length} soggetti</span>
        </div>
        <div className="related-list">
          {Array.from(new Set(activeMembers.map((m: CondominiumMember) => m.apartment.trim()).filter(Boolean))).map((apartment) => {
            const unitMembers = activeMembers.filter((m: CondominiumMember) => m.apartment.trim().toLowerCase() === apartment.toLowerCase());
            const owners = unitMembers.filter((m: CondominiumMember) => m.role === "Proprietario");
            const tenants = unitMembers.filter((m: CondominiumMember) => m.role === "Inquilino");
            return <div className="request-card" key={apartment}>
              <div className="request-main">
                <b>🏠 {apartment}</b>
                <span>{unitMembers.length} {unitMembers.length === 1 ? "persona associata" : "persone associate"} · {owners.length} proprietari · {tenants.length} inquilini</span>
                <p>{unitMembers.map((m: CondominiumMember) => `${m.firstName} ${m.lastName} · ${m.role}${m.email ? ` · ${m.email}` : ""}`).join("  |  ")}</p>
              </div>
              <div className="request-actions">
                <Badge value={owners.length ? "Proprietà" : "Locazione"} />
                <button className="secondary-button small" onClick={() => setSelectedUnit(apartment)}>Gestisci unità</button>
              </div>
            </div>;
          })}
        </div>
      </section>
      {selectedUnit && (() => {
        const unitMembers = activeMembers.filter((m: CondominiumMember) => m.apartment.trim().toLowerCase() === selectedUnit.trim().toLowerCase());
        return <Modal onClose={() => setSelectedUnit(null)}>
          <ModalTitle title={`Unità abitativa ${selectedUnit}`} />
          <p className="section-subtitle">Tutte le persone associate a questa unità e i relativi accessi al Portale.</p>
          <div className="related-list" style={{marginTop:16}}>
            {unitMembers.map((member: CondominiumMember) => {
              const permissions = member.role === "Inquilino"
                ? ["Spese ordinarie", "Comunicazioni e avvisi", "Regolamento condominiale"]
                : ["Documenti", "Verbali", "Regolamento", "Assemblee", "Spese ordinarie", "Spese straordinarie", "Comunicazioni e avvisi"];
              return <div className="request-card" key={member.id}>
                <div className="request-main">
                  <b>{member.firstName} {member.lastName}</b>
                  <span>{member.role} · {member.email || "E-mail non inserita"}</span>
                  <small>{member.userId ? "🟢 Accesso Portale attivo" : "⚪ Accesso Portale non attivo"}</small>
                  <p><strong>Permessi:</strong> {permissions.join(" · ")}</p>
                </div>
                {isAdministrator && <div className="request-actions">
                  <button className="secondary-button small" onClick={() => { setSelectedUnit(null); onEditMember(member); }}>Modifica</button>
                </div>}
              </div>;
            })}
          </div>
          {isAdministrator && (
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setSelectedUnit(null)}>Chiudi</button>
              <button className="primary-button" onClick={() => { setSelectedUnit(null); onNewMember(item.id, selectedUnit); }}>+ Aggiungi persona a questa unità</button>
            </div>
          )}
        </Modal>;
      })()}

      <section className="condominium-section-card">
        <div className="section-title">
          <div><div className="eyebrow">Anagrafica</div><h2>Condòmini</h2><p className="section-subtitle">Gestisci anagrafica, recapiti, interno, qualifica e millesimi.</p></div>
          <div className="button-row compact">
            <button className="secondary-button" onClick={() => onNewCommunication(item.id)}>✉️ Nuova comunicazione</button>
            {isAdministrator && (
              <>
                <button className="primary-button" onClick={() => onPrepareEmail(item.id)}>✉️ Scrivi a tutti</button>
                <button className="secondary-button" onClick={() => onNewMember(item.id)}>+ Aggiungi condòmino</button>
              </>
            )}
          </div>
        </div>
        <div className="condominium-member-list">
          {activeMembers.length === 0 ? <Empty text="Nessun condòmino presente nell'anagrafica." /> : activeMembers.map((member: CondominiumMember) => (
            <div className="condominium-member-card" key={member.id}>
              <div className="member-main"><b>{member.firstName} {member.lastName}</b><span>{member.apartment} · {member.role} · {member.millesimi || "Millesimi non inseriti"}</span><small>{member.phone || "Telefono non inserito"}{member.email ? ` · ${member.email}` : " · E-mail non inserita"}</small></div>
              {isAdministrator && (
                <div className="related-actions">
                  {member.email && <button className="secondary-button small" onClick={() => onPrepareEmail(item.id, [member.id])}>Scrivi</button>}
                  <button className="secondary-button small" onClick={() => onEditMember(member)}>Modifica</button>
                  <button className="mini-danger" onClick={() => onDeleteMember(member.id)}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
  const currentCondominiumMember = currentPortalMember
    ? condominiumMembers.find(
        (member: CondominiumMember) =>
          member.condominiumId === currentPortalMember.condominiumId &&
          member.active &&
          member.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase()
      )
    : null;

  const visibleRequests = condominiumRequests.filter((request: CondominiumRequest) =>
    !isAdministrator &&
    request.condominiumId === residentCondominiumId &&
    Boolean(currentCondominiumMember) &&
    request.memberId === currentCondominiumMember?.id
  );

  const save = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.condominiumId
    ) {
      alert(
        "Inserisci nome, email e condominio."
      );
      return;
    }

    if (!validateEmail(form.email)) {
      alert(
        "Controlla l'indirizzo email."
      );
      return;
    }

    onAdd(form);

    setForm({
      ...form,
      id: 0,
      name: "",
      email: "",
      apartment: "",
    });

    setShowAdd(false);
  };

  return (
    <>

      {isAdministrator ? (
        <PageHeader
          eyebrow="Accesso esterno"
          title="Portale condomini"
          action="+ Nuovo accesso"
          onAction={() => {

          if (!portalEnabled) {
            onNavigate("abbonamento");
            return;
          }

          setShowAdd(true);
          }}
        />
      ) : (
        <PageHeader eyebrow="Accesso esterno" title="Portale condomini" />
      )}


      <section className="portal-hero">

        <div>

          <span className="ai-kicker">
            BETHAG PORTAL
          </span>

          <h2>
            Un'area riservata per i
            condomini.
          </h2>

          <p>
            L'amministratore decide
            quali informazioni rendere
            disponibili. Il sistema è
            progettato per separare i
            dati del singolo utente da
            quelli degli altri condomini.
          </p>

        </div>


        <div className="portal-stats">

          <div>
            <b>
              {members.length}
            </b>
            <span>
              utenti
            </span>
          </div>

          <div>
            <b>
              {
                visibleDocuments.length
              }
            </b>
            <span>
              documenti condivisi
            </span>
          </div>

          <div>
            <b>
              {
                visibleMinutes.length
              }
            </b>
            <span>
              verbali pubblicati
            </span>
          </div>

          <div>
            <b>
              {
                visibleCommunications.length
              }
            </b>
            <span>
              comunicazioni
            </span>
          </div>

        </div>

      </section>


      {!isAdministrator && currentPortalMember && portalEnabled && (
        <section className="card portal-request-card">
          <SectionTitle title="Segnalazioni e richieste" />
          <p className="section-subtitle">Invia rapidamente una segnalazione o una richiesta all'amministratore del tuo condominio.</p>
          <button className="primary-button" type="button" onClick={() => onPortalRequest(currentPortalMember)}>
            + Nuova segnalazione o richiesta
          </button>
          {visibleRequests.length > 0 && (
            <div className="related-list" style={{ marginTop: 16 }}>
              {visibleRequests.map((request: CondominiumRequest) => (
                <div className="request-card" key={request.id}>
                  <div className="request-main"><b>{request.category}</b><span>{formatDate(request.date)}</span><p>{request.description}</p>{request.response && <div className="request-response"><strong>Risposta amministratore:</strong> {request.response}</div>}</div>
                  <div className="request-actions"><Badge value={request.status} /><Badge value={"Priorità " + request.priority} /></div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isAdministrator && showAdd && (
        <form
          className="form-card"
          onSubmit={save}
        >

          <ModalTitle
            title="Nuovo accesso condomino"
          />

          <div className="form-grid">

            <Field
              label="Nome e cognome *"
              value={form.name}
              onChange={(
                v: string
              ) =>
                setForm({
                  ...form,
                  name: v,
                })
              }
            />

            <Field
              label="Email *"
              type="email"
              value={form.email}
              onChange={(
                v: string
              ) =>
                setForm({
                  ...form,
                  email: v,
                })
              }
            />

            <SelectField
              label="Condominio"
              value={
                form.condominiumId
              }
              onChange={(
                v: string
              ) =>
                setForm({
                  ...form,
                  condominiumId:
                    Number(v),
                })
              }
              options={condominiums.map(
                (
                  c: Condominium
                ) => [
                  c.id,
                  c.name,
                ]
              )}
            />

            <Field
              label="Interno"
              value={
                form.apartment
              }
              onChange={(
                v: string
              ) =>
                setForm({
                  ...form,
                  apartment: v,
                })
              }
            />

            <SelectField
              label="Ruolo"
              value={
                form.role
              }
              onChange={(
                v: string
              ) =>
                setForm({
                  ...form,
                  role:
                    v as UserRole,
                })
              }
              options={[
                [
                  "resident",
                  "Condomino",
                ],
                [
                  "council",
                  "Consigliere",
                ],
              ]}
            />

          </div>


          <div className="permission-editor">

            <b>
              Permessi iniziali
            </b>

            <div className="permission-checks">

              {(
                [
                  "documenti",
                  "verbali",
                  "regolamento",
                  "pagamenti_ordinari",
                  "pagamenti_straordinari",
                  "assemblee",
                  "comunicazioni",
                ] as PortalPermission[]
              ).map(
                (
                  permission
                ) => (
                  <label
                    key={
                      permission
                    }
                    className="check-row"
                  >

                    <input
                      type="checkbox"
                      checked={form.permissions.includes(
                        permission
                      )}
                      onChange={() => {

                        const exists =
                          form.permissions.includes(
                            permission
                          );

                        setForm({
                          ...form,
                          permissions:
                            exists
                              ? form.permissions.filter(
                                  (
                                    p
                                  ) =>
                                    p !==
                                    permission
                                )
                              : [
                                  ...form.permissions,
                                  permission,
                                ],
                        });

                      }}
                    />

                    {
                      permissionName(
                        permission
                      )
                    }

                  </label>
                )
              )}

            </div>

          </div>


          <div className="form-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowAdd(false)
              }
            >
              Annulla
            </button>

            <button
              className="primary-button"
              type="submit"
            >
              Crea accesso
            </button>

          </div>

        </form>
      )}


      <section className="portal-grid">

        <div className="card">

          <SectionTitle
            title="Accessi autorizzati"
          />

          {members.length ===
          0 ? (
            <Empty text="Nessun utente configurato." />
          ) : (
            members.map(
              (
                member: PortalMember
              ) => (
                <div
                  className="portal-member"
                  key={member.id}
                >

                  <div>

                    <b>
                      {member.name}
                    </b>

                    <small>
                      {
                        member.email
                      }
                    </small>

                    <small>
                      {
                        condominiums.find(
                          (
                            c: Condominium
                          ) =>
                            c.id ===
                            member.condominiumId
                        )
                          ?.name
                      }{" "}
                      ·{" "}
                      {
                        member.apartment
                      }
                    </small>

                    <small>
                      Ruolo:{" "}
                      {
                        roleName(
                          member.role
                        )
                      }
                    </small>

                    <div className="permission-tags">

                      {member.permissions.map(
                        (
                          permission
                        ) => (
                          <span
                            key={
                              permission
                            }
                          >
                            {
                              permissionName(
                                permission
                              )
                            }
                          </span>
                        )
                      )}

                    </div>

                  </div>


                  {isAdministrator && (
                    <div className="row-actions">
                    <Badge
                      value={
                        member.active
                          ? "Attivo"
                          : "Disattivato"
                      }
                    />

                    <button
                      className="secondary-button small"
                      onClick={() =>
                        onToggle(
                          member.id
                        )
                      }
                    >
                      {member.active
                        ? "Disattiva"
                        : "Attiva"}
                    </button>

                    <button
                      className="mini-danger"
                      onClick={() =>
                        onDelete(
                          member.id
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                  )}


                </div>
              )
            )
          )}

        </div>


        <div className="card">

          <SectionTitle
            title="Contenuti condivisibili"
          />

          <div className="permission-box">
            <b>
              <AppIcon name="folder" size={18} /> Documenti
            </b>

            <span>
              Regolamenti, verbali e
              documenti autorizzati.
            </span>
          </div>

          <div className="permission-box">
            <b>
              <AppIcon name="wallet" size={18} /> Pagamenti
            </b>

            <span>
              In futuro ogni condomino
              potrà visualizzare
              esclusivamente i propri
              dati personali e
              contabili.
            </span>
          </div>

          <div className="permission-box">
            <b>
              <AppIcon name="users" size={18} /> Assemblee
            </b>

            <span>
              Convocazioni e verbali
              pubblicati
              dall'amministratore.
            </span>
          </div>

          <div className="permission-box">
            <b>
              <AppIcon name="megaphone" size={18} /> Comunicazioni
            </b>

            <span>
              Avvisi e comunicazioni pubblicati
              dall'amministratore.
            </span>
          </div>

          <div className="permission-box">
            <b>
              📜 Regolamento
            </b>

            <span>
              Accesso ai documenti
              autorizzati.
            </span>
          </div>

          <div className="permission-box">
            <b>
              📢 Comunicazioni
            </b>

            <span>
              Avvisi e comunicazioni
              pubblicate
              dall'amministratore.
            </span>
          </div>

        </div>

      </section>

    </>
  );
}


/* =========================================================
   AIUTO E GUIDA BETHAG
   ========================================================= */

type HelpGuideItem = {
  id: string;
  title: string;
  section: string;
  content: string;
  keywords: string[];
};

const BETHAG_GUIDE: HelpGuideItem[] = [
  {
    id: "home",
    section: "Inizio",
    title: "Come orientarsi in BETHAG",
    content: "La Homepage è il centro operativo: mostra il riepilogo dei condomini, le scadenze, le attività, le comunicazioni, le richieste e gli indicatori principali. Usa il menu laterale per raggiungere ogni modulo autorizzato.",
    keywords: ["homepage", "dashboard", "inizio", "cruscotto", "menu"],
  },
  {
    id: "accesso",
    section: "Inizio",
    title: "Accesso e ruoli",
    content: "BETHAG distingue amministratore, collaboratore e utente del Portale. L'accesso effettivo viene verificato tramite l'account autenticato e le autorizzazioni del workspace; un utente senza accesso attivo non può entrare nei dati del gestionale.",
    keywords: ["accesso", "login", "account", "ruoli", "sicurezza", "workspace"],
  },
  {
    id: "condomini",
    section: "Gestione",
    title: "Gestione dei condomini",
    content: "La sezione Condomini raccoglie le schede degli edifici e le relative informazioni anagrafiche. Dalla scheda del singolo condominio puoi consultare i dati e collegare le informazioni operative previste dai moduli BETHAG.",
    keywords: ["condomini", "anagrafica", "condominio", "scheda", "edificio"],
  },
  {
    id: "condomini-membri",
    section: "Gestione",
    title: "Anagrafica dei condòmini",
    content: "Ogni condominio può avere la propria anagrafica dei condòmini, con dati di contatto, appartamento, ruolo e stato attivo. L'associazione al condominio viene mantenuta anche nel database per impedire che un utente venga collegato arbitrariamente a un altro edificio.",
    keywords: ["condòmini", "condomini", "anagrafica", "proprietario", "inquilino", "appartamento"],
  },
  {
    id: "richieste",
    section: "Gestione",
    title: "Segnalazioni e richieste",
    content: "I condòmini possono inviare dal Portale segnalazioni o richieste all'amministratore. La richiesta conserva condominio e richiedente, può avere priorità e stato e può essere aggiornata con una risposta. L'associazione viene verificata lato server.",
    keywords: ["richieste", "segnalazioni", "problema", "informazioni", "assistenza"],
  },
  {
    id: "documenti",
    section: "Gestione",
    title: "Documenti e archivio",
    content: "La sezione Documenti organizza l'archivio del workspace e collega ogni documento al relativo condominio. I contenuti condivisi possono essere resi disponibili nel Portale secondo le autorizzazioni configurate.",
    keywords: ["documenti", "archivio", "pdf", "word", "excel", "condivisione"],
  },
  {
    id: "scadenze",
    section: "Gestione",
    title: "Scadenze e adempimenti",
    content: "Le Scadenze consentono di registrare gli adempimenti, controllare le date e distinguere gli elementi da fare, in scadenza e completati. Il modulo è pensato per fornire all'amministratore una visione operativa delle attività temporali.",
    keywords: ["scadenze", "date", "urgenze", "adempimenti", "promemoria"],
  },
  {
    id: "assemblee",
    section: "Gestione",
    title: "Assemblee e verbali",
    content: "La sezione Assemblee permette di organizzare le riunioni e gestire le informazioni del relativo verbale. Nei moduli abilitati è predisposta anche per acquisizione audio, trascrizione e successiva elaborazione assistita.",
    keywords: ["assemblee", "assemblea", "verbale", "audio", "trascrizione"],
  },
  {
    id: "fornitori",
    section: "Gestione",
    title: "Fornitori",
    content: "Il modulo Fornitori raccoglie i riferimenti dei soggetti che prestano servizi al condominio e permette di collegare le informazioni operative alle attività gestite in BETHAG.",
    keywords: ["fornitori", "imprese", "manutenzione", "servizi", "contatti"],
  },
  {
    id: "attivita",
    section: "Gestione",
    title: "Attività operative",
    content: "Le Attività permettono di trasformare esigenze e adempimenti in lavori operativi, con stato, priorità, data e collegamento al condominio. Sono utili per seguire ciò che è aperto, in corso o completato.",
    keywords: ["attività", "lavori", "task", "priorità", "stato", "operativo"],
  },
  {
    id: "comunicazioni",
    section: "Comunicazioni",
    title: "Comunicazioni ai condòmini",
    content: "Le Comunicazioni permettono di preparare avvisi, indicare i destinatari e pubblicare i contenuti nel Portale quando previsto. La gestione dei destinatari viene collegata alle anagrafiche autorizzate del condominio.",
    keywords: ["comunicazioni", "avvisi", "destinatari", "pubblicazione", "portale"],
  },
  {
    id: "email",
    section: "Comunicazioni",
    title: "Invio e-mail ai destinatari",
    content: "Quando una comunicazione è pronta, l'amministratore può utilizzare l'invio e-mail diretto ai destinatari autorizzati. L'invio passa dal backend BETHAG e non dal client di posta del dispositivo; lo stato della comunicazione viene aggiornato dopo l'esito del servizio.",
    keywords: ["email", "e-mail", "invio", "destinatari", "resend", "posta"],
  },
  {
    id: "collaboratori",
    section: "Amministrazione",
    title: "Collaboratori e autorizzazioni",
    content: "L'amministratore può invitare collaboratori, assegnare permessi per modulo e disattivare gli accessi. Le autorizzazioni non sono solo grafiche: vengono verificate anche dal database tramite Row Level Security.",
    keywords: ["collaboratori", "permessi", "ruoli", "autorizzazioni", "rls"],
  },
  {
    id: "piani",
    section: "Amministrazione",
    title: "Piani e add-on",
    content: "La sezione Piano e abbonamento mostra la struttura Free, Plus, Professional e Portal e i relativi moduli. Gli sblocchi commerciali e i pagamenti reali richiederanno il collegamento definitivo del sistema di billing.",
    keywords: ["piano", "abbonamento", "free", "plus", "professional", "portal", "addon"],
  },
  {
    id: "portale",
    section: "Portale",
    title: "Portale Condomini",
    content: "Il Portale è l'area riservata ai condòmini. Ogni utente visualizza esclusivamente i contenuti pubblicati e autorizzati per il proprio condominio, come documenti, verbali e comunicazioni.",
    keywords: ["portale", "condomini", "residente", "consultazione", "pubblicazione"],
  },
  {
    id: "portale-accessi",
    section: "Portale",
    title: "Accessi e permessi del Portale",
    content: "Gli accessi al Portale sono associati a un condominio, a un indirizzo e-mail e a un insieme di permessi. L'identità dell'utente autenticato viene verificata prima di consentire la consultazione delle informazioni riservate.",
    keywords: ["portale", "accessi", "permessi", "residente", "consiglio", "sicurezza"],
  },
  {
    id: "sicurezza",
    section: "Sicurezza",
    title: "Protezione dei dati",
    content: "BETHAG utilizza autenticazione Supabase e Row Level Security per applicare le regole di accesso direttamente al database. Questo significa che un permesso revocato non deve poter essere aggirato semplicemente chiamando direttamente le API.",
    keywords: ["sicurezza", "privacy", "rls", "database", "autenticazione", "protezione"],
  },
  {
    id: "ai",
    section: "BETHAG AI",
    title: "BETHAG AI",
    content: "BETHAG AI è progettata per assistere l'amministratore nell'analisi e nell'organizzazione dei contenuti. La pagina Aiuto dispone già di una ricerca nella guida; le funzioni AI collegate a servizi esterni verranno integrate attraverso il backend dedicato.",
    keywords: ["ai", "intelligenza artificiale", "analisi", "assistente", "automazione"],
  },
  {
    id: "aiuto",
    section: "Supporto",
    title: "Come usare la guida",
    content: "Puoi cercare un argomento con il campo di ricerca oppure porre una domanda nella sezione Chiedi alla guida. Le schede spiegano le funzioni disponibili e costituiscono la base della futura documentazione conversazionale di BETHAG.",
    keywords: ["aiuto", "guida", "supporto", "faq", "ricerca", "manuale"],
  },
];

function HelpPage({
  sessionRole,
  onNavigate,
}: {
  sessionRole: UserRole | null;
  onNavigate: (page: Page) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HelpGuideItem | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? BETHAG_GUIDE.filter((item) =>
        [item.title, item.section, item.content, ...item.keywords]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
    : BETHAG_GUIDE;

  const askGuide = () => {
    const q = question.trim().toLowerCase();
    if (!q) return;
    const matches = BETHAG_GUIDE.filter((item) =>
      [item.title, item.section, item.content, ...item.keywords]
        .join(" ")
        .toLowerCase()
        .split(" ")
        .some((word) => word.length > 3 && q.includes(word))
    );
    const best = matches[0];
    setAnswer(
      best
        ? `Secondo la guida BETHAG: ${best.content} Consulta anche “${best.title}” per approfondire.`
        : "Non ho trovato una risposta specifica nella guida disponibile. Al termine dello sviluppo questa area potrà essere collegata all'AI di BETHAG per consultare l'intera documentazione del sito."
    );
  };

  return (
    <>
      <PageHeader eyebrow="Supporto" title="Aiuto e guida BETHAG" />
      <section className="help-hero">
        <div>
          <span className="eyebrow">GUIDA INTEGRATA</span>
          <h2>Trova rapidamente come utilizzare BETHAG.</h2>
          <p>
            Questa sezione è stata predisposta per contenere la guida completa
            del gestionale. Potrà essere aggiornata insieme all'evoluzione del sito.
          </p>
        </div>
        <div className="help-hero-badge">
          <AppIcon name="help" size={28} />
          <span>Supporto</span>
        </div>
      </section>

      <section className="help-ai-panel">
        <div className="help-ai-heading">
          <div>
            <span className="eyebrow">BETHAG AI</span>
            <h2>Chiedi alla guida</h2>
          </div>
          <span className="help-ai-status">Predisposto per AI</span>
        </div>
        <p>
          Scrivi una domanda. Per ora la risposta viene ricercata nella guida
          integrata; in seguito questo spazio potrà essere collegato all'AI reale
          per una consultazione conversazionale dell'intera documentazione.
        </p>
        <div className="help-question">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") askGuide();
            }}
            placeholder="Es. Come gestisco un nuovo condominio?"
          />
          <button className="primary-button" onClick={askGuide}>
            Chiedi
          </button>
        </div>
        {answer && <div className="help-answer"><strong>BETHAG AI</strong><span>{answer}</span></div>}
      </section>

      <section className="help-toolbar">
        <div>
          <h2>Guida del sito</h2>
          <p>{BETHAG_GUIDE.length} argomenti predisposti</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nella guida..."
        />
      </section>

      <section className="help-grid">
        {results.map((item) => (
          <button
            className="help-card"
            key={item.id}
            onClick={() => setSelected(item)}
          >
            <span className="help-card-section">{item.section}</span>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
            <span className="help-card-more">Leggi →</span>
          </button>
        ))}
      </section>

      {results.length === 0 && (
        <Empty text="Nessun argomento trovato nella guida." />
      )}

      {selected && (
        <div className="help-detail">
          <div className="help-detail-top">
            <div>
              <span className="eyebrow">{selected.section}</span>
              <h2>{selected.title}</h2>
            </div>
            <button className="secondary-button" onClick={() => setSelected(null)}>
              Chiudi
            </button>
          </div>
          <p>{selected.content}</p>
        </div>
      )}

      <section className="help-roadmap">
        <div>
          <span className="eyebrow">SVILUPPO FUTURO</span>
          <h2>Una guida che cresce insieme a BETHAG.</h2>
          <p>
            Al termine della realizzazione del sito potremo trasformare questa
            sezione in una documentazione completa, organizzata per moduli,
            ruoli e procedure, con consultazione assistita dall'AI.
          </p>
        </div>
        <div className="help-roadmap-items">
          <span>✓ Manuale completo</span>
          <span>✓ Guide passo-passo</span>
          <span>✓ FAQ contestuali</span>
          <span>✓ Consultazione AI</span>
        </div>
      </section>
    </>
  );
}


/* =========================================================
   ABBONAMENTO
   ========================================================= */

function SubscriptionPage({
  subscription,
  setSubscription,
  isAdministrator = false,
}: {
  subscription: Subscription;
  setSubscription: React.Dispatch<React.SetStateAction<Subscription>>;
  isAdministrator?: boolean;
}) {
  const plans = [
    { id: "free" as PlanId, title: "BETHAG Free", description: "Il gestionale essenziale.", features: ["Homepage e dashboard","Profilo amministratore","Accesso alla struttura BETHAG"] },
    { id: "plus" as PlanId, title: "BETHAG Plus", description: "Automazione documentale.", features: ["Tutto Free","Condomini","Documenti","Scadenze","Fornitori","Attività","Comunicazioni"] },
    { id: "professional" as PlanId, title: "BETHAG Professional", description: "Automazione avanzata.", features: ["Tutto Plus","Assemblee avanzate","BETHAG AI","Acquisizione audio","Trascrizione assemblee","Bozza automatica verbale","Workflow di verifica","Automazioni avanzate"] },
    { id: "portal" as PlanId, title: "BETHAG Portal", description: "Amministratore + condomini.", features: ["Tutto Professional","Portale condomini","Utenti e ruoli","Permessi granulari","Documenti condivisi","Verbali pubblicabili","Comunicazioni","Accesso riservato"] },
  ];

  const addons: AddonId[] = ["condomini","documenti","scadenze","assemblee","fornitori","attivita","comunicazioni","ai","portale"];

  const activateDemo = (id: PlanId) => {
    if (!isAdministrator) {
      alert("La gestione del piano è riservata all'Amministratore.");
      return;
    }
    setSubscription((current) => ({ ...current, plan: id, status: "Demo", renewalDate: "" }));
  };

  const unlockAddon = (addon: AddonId) => {
    if (!isAdministrator) {
      alert("La gestione degli add-on è riservata all'Amministratore.");
      return;
    }
    setSubscription((current) => ({
      ...current,
      addons: current.addons.includes(addon) ? current.addons : [...current.addons, addon],
    }));
  };

  const isIncluded = (addon: AddonId) => hasFeature(subscription.plan, ADDON_REQUIRED_PLAN[addon]);

  return (
    <>
      <PageHeader eyebrow="Modello di servizio" title="Piano e upgrade" />
      <section className="subscription-current">
        <div>
          <span className="eyebrow">Piano attuale</span>
          <h2>{PLAN_NAMES[subscription.plan]}</h2>
          <p>{PLAN_DESCRIPTIONS[subscription.plan]}</p>
        </div>
        <div className="subscription-current-right">
          <Badge value={subscription.status} />
          {subscription.addons.length > 0 && <span className="badge">{subscription.addons.length} sblocc{subscription.addons.length === 1 ? "o" : "hi"} singol{subscription.addons.length === 1 ? "o" : "i"}</span>}
        </div>
      </section>

      <section className="pricing-grid">
        {plans.map((plan) => (
          <article className={`pricing-card ${subscription.plan === plan.id ? "current" : ""}`} key={plan.id}>
            {subscription.plan === plan.id && <div className="current-plan">Piano attuale</div>}
            <div className="pricing-icon">{plan.id === "free" ? "🆓" : plan.id === "plus" ? <AppIcon name="sparkles" size={20} /> : plan.id === "professional" ? "🚀" : "👥"}</div>
            <h2>{plan.title}</h2>
            <p>{plan.description}</p>
            <ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
            <button className={subscription.plan === plan.id ? "secondary-button" : "primary-button"} onClick={() => activateDemo(plan.id)}>
              {subscription.plan === plan.id ? "Piano attivo" : "Prova struttura"}
            </button>
          </article>
        ))}
      </section>

      <section className="addon-panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Modello modulare</span>
            <h2>Sblocchi singoli</h2>
            <p className="section-subtitle">Non devi necessariamente passare al piano superiore. Puoi aggiungere una singola funzionalità al tuo piano quando ti serve.</p>
          </div>
          <span className="badge">Add-on</span>
        </div>
        <div className="addon-grid">
          {addons.map((addon) => {
            const included = isIncluded(addon);
            const unlocked = hasAddon(subscription, addon);
            return (
              <article className="addon-card" key={addon}>
                <div className="addon-card-top">
                  <div>
                    <span className="addon-icon">{addon === "ai" ? "✦" : addon === "portale" ? "◈" : "▦"}</span>
                    <h3>{ADDON_NAMES[addon]}</h3>
                  </div>
                  <strong>{ADDON_PRICES[addon]}</strong>
                </div>
                <p>{included ? "Incluso in " + PLAN_NAMES[ADDON_REQUIRED_PLAN[addon]] + "." : unlocked ? "Sbloccato singolarmente nel tuo workspace." : "Disponibile anche senza passare a " + PLAN_NAMES[ADDON_REQUIRED_PLAN[addon]] + "."}</p>
                <button type="button" className={included || unlocked ? "secondary-button" : "primary-button"} disabled={included || unlocked} onClick={() => unlockAddon(addon)}>
                  {included ? "✓ Incluso nel piano" : unlocked ? "✓ Sbloccato" : "Sblocca singolarmente"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="info-card">
        <b>Abbonamento e acquisti reali</b>
        <p>
          Il piano stabilisce quali moduli sono inclusi. Gli add-on permettono
          di sbloccare singole funzionalità anche mantenendo il piano attuale.
          In questa versione gli acquisti sono simulati localmente; pagamento,
          fatturazione e controllo server-side degli entitlement verranno
          collegati successivamente.
        </p>
      </div>
    </>
  );
}

/* =========================================================
   GESTIONE COLLABORATORI
   ========================================================= */

const COLLABORATOR_PERMISSION_LABELS: Record<
  CollaboratorPermission,
  string
> = {
  condomini: "Condomini",
  documenti: "Documenti",
  scadenze: "Scadenze",
  assemblee: "Assemblee",
  fornitori: "Fornitori",
  attivita: "Attività",
  comunicazioni: "Comunicazioni",
  ai: "BETHAG AI",
  portale: "Portale condomini",
};

function CollaboratorsPage({
  collaborators,
  setCollaborators,
  workspaceId,
  isAdministrator = false,
}: {
  collaborators: Collaborator[];
  setCollaborators: React.Dispatch<
    React.SetStateAction<Collaborator[]>
  >;
  workspaceId: string;
  isAdministrator?: boolean;
}) {
  const [form, setForm] = useState<Collaborator>({
    id: 0,
    name: "",
    email: "",
    workspaceId,
    status: "Invitato",
    permissions: [
      "condomini",
      "documenti",
      "scadenze",
      "assemblee",
      "fornitori",
      "attivita",
      "comunicazioni",
      "ai",
      "portale",
    ],
  });

  const reset = () =>
    setForm({
      id: 0,
      name: "",
      email: "",
      workspaceId,
      status: "Invitato",
      permissions: [
        "condomini",
        "documenti",
        "scadenze",
        "assemblee",
        "fornitori",
        "attivita",
        "comunicazioni",
        "ai",
        "portale",
      ],
    });

  const save = async (e: React.FormEvent) => {
    if (!isAdministrator) {
      alert("La gestione dei collaboratori è riservata all'Amministratore.");
      return;
    }
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) { alert("Inserisci nome e indirizzo email del collaboratore."); return; }
    if (!validateEmail(email)) { alert("Controlla l'indirizzo email."); return; }
    if (form.permissions.length === 0) { alert("Seleziona almeno una funzione per il collaboratore."); return; }
    if (collaborators.some((item) => item.email.toLowerCase() === email && item.id !== form.id)) {
      alert("Esiste già un collaboratore con questo indirizzo email."); return;
    }

    try {
      if (!supabaseConfigured || !supabase) throw new Error("Supabase non è configurato: impossibile creare un accesso reale.");

      if (!form.id) {
        const legacyId = makeId();
        const { data, error } = await supabase.functions.invoke("bethag-invite-collaborator", {
          body: { workspaceId, legacyId, name, email, permissions: form.permissions },
        });
        if (error) throw error;
        if (!data?.success || !data?.userId) throw new Error(data?.error || "Invito collaboratore non riuscito.");

        const invitedStatus = data?.invited === false ? "Attivo" : "Invitato";
        setCollaborators((items) => [...items, {
          ...form,
          id: legacyId,
          userId: data.userId,
          name,
          email,
          workspaceId,
          status: invitedStatus,
        }]);
        alert(
          data?.invited === false
            ? "Collaboratore collegato all'account esistente e aggiunto al workspace."
            : "Collaboratore creato e invito inviato via e-mail."
        );
      } else {
        const current = collaborators.find((item) => item.id === form.id);
        if (!current?.userId) throw new Error("Questo collaboratore non è ancora collegato a un account Auth.");
        if (current.email.toLowerCase() !== email) {
          alert("Per cambiare l'e-mail di accesso è necessario rimuovere il collaboratore e invitarlo nuovamente.");
          return;
        }
        const { error } = await supabase.from("workspace_members").update({
          active: form.status !== "Disattivato", permissions: form.permissions,
        }).eq("workspace_id", workspaceId).eq("user_id", current.userId);
        if (error) throw error;
        setCollaborators((items) => items.map((item) =>
          item.id === form.id ? { ...form, userId: current.userId, name, email, workspaceId } : item
        ));
      }
      reset();
    } catch (error) {
      console.error("BETHAG collaborator save failed", error);
      alert(error instanceof Error ? error.message : "Impossibile salvare il collaboratore.");
    }
  };

  const edit = (item: Collaborator) => {
    if (!isAdministrator) {
      alert("La modifica dei collaboratori è riservata all'Amministratore.");
      return;
    }
    setForm({
      ...item,
      permissions: [...item.permissions],
    });
  };

  const remove = async (id: number) => {
    if (!isAdministrator) {
      alert("La rimozione dei collaboratori è riservata all'Amministratore.");
      return;
    }
    if (
      !window.confirm(
        "Vuoi rimuovere questo collaboratore dal workspace?"
      )
    ) {
      return;
    }

    try {
      if (!supabaseConfigured || !supabase) {
        throw new Error("Supabase non è configurato.");
      }
      const target = collaborators.find((item) => item.id === id);
      if (!target?.userId) {
        throw new Error("Il collaboratore non è collegato a un account Auth.");
      }

      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", target.userId)
        .eq("role", "collaborator");

      if (error) throw error;

      setCollaborators((items) =>
        items.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error("BETHAG collaborator removal failed", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossibile rimuovere il collaboratore."
      );
    }
  };

  const toggleStatus = async (id: number) => {
    if (!isAdministrator) {
      alert("La modifica dello stato dei collaboratori è riservata all'Amministratore.");
      return;
    }
    try {
      if (!supabaseConfigured || !supabase) {
        throw new Error("Supabase non è configurato.");
      }
      const target = collaborators.find((item) => item.id === id);
      if (!target?.userId) {
        throw new Error("Il collaboratore non è collegato a un account Auth.");
      }

      const nextActive = target.status !== "Attivo";
      const { error } = await supabase
        .from("workspace_members")
        .update({ active: nextActive })
        .eq("workspace_id", workspaceId)
        .eq("user_id", target.userId)
        .eq("role", "collaborator");

      if (error) throw error;

      setCollaborators((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                status: nextActive ? "Attivo" : "Disattivato",
              }
            : item
        )
      );
    } catch (error) {
      console.error("BETHAG collaborator status update failed", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossibile aggiornare lo stato del collaboratore."
      );
    }
  };

  const togglePermission = (
    permission: CollaboratorPermission
  ) => {
    if (!isAdministrator) {
      alert("La modifica dei permessi è riservata all'Amministratore.");
      return;
    }
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter(
            (item) => item !== permission
          )
        : [...current.permissions, permission],
    }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Collaboratori"
      />

      <section className="workspace-card">
        <div>
          <span className="eyebrow">Workspace amministratore</span>
          <h2>Accessi operativi</h2>
          <p>
            I collaboratori appartengono a questo workspace.
            Un collaboratore può accedere solo alle sezioni
            autorizzate dall'Amministratore.
          </p>
        </div>
        <div className="workspace-id">{workspaceId}</div>
      </section>

      <form className="form-card" onSubmit={save}>
        <div className="form-grid">
          <Field
            full
            label="Nome e cognome"
            value={form.name}
            onChange={(v: string) =>
              setForm({ ...form, name: v })
            }
          />
          <Field
            full
            label="Email di accesso"
            type="email"
            value={form.email}
            onChange={(v: string) =>
              setForm({ ...form, email: v })
            }
          />

          <div className="field full">
            <label>Stato</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status:
                    e.target.value as CollaboratorStatus,
                })
              }
            >
              <option value="Invitato">Invitato</option>
              <option value="Attivo">Attivo</option>
              <option value="Disattivato">Disattivato</option>
            </select>
            <small>
              L'accesso frontend viene consentito solo quando
              lo stato è "Attivo".
            </small>
          </div>
        </div>

        <div className="permission-checks">
          {(
            Object.keys(
              COLLABORATOR_PERMISSION_LABELS
            ) as CollaboratorPermission[]
          ).map((permission) => (
            <label
              className="permission-check"
              key={permission}
            >
              <input
                type="checkbox"
                checked={form.permissions.includes(permission)}
                onChange={() =>
                  togglePermission(permission)
                }
              />
              <span>
                {COLLABORATOR_PERMISSION_LABELS[permission]}
              </span>
            </label>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={reset}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="primary-button"
          >
            {form.id
              ? "Salva modifiche"
              : "Invita collaboratore"}
          </button>
        </div>
      </form>

      <section className="section-card">
        <div className="section-header">
          <div>
            <span className="eyebrow">Accessi</span>
            <h2>Collaboratori del workspace</h2>
          </div>
          <span className="badge">
            {collaborators.length}
          </span>
        </div>

        {collaborators.length === 0 ? (
          <div className="empty-state">
            Nessun collaboratore configurato.
          </div>
        ) : (
          <div className="collaborator-list">
            {collaborators.map((item) => (
              <article
                className="row-card collaborator-card"
                key={item.id}
              >
                <div className="row-main">
                  <strong>{item.name}</strong>
                  <span>{item.email}</span>
                  <small>
                    {item.permissions
                      .map(
                        (permission) =>
                          COLLABORATOR_PERMISSION_LABELS[
                            permission
                          ]
                      )
                      .join(" · ")}
                  </small>
                </div>

                <div className="row-actions">
                  <span className="badge">
                    {item.status}
                  </span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => edit(item)}
                  >
                    Modifica
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => toggleStatus(item.id)}
                  >
                    {item.status === "Attivo"
                      ? "Disattiva"
                      : "Attiva"}
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => remove(item.id)}
                  >
                    Rimuovi
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}


/* =========================================================
   PROFILO / WORKSPACE
   ========================================================= */

function ProfilePage({
  profile,
  setProfile,
  subscription,
  portalMembers,
  isAdministrator = false,
}: any) {
  const [saved, setSaved] =
    useState(false);

  const save = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    if (!isAdministrator) {
      alert("La modifica del profilo amministratore è riservata all'Amministratore.");
      return;
    }
    e.preventDefault();

    if (
      profile.email &&
      !validateEmail(
        profile.email
      )
    ) {
      alert(
        "Controlla l'indirizzo email."
      );
      return;
    }

    setSaved(true);

    setTimeout(
      () =>
        setSaved(false),
      1800
    );
  };

  return (
    <>

      <PageHeader
        eyebrow="Impostazioni"
        title="Amministratore"
      />


      <div className="profile-plan-card">

        <div>

          <span className="eyebrow">
            Piano BETHAG
          </span>

          <h2>
            {
              PLAN_NAMES[
                subscription.plan
              ]
            }
          </h2>

        </div>

        <button
          className="secondary-button"
          type="button"
        >
          Piano attivo
        </button>

      </div>


      <section className="workspace-card">

        <div>

          <span className="eyebrow">
            Workspace amministratore
          </span>

          <h2>
            Workspace BETHAG
          </h2>

          <p>
            Questo identificativo è
            predisposto per il futuro
            isolamento dei dati tra
            amministratori.
          </p>

        </div>

        <div className="workspace-id">
          {profile.workspaceId}
        </div>

      </section>


      <form
        className="form-card"
        onSubmit={save}
      >

        <div className="form-grid">

          <Field
            full
            label="Nome e cognome"
            value={profile.name}
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                name: v,
              })
            }
          />

          <Field
            full
            label="Studio / società"
            value={
              profile.company
            }
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                company: v,
              })
            }
          />

          <Field
            label="Email"
            type="email"
            value={
              profile.email
            }
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                email: v,
              })
            }
          />

          <Field
            label="Telefono"
            type="tel"
            value={
              profile.phone
            }
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                phone: v,
              })
            }
          />

          <Field
            full
            label="Indirizzo"
            value={
              profile.address
            }
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                address: v,
              })
            }
          />

          <Field
            label="Codice fiscale"
            value={
              profile.fiscalCode
            }
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                fiscalCode: v,
              })
            }
          />

          <Field
            label="Partita IVA"
            value={
              profile.vat
            }
            onChange={(
              v: string
            ) =>
              setProfile({
                ...profile,
                vat: v,
              })
            }
          />

        </div>


        <div className="form-actions">

          <button
            className="primary-button"
            type="submit"
          >
            {saved
              ? "Salvato ✓"
              : "Salva dati"}
          </button>

        </div>

      </form>


      <section className="workspace-grid">

        <div className="info-card">

          <b>
            👥 Collaboratori e utenti
          </b>

          <p>
            Utenti configurati nel
            workspace:
            {" "}
            <strong>
              {portalMembers.length}
            </strong>
          </p>

          <p>
            Nella versione backend sarà
            possibile associare utenti,
            ruoli, permessi e accessi a
            specifici condomini.
          </p>

        </div>


        <div className="info-card">

          <b>
            🔐 Sicurezza e isolamento
          </b>

          <p>
            L'attuale frontend utilizza
            localStorage esclusivamente
            per la demo.
          </p>

          <p>
            Nella versione pubblica
            autenticazione, autorizzazioni,
            workspace e dati dovranno
            essere gestiti dal backend.
          </p>

        </div>

      </section>

    </>
  );
}


/* =========================================================
   MODALE
   ========================================================= */

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >

      <div
        className="modal"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >

        <button
          className="modal-close"
          onClick={onClose}
        >
          ×
        </button>

        {children}

      </div>

    </div>
  );
}


/* =========================================================
   FORM CONDOMINIO
   ========================================================= */

function CondominiumForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  editing,
}: any) {
  const set = (
    key: keyof Condominium,
    val: string
  ) =>
    onChange({
      ...value,
      [key]: val,
    });

  return (
    <form onSubmit={onSubmit}>

      <div className="modal-title">

        <div className="eyebrow">
          Gestione patrimonio
        </div>

        <h2>
          {editing
            ? "Modifica condominio"
            : "Nuovo condominio"}
        </h2>

      </div>


      <div className="form-grid">

        <Field
          full
          label="Nome del condominio *"
          value={value.name}
          onChange={(
            v: string
          ) =>
            set("name", v)
          }
          placeholder="Es. Condominio Magnolia"
        />

        <Field
          full
          label="Indirizzo *"
          value={
            value.address
          }
          onChange={(
            v: string
          ) =>
            set(
              "address",
              v
            )
          }
          placeholder="Via e numero civico"
        />

        <Field
          label="CAP"
          value={value.cap}
          onChange={(
            v: string
          ) =>
            set("cap", v)
          }
        />

        <Field
          label="Comune"
          value={value.city}
          onChange={(
            v: string
          ) =>
            set(
              "city",
              v
            )
          }
        />

        <Field
          label="Provincia"
          value={
            value.province
          }
          onChange={(
            v: string
          ) =>
            set(
              "province",
              v
            )
          }
        />

        <Field
          label="Unità immobiliari *"
          value={value.units}
          onChange={(
            v: string
          ) =>
            set(
              "units",
              v.replace(
                /\D/g,
                ""
              )
            )
          }
          type="number"
        />

        <Field
          full
          label="Codice fiscale del condominio"
          value={
            value.fiscalCode
          }
          onChange={(
            v: string
          ) =>
            set(
              "fiscalCode",
              v
            )
          }
        />

        <Field
          label="Referente"
          value={
            value.contact
          }
          onChange={(
            v: string
          ) =>
            set(
              "contact",
              v
            )
          }
        />

        <Field
          label="Telefono"
          value={
            value.phone
          }
          onChange={(
            v: string
          ) =>
            set(
              "phone",
              v
            )
          }
          type="tel"
        />

        <Field
          full
          label="Email"
          value={
            value.email
          }
          onChange={(
            v: string
          ) =>
            set(
              "email",
              v
            )
          }
          type="email"
        />

        <Field
          label="Banca"
          value={value.bank}
          onChange={(
            v: string
          ) =>
            set(
              "bank",
              v
            )
          }
        />

        <Field
          label="IBAN"
          value={value.iban}
          onChange={(
            v: string
          ) =>
            set(
              "iban",
              v
            )
          }
        />

        <Field
          full
          label="Note"
          value={
            value.notes
          }
          onChange={(
            v: string
          ) =>
            set(
              "notes",
              v
            )
          }
          textarea
        />

      </div>


      <div className="form-actions">

        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
        >
          Annulla
        </button>

        <button
          type="submit"
          className="primary-button"
        >
          {editing
            ? "Salva modifiche"
            : "Salva condominio"}
        </button>

      </div>

    </form>
  );
}


/* =========================================================
   FORM SCADENZA
   ========================================================= */

function DeadlineForm({
  value,
  setValue,
  condominiums,
  onSubmit,
  onCancel,
  editing,
}: any) {
  return (
    <form onSubmit={onSubmit}>

      <ModalTitle
        title={
          editing
            ? "Modifica scadenza"
            : "Nuova scadenza"
        }
      />

      <div className="form-grid">

        <Field
          full
          label="Titolo *"
          value={value.title}
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              title: v,
            })
          }
        />

        <SelectField
          label="Condominio"
          value={
            value.condominiumId
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              condominiumId:
                Number(v),
            })
          }
          options={condominiums.map(
            (
              c: Condominium
            ) => [
              c.id,
              c.name,
            ]
          )}
        />

        <Field
          label="Data *"
          value={
            value.dueDate
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              dueDate: v,
            })
          }
          type="date"
        />

        <Field
          label="Importo (€)"
          value={
            value.amount
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              amount: v,
            })
          }
          type="number"
        />

        <Field
          label="Categoria"
          value={
            value.category
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              category: v,
            })
          }
        />

        <SelectField
          label="Stato"
          value={
            value.status
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              status:
                v as DeadlineStatus,
            })
          }
          options={[
            "Da fare",
            "In scadenza",
            "Completata",
          ].map(
            (x) => [
              x,
              x,
            ]
          )}
        />

        <Field
          full
          label="Note"
          value={
            value.notes
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              notes: v,
            })
          }
          textarea
        />

      </div>

      <Actions
        onCancel={onCancel}
      />

    </form>
  );
}


/* =========================================================
   FORM DOCUMENTO
   ========================================================= */

function DocumentForm({
  value,
  setValue,
  condominiums,
  onSubmit,
  onCancel,
  selectedFileName,
  setSelectedFileName,
  editing,
}: any) {
  return (
    <form onSubmit={onSubmit}>

      <ModalTitle
        title={
          editing
            ? "Modifica documento"
            : "Nuovo documento"
        }
      />

      <div className="form-grid">

        <div className="field full">

          <label>
            Carica file
          </label>

          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,image/*"
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>
            ) => {

              const file =
                e.target.files?.[0];

              if (!file)
                return;

              const source =
                fileSource(
                  file.name,
                  file.type
                );

              setSelectedFileName(
                file.name
              );

              setValue({
                ...value,
                name: file.name,
                size: `${Math.round(
                  file.size / 1024
                )} KB`,
                source,
                mimeType:
                  file.type,
              });

            }}
          />

          <small>
            Formati predisposti:
            PDF, Word, Excel, CSV,
            TXT, RTF, ODT,
            immagini.
          </small>

          {selectedFileName && (
            <small>
              Selezionato:{" "}
              {
                selectedFileName
              }
            </small>
          )}

        </div>


        <Field
          full
          label="Nome documento *"
          value={value.name}
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              name: v,
            })
          }
        />

        <SelectField
          label="Condominio"
          value={
            value.condominiumId
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              condominiumId:
                Number(v),
            })
          }
          options={condominiums.map(
            (
              c: Condominium
            ) => [
              c.id,
              c.name,
            ]
          )}
        />

        <Field
          label="Categoria"
          value={
            value.category
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              category: v,
            })
          }
        />

        <Field
          label="Data"
          value={value.date}
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              date: v,
            })
          }
          type="date"
        />

        <SelectField
          label="Visibilità"
          value={
            value.publication
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              publication:
                v as PublicationStatus,
            })
          }
          options={[
            [
              "Privato",
              "Privato",
            ],
            [
              "Condiviso",
              "Condiviso",
            ],
          ]}
        />

        <Field
          full
          label="Note"
          value={
            value.notes
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              notes: v,
            })
          }
          textarea
        />

      </div>

      <Actions
        onCancel={onCancel}
      />

    </form>
  );
}


/* =========================================================
   FORM ASSEMBLEA
   ========================================================= */

function AssemblyForm({
  value,
  setValue,
  condominiums,
  onSubmit,
  onCancel,
  editing,
}: any) {
  return (
    <form onSubmit={onSubmit}>

      <ModalTitle
        title={
          editing
            ? "Modifica assemblea"
            : "Nuova assemblea"
        }
      />

      <div className="form-grid">

        <Field
          full
          label="Titolo *"
          value={
            value.title
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              title: v,
            })
          }
        />

        <SelectField
          label="Condominio"
          value={
            value.condominiumId
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              condominiumId:
                Number(v),
            })
          }
          options={condominiums.map(
            (
              c: Condominium
            ) => [
              c.id,
              c.name,
            ]
          )}
        />

        <Field
          label="Data *"
          value={
            value.date
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              date: v,
            })
          }
          type="date"
        />

        <Field
          label="Ora"
          value={
            value.time
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              time: v,
            })
          }
          type="time"
        />

        <Field
          label="Luogo"
          value={
            value.place
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              place: v,
            })
          }
        />

        <SelectField
          label="Stato"
          value={
            value.status
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              status:
                v as AssemblyStatus,
            })
          }
          options={[
            "Programmato",
            "Svolto",
            "Annullato",
          ].map(
            (x) => [
              x,
              x,
            ]
          )}
        />

        <Field
          full
          label="Note"
          value={
            value.notes
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              notes: v,
            })
          }
          textarea
        />

      </div>

      <Actions
        onCancel={onCancel}
      />

    </form>
  );
}


/* =========================================================
   FORM FORNITORE
   ========================================================= */

function SupplierForm({
  value,
  setValue,
  condominiums,
  onSubmit,
  onCancel,
  editing,
}: any) {
  return (
    <form onSubmit={onSubmit}>

      <ModalTitle
        title={
          editing
            ? "Modifica fornitore"
            : "Nuovo fornitore"
        }
      />

      <div className="form-grid">

        <Field
          label="Nome *"
          value={value.name}
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              name: v,
            })
          }
        />

        <Field
          label="Servizio *"
          value={
            value.service
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              service: v,
            })
          }
        />

        <Field
          label="Telefono"
          value={
            value.phone
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              phone: v,
            })
          }
          type="tel"
        />

        <Field
          label="Email"
          value={
            value.email
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              email: v,
            })
          }
          type="email"
        />

        <SelectField
          full
          label="Condominio"
          value={
            value.condominiumId ??
            ""
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              condominiumId:
                v
                  ? Number(v)
                  : null,
            })
          }
          options={[
            [
              "",
              "Tutti i condomini",
            ],
            ...condominiums.map(
              (
                c: Condominium
              ) => [
                c.id,
                c.name,
              ]
            ),
          ]}
        />

        <Field
          full
          label="Note"
          value={
            value.notes
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              notes: v,
            })
          }
          textarea
        />

      </div>

      <Actions
        onCancel={onCancel}
      />

    </form>
  );
}


/* =========================================================
   FORM ATTIVITÀ
   ========================================================= */

function ActivityForm({
  value,
  setValue,
  condominiums,
  onSubmit,
  onCancel,
  editing,
}: any) {
  return (
    <form onSubmit={onSubmit}>

      <ModalTitle
        title={
          editing
            ? "Modifica attività"
            : "Nuova attività"
        }
      />

      <div className="form-grid">

        <Field
          full
          label="Titolo *"
          value={
            value.title
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              title: v,
            })
          }
        />

        <SelectField
          full
          label="Condominio"
          value={
            value.condominiumId ??
            ""
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              condominiumId:
                v
                  ? Number(v)
                  : null,
            })
          }
          options={[
            [
              "",
              "Tutti i condomini",
            ],
            ...condominiums.map(
              (
                c: Condominium
              ) => [
                c.id,
                c.name,
              ]
            ),
          ]}
        />

        <Field
          label="Scadenza"
          value={
            value.dueDate
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              dueDate: v,
            })
          }
          type="date"
        />

        <SelectField
          label="Priorità"
          value={
            value.priority
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              priority:
                v as ActivityPriority,
            })
          }
          options={[
            "Bassa",
            "Media",
            "Alta",
          ].map(
            (x) => [
              x,
              x,
            ]
          )}
        />

        <SelectField
          label="Stato"
          value={
            value.status
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              status:
                v as ActivityStatus,
            })
          }
          options={[
            "Aperta",
            "In corso",
            "Completata",
          ].map(
            (x) => [
              x,
              x,
            ]
          )}
        />

        <Field
          full
          label="Note"
          value={
            value.notes
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              notes: v,
            })
          }
          textarea
        />

      </div>

      <Actions
        onCancel={onCancel}
      />

    </form>
  );
}


/* =========================================================
   FORM COMUNICAZIONE
   ========================================================= */

function CondominiumMemberForm({ value, setValue, condominiums, members, onSubmit, onCancel, editing }: any) {
  const set = (key: keyof CondominiumMember, val: any) => setValue({ ...value, [key]: val });
  const sameCondominium = members.filter((m: CondominiumMember) => m.condominiumId === value.condominiumId && m.id !== value.id);
  const existingApartments = Array.from(new Set(sameCondominium.map((m: CondominiumMember) => m.apartment.trim()).filter(Boolean)));
  const selectedApartment = value.apartment.trim();
  const apartmentAssociates = sameCondominium.filter((m: CondominiumMember) => m.apartment.trim().toLowerCase() === selectedApartment.toLowerCase());
  const unitSelection = existingApartments.includes(value.apartment)
    ? value.apartment
    : value.apartment
      ? "__new__"
      : "";
  return <form onSubmit={onSubmit}>
    <ModalTitle title={editing ? "Modifica condòmino" : "Nuovo condòmino"} />
    <div className="form-grid">
      <SelectField full label="Condominio" value={value.condominiumId} onChange={(v: string) => setValue({ ...value, condominiumId: Number(v), apartment: "", unitId: "" })} options={condominiums.map((c: Condominium) => [c.id, c.name])} />
      <Field label="Nome *" value={value.firstName} onChange={(v: string) => set("firstName", v)} />
      <Field label="Cognome *" value={value.lastName} onChange={(v: string) => set("lastName", v)} />
      <div className="field full">
        <label>Unità abitativa *</label>
        <select value={unitSelection} onChange={(e) => {
          if (e.target.value === "__new__") setValue({ ...value, apartment: "", unitId: "" });
          else setValue({ ...value, apartment: e.target.value, unitId: `local-unit-${value.condominiumId}-${e.target.value.toLowerCase().replace(/\\s+/g, "-")}` });
        }}>
          <option value="">Seleziona un'unità esistente oppure creane una nuova</option>
          {existingApartments.map((apartment) => <option key={apartment} value={apartment}>{apartment}</option>)}
          <option value="__new__">+ Nuova unità…</option>
        </select>
        {!existingApartments.includes(value.apartment) && (
          <input style={{ marginTop: 8 }} value={value.apartment} autoFocus={Boolean(value.apartment)} placeholder="Es. Interno 4" onChange={(e) => setValue({ ...value, apartment: e.target.value, unitId: "" })} />
        )}
        {apartmentAssociates.length > 0 && (
          <div className="form-help" style={{ marginTop: 8 }}>
            <strong>Già associati:</strong>{" "}
            {apartmentAssociates.map((m: CondominiumMember) => `${m.firstName} ${m.lastName} (${m.role})`).join(" · ")}
            <br />Il nuovo soggetto sarà collegato alla stessa unità abitativa.
          </div>
        )}
      </div>
      <SelectField label="Qualifica" value={value.role} onChange={(v: string) => set("role", v)} options={[["Proprietario","Proprietario"],["Inquilino","Inquilino"]]} />
      <Field label="Millesimi" value={value.millesimi} onChange={(v: string) => set("millesimi", v)} />
      <Field label="Codice fiscale" value={value.fiscalCode} onChange={(v: string) => set("fiscalCode", v)} />
      <Field label="Telefono" value={value.phone} onChange={(v: string) => set("phone", v)} />
      <Field label="E-mail" value={value.email} onChange={(v: string) => set("email", v)} />
      <div className="field checkbox-field"><label>Stato</label><label className="switch-row"><input type="checkbox" checked={value.active} onChange={(e) => set("active", e.target.checked)} /><span>Condòmino attivo</span></label></div>
      <Field full label="Note" value={value.notes} onChange={(v: string) => set("notes", v)} textarea />
    </div>
    <Actions onCancel={onCancel} />
  </form>;
}
function CondominiumRequestForm({ value, setValue, condominiums, members, suppliers, activities, onSubmit, onCancel, editing }: any) {
  const set = (key: keyof CondominiumRequest, val: any) => setValue({ ...value, [key]: val });
  return <form onSubmit={onSubmit}><ModalTitle title={editing ? "Modifica segnalazione / richiesta" : "Nuova segnalazione / richiesta"} /><div className="form-grid">
    <SelectField full label="Condominio" value={value.condominiumId} onChange={(v: string) => set("condominiumId", Number(v))} options={condominiums.map((c: Condominium) => [c.id, c.name])} />
    <SelectField label="Condòmino" value={value.memberId ?? ""} onChange={(v: string) => set("memberId", v ? Number(v) : null)} options={[["","Non indicato"],...members.filter((m: CondominiumMember) => m.condominiumId === value.condominiumId).map((m: CondominiumMember) => [m.id,`${m.firstName} ${m.lastName} · ${m.apartment}`])]} />
    <SelectField label="Categoria" value={value.category} onChange={(v: string) => set("category", v)} options={[["Informazioni","Informazioni"],["Manutenzione","Manutenzione"],["Guasto","Guasto"],["Amministrazione","Amministrazione"],["Pagamento","Pagamento"],["Segnalazione","Segnalazione"],["Altro","Altro"]]} />
    <SelectField label="Priorità" value={value.priority} onChange={(v: string) => set("priority", v)} options={[["Bassa","Bassa"],["Media","Media"],["Alta","Alta"]]} /><Field label="Data" type="date" value={value.date} onChange={(v: string) => set("date", v)} />
    <SelectField label="Stato" value={value.status} onChange={(v: string) => set("status", v)} options={[["Nuova","Nuova"],["In lavorazione","In lavorazione"],["Risolta","Risolta"],["Chiusa","Chiusa"]]} />
    <Field full label="Descrizione *" value={value.description} onChange={(v: string) => set("description", v)} textarea /><Field full label="Risposta amministratore" value={value.response} onChange={(v: string) => set("response", v)} textarea /><Field label="Allegato" value={value.attachmentName} onChange={(v: string) => set("attachmentName", v)} />
    <SelectField label="Fornitore collegato" value={value.supplierId ?? ""} onChange={(v: string) => set("supplierId", v ? Number(v) : null)} options={[["","Nessun fornitore"],...suppliers.filter((s: Supplier) => s.condominiumId === null || s.condominiumId === value.condominiumId).map((s: Supplier) => [s.id,s.name])]} />
    <SelectField label="Attività collegata" value={value.activityId ?? ""} onChange={(v: string) => set("activityId", v ? Number(v) : null)} options={[["","Nessuna attività"],...activities.filter((a: Activity) => a.condominiumId === value.condominiumId).map((a: Activity) => [a.id,a.title])]} />
  </div><Actions onCancel={onCancel} /></form>;
}

function CommunicationForm({
  value,
  setValue,
  condominiums,
  members = [],
  onPrepareEmail,
  onSubmit,
  onCancel,
  editing,
}: any) {
  return (
    <form onSubmit={onSubmit}>

      <ModalTitle
        title={
          editing
            ? "Modifica comunicazione"
            : "Nuova comunicazione"
        }
      />

      <div className="form-grid">

        <Field
          full
          label="Titolo *"
          value={
            value.title
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              title: v,
            })
          }
          placeholder="Es. Avviso manutenzione"
        />

        <SelectField
          label="Condominio"
          value={
            value.condominiumId ??
            ""
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              condominiumId:
                v
                  ? Number(v)
                  : null,
              recipientIds: [],
            })
          }
          options={[
            ["", "Seleziona un condominio"],
            ...condominiums.map((item: Condominium) => [
              String(item.id),
              item.name,
            ]),
          ]}
        />

        <SelectField
          label="Destinatari"
          value={
            value.audience
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              audience:
                v as CommunicationAudience,
              recipientIds:
                v === "Selezionati" ? (value.recipientIds || []) : [],
            })
          }
          options={[
            [
              "Tutti",
              "Tutti i condòmini",
            ],
            [
              "Selezionati",
              "Condòmini selezionati",
            ],
            [
              "Consiglio",
              "Consiglio",
            ],
          ]}
        />

        {value.audience === "Selezionati" && (
          <div className="field full recipient-picker"><label>Condòmini destinatari</label><div className="recipient-list">
            {members.filter((m: CondominiumMember) => m.condominiumId === value.condominiumId && m.active).map((member: CondominiumMember) => (
              <label className="recipient-option" key={member.id}><input type="checkbox" checked={(value.recipientIds || []).includes(member.id)} onChange={(e) => setValue({ ...value, recipientIds: e.target.checked ? [...(value.recipientIds || []), member.id] : (value.recipientIds || []).filter((id: number) => id !== member.id) })} /><span>{member.firstName} {member.lastName}{member.email ? ` · ${member.email}` : " · E-mail non inserita"}</span></label>
            ))}
          </div></div>
        )}

        {value.audience === "Consiglio" && (
          <div className="field full recipient-picker">
            <label>Destinatari del Consiglio</label>
            <div className="recipient-help">
              Verranno utilizzati gli indirizzi e-mail dei membri attivi con ruolo <b>Consigliere</b> nel Portale condomini per il condominio selezionato.
            </div>
          </div>
        )}

        <Field
          label="Data"
          type="date"
          value={
            value.date
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              date: v,
            })
          }
        />

        <Field
          full
          label="Contenuto *"
          value={
            value.body
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              body: v,
            })
          }
          textarea
          placeholder="Scrivi il contenuto della comunicazione..."
        />

        <SelectField
          label="Stato"
          value={
            value.status
          }
          onChange={(
            v: string
          ) =>
            setValue({
              ...value,
              status:
                v as CommunicationStatus,
            })
          }
          options={[
            [
              "Bozza",
              "Bozza",
            ],
            [
              "Pubblicata",
              "Pubblicata",
            ],
          ]}
        />

        <div className="field checkbox-field">

          <label>
            Pubblica nel portale
          </label>

          <label className="switch-row">

            <input
              type="checkbox"
              checked={
                value.publishedToPortal
              }
              onChange={(e) =>
                setValue({
                  ...value,
                  publishedToPortal:
                    e.target.checked,
                  status:
                    e.target.checked
                      ? "Pubblicata"
                      : "Bozza",
                })
              }
            />

            <span>
              Rendi visibile ai
              destinatari autorizzati
            </span>

          </label>

        </div>

      </div>

      {value.condominiumId && (
        <div className="communication-email-actions"><button type="button" className="secondary-button" onClick={() => onPrepareEmail(value.condominiumId, value.audience === "Selezionati" ? value.recipientIds || [] : undefined, value.id || undefined, value.title, value.body, value.audience)}>✉️ Invia e-mail</button><span>{value.emailStatus === "Inviata" ? "E-mail inviata correttamente." : "Invio diretto ai destinatari autorizzati."}</span></div>
      )}

      <Actions
        onCancel={onCancel}
      />

    </form>
  );
}


/* =========================================================
   FORM HELPERS
   ========================================================= */

function ModalTitle({
  title,
}: {
  title: string;
}) {
  return (
    <div className="modal-title">

      <div className="eyebrow">
        BETHAG
      </div>

      <h2>
        {title}
      </h2>

    </div>
  );
}


function Actions({
  onCancel,
}: {
  onCancel: () => void;
}) {
  return (
    <div className="form-actions">

      <button
        type="button"
        className="secondary-button"
        onClick={onCancel}
      >
        Annulla
      </button>

      <button
        type="submit"
        className="primary-button"
      >
        Salva
      </button>

    </div>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  full = false,
  textarea = false,
}: any) {
  return (
    <div
      className={`field ${
        full ? "full" : ""
      }`}
    >

      <label>
        {label}
      </label>

      {textarea ? (
        <textarea
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
      ) : (
        <input
          type={type}
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
      )}

    </div>
  );
}


function SelectField({
  label,
  value,
  onChange,
  options,
  full = false,
}: any) {
  return (
    <div
      className={`field ${
        full ? "full" : ""
      }`}
    >

      <label>
        {label}
      </label>

      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      >

        {options.map(
          (x: any) => (
            <option
              key={String(
                x[0]
              )}
              value={x[0]}
            >
              {x[1]}
            </option>
          )
        )}

      </select>

    </div>
  );
}


/* =========================================================
   CSS
   ========================================================= */

const styles = `
*{
  box-sizing:border-box;
}

html{
  -webkit-text-size-adjust:100%;
  scroll-behavior:smooth;
}

body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:#f5f7fb;
  color:#172033;
}

button,
input,
textarea,
select{
  font:inherit;
}

button{
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}

.app{
  min-height:100vh;
  display:flex;
}

.sidebar{
  width:260px;
  flex-shrink:0;
  background:#111827;
  color:#fff;
  padding:26px 16px;
  display:flex;
  flex-direction:column;
}

.logo{
  font-size:28px;
  font-weight:800;
  letter-spacing:1px;
  padding:0 12px 22px;
}

.logo span{
  color:#7c9cff;
}

.plan-sidebar{
  margin:0 10px 18px;
  padding:9px 11px;
  background:#1f2937;
  border:1px solid #334155;
  border-radius:10px;
  font-size:12px;
  color:#c7d2fe;
}

.plan-sidebar small{
  display:block;
  margin-top:4px;
  color:#94a3b8;
  font-size:9px;
  word-break:break-all;
}
.role-badge{
  display:inline-block!important;
  margin-top:8px!important;
  padding:4px 8px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:999px;
  background:rgba(255,255,255,.08);
  color:#e2e8f0!important;
  font-size:10px!important;
  font-weight:700;
  letter-spacing:.02em;
  width:max-content;
}

.nav{
  display:flex;
  flex-direction:column;
  gap:6px;
}

.nav-item{
  border:0;
  background:transparent;
  color:#cbd5e1;
  text-align:left;
  padding:12px 13px;
  border-radius:10px;
  font-size:14px;
  width:100%;
}

.nav-item.active,
.nav-item:hover{
  background:#1f2937;
  color:#fff;
}

.sidebar-bottom{
  margin-top:auto;
  padding:14px;
  border-top:1px solid #273244;
  color:#94a3b8;
  font-size:13px;
}

.content{
  flex:1;
  padding:30px;
  max-width:1500px;
  margin:0 auto;
  width:100%;
}

.mobile-header{
  display:none;
}

.topbar,
.page-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
  margin-bottom:28px;
}

.dashboard-subtitle{
  margin:7px 0 0;
  color:#64748b;
  font-size:13px;
}

.eyebrow{
  color:#64748b;
  font-size:13px;
  margin-bottom:5px;
}

h1{
  margin:0;
  font-size:30px;
}

.profile{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:12px;
  padding:10px 14px;
  font-weight:600;
  color:#172033;
}

.stats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
  margin-bottom:18px;
}

.stat-card{
  border:1px solid #e2e8f0;
  background:#fff;
  border-radius:16px;
  padding:20px;
  text-align:left;
  box-shadow:0 4px 18px rgba(15,23,42,.04);
}

.stat-card span{
  font-size:24px;
}

.stat-card strong{
  display:block;
  font-size:30px;
  margin-top:14px;
}

.stat-card small{
  display:block;
  color:#64748b;
  margin-top:4px;
}

.mini-stats{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
  margin-bottom:24px;
}

.mini-stat{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:14px;
  padding:15px 18px;
}

.mini-stat b{
  font-size:22px;
  display:block;
}

.mini-stat span{
  font-size:12px;
  color:#64748b;
}

.dashboard-grid{
  display:grid;
  grid-template-columns:1.5fr 1fr;
  gap:20px;
}

.dashboard-secondary{
  margin-top:20px;
}

.card,
.form-card,
.detail-card,
.search-card,
.table-card,
.info-card,
.subscription-current,
.profile-plan-card,
.workspace-card{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:16px;
  padding:20px;
  box-shadow:0 4px 18px rgba(15,23,42,.04);
}

.section-title{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  margin-bottom:16px;
}

.section-title h2{
  font-size:19px;
  margin:0;
}

.link{
  border:0;
  background:transparent;
  color:#526dfe;
  font-size:14px;
  padding:5px;
}

.list-row,
.activity{
  display:flex;
  justify-content:space-between;
  gap:15px;
  padding:15px 0;
  border-bottom:1px solid #eef2f7;
}

.list-row:last-child,
.activity:last-child{
  border-bottom:0;
}

.list-row small,
.activity small,
.row-card small{
  display:block;
  color:#64748b;
  margin-top:5px;
}

.list-row>strong{
  white-space:nowrap;
  font-size:13px;
  color:#475569;
}

.badge{
  display:inline-block;
  margin-top:7px;
  padding:4px 8px;
  border-radius:999px;
  font-size:11px;
  background:#eef2ff;
  color:#4f46e5;
}

.badge.urgent{
  background:#fff1f2;
  color:#be123c;
}

.badge.done{
  background:#ecfdf5;
  color:#047857;
}

.notice{
  margin-top:14px;
  padding:11px;
  border-radius:10px;
  background:#fff7ed;
  color:#9a3412;
  font-size:13px;
}

.ai-card{
  margin-top:20px;
  background:linear-gradient(135deg,#111827,#263454);
  color:#fff;
  border-radius:18px;
  padding:24px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
}

.ai-card h2{
  margin:4px 0 8px;
}

.ai-card p{
  color:#cbd5e1;
  max-width:680px;
  line-height:1.5;
  margin:0;
}

.ai-kicker{
  font-size:12px;
  letter-spacing:1px;
  color:#a5b4fc;
}

.ai-button{
  border:0;
  border-radius:10px;
  background:#fff;
  color:#111827;
  padding:12px 16px;
  font-weight:700;
  white-space:nowrap;
}

.primary-button{
  border:0;
  background:#526dfe;
  color:#fff;
  padding:12px 17px;
  border-radius:10px;
  font-weight:700;
}

.primary-button:hover{
  background:#4359dc;
}

.secondary-button{
  border:1px solid #dbe2ea;
  background:#fff;
  color:#334155;
  padding:11px 16px;
  border-radius:10px;
  font-weight:600;
}

.secondary-button.small{
  padding:7px 10px;
  font-size:12px;
}

.small-button{
  padding:8px 11px;
  font-size:12px;
}

.danger-button,
.mini-danger{
  border:1px solid #fecdd3;
  background:#fff1f2;
  color:#be123c;
  padding:11px 16px;
  border-radius:10px;
  font-weight:600;
}

.mini-danger{
  padding:6px 10px;
}

.search-card{
  margin-bottom:8px;
  padding:14px;
}

.search-input{
  width:100%;
  border:1px solid #dbe2ea;
  border-radius:10px;
  padding:12px 14px;
  outline:0;
}

.search-input:focus,
input:focus,
textarea:focus,
select:focus{
  border-color:#526dfe;
  box-shadow:0 0 0 3px rgba(82,109,254,.12);
}

.results-info{
  color:#64748b;
  font-size:13px;
  margin:10px 0 16px;
}

.cards-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:18px;
}

.entity-card{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:16px;
  padding:20px;
  box-shadow:0 4px 18px rgba(15,23,42,.04);
}

.entity-icon{
  font-size:26px;
}

.entity-card h2{
  font-size:18px;
  margin:12px 0 7px;
}

.entity-card p{
  color:#64748b;
  line-height:1.5;
}

.meta{
  margin:15px 0;
  color:#475569;
  font-size:14px;
}

.small-note{
  font-size:13px;
  background:#f8fafc;
  border-radius:8px;
  padding:9px;
}

.button-row{
  display:flex;
  gap:9px;
  flex-wrap:wrap;
  margin-top:18px;
}

.button-row>*{
  flex:1;
}

.detail-card{
  margin-top:20px;
}

.detail-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:18px;
}

.detail-label{
  color:#64748b;
  font-size:12px;
  margin-bottom:4px;
}

.detail-value{
  font-weight:600;
  word-break:break-word;
}

.notes{
  border-top:1px solid #eef2f7;
  margin-top:20px;
  padding-top:18px;
}

.notes p{
  color:#475569;
  white-space:pre-wrap;
  line-height:1.5;
}

.cards-list{
  display:flex;
  flex-direction:column;
  gap:12px;
}

.row-card{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:14px;
  padding:17px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
}

.row-card b{
  display:block;
}

.row-card span{
  display:block;
  color:#475569;
  font-size:13px;
  margin-top:7px;
}

.row-card p{
  color:#64748b;
  font-size:13px;
  line-height:1.5;
  white-space:pre-wrap;
}

.row-actions{
  display:flex;
  align-items:center;
  gap:9px;
  flex-wrap:wrap;
}

.row-actions select,
.field select{
  border:1px solid #dbe2ea;
  background:#fff;
  border-radius:10px;
  padding:10px;
}

.form-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:16px;
}

.field{
  display:flex;
  flex-direction:column;
  gap:7px;
}

.field.full{
  grid-column:1/-1;
}

.field label{
  font-size:13px;
  font-weight:650;
  color:#334155;
}

.field input,
.field textarea,
.field select{
  width:100%;
  border:1px solid #dbe2ea;
  border-radius:10px;
  padding:12px;
  background:#fff;
  color:#172033;
  outline:0;
}

.field textarea{
  min-height:100px;
  resize:vertical;
}

.form-actions{
  display:flex;
  justify-content:flex-end;
  gap:10px;
  margin-top:22px;
}

.info-card{
  margin-top:18px;
  color:#475569;
}

.info-card p{
  line-height:1.5;
}

.empty{
  padding:28px;
  text-align:center;
  color:#64748b;
}

.quick-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}

.quick-action{
  border:1px solid #e2e8f0;
  background:#f8fafc;
  border-radius:12px;
  padding:15px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:7px;
  min-height:100px;
  color:#334155;
}

.quick-action span{
  font-size:12px;
  font-weight:600;
}

/* DETTAGLIO CONDOMINIO */

.condominium-quick-actions{margin-top:20px}.quick-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.quick-action-card{border:1px solid #dbe4f3;background:#f8faff;border-radius:14px;padding:15px;text-align:left;display:flex;flex-direction:column;gap:5px;color:#172033;cursor:pointer;transition:.15s}.quick-action-card:hover{border-color:#b9c9ec;transform:translateY(-1px)}.quick-action-card strong{font-size:13px}.quick-action-card span{font-size:11px;color:#64748b}.quick-action-card:first-letter{font-size:18px}

.condominium-detail-page{
  width:100%;
}

.detail-page-header{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:18px;
  padding:22px;
  margin-bottom:20px;
  box-shadow:0 4px 18px rgba(15,23,42,.04);
}

.back-button{
  border:0;
  background:transparent;
  color:#526dfe;
  padding:0;
  margin:0 0 22px;
  font-weight:700;
  font-size:14px;
}

.detail-page-heading{
  display:flex;
  align-items:center;
  gap:16px;
}

.detail-page-icon{
  width:60px;
  height:60px;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#eef2ff;
  border-radius:15px;
  font-size:29px;
}

.detail-page-heading-text{
  min-width:0;
}

.detail-page-heading h1{
  margin:0;
  font-size:28px;
  line-height:1.2;
}

.detail-page-heading p{
  margin:7px 0 0;
  color:#64748b;
  font-size:14px;
  line-height:1.5;
}

.detail-page-actions{
  display:flex;
  gap:10px;
  margin-top:22px;
}

.detail-page-actions button{
  min-width:120px;
}

.condominium-detail-page .detail-card{
  margin-top:0;
}

.condominium-overview{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:10px;
  margin-bottom:22px;
}

.overview-stat{
  background:#f8fafc;
  border:1px solid #eef2f7;
  border-radius:11px;
  padding:13px;
  text-align:center;
}

.overview-stat b{
  display:block;
  font-size:21px;
}

.overview-stat span{
  display:block;
  margin-top:3px;
  color:#64748b;
  font-size:10px;
}

/* RELATED */

.related-section{
  border-top:1px solid #eef2f7;
  margin-top:24px;
  padding-top:20px;
}

.related-title{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}

.related-title h3{
  margin:0;
  font-size:17px;
}

.related-title span{
  background:#eef2ff;
  color:#4f46e5;
  border-radius:999px;
  padding:4px 9px;
  font-size:12px;
  font-weight:700;
}

.related-list{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.related-row{
  border:1px solid #eef2f7;
  border-radius:12px;
  padding:12px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
}

.related-main{
  min-width:0;
}

.related-main b{
  display:block;
}

.related-main small{
  display:block;
  color:#64748b;
  margin-top:4px;
  line-height:1.4;
}

.related-actions{
  display:flex;
  align-items:center;
  gap:6px;
  flex-wrap:wrap;
  justify-content:flex-end;
}

.related-actions select{
  border:1px solid #dbe2ea;
  border-radius:8px;
  padding:7px;
  background:#fff;
}

/* DOCUMENTI */

.document-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
}

.document-card{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:16px;
  padding:18px;
  box-shadow:0 4px 18px rgba(15,23,42,.04);
}

.document-icon{
  font-size:28px;
}

.document-card h3{
  margin:12px 0 5px;
  font-size:16px;
  word-break:break-word;
}

.document-card>p{
  color:#64748b;
  font-size:13px;
}

.document-meta{
  display:flex;
  gap:5px;
  flex-wrap:wrap;
  margin:12px 0;
}

.document-meta span{
  background:#f8fafc;
  border:1px solid #eef2f7;
  padding:5px 7px;
  border-radius:7px;
  font-size:11px;
  color:#475569;
}

.document-status{
  display:flex;
  gap:5px;
  flex-wrap:wrap;
}

.ai-summary{
  margin-top:12px;
  padding:10px;
  background:#f5f3ff;
  border-radius:10px;
  color:#4c1d95;
  font-size:12px;
}

.ai-summary p{
  margin:5px 0 0;
  line-height:1.4;
}

.full-button{
  width:100%;
  margin-top:8px;
}

.document-bottom{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin-top:12px;
  border-top:1px solid #eef2f7;
  padding-top:10px;
}

/* BANNER */

.feature-banner{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:15px;
  background:#eef2ff;
  border:1px solid #c7d2fe;
  border-radius:14px;
  padding:14px 17px;
  margin-bottom:15px;
}

.feature-banner div{
  display:flex;
  flex-direction:column;
  gap:3px;
}

.feature-banner span{
  font-size:12px;
  color:#4f46e5;
}

.feature-plan{
  background:#fff;
  border-radius:999px;
  padding:7px 10px;
  font-weight:700;
}

/* AI */

.ai-hero{
  background:linear-gradient(135deg,#111827,#263454);
  color:#fff;
  border-radius:20px;
  padding:28px;
  display:flex;
  justify-content:space-between;
  gap:25px;
  align-items:center;
  margin-bottom:20px;
}

.ai-hero h2{
  margin:8px 0;
  font-size:27px;
}

.ai-hero p{
  color:#cbd5e1;
  max-width:760px;
  line-height:1.55;
}

.ai-plan-box{
  min-width:210px;
  padding:18px;
  border-radius:14px;
  background:rgba(255,255,255,.08);
  display:flex;
  flex-direction:column;
  gap:9px;
}

.ai-plan-box span{
  color:#cbd5e1;
  font-size:12px;
}

.ai-tools-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
  margin-bottom:20px;
}

.ai-tool{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:16px;
  padding:20px;
}

.tool-icon{
  font-size:28px;
}

.ai-tool h3{
  margin:12px 0 8px;
}

.ai-tool p{
  color:#64748b;
  line-height:1.5;
  font-size:13px;
}

.tool-flow{
  display:block;
  background:#f8fafc;
  border-radius:8px;
  padding:8px;
  color:#475569;
  font-size:11px;
}

/* ASSEMBLEE */

.assembly-card{
  align-items:flex-start;
}

.assembly-main{
  min-width:0;
  flex:1;
}

.assembly-statuses{
  display:flex;
  gap:5px;
  flex-wrap:wrap;
  margin-top:8px;
}

.assembly-actions{
  display:flex;
  flex-direction:column;
  gap:7px;
  min-width:190px;
}

.file-button{
  border:1px solid #dbe2ea;
  background:#fff;
  color:#334155;
  padding:10px;
  border-radius:9px;
  font-weight:600;
  font-size:12px;
  text-align:center;
}

.file-button input{
  display:none;
}

.minutes-preview{
  background:#f8fafc;
  border:1px solid #eef2f7;
  border-radius:10px;
  padding:10px;
  margin-top:10px;
  max-width:700px;
}

.minutes-preview p{
  white-space:pre-wrap;
  font-size:12px;
  color:#475569;
  max-height:150px;
  overflow:auto;
}

/* COMUNICAZIONI */

.communication-main{
  min-width:0;
  flex:1;
}

.communication-main p{
  max-width:750px;
  margin-bottom:0;
}

/* PORTALE */

.portal-hero{
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:18px;
  padding:25px;
  display:flex;
  justify-content:space-between;
  gap:25px;
  margin-bottom:20px;
}

.portal-hero h2{
  margin:5px 0;
  font-size:25px;
}

.portal-hero p{
  max-width:700px;
  color:#64748b;
  line-height:1.5;
}

.portal-stats{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:10px;
}

.portal-stats div{
  min-width:100px;
  padding:15px;
  background:#f8fafc;
  border-radius:12px;
  text-align:center;
}

.portal-stats b{
  display:block;
  font-size:22px;
}

.portal-stats span{
  color:#64748b;
  font-size:11px;
}

.portal-grid{
  display:grid;
  grid-template-columns:1.4fr 1fr;
  gap:20px;
  margin-top:20px;
}

.portal-member{
  display:flex;
  justify-content:space-between;
  gap:12px;
  padding:13px 0;
  border-bottom:1px solid #eef2f7;
}

.portal-member small{
  display:block;
  color:#64748b;
  margin-top:4px;
}

.permission-box{
  padding:13px;
  border:1px solid #eef2f7;
  border-radius:11px;
  margin-bottom:9px;
}

.permission-box b,
.permission-box span{
  display:block;
}

.permission-box span{
  color:#64748b;
  font-size:12px;
  margin-top:4px;
  line-height:1.4;
}

.permission-tags{
  display:flex;
  gap:5px;
  flex-wrap:wrap;
  margin-top:8px;
}

.permission-tags span{
  display:inline-block;
  padding:4px 7px;
  background:#eef2ff;
  color:#4f46e5;
  border-radius:999px;
  font-size:10px;
}

/* PERMISSION EDITOR */

.permission-editor{
  margin-top:18px;
  padding:14px;
  border:1px solid #eef2f7;
  border-radius:12px;
}

.permission-checks{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:9px;
  margin-top:10px;
}

.check-row{
  display:flex;
  align-items:center;
  gap:8px;
  color:#475569;
  font-size:13px;
}

.check-row input{
  width:17px;
  height:17px;
}

.switch-row{
  display:flex;
  align-items:center;
  gap:9px;
  color:#475569;
  font-size:13px;
}

.switch-row input{
  width:18px;
  height:18px;
}

.checkbox-field{
  justify-content:flex-end;
}

/* PRICING */

.subscription-current{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:20px;
}

.subscription-current h2{
  margin:3px 0;
}

.subscription-current p{
  color:#64748b;
  margin:5px 0 0;
}

.pricing-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:15px;
}

.pricing-card{
  position:relative;
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:17px;
  padding:20px;
  display:flex;
  flex-direction:column;
  min-height:430px;
}

.pricing-card.current{
  border:2px solid #526dfe;
}

.current-plan{
  position:absolute;
  top:12px;
  right:12px;
  background:#eef2ff;
  color:#4f46e5;
  border-radius:999px;
  padding:5px 8px;
  font-size:10px;
  font-weight:700;
}

.pricing-icon{
  font-size:28px;
}

.pricing-card h2{
  margin:12px 0 6px;
}

.pricing-card>p{
  color:#64748b;
  font-size:13px;
  min-height:38px;
}

.pricing-card ul{
  list-style:none;
  padding:0;
  margin:12px 0 20px;
  flex:1;
}

.pricing-card li{
  padding:6px 0;
  color:#475569;
  font-size:12px;
}

/* PROFILO */

.profile-plan-card{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:18px;
}

.profile-plan-card h2{
  margin:2px 0 0;
}

.workspace-card{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
  margin-bottom:18px;
}

.workspace-card h2{
  margin:3px 0;
}

.workspace-card p{
  color:#64748b;
  max-width:700px;
  margin-bottom:0;
  line-height:1.5;
}

.workspace-id{
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:13px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  padding:10px 12px;
  border-radius:9px;
  word-break:break-all;
}

.workspace-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
}

/* MODAL */

.modal-backdrop{
  position:fixed;
  inset:0;
  background:rgba(15,23,42,.48);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
  z-index:1000;
}

.modal{
  position:relative;
  background:#fff;
  border-radius:18px;
  max-width:760px;
  width:100%;
  max-height:92vh;
  overflow:auto;
  padding:25px;
  box-shadow:0 25px 70px rgba(15,23,42,.25);
}

.modal-close{
  position:absolute;
  right:15px;
  top:12px;
  border:0;
  background:#f1f5f9;
  border-radius:50%;
  width:34px;
  height:34px;
  font-size:22px;
}

.modal-title{
  margin-bottom:22px;
}

.modal-title h2{
  margin:0;
  font-size:24px;
}

/* MOBILE */

.mobile-menu-backdrop{
  display:none;
}

.mobile-plan{
  margin:10px 0 15px;
  background:#1f2937;
  color:#c7d2fe;
  padding:9px;
  border-radius:8px;
  font-size:12px;
}

.mobile-plan small{
  display:block;
  color:#94a3b8;
  margin-top:4px;
  font-size:9px;
}

.mobile-bottom-nav{
  display:none;
}

@media(max-width:1100px){

  .cards-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .stats{
    grid-template-columns:repeat(2,1fr);
  }

  .mini-stats{
    grid-template-columns:repeat(2,1fr);
  }

  .pricing-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .document-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .ai-tools-grid{
    grid-template-columns:1fr 1fr;
  }

  .condominium-overview{
    grid-template-columns:repeat(3,1fr);
  }

}

@media(max-width:850px){

  .sidebar{
    display:none;
  }

  .content{
    padding:12px 15px 100px;
  }

  .mobile-header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:8px 2px 18px;
    font-size:18px;
  }

  .icon-button{
    border:1px solid #dbe2ea;
    background:#fff;
    border-radius:10px;
    width:42px;
    height:42px;
  }

  .mobile-menu-backdrop{
    display:flex;
    position:fixed;
    inset:0;
    background:rgba(15,23,42,.45);
    z-index:200;
  }

  .mobile-menu{
    width:min(320px,88vw);
    height:100%;
    background:#111827;
    color:#fff;
    padding:20px 15px;
    box-shadow:20px 0 50px rgba(0,0,0,.25);
    overflow:auto;
  }

  .mobile-menu-header{
    display:flex;
    align-items:center;
    justify-content:space-between;
  }

  .mobile-menu-header .logo{
    padding:0;
  }

  .mobile-menu-header .modal-close{
    position:static;
    background:#1f2937;
    color:#fff;
  }

  .mobile-nav{
    display:flex;
    flex-direction:column;
    gap:7px;
    margin-top:15px;
  }

  .mobile-nav .nav-item{
    padding:14px;
    font-size:15px;
  }

  .mobile-bottom-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    height:72px;
    display:flex;
    align-items:center;
    justify-content:space-around;
    gap:3px;
    background:rgba(255,255,255,.96);
    backdrop-filter:blur(16px);
    border-top:1px solid #e2e8f0;
    z-index:150;
    padding:7px 6px;
  }

  .mobile-bottom-nav button{
    border:0;
    background:transparent;
    color:#64748b;
    min-width:52px;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:2px;
    padding:4px;
  }

  .mobile-bottom-nav button span{
    font-size:18px;
  }

  .mobile-bottom-nav button small{
    font-size:9px;
  }

  .mobile-bottom-nav .mobile-bottom-active{
    color:#526dfe;
    font-weight:700;
  }

  .mobile-bottom-nav .mobile-ai-button{
    width:48px;
    height:48px;
    min-width:48px;
    border-radius:50%;
    background:#526dfe;
    color:#fff;
    font-size:20px;
    margin-top:-20px;
    box-shadow:0 7px 20px rgba(82,109,254,.35);
  }

  .mobile-bottom-nav .mobile-ai-button small{
    display:none;
  }

  .dashboard-grid,
  .portal-grid,
  .workspace-grid{
    grid-template-columns:1fr;
  }

  .ai-card,
  .ai-hero,
  .portal-hero{
    align-items:flex-start;
    flex-direction:column;
  }

  .ai-plan-box{
    width:100%;
  }

  .portal-stats{
    width:100%;
  }

  .topbar,
  .page-header{
    align-items:flex-start;
  }

  h1{
    font-size:26px;
  }

  .assembly-card{
    flex-direction:column;
  }

  .assembly-actions{
    width:100%;
  }

  .assembly-actions>*{
    width:100%;
  }

  .workspace-card{
    align-items:flex-start;
    flex-direction:column;
  }

}

@media(max-width:650px){

  .stats,
  .cards-grid,
  .form-grid,
  .detail-grid,
  .mini-stats,
  .document-grid,
  .pricing-grid,
  .ai-tools-grid,
  .workspace-grid,
  .permission-checks{
    grid-template-columns:1fr;
  }

  .page-header{
    flex-direction:column;
  }

  .page-header .primary-button{
    width:100%;
  }

  .feature-banner{
    align-items:flex-start;
    flex-direction:column;
  }

  .row-card{
    align-items:flex-start;
    flex-direction:column;
  }

  .row-actions{
    width:100%;
    flex-wrap:wrap;
  }

  .row-actions select{
    flex:1;
  }

  .form-actions{
    flex-direction:column-reverse;
  }

  .form-actions button{
    width:100%;
  }

  .modal{
    padding:20px 16px;
  }

  .list-row{
    align-items:flex-start;
  }

  .list-row>strong{
    font-size:12px;
  }

  .related-row{
    align-items:flex-start;
    flex-direction:column;
  }

  .related-actions{
    width:100%;
    justify-content:flex-start;
  }

  .related-actions>*{
    flex:1;
  }

  .quick-action-grid{grid-template-columns:1fr 1fr}

  .detail-page-header{
    padding:18px;
  }

  .detail-page-heading{
    align-items:flex-start;
  }

  .detail-page-icon{
    width:52px;
    height:52px;
    font-size:24px;
  }

  .detail-page-heading h1{
    font-size:23px;
  }

  .detail-page-heading p{
    font-size:13px;
  }

  .detail-page-actions{
    flex-direction:column;
  }

  .detail-page-actions button{
    width:100%;
  }

  .back-button{
    margin-bottom:18px;
  }

  .portal-stats{
    grid-template-columns:1fr 1fr;
  }

  .portal-member{
    align-items:flex-start;
    flex-direction:column;
  }

  .subscription-current,
  .profile-plan-card{
    align-items:flex-start;
    flex-direction:column;
    gap:12px;
  }

  .pricing-card{
    min-height:auto;
  }

  .document-bottom{
    align-items:flex-start;
    flex-direction:column;
  }

  .document-bottom>*{
    width:100%;
    text-align:left;
  }

  .condominium-overview{
    grid-template-columns:repeat(2,1fr);
  }

  .quick-grid{
    grid-template-columns:1fr 1fr;
  }

  .workspace-id{
    width:100%;
  }

}
.condominium-section-card{margin-top:20px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 4px 18px rgba(15,23,42,.04)}
.section-subtitle{margin:5px 0 0;color:#64748b;font-size:13px;line-height:1.5}.button-row.compact{margin-top:0}.button-row.compact>*{flex:0 0 auto}
.condominium-member-list{display:flex;flex-direction:column;gap:10px;margin-top:16px}.condominium-member-card{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px;border:1px solid #eef2f7;border-radius:12px;background:#f8fafc}.member-main{min-width:0}.member-main b,.member-main span,.member-main small{display:block}.member-main span{margin-top:5px;color:#475569;font-size:13px}.member-main small{margin-top:4px;color:#64748b;font-size:12px;word-break:break-word}
.request-summary{display:flex;gap:20px;margin:14px 0;color:#64748b;font-size:13px}.request-summary b{color:#111827;font-size:18px}.request-card{display:flex;justify-content:space-between;gap:16px;padding:15px 0;border-bottom:1px solid #eef2f7}.request-card:last-child{border-bottom:0}.request-main{min-width:0;flex:1}.request-main>b,.request-main>span{display:block}.request-main>span{margin-top:4px;color:#64748b;font-size:12px}.request-main p{margin:8px 0 0;color:#475569;line-height:1.5;white-space:pre-wrap}.request-response{margin-top:10px;padding:9px 10px;border-radius:8px;background:#f0fdf4;color:#166534;font-size:12px}.request-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;min-width:230px}
.recipient-picker{padding:12px;background:#f8fafc;border:1px solid #eef2f7;border-radius:10px}.recipient-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}.recipient-option{display:flex;align-items:center;gap:8px;font-size:13px}.communication-email-actions{display:flex;align-items:center;gap:10px;margin-top:16px;padding:10px;background:#f8fafc;border-radius:10px}.communication-email-actions span{color:#64748b;font-size:12px}
@media (max-width:760px){.condominium-member-card,.request-card{align-items:flex-start;flex-direction:column}.request-actions{width:100%;justify-content:flex-start;min-width:0}.button-row.compact{width:100%;flex-direction:column}.button-row.compact>*{width:100%}.communication-email-actions{align-items:flex-start;flex-direction:column}}
.collaborator-list{display:flex;flex-direction:column;gap:12px;margin-top:14px}
.collaborator-card{align-items:flex-start}
.collaborator-card .row-main{min-width:0}
.collaborator-card .row-main strong,.collaborator-card .row-main span,.collaborator-card .row-main small{display:block}
.collaborator-card .row-main span{margin-top:4px;color:#64748b;font-size:13px}
.collaborator-card .row-main small{margin-top:6px;color:#94a3b8;font-size:11px;line-height:1.45}
.collaborator-card .row-actions{align-items:center}
.permission-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}
.permission-check{display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid #e2e8f0;border-radius:11px;background:#f8fafc;color:#475569;font-size:12px;font-weight:700}
.permission-check input{width:auto;margin:0}
@media(max-width:760px){.permission-checks{grid-template-columns:1fr}.collaborator-card .row-actions{width:100%}.collaborator-card .row-actions>*{flex:1}}

/* =========================================================
   BETHAG - KPI E FILTRI AVANZATI
   ========================================================= */
.quick-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}
.quick-stat {
  padding: 14px 16px;
  border: 1px solid #e6e8ec;
  border-radius: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.quick-stat b { font-size: 20px; }
.quick-stat span { font-size: 12px; opacity: .7; }
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 18px;
}
.filter-bar select {
  min-width: 150px;
  padding: 9px 11px;
  border: 1px solid #dfe3e8;
  border-radius: 10px;
  background: #fff;
}
@media (max-width: 760px) {
  .quick-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-bar select { flex: 1 1 140px; min-width: 0; }
}


/* =========================================================
   BETHAG VISUAL SYSTEM
   ========================================================= */

:root{
  --bethag-ink:#172033;
  --bethag-muted:#64748b;
  --bethag-line:#e2e8f0;
  --bethag-surface:#ffffff;
  --bethag-soft:#f7f9fc;
  --bethag-primary:#4f6df5;
  --bethag-primary-dark:#3857d6;
  --bethag-accent:#7c9cff;
  --bethag-shadow:0 12px 32px rgba(15,23,42,.08);
}

body{
  background:
    radial-gradient(circle at 80% -10%, rgba(124,156,255,.14), transparent 34%),
    #f5f7fb;
}

.app{
  background:transparent;
}

.sidebar{
  background:
    radial-gradient(circle at 10% 0%, rgba(124,156,255,.18), transparent 28%),
    linear-gradient(180deg,#0f172a 0%,#111827 55%,#0b1220 100%);
  border-right:1px solid rgba(255,255,255,.06);
  box-shadow:8px 0 28px rgba(15,23,42,.08);
}

.brand-logo{
  display:flex;
  align-items:center;
  justify-content:flex-start;
  min-height:0;
  padding:0 4px 20px;
  color:#fff;
}

.brand-logo-image{
  display:block;
  width:100%;
  max-width:190px;
  height:auto;
  object-fit:contain;
  object-position:center;
  filter:drop-shadow(0 8px 18px rgba(0,153,255,.18));
}

.brand-logo-compact{
  padding:0;
  min-height:0;
}

.brand-logo-compact .brand-logo-image{
  max-width:120px;
}

.plan-sidebar{
  background:rgba(255,255,255,.055);
  border-color:rgba(255,255,255,.09);
  backdrop-filter:blur(12px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}

.nav{
  gap:4px;
}

.nav-item{
  display:flex;
  align-items:center;
  gap:11px;
  min-height:44px;
  padding:10px 12px;
  border:1px solid transparent;
  transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease;
}

.nav-item:hover{
  background:rgba(255,255,255,.055);
  border-color:rgba(255,255,255,.06);
  transform:translateX(2px);
}

.nav-item.active{
  background:linear-gradient(90deg,rgba(79,109,245,.26),rgba(79,109,245,.10));
  border-color:rgba(124,156,255,.20);
  box-shadow:inset 3px 0 0 #7c9cff;
}

.nav-icon{
  width:20px;
  height:20px;
  display:grid;
  place-items:center;
  color:#9fb2ff;
  flex:0 0 20px;
}

.nav-item.active .nav-icon{
  color:#fff;
}

.content{
  padding:32px clamp(20px,3vw,42px) 90px;
}

.topbar,.page-header{
  margin-bottom:24px;
}

h1{
  letter-spacing:-.025em;
}

.dashboard-subtitle{
  font-size:14px;
}

.profile{
  border-color:#dbe3ef;
  box-shadow:0 5px 18px rgba(15,23,42,.05);
  transition:transform .18s ease,box-shadow .18s ease;
}

.profile:hover{
  transform:translateY(-1px);
  box-shadow:0 9px 24px rgba(15,23,42,.09);
}

.stat-card,.card,.panel,.table-card,.section-card{
  box-shadow:var(--bethag-shadow);
}

.stat-card{
  border-color:#e4e9f2;
  transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;
}

.stat-card:hover{
  transform:translateY(-2px);
  box-shadow:0 16px 34px rgba(15,23,42,.10);
  border-color:#d5def0;
}

button{
  transition:transform .15s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease;
}

.primary-button{
  background:linear-gradient(135deg,var(--bethag-primary),var(--bethag-primary-dark));
  box-shadow:0 7px 16px rgba(79,109,245,.20);
}

.primary-button:hover{
  transform:translateY(-1px);
  box-shadow:0 10px 22px rgba(79,109,245,.28);
}

.secondary-button{
  background:#fff;
}

input,textarea,select{
  border-color:#dbe3ef;
  background:#fff;
  transition:border-color .15s ease,box-shadow .15s ease;
}

input:focus,textarea:focus,select:focus{
  outline:none;
  border-color:#7c9cff;
  box-shadow:0 0 0 3px rgba(124,156,255,.14);
}

.mobile-header{
  background:rgba(255,255,255,.88);
  border:1px solid rgba(226,232,240,.9);
  box-shadow:0 8px 24px rgba(15,23,42,.06);
  backdrop-filter:blur(16px);
}

.icon-button{
  display:grid;
  place-items:center;
  width:40px;
  height:40px;
  border-radius:12px;
}

.mobile-bottom-nav{
  background:rgba(255,255,255,.94);
  border-top:1px solid rgba(226,232,240,.9);
  box-shadow:0 -10px 30px rgba(15,23,42,.08);
  backdrop-filter:blur(18px);
}

.mobile-bottom-nav button{
  color:#64748b;
}

.mobile-bottom-nav button span{
  display:grid;
  place-items:center;
}

.mobile-bottom-active{
  color:#4f6df5 !important;
}

.mobile-ai-button{
  border:4px solid #f5f7fb;
  background:linear-gradient(145deg,#8da7ff,#536ff2) !important;
  box-shadow:0 8px 20px rgba(79,109,245,.28);
}

.sidebar-bottom{
  border-top-color:rgba(255,255,255,.08);
}

@media (max-width:900px){
  .content{
    padding:18px 16px 92px;
  }
  .brand-logo{
    padding-bottom:18px;
  }
}

@media (max-width:640px){
  .content{
    padding:14px 12px 86px;
  }
  .topbar,.page-header{
    gap:12px;
    margin-bottom:18px;
  }
  h1{
    font-size:25px;
  }
  .stats{
    gap:10px;
  }
  .stat-card{
    border-radius:14px;
    padding:14px;
  }
}

.public-home{min-height:100vh;background:radial-gradient(circle at 15% 10%,rgba(124,156,255,.22),transparent 30%),radial-gradient(circle at 90% 85%,rgba(79,109,245,.16),transparent 32%),linear-gradient(135deg,#f8faff 0%,#eef3ff 100%);color:#172033;padding:28px;box-sizing:border-box}
.public-home-inner{max-width:1180px;margin:0 auto;min-height:calc(100vh - 56px);display:flex;flex-direction:column}
.public-header{display:flex;align-items:center;justify-content:space-between;gap:20px}
.public-login-button{border:1px solid #dbe3ef;background:#fff;border-radius:12px;padding:11px 17px;font-weight:700;color:#3857d6;cursor:pointer;box-shadow:0 6px 18px rgba(15,23,42,.06)}
.public-main{flex:1;display:grid;grid-template-columns:1.15fr .85fr;gap:34px;align-items:center;padding:60px 0 50px}
.public-copy h1{font-size:clamp(42px,6vw,72px);line-height:1.02;letter-spacing:-.055em;margin:18px 0 20px}
.public-copy p{color:#64748b;font-size:18px;line-height:1.65;max-width:650px;margin:0}
.public-kicker{display:inline-flex;padding:7px 11px;border-radius:999px;background:#e9efff;color:#3857d6;font-size:12px;font-weight:800;letter-spacing:.04em}
.platform-panel{background:rgba(255,255,255,.88);border:1px solid #e1e7f2;border-radius:26px;padding:28px;box-shadow:0 25px 70px rgba(15,23,42,.1);backdrop-filter:blur(18px)}
.platform-label{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.08em}
.platform-card{width:100%;margin-top:16px;text-align:left;border:1px solid #dbe3ef;background:linear-gradient(145deg,#fff,#f5f7ff);border-radius:18px;padding:20px;cursor:pointer;box-shadow:0 12px 30px rgba(79,109,245,.1)}
.platform-card strong,.platform-card>span{display:block}
.platform-card strong{font-size:19px;color:#172033}
.platform-card>span:not(.platform-icon){margin-top:7px;color:#64748b;line-height:1.5;font-size:13px}
.platform-card b{display:block;margin-top:14px;color:#3857d6;font-size:13px}
.platform-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#e9efff;color:#3857d6;margin-bottom:14px}
.future-platform{display:grid;gap:10px;margin-top:14px}
.future-platform div{padding:14px 15px;border-radius:14px;border:1px dashed #dbe3ef;color:#94a3b8;background:#fafbfe;font-size:12px;font-weight:700}
.public-footer{border-top:1px solid rgba(148,163,184,.25);padding-top:18px;color:#94a3b8;font-size:12px}

.login-page{min-height:100vh;background:radial-gradient(circle at 15% 10%,rgba(124,156,255,.22),transparent 30%),linear-gradient(135deg,#f8faff,#eef3ff);display:grid;place-items:center;padding:18px;box-sizing:border-box}
.login-card{width:min(520px,100%);background:#fff;border:1px solid #e1e7f2;border-radius:24px;padding:28px;box-shadow:0 25px 70px rgba(15,23,42,.12);box-sizing:border-box}
.login-card-header{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:24px}
.login-card h1{margin:0 0 7px;font-size:28px;letter-spacing:-.03em}
.login-intro{color:#64748b;margin:0 0 22px;line-height:1.5;font-size:13px}
.login-role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}
.login-role{border:1px solid #dbe3ef;background:#fff;color:#475569;border-radius:12px;padding:12px 8px;cursor:pointer;font-weight:800;font-size:12px}
.login-role.active{border:2px solid #526dfe;background:#eef2ff;color:#3857d6}
.login-role-description{padding:13px;border-radius:12px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.45;margin-bottom:18px}
.login-card label{display:block;font-size:12px;font-weight:800;color:#475569;margin-bottom:7px}
.login-card input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #dbe3ef;border-radius:11px;margin-bottom:13px}
.login-note{display:block;margin-top:-4px;color:#64748b;font-size:11px;line-height:1.4}
.login-error{margin-top:13px;padding:10px;border-radius:9px;background:#fff1f2;color:#be123c;font-size:12px}
.login-submit{width:100%;margin-top:18px}
.login-disclaimer{margin:18px 0 0;color:#94a3b8;font-size:10px;line-height:1.45}

.resident-portal{min-height:100vh;background:radial-gradient(circle at 85% 0%,rgba(124,156,255,.15),transparent 30%),#f5f7fb;color:#172033}
.resident-header{background:#fff;border-bottom:1px solid #e2e8f0;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;position:sticky;top:0;z-index:10}
.resident-header-right{display:flex;align-items:center;gap:10px}
.resident-identity{text-align:right;font-size:12px;color:#64748b}
.resident-identity strong,.resident-identity span{display:block}
.resident-identity strong{color:#172033}
.resident-main{max-width:1180px;margin:0 auto;padding:28px 18px 60px}
.resident-hero{background:linear-gradient(135deg,#172554,#3857d6);color:#fff;border-radius:22px;padding:28px;box-shadow:0 20px 45px rgba(30,64,175,.18)}
.resident-hero h1{margin:7px 0;font-size:30px;letter-spacing:-.035em}
.resident-hero p{margin:0;opacity:.82;line-height:1.5}
.resident-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
.resident-stats>div{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(15,23,42,.05)}
.resident-stats b,.resident-stats span{display:block}
.resident-stats b{font-size:24px}
.resident-stats span{color:#64748b;font-size:12px}
.resident-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:18px}
.resident-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:20px}
.resident-card h2{margin:0;font-size:18px}
.resident-list-item{padding:15px 0;border-bottom:1px solid #eef2f7}
.resident-list-item:last-child{border-bottom:0}
.resident-list-item strong{display:block}
.resident-list-item small,.resident-list-row small{display:block;color:#94a3b8;font-size:11px;margin-top:4px}
.resident-list-item p{color:#475569;font-size:13px;line-height:1.5;white-space:pre-wrap}
.resident-list-row{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #eef2f7}
.resident-list-row strong{font-size:13px}
.resident-list-row>span{color:#3857d6;font-size:11px;font-weight:800}
.empty-state{color:#94a3b8;font-size:13px}
.resident-readonly-note{margin-top:18px;padding:15px;border-radius:14px;background:#eef2ff;color:#475569;font-size:12px;line-height:1.5}
.resident-request-card{margin-top:18px}
.resident-request-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.resident-request-form select,.resident-request-form textarea{width:100%;box-sizing:border-box;border:1px solid #dbe2ee;border-radius:10px;padding:10px 12px;font:inherit;background:#fff;color:#1e293b}
.resident-request-form textarea{grid-column:1/-1;resize:vertical;min-height:100px}
.resident-request-form .primary-button{justify-self:start}
.resident-request-history{margin-top:20px;padding-top:16px;border-top:1px solid #eef2f7}
.resident-request-history>strong{display:block;margin-bottom:6px}


@media(max-width:850px){
  .public-home{padding:18px}
  .public-main{grid-template-columns:1fr;padding:40px 0}
  .public-copy h1{font-size:clamp(38px,11vw,58px)}
  .public-copy p{font-size:16px}
  .resident-header{padding:14px 16px}
  .resident-grid{grid-template-columns:1fr}
}
@media(max-width:560px){
  .public-header .brand-word{font-size:18px}
  .platform-panel{padding:20px}
  .login-card{padding:20px}
  .login-role-grid{grid-template-columns:1fr}
  .resident-stats{grid-template-columns:1fr 1fr}
  .resident-identity{display:none}
}


.addon-panel{margin-top:22px;padding:22px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:var(--bethag-shadow)}
.subscription-current-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.addon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}
.addon-card{display:flex;flex-direction:column;gap:10px;padding:17px;border:1px solid #e2e8f0;border-radius:15px;background:linear-gradient(145deg,#fff,#f8faff)}
.addon-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.addon-card-top h3{margin:8px 0 0;font-size:15px}.addon-card-top strong{font-size:12px;color:#3857d6;white-space:nowrap}.addon-card p{margin:0;color:#64748b;font-size:12px;line-height:1.5;min-height:38px}.addon-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#eef2ff;color:#3857d6;font-weight:900}.addon-card button{margin-top:auto}.addon-card button:disabled{opacity:1;cursor:default}
@media(max-width:900px){.addon-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.addon-grid{grid-template-columns:1fr}.subscription-current-right{justify-content:flex-start}}

.nav-lock{margin-left:auto;font-size:9px;font-weight:800;letter-spacing:.04em;padding:2px 5px;border-radius:6px;background:#eef2ff;color:#3857d6}.homepage-focus-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}.focus-card{border:1px solid #e5e9f2;background:#fff;border-radius:18px;padding:17px;text-align:left;display:flex;align-items:center;gap:12px;cursor:pointer;box-shadow:0 8px 24px rgba(20,31,55,.05);transition:transform .18s ease,box-shadow .18s ease}.focus-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(20,31,55,.09)}.focus-card>div{min-width:0;display:flex;flex-direction:column;gap:3px;flex:1}.focus-card strong{font-size:18px;color:#17233f}.focus-card span{font-size:12px;color:#667085}.focus-card small{font-weight:700;color:#3857d6;white-space:nowrap}.focus-icon{width:34px;height:34px;border-radius:11px;background:#eef2ff;display:grid;place-items:center;font-weight:900;color:#3857d6}.focus-card-warning .focus-icon{background:#fff2e8;color:#c65b18}.focus-card-plan{background:linear-gradient(135deg,#f8f9ff,#eef3ff)}@media(max-width:1000px){.homepage-focus-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.homepage-focus-grid{grid-template-columns:1fr}.focus-card{padding:15px}}
.help-hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 28px;border-radius:22px;background:linear-gradient(135deg,#071b4d,#0a4fd8);color:#fff;box-shadow:0 18px 42px rgba(16,55,130,.18);margin-bottom:18px}.help-hero h2{margin:7px 0 8px;font-size:27px}.help-hero p{margin:0;max-width:700px;color:rgba(255,255,255,.78);line-height:1.6}.help-hero .eyebrow{color:#9fc5ff}.help-hero-badge{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:95px;font-weight:800}.help-ai-panel{padding:24px;border:1px solid #dce5f5;border-radius:20px;background:#fff;box-shadow:var(--bethag-shadow);margin-bottom:20px}.help-ai-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.help-ai-heading h2{margin:4px 0}.help-ai-panel p{color:#667085;line-height:1.55}.help-ai-status{font-size:11px;font-weight:800;padding:7px 10px;border-radius:999px;background:#eef3ff;color:#3857d6}.help-question{display:flex;gap:10px}.help-question input,.help-toolbar input{flex:1;min-width:0}.help-answer{display:flex;gap:10px;margin-top:14px;padding:14px;border-radius:14px;background:#f5f8ff;color:#334155;line-height:1.5}.help-answer strong{color:#3857d6;white-space:nowrap}.help-toolbar{display:flex;align-items:end;justify-content:space-between;gap:18px;margin:24px 0 14px}.help-toolbar h2{margin:0}.help-toolbar p{margin:4px 0 0;color:#667085;font-size:13px}.help-toolbar input{max-width:330px}.help-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.help-card{text-align:left;padding:20px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(20,31,55,.045);cursor:pointer}.help-card:hover{border-color:#b9c9ec;transform:translateY(-1px)}.help-card-section{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#3857d6}.help-card h3{margin:8px 0}.help-card p{margin:0;color:#667085;line-height:1.5;font-size:13px}.help-card-more{display:block;margin-top:15px;font-weight:800;color:#3857d6;font-size:12px}.help-detail{margin-top:18px;padding:24px;border-radius:18px;border:1px solid #dbe4f3;background:#f8faff}.help-detail-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.help-detail h2{margin:5px 0}.help-detail p{color:#475569;line-height:1.7}.help-roadmap{margin-top:20px;padding:24px;border-radius:20px;background:#f1f5ff;border:1px solid #dbe5fa;display:flex;justify-content:space-between;gap:24px}.help-roadmap h2{margin:5px 0}.help-roadmap p{max-width:720px;color:#64748b;line-height:1.6}.help-roadmap-items{display:flex;flex-direction:column;gap:9px;font-weight:700;color:#3857d6;white-space:nowrap}@media(max-width:900px){.help-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.help-roadmap{flex-direction:column}.help-roadmap-items{white-space:normal}}@media(max-width:650px){.help-hero{padding:22px;flex-direction:column;align-items:flex-start}.help-ai-heading,.help-toolbar{align-items:stretch;flex-direction:column}.help-question{flex-direction:column}.help-toolbar input{max-width:none}.help-grid{grid-template-columns:1fr}}
`;


/* =========================================================
   PUBLIC HOME / LOGIN / RESIDENT PORTAL
   ========================================================= */

/* =========================================================
 RENDER
 ========================================================= */

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);