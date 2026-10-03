import React, { useEffect, useMemo, useRef, useState } from "react";
import AccountingPage from "./AccountingPage";
import RegisterPage from "./RegisterPage";
import InsurancePoliciesSection from "./InsurancePoliciesSection";
import ReactDOM from "react-dom/client";
import { supabase, supabaseConfigured, supabasePublicAuth } from "./lib/supabase";
import { analyzeCondominiumDocumentsWithAI,
  analyzeCondominiumStoredDocumentsWithAI, storeWorkspaceDocuments, deleteWorkspaceStoredFile, analyzeWorkspaceDocumentsWithAI,
  analyzeWorkspaceStoredDocumentsWithAI, storeCondominiumDocuments, claimFirstWorkspaceAdmin, confirmCondominiumCreationIntake, createCondominiumCreationIntake, deleteCondominium as deleteCondominiumBackend, deleteCondominiumMember as deleteCondominiumMemberBackend, deleteCondominiumUnit as deleteCondominiumUnitBackend, deletePortalMember as deletePortalMemberBackend, deleteCondominiumWork as deleteCondominiumWorkBackend, saveCondominiumWorkProgress as saveCondominiumWorkProgressBackend, syncCondominiumWorkDocuments as syncCondominiumWorkDocumentsBackend, recordCondominiumWorkEvent as recordCondominiumWorkEventBackend, reconcileCondominiumWork as reconcileCondominiumWorkBackend, confirmCondominiumInvoice as confirmCondominiumInvoiceBackend, deleteWorkspaceRecord as deleteWorkspaceRecordBackend, saveCondominiumMember as saveCondominiumMemberBackend, confirmCondominiumMemberTransfer, closeCondominiumMemberTransfer, previewCondominiumMemberTransfer, saveCondominiumUnit as saveCondominiumUnitBackend, getActiveWorkspaceId, loadBackendState, saveCondominium as saveCondominiumBackend, syncBackendState, updateCondominiumRequestStatus } from "./lib/bethagBackend";

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
  | "lavori"
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

type WorkStatus = "Da programmare" | "Preventivo richiesto" | "Approvato" | "In corso" | "Sospeso" | "Completato" | "Annullato";
type WorkPriority = "Bassa" | "Media" | "Alta";

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

type CondominiumStructureScale = {
  id: string;
  label: string;
  interiors: number;
};

type CondominiumStructureBuilding = {
  id: string;
  label: string;
  scales: CondominiumStructureScale[];
};

type CondominiumStructureCivic = {
  id: string;
  label: string;
  buildings: CondominiumStructureBuilding[];
};

type CondominiumStructure = {
  configured: boolean;
  civics: CondominiumStructureCivic[];
  autonomous: {
    garages: number;
    cantine: number;
    postiAuto: number;
    altre: number;
  };
};

type CondominiumCreationUnitDraft = {
  unitCode: string;
  unitType: CondominiumUnit["unitType"];
  civicCode?: string;
  buildingCode?: string;
  staircaseCode?: string;
  interior?: number;
  millesimi?: string;
  owners: Array<{
    firstName: string;
    lastName: string;
    fiscalCode?: string;
    email?: string;
    phone?: string;
    ownershipShare?: string;
  }>;
  confidence?: number;
  sourceDocument?: string;
  warnings?: string[];
};

type CondominiumCreationDraft = {
  name?: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  fiscalCode?: string;
  structure?: CondominiumStructure;
  unitRecords?: CondominiumCreationUnitDraft[];
  confidence?: number;
  sourceDocuments: string[];
  warnings: string[];
};

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
  structure?: CondominiumStructure;
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
  unitType: "Abitazione" | "Garage" | "Cantina" | "Posto auto" | "Altro";
  cadastralCategory: string;
  cadastralAutonomous: boolean;
  millesimi: string;
  civicCode?: string;
  staircaseCode?: string;
  incorporatedInUnitId?: string;
  relationshipToResidentialUnit: "Nessuna" | "Pertinenza" | "Incorporata";
  ownerMode: "condominium_member" | "external" | "mixed" | "inherited";
  ownerMemberIds: number[];
  externalOwners: ExternalUnitOwner[];
  notes: string;
  active: boolean;
  buildingCode?: string;
  lifecycleStatus?: "Attiva" | "Storica" | "Soppressa";
  lifecycleEffectiveDate?: string | null;
  supersededAt?: string | null;
};

type CondominiumMember = {
  /** Internal Supabase UUID used by transactional ownership-transfer RPCs. */
  dbId?: string;
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
  aiDocumentType?: "Riparto spese" | "Fattura" | "Verbale" | "Convocazione" | "Regolamento" | "Altro";
  aiConfidence?: number;
  fileSizeBytes?: number;
  storagePath?: string;
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

type CondominiumWork = { id: string; condominiumId: number; title: string; category: string; description: string; status: WorkStatus; priority: WorkPriority; supplierId: number | null; activityId: number | null; documentIds: number[]; startDate: string; expectedEndDate: string; actualEndDate: string; estimatedAmount: number; approvedAmount: number; actualAmount: number; progressPercent: number; notes: string; };
type WorkProgress = { id?: string; workId: string; progressNo: number; progressDate: string; title: string; status: string; percentage: number; amount: number; paidAmount: number; notes: string; ledgerEntryId?: string | null; };

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
  condominiumWorks: "bethag-condominium-works-v1",
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
const initialCondominiumWorks: CondominiumWork[] = [];

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
  structure: {
    configured: false,
    civics: [],
    autonomous: { garages: 0, cantine: 0, postiAuto: 0, altre: 0 },
  },
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

const emptyCondominiumWork: CondominiumWork = { id: "", condominiumId: 1, title: "", category: "Manutenzione", description: "", status: "Da programmare", priority: "Media", supplierId: null, activityId: null, documentIds: [], startDate: "", expectedEndDate: "", actualEndDate: "", estimatedAmount: 0, approvedAmount: 0, actualAmount: 0, progressPercent: 0, notes: "" };
const emptyWorkProgress: WorkProgress = { workId: "", progressNo: 1, progressDate: localISODate(), title: "SAL 1", status: "In corso", percentage: 0, amount: 0, paidAmount: 0, notes: "" };

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

  const [condominiumWorks, setCondominiumWorks] = useState<CondominiumWork[]>(() => load(KEYS.condominiumWorks, initialCondominiumWorks));

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
    buildingCode: "",
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
  const [condominiumAiDraft, setCondominiumAiDraft] = useState<CondominiumCreationDraft | null>(null);
  const [condominiumAiFiles, setCondominiumAiFiles] = useState<string[]>([]);
  const [condominiumAiIntakeId, setCondominiumAiIntakeId] = useState<string | null>(null);
  const [condominiumAiProcessing, setCondominiumAiProcessing] = useState(false);
  const [condominiumAiConfirmedUnits, setCondominiumAiConfirmedUnits] = useState<CondominiumCreationUnitDraft[]>([]);

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

  const [selectedCondominiumWork, setSelectedCondominiumWork] = useState<CondominiumWork | null>(null);

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

  const [condominiumWorkForm, setCondominiumWorkForm] = useState<CondominiumWork>(emptyCondominiumWork);
  const [workProgressForm, setWorkProgressForm] = useState<WorkProgress>(emptyWorkProgress);
  const [selectedWorkProgress, setSelectedWorkProgress] = useState<WorkProgress | null>(null);

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

    // Access is resolved only for the verified Auth identity. This protects
    // both workspace membership and the email-based portal fallback.
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const authenticatedUser = authData.user;
    const normalizedEmail = email.trim().toLowerCase();
    if (
      !authenticatedUser ||
      authenticatedUser.id !== userId ||
      !authenticatedUser.email_confirmed_at ||
      authenticatedUser.email?.trim().toLowerCase() !== normalizedEmail
    ) {
      return null;
    }

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

          // MFA completamente opzionale: se l'utente ha un fattore verificato,
          // BETHAG propone la verifica ma non blocca il login se l'utente decide
          // di proseguire senza utilizzare il secondo fattore.
          if (aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;

            const factor = [...(factors?.totp ?? []), ...(factors?.phone ?? [])]
              .find((item: any) => item.status === "verified");

            if (factor) {
              const useMfa = window.confirm(
                "È disponibile l'autenticazione a due fattori. Vuoi usarla per questo accesso?\n\nPuoi scegliere No e accedere normalmente."
              );

              if (useMfa) {
                const { data: challenge, error: challengeError } =
                  await supabase.auth.mfa.challenge({ factorId: factor.id });
                if (challengeError) throw challengeError;

                const code = window.prompt(
                  "Inserisci il codice generato dall'app autenticatrice."
                );

                // Il codice di conferma non è obbligatorio: annullando la richiesta
                // l'accesso prosegue con la normale autenticazione e-mail/password.
                if (code?.trim()) {
                  const { error: verifyError } = await supabase.auth.mfa.verify({
                    factorId: factor.id,
                    challengeId: challenge.id,
                    code: code.trim(),
                  });

                  if (verifyError) {
                    throw new Error("Codice di autenticazione a due fattori non valido.");
                  }
                }
              }
            }
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
          name: session.user.user_metadata?.full_name || current.name,
          company: session.user.user_metadata?.company || current.company,
          phone: session.user.user_metadata?.phone || current.phone,
          address: session.user.user_metadata?.address || current.address,
          fiscalCode: session.user.user_metadata?.fiscal_code || current.fiscalCode,
          vat: session.user.user_metadata?.vat || current.vat,
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
      console.error("BETHAG registration member lookup failed", dbMemberError);
      alert("Impossibile individuare il profilo condòmino nel database. Aggiorna i dati e riprova.");
      return;
    }
    const { error } = await supabase.rpc("admin_approve_portal_registration", {
      p_request_id: requestId,
      p_member_id: dbMember.id,
    });
    if (error) {
      console.error("BETHAG portal registration approval failed", error);
      const message = String(error.message || "");
      if (message.includes("ACCOUNT_EMAIL_NOT_VERIFIED_OR_MISMATCH")) {
        alert("L'indirizzo e-mail dell'account non risulta verificato o non corrisponde alla richiesta. Il condòmino deve confermare l'e-mail utilizzata per registrarsi.");
      } else if (message.includes("MEMBER_EMAIL_MUST_BE_CORRECTED_BEFORE_APPROVAL")) {
        alert("L'e-mail dell'anagrafica condominiale è diversa da quella verificata dell'account. Correggi prima l'e-mail nel profilo condòmino, salva e ripeti l'autorizzazione.");
      } else if (message.includes("MISMATCH_REQUEST_MUST_USE_ORIGINAL_MATCHED_MEMBER")) {
        alert("La richiesta presenta un'incongruenza e-mail: verifica e correggi il profilo originariamente individuato prima di autorizzare l'accesso.");
      } else {
        alert(message || "Autorizzazione non riuscita. Verifica i dati e riprova.");
      }
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

  const executeMemberTransfer = async (input: {
    unitId: string; outgoingMemberId: string; incomingName: string;
    incomingEmail?: string | null; transferDate: string; transferType: string; notes?: string;
  }) => {
    if (!requireModulePermission("condomini", "La registrazione del subentro")) return false;
    if (!supabaseConfigured || !supabase || !profile.workspaceId) {
      alert("Il subentro richiede una sessione BETHAG collegata al server.");
      return false;
    }
    try {
      const preview = await previewCondominiumMemberTransfer({
        unitId: input.unitId,
        outgoingMemberId: input.outgoingMemberId,
        transferDate: input.transferDate,
      });
      const money = (value: unknown) => new Intl.NumberFormat("it-IT", {
        style: "currency", currency: "EUR",
      }).format(Number(value ?? 0));
      const flags = (preview.review_flags && typeof preview.review_flags === "object")
        ? preview.review_flags as Record<string, unknown>
        : {};
      const reviewItems = [
        flags.unpaid_before_transfer === true ? "rate scadute o non saldate" : "",
        flags.unpaid_allocations_before_transfer === true ? "riparti di spesa non saldati" : "",
        flags.outstanding_fiscal_carryovers === true ? "riporti fiscali ancora aperti" : "",
        flags.extraordinary_deliberated_before_due_after === true ? "spese straordinarie deliberate prima del rogito ma con scadenza successiva" : "",
      ].filter(Boolean);
      const previewMessage = [
        "QUADRO PREVISIONALE DEL SUBENTRO",
        `Data: ${input.transferDate}`,
        `Rate insolute alla data: ${money(preview.outstanding_before)}`,
        `Rate già pagate alla data: ${money(preview.paid_before)}`,
        `Riparti insoluti alla data: ${money(preview.allocations_outstanding_before)}`,
        `Riporti fiscali aperti: ${money(preview.fiscal_carryovers_outstanding)}`,
        "",
        reviewItems.length
          ? "Elementi da verificare:\n- " + reviewItems.join("\n- ")
          : "Nessuna delle criticità contabili automatiche elencate risulta presente.",
        "",
        "La ripartizione delle responsabilità giuridiche richiede comunque verifica documentale.",
        "Vuoi procedere con la registrazione del subentro?",
      ].join("\n");
      if (!window.confirm(previewMessage)) return false;
      await confirmCondominiumMemberTransfer(input);
      const refreshed = await loadBackendState(profile.workspaceId);
      setCondominiumMembers(refreshed.condominiumMembers || []);
      setCondominiumUnits(Array.isArray(refreshed.condominiumUnits) ? refreshed.condominiumUnits : []);
      setPortalMembers(refreshed.portalMembers || []);
      return true;
    } catch (error) {
      console.error("BETHAG ownership transfer failed", error);
      alert(error instanceof Error ? "Subentro non confermato dal server.\n\n" + error.message : "Subentro non confermato dal server.");
      return false;
    }
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
        const invitedAccount = session.user.user_metadata?.bethag_invited === true &&
          session.user.user_metadata?.bethag_password_set !== true;
        if (invitedAccount) {
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

        const confirmedEmail = user.email?.trim().toLowerCase() || "";
        if (!user.email_confirmed_at || confirmedEmail !== sessionEmail.trim().toLowerCase()) {
          await supabase.auth.signOut();
          if (!cancelled) {
            setSessionRole(null);
            setSessionEmail("");
            setServerCollaboratorPermissions([]);
            localStorage.removeItem(KEYS.session);
            localStorage.removeItem(KEYS.sessionEmail);
            setPage("homepage");
          }
          return;
        }

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
      apply("condominiumWorks", setCondominiumWorks);
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
      const skippedSecurityRows: string[] = [];
      if (supabase) {
        for (const table of restoreOrder) {
          const rows = Array.isArray(backup.backend?.[table]) ? backup.backend[table] : [];
          if (!rows.length) continue;

          // Le membership sono dati di autorizzazione, non semplici dati anagrafici:
          // un backup modificato manualmente non deve poter creare un nuovo
          // amministratore. Il restore può aggiornare solo membership non-admin.
          if (table === "workspace_members") {
            const safeRows = rows.filter((row: any) => {
              const role = String(row?.role || "").toLowerCase();
              if (role === "admin") {
                skippedSecurityRows.push("workspace_members:admin");
                return false;
              }
              return role === "collaborator" || role === "resident";
            });
            if (!safeRows.length) continue;
            const normalized = safeRows.map((row: any) => ({
              ...row,
              workspace_id: profile.workspaceId,
              role: String(row.role).toLowerCase() as "collaborator" | "resident",
            }));
            const { error } = await supabase
              .from(table)
              .upsert(normalized, { onConflict: "workspace_id,user_id" });
            if (error) errors.push(table + ": " + error.message);
            continue;
          }

          const normalized = rows.map((row: any) => ({...row, workspace_id: profile.workspaceId}));
          const { error } = await supabase.from(table).upsert(normalized, { onConflict: "id" });
          if (error) errors.push(table + ": " + error.message);
        }
      }
      if (errors.length) {
        alert("Ripristino completato parzialmente. Le tabelle non ripristinate sono state segnalate: " + errors.join(" | ") + (skippedSecurityRows.length ? " Le membership amministratore presenti nel file sono state ignorate per sicurezza." : ""));
      } else {
        alert("Ripristino BETHAG completato. I dati non presenti nel backup non sono stati eliminati." + (skippedSecurityRows.length ? " Le membership amministratore presenti nel file sono state ignorate per sicurezza." : ""));
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
        assemblies, suppliers, activities, condominiumWorks, communications, portalMembers, collaborators, subscription, profile
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
        setCondominiumUnits(Array.isArray(backend.condominiumUnits) ? backend.condominiumUnits : []);
        setDocuments(backend.documents);
        setDeadlines(backend.deadlines);
        setAssemblies(backend.assemblies);
        setSuppliers(backend.suppliers);
        setActivities(backend.activities);
        setCondominiumWorks(Array.isArray(backend.condominiumWorks) ? backend.condominiumWorks : []);
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
          condominiumWorks,
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
    condominiumWorks,
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
    localStorage.setItem(KEYS.condominiumWorks, JSON.stringify(condominiumWorks));
  }, [condominiumWorks]);

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
    lavori: "attivita",
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
    lavori: "attivita",
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
    setSelectedCondominiumWork(null);
    setSelectedCommunication(null);
  };

  const openModal = (type: string) => {
    setModalType(type);
    setShowModal(true);
  };
  const openCondominiumAiCreation = () => {
    if (!requirePlan("professional", "La creazione automatica del condominio con AI", "ai")) return;
    setCondominiumAiDraft(null);
    setCondominiumAiFiles([]);
    setCondominiumAiProcessing(false);
    setCondominiumAiLargeFiles([]);
    setCondominiumAiConfirmedUnits([]);
    openModal("condominium-ai");
  };

  const processCondominiumDocuments = async (
    selectedFiles: File[],
    storageMode: "both" | "analysis" | "storage"
  ) => {
    if (!selectedFiles.length) return;
    setCondominiumAiFiles(selectedFiles.map((file) => file.name));
    setCondominiumAiProcessing(true);
    setCondominiumAiIntakeId(null);
    try {
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId) throw new Error("Workspace attivo non disponibile.");

      let storedDocuments: any[] = [];
      if (storageMode !== "analysis") {
        storedDocuments = await storeCondominiumDocuments(workspaceId, selectedFiles);
      }
      if (storageMode === "storage") {
        alert("Documenti memorizzati correttamente. L'analisi AI non è stata eseguita.");
        return;
      }

      const analysisFiles = storedDocuments.map((item: any, index: number) => ({
        filename: item.name || selectedFiles[index]?.name || "documento",
        storagePath: item.path,
        mimeType: item.type || selectedFiles[index]?.type || "application/octet-stream",
      }));
      const draft = await analyzeCondominiumStoredDocumentsWithAI(workspaceId, analysisFiles);

      if (storageMode === "analysis" && storedDocuments.length) {
        await Promise.all(
          storedDocuments.map((item: any) =>
            deleteWorkspaceStoredFile(item.path).catch(() => undefined)
          )
        );
      }
      setCondominiumAiDraft(draft);
      const intakeId = await createCondominiumCreationIntake(workspaceId, {
        source: "AI",
        sourceDocuments: selectedFiles.map((file) => ({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          lastModified: file.lastModified,
          stored: storageMode !== "analysis",
          storagePath: storedDocuments.find((item) => item.name === file.name)?.path ?? null,
        })),
        extractedData: {
          name: draft.name ?? "",
          address: draft.address ?? "",
          cap: draft.cap ?? "",
          city: draft.city ?? "",
          province: draft.province ?? "",
          fiscalCode: draft.fiscalCode ?? "",
          units: draft.units ?? draft.unitRecords?.length ?? 0,
          unitRecords: draft.unitRecords ?? [],
        },
        structure: draft.structure ?? {},
        validationErrors: [],
        warnings: draft.warnings ?? [],
        notes: storageMode === "analysis"
          ? "Proposta estratta automaticamente senza memorizzazione permanente del file originale."
          : "Proposta estratta automaticamente e documento originale memorizzato.",
      });
      setCondominiumAiIntakeId(intakeId);
    } catch (error: any) {
      console.error("BETHAG condominium AI analysis error", error);
      alert(error?.message || "Impossibile elaborare i documenti.");
      setCondominiumAiDraft(null);
    } finally {
      setCondominiumAiProcessing(false);
      setCondominiumAiLargeFiles([]);
    }
  };

  const analyzeCondominiumDocuments = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!requirePlan("professional", "La lettura AI dei documenti per creare un condominio", "ai")) return;
    const selectedFiles = Array.from(files);
    const largeFiles = selectedFiles.filter((file) => file.size >= 25 * 1024 * 1024);
    if (largeFiles.length) {
      setCondominiumAiFiles(selectedFiles.map((file) => file.name));
      setCondominiumAiLargeFiles(selectedFiles);
      return;
    }
    await processCondominiumDocuments(selectedFiles, "both");
  };

  const handleLargeCondominiumFiles = async (
    mode: "both" | "analysis" | "storage"
  ) => {
    if (!condominiumAiLargeFiles.length) return;
    await processCondominiumDocuments(condominiumAiLargeFiles, mode);
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
      millesimi: condominiumUnitForm.cadastralAutonomous ? condominiumUnitForm.millesimi.trim() : "",
      notes: condominiumUnitForm.notes.trim(),
      // Una pertinenza catastalmente autonoma può essere collegata
      // facoltativamente all'unità principale; il collegamento non implica
      // che i millesimi vengano ereditati. Solo l'unità catastalmente
      // incorporata non ha millesimi autonomi.
      incorporatedInUnitId: condominiumUnitForm.incorporatedInUnitId || "",
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
    event: React.FormEvent<HTMLFormElement>,
    dataOverride?: Condominium,
    aiConfirmedUnitsOverride?: CondominiumCreationUnitDraft[],
  ) => {
    event.preventDefault();

    if (!requireModulePermission("condomini", "La modifica dei dati del condominio")) return;

    const isEditing =
      Boolean(editingCondominium && editingCondominium.id !== 0);

    const data =
      dataOverride ||
      editingCondominium ||
      emptyCondominium;

    if (!data.name.trim() || !data.address.trim()) {
      alert("Nome e indirizzo del condominio sono obbligatori.");
      return;
    }

    const structureUnitCount = data.structure?.configured
      ? data.structure.civics.reduce(
          (total, civic) => total + civic.buildings.reduce(
            (buildingTotal, building) => buildingTotal + building.scales.reduce(
              (scaleTotal, scale) => scaleTotal + Math.max(0, Number(scale.interiors) || 0),
              0
            ),
            0
          ),
          0
        ) +
        Math.max(0, Number(data.structure.autonomous.garages) || 0) +
        Math.max(0, Number(data.structure.autonomous.cantine) || 0) +
        Math.max(0, Number(data.structure.autonomous.postiAuto) || 0) +
        Math.max(0, Number(data.structure.autonomous.altre) || 0)
      : 0;

    const hasConfirmedAiUnits = Boolean(dataOverride && aiConfirmedUnitsOverride && aiConfirmedUnitsOverride.length > 0);
    if (!isEditing && structureUnitCount <= 0 && !hasConfirmedAiUnits) {
      alert("Indica nella struttura almeno un interno o una pertinenza autonoma.");
      return;
    }

    const normalizedData = {
      ...data,
      units: String(data.structure?.configured ? structureUnitCount : Math.max(0, Number(data.units) || 0)),
    };

    if (!validateEmail(data.email)) {
      alert("Controlla l'indirizzo email.");
      return;
    }

    const nextCondominiums = isEditing
      ? condominiums.map((item) =>
          item.id === editingCondominium!.id
            ? { ...normalizedData, id: editingCondominium!.id }
            : item
        )
      : [
          ...condominiums,
          {
            ...normalizedData,
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

        // Alla prima creazione, la struttura configurata dal wizard genera
        // le sole unità anagrafiche. Proprietari e millesimi restano vuoti:
        // non vengono mai inventati dal configuratore.
        if (!isEditing && savedItem.structure?.configured) {
          const structure = savedItem.structure;
          const generatedUnits: CondominiumUnit[] = [];

          structure.civics.forEach((civic) => {
            civic.buildings.forEach((building) => {
              building.scales.forEach((scale) => {
                for (let interior = 1; interior <= Math.max(0, Number(scale.interiors) || 0); interior += 1) {
                  generatedUnits.push({
                    id: "",
                    condominiumId: savedItem.id,
                    unitCode: `${civic.label} - ${building.label} - ${scale.label} - Int. ${interior}`,
                    unitType: "Abitazione",
                    cadastralCategory: "",
                    cadastralAutonomous: true,
                    millesimi: "",
                    civicCode: civic.label,
                    buildingCode: building.label,
                    staircaseCode: scale.label,
                    incorporatedInUnitId: "",
                    relationshipToResidentialUnit: "Nessuna",
                    ownerMode: "condominium_member",
                    ownerMemberIds: [],
                    externalOwners: [],
                    notes: "",
                    active: true,
                  });
                }
              });
            });
          });

          const autonomousDefinitions: Array<[CondominiumUnit["unitType"], string, number]> = [
            ["Garage", "Box", structure.autonomous.garages],
            ["Cantina", "Cantina", structure.autonomous.cantine],
            ["Posto auto", "Posto auto", structure.autonomous.postiAuto],
            ["Altro", "Altra pertinenza", structure.autonomous.altre],
          ];

          autonomousDefinitions.forEach(([unitType, prefix, count]) => {
            for (let index = 1; index <= Math.max(0, Number(count) || 0); index += 1) {
              generatedUnits.push({
                id: "",
                condominiumId: savedItem.id,
                unitCode: `${prefix} ${index}`,
                unitType,
                cadastralCategory: unitType === "Garage" ? "C/6" : unitType === "Cantina" ? "C/2" : "",
                cadastralAutonomous: true,
                millesimi: "",
                civicCode: "",
                buildingCode: "",
                staircaseCode: "",
                incorporatedInUnitId: "",
                relationshipToResidentialUnit: "Nessuna",
                ownerMode: "condominium_member",
                ownerMemberIds: [],
                externalOwners: [],
                notes: "",
                active: true,
              });
            }
          });

          const confirmedAiUnitsForCreation = aiConfirmedUnitsOverride ?? condominiumAiConfirmedUnits;
          if (generatedUnits.length === 0 && confirmedAiUnitsForCreation.length > 0) {
            for (const draftUnit of confirmedAiUnitsForCreation) {
              generatedUnits.push({
                id: "",
                condominiumId: savedItem.id,
                unitCode: draftUnit.unitCode,
                unitType: draftUnit.unitType,
                cadastralCategory: draftUnit.unitType === "Garage" ? "C/6" : draftUnit.unitType === "Cantina" ? "C/2" : "",
                cadastralAutonomous: draftUnit.unitType !== "Abitazione",
                millesimi: draftUnit.millesimi ?? "",
                civicCode: draftUnit.civicCode ?? "",
                buildingCode: draftUnit.buildingCode ?? "",
                staircaseCode: draftUnit.staircaseCode ?? "",
                incorporatedInUnitId: "",
                relationshipToResidentialUnit: "Nessuna",
                ownerMode: "condominium_member",
                ownerMemberIds: [],
                externalOwners: [],
                notes: "Unità acquisita dai documenti e confermata dall'amministratore.",
                active: true,
              });
            }
          }

          for (const generatedUnit of generatedUnits) {
            const savedUnit = await saveCondominiumUnitBackend(workspaceId, generatedUnit);
            generatedUnit.id = String(savedUnit?.id || generatedUnit.id || ("local-" + makeId()));
          }

          // Se la creazione è partita da documenti, applichiamo solo i dati
          // esplicitamente confermati dall'amministratore. I millesimi restano
          // sempre proprietà dell'unità; i proprietari vengono registrati
          // nell'anagrafica e collegati all'unità.
          const confirmedAiUnits = aiConfirmedUnitsOverride ?? condominiumAiConfirmedUnits;
          if (confirmedAiUnits.length > 0) {
            for (const draftUnit of confirmedAiUnits) {
              const target = generatedUnits.find((unit) =>
                unit.unitCode.trim().toLowerCase() === draftUnit.unitCode.trim().toLowerCase()
              );
              if (!target) continue;

              const ownerMemberIds: number[] = [];
              for (const owner of draftUnit.owners ?? []) {
                const legacyId = makeId();
                const existingMember = condominiumMembers.find((member) => {
                  const sameFiscalCode = owner.fiscalCode && member.fiscalCode &&
                    owner.fiscalCode.replace(/\\s/g, "").toUpperCase() === member.fiscalCode.replace(/\\s/g, "").toUpperCase();
                  const sameEmail = owner.email && member.email &&
                    owner.email.trim().toLowerCase() === member.email.trim().toLowerCase();
                  return Boolean(sameFiscalCode || sameEmail);
                });

                if (existingMember) {
                  ownerMemberIds.push(existingMember.id);
                  continue;
                }

                const savedMember = await saveCondominiumMemberBackend(workspaceId, {
                  id: legacyId,
                  condominiumId: savedItem.id,
                  firstName: owner.firstName,
                  lastName: owner.lastName,
                  fiscalCode: owner.fiscalCode ?? "",
                  phone: owner.phone ?? "",
                  email: owner.email ?? "",
                  apartment: target.unitCode,
                  role: "Proprietario",
                  notes: "Inserito tramite acquisizione documentale AI e confermato dall'amministratore.",
                  active: true,
                  unitId: target.id,
                });
                ownerMemberIds.push(Number(savedMember?.legacy_id ?? legacyId));
              }

              const updatedUnit = {
                ...target,
                millesimi: draftUnit.millesimi ?? "",
                ownerMemberIds,
                ownerMode: ownerMemberIds.length ? "condominium_member" : target.ownerMode,
              };
              const savedUnit = await saveCondominiumUnitBackend(workspaceId, updatedUnit);
              target.millesimi = updatedUnit.millesimi;
              target.ownerMemberIds = ownerMemberIds;
              target.ownerMode = updatedUnit.ownerMode;
              target.id = String(savedUnit?.id || target.id);
            }
          }
        }

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

    if (!isEditing && savedItem.structure?.configured && !(supabaseConfigured && supabase)) {
      const structure = savedItem.structure;
      const generatedUnits: CondominiumUnit[] = [];
      structure.civics.forEach((civic) => {
        civic.buildings.forEach((building) => {
          building.scales.forEach((scale) => {
            for (let interior = 1; interior <= Math.max(0, Number(scale.interiors) || 0); interior += 1) {
              generatedUnits.push({
                id: "local-" + makeId(),
                condominiumId: savedItem.id,
                unitCode: `${civic.label} - ${building.label} - ${scale.label} - Int. ${interior}`,
                unitType: "Abitazione",
                cadastralCategory: "",
                cadastralAutonomous: true,
                millesimi: "",
                civicCode: civic.label,
                buildingCode: building.label,
                staircaseCode: scale.label,
                incorporatedInUnitId: "",
                relationshipToResidentialUnit: "Nessuna",
                ownerMode: "condominium_member",
                ownerMemberIds: [],
                externalOwners: [],
                notes: "",
                active: true,
              });
            }
          });
        });
      });
      const autonomousDefinitions: Array<[CondominiumUnit["unitType"], string, number]> = [
        ["Garage", "Box", structure.autonomous.garages],
        ["Cantina", "Cantina", structure.autonomous.cantine],
        ["Posto auto", "Posto auto", structure.autonomous.postiAuto],
        ["Altro", "Altra pertinenza", structure.autonomous.altre],
      ];
      autonomousDefinitions.forEach(([unitType, prefix, count]) => {
        for (let index = 1; index <= Math.max(0, Number(count) || 0); index += 1) {
          generatedUnits.push({
            id: "local-" + makeId(),
            condominiumId: savedItem.id,
            unitCode: `${prefix} ${index}`,
            unitType,
            cadastralCategory: unitType === "Garage" ? "C/6" : unitType === "Cantina" ? "C/2" : "",
            cadastralAutonomous: true,
            millesimi: "",
            civicCode: "",
            buildingCode: "",
            staircaseCode: "",
            incorporatedInUnitId: "",
            relationshipToResidentialUnit: "Nessuna",
            ownerMode: "condominium_member",
            ownerMemberIds: [],
            externalOwners: [],
            notes: "",
            active: true,
          });
        }
      });
      const confirmedAiUnitsForCreation = aiConfirmedUnitsOverride ?? condominiumAiConfirmedUnits;
      if (generatedUnits.length === 0 && confirmedAiUnitsForCreation.length > 0) {
        for (const draftUnit of confirmedAiUnitsForCreation) {
          generatedUnits.push({
            id: "local-" + makeId(),
            condominiumId: savedItem.id,
            unitCode: draftUnit.unitCode,
            unitType: draftUnit.unitType,
            cadastralCategory: draftUnit.unitType === "Garage" ? "C/6" : draftUnit.unitType === "Cantina" ? "C/2" : "",
            cadastralAutonomous: draftUnit.unitType !== "Abitazione",
            millesimi: draftUnit.millesimi ?? "",
            civicCode: draftUnit.civicCode ?? "",
            buildingCode: draftUnit.buildingCode ?? "",
            staircaseCode: draftUnit.staircaseCode ?? "",
            incorporatedInUnitId: "",
            relationshipToResidentialUnit: "Nessuna",
            ownerMode: "condominium_member",
            ownerMemberIds: [],
            externalOwners: [],
            notes: "Unità acquisita dai documenti e confermata dall'amministratore.",
            active: true,
          });
        }
      }
      const confirmedAiUnits = aiConfirmedUnitsOverride ?? condominiumAiConfirmedUnits;
      if (confirmedAiUnits.length > 0) {
        const aiMembers: CondominiumMember[] = [];
        for (const draftUnit of confirmedAiUnits) {
          const target = generatedUnits.find((unit) =>
            unit.unitCode.trim().toLowerCase() === draftUnit.unitCode.trim().toLowerCase()
          );
          if (!target) continue;
          const ownerIds: number[] = [];
          for (const owner of draftUnit.owners ?? []) {
            const member: CondominiumMember = {
              id: makeId(),
              condominiumId: savedItem.id,
              firstName: owner.firstName,
              lastName: owner.lastName,
              fiscalCode: owner.fiscalCode ?? "",
              phone: owner.phone ?? "",
              email: owner.email ?? "",
              apartment: target.unitCode,
              role: "Proprietario",
              notes: "Inserito tramite acquisizione documentale AI e confermato dall'amministratore.",
              active: true,
              unitId: target.id,
            };
            aiMembers.push(member);
            ownerIds.push(member.id);
          }
          target.millesimi = draftUnit.millesimi ?? "";
          target.ownerMemberIds = ownerIds;
          target.ownerMode = ownerIds.length ? "condominium_member" : target.ownerMode;
        }
        if (aiMembers.length > 0) {
          setCondominiumMembers((current) => [...current, ...aiMembers]);
        }
      }
      setCondominiumUnits((current) => [...current, ...generatedUnits]);
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

  const saveDocument = async (
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

    let documentData: DocumentItem = {
      ...documentForm,
      name: documentForm.name.trim(),
      size: selectedFileName ? documentForm.size || "File locale" : documentForm.size,
    };

    if (selectedDocumentFile && supabaseConfigured && profile.workspaceId) {
      try {
        const stored = await storeWorkspaceDocuments(profile.workspaceId, [selectedDocumentFile], documentForm.condominiumId);
        const uploaded = stored[0];
        documentData = {
          ...documentData,
          storagePath: uploaded?.path ?? "",
          fileSizeBytes: selectedDocumentFile.size,
          mimeType: selectedDocumentFile.type || "application/octet-stream",
        };
      } catch (error: any) {
        alert(error?.message || "Impossibile memorizzare il file.");
        return;
      }
    }

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
    setSelectedDocumentFile(null);
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
      const documentToDelete = documents.find((item) => item.id === id);
      if (documentToDelete?.storagePath && supabaseConfigured) {
        await deleteWorkspaceStoredFile(documentToDelete.storagePath);
      }
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

  const processDocumentAI = async (
    item: DocumentItem
  ) => {
    if (!requirePlan("plus", "L'elaborazione automatica AI dei documenti", "ai")) return;
    if (!isAdministrator) {
      alert("L'avvio dell'analisi AI è riservato all'Amministratore.");
      return;
    }

    setDocuments((current) =>
      current.map((doc) =>
        doc.id === item.id ? { ...doc, aiStatus: "In elaborazione" } : doc
      )
    );

    try {
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId) throw new Error("Workspace attivo non disponibile.");

      if (!item.storagePath) {
        throw new Error("Questo documento non dispone del file originale memorizzato. Ricaricalo dal modulo Documenti prima di avviare l'analisi AI.");
      }

      const draft = await analyzeWorkspaceStoredDocumentsWithAI(workspaceId, [{
        filename: item.name,
        storagePath: item.storagePath,
        mimeType: item.mimeType || "application/octet-stream",
      }]);

      setDocuments((current) =>
        current.map((doc) =>
          doc.id === item.id
            ? {
                ...doc,
                aiStatus: "Da verificare",
                aiSummary: draft.summary || "Analisi AI completata: verifica richiesta.",
                extractedData: JSON.stringify(draft),
                aiDocumentType: draft.documentType || "Altro",
                aiConfidence: Number.isFinite(Number(draft.confidence)) ? Number(draft.confidence) : 0,
              }
            : doc
        )
      );
    } catch (error: any) {
      console.error("BETHAG general document AI error", error);
      setDocuments((current) =>
        current.map((doc) =>
          doc.id === item.id ? { ...doc, aiStatus: "Non elaborato" } : doc
        )
      );
      alert(error?.message || "Impossibile analizzare il documento con l'AI.");
    }
  };

  const confirmDocumentAI = async (
    id: number
  ) => {
    if (!isAdministrator) {
      alert("La conferma dell'analisi AI è riservata all'Amministratore.");
      return;
    }

    const document = documents.find((item) => item.id === id);
    if (!document) return;

    try {
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId || !supabase) throw new Error("Workspace o Supabase non disponibili.");

      let operationalMessage = "Dati AI confermati.";
      const extracted = document.extractedData ? JSON.parse(document.extractedData) : null;

      if (document.aiDocumentType === "Riparto spese" && extracted) {
        const { data: condominium } = await supabase
          .from("condominiums")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("legacy_id", document.condominiumId)
          .maybeSingle();

        if (!condominium?.id) throw new Error("Condominio associato al documento non trovato.");

        const { data: dbDocument } = await supabase
          .from("documents")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("legacy_id", document.id)
          .maybeSingle();

        if (dbDocument?.id) {
          const { data: existingIntake, error: existingIntakeError } = await supabase
            .from("condominium_allocation_intakes")
            .select("id,status")
            .eq("workspace_id", workspaceId)
            .eq("document_id", dbDocument.id)
            .neq("status", "Annullato")
            .limit(1)
            .maybeSingle();
          if (existingIntakeError) throw existingIntakeError;
          if (existingIntake?.id) {
            operationalMessage = "Il riparto di questo documento è già presente in Contabilità come proposta. Non è stata creata una seconda acquisizione.";
            setDocuments((current) => current.map((doc) => doc.id === id ? { ...doc, aiStatus: "Confermato" } : doc));
            alert(operationalMessage);
            return;
          }
        }

        const rawRows = Array.isArray(extracted.unitRows) ? extracted.unitRows : [];
        const { data: dbUnits } = await supabase
          .from("condominium_units")
          .select("id,unit_code,data")
          .eq("workspace_id", workspaceId)
          .eq("condominium_id", condominium.id);

        const rows = rawRows.map((row: any) => {
          const unitCode = String(row.unitCode ?? "").trim();
          const matched = (dbUnits ?? []).find((unit: any) => String(unit.unit_code ?? "").trim().toLowerCase() === unitCode.toLowerCase());
          const amount = Number(String(row.amount ?? "").replace(/[^0-9,.-]/g, "").replace(",", "."));
          const millesimi = Number(String(row.millesimi ?? "").replace(",", "."));
          return { unit_id: matched?.id ?? "", unit_code: unitCode, description: row.description ?? "", amount: Number.isFinite(amount) ? amount : 0, millesimi: Number.isFinite(millesimi) ? millesimi : 0, owner: row.owner ?? "", matched: Boolean(matched) };
        });

        const validationErrors = rows.filter((row: any) => !row.unit_id).map((row: any) => "Unità non trovata in BETHAG: " + (row.unit_code || "senza codice"));
        const expenseAmount = Number(String(extracted.expenseAmount ?? "").replace(/[^0-9,.-]/g, "").replace(",", "."));

        const { error } = await supabase.from("condominium_allocation_intakes").insert({
          workspace_id: workspaceId, condominium_id: condominium.id, source: "AI", status: "Da verificare",
          document_id: dbDocument?.id ?? null, title: document.name,
          description: extracted.summary ?? "Riparto spese estratto automaticamente.",
          expense_amount: Number.isFinite(expenseAmount) ? expenseAmount : null,
          extracted_data: extracted, rows, validation_errors: validationErrors,
          notes: "Proposta generata dall'AI e confermata dall'amministratore. Le imputazioni contabili definitive richiedono l'applicazione esplicita dalla sezione Contabilità.",
        });
        if (error) throw error;
        operationalMessage = validationErrors.length
          ? "Dati AI confermati. Il riparto è stato trasferito in Contabilità come proposta da verificare; alcune unità non sono state associate automaticamente."
          : "Dati AI confermati. Il riparto è stato trasferito in Contabilità come proposta da verificare.";
      }

      if (document.aiDocumentType === "Fattura" && extracted) {
        const parseAmount = (value: any) => Number(String(value ?? "").replace(/[^0-9,.-]/g, "").replace(",", "."));
        const normalize = (value: any) => String(value ?? "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
        const supplierName = String(extracted.supplier ?? "").trim();
        const amount = parseAmount(extracted.expenseAmount ?? extracted.amount ?? extracted.totalAmount);
        const invoiceNumber = String(extracted.invoiceNumber ?? extracted.numeroFattura ?? "").trim();
        const invoiceDate = String(extracted.documentDate ?? extracted.invoiceDate ?? "").trim();

        if (!Number.isFinite(amount) || amount <= 0) throw new Error("La fattura è stata riconosciuta, ma l'importo non è sufficientemente determinato.");
        if (!supplierName) throw new Error("La fattura è stata riconosciuta, ma il fornitore non è sufficientemente determinato.");

        const candidateSuppliers = suppliers
          .filter((supplier) => supplier.condominiumId === document.condominiumId || supplier.condominiumId === null)
          .map((supplier) => ({ supplier, score: normalize(supplier.name) === normalize(supplierName) ? 100 : (normalize(supplier.name).includes(normalize(supplierName)) || normalize(supplierName).includes(normalize(supplier.name)) ? 70 : 0) }))
          .filter((item) => item.score > 0)
          .sort((x, y) => y.score - x.score);
        const selectedSupplier = candidateSuppliers[0]?.supplier;

        const workCandidates = condominiumWorks
          .filter((work) => work.condominiumId === document.condominiumId)
          .map((work) => {
            const supplierScore = selectedSupplier && work.supplierId === selectedSupplier.id ? 60 : 0;
            const text = normalize(`${work.title} ${work.category} ${work.description}`);
            const supplierText = normalize(supplierName);
            const keywordScore = supplierText.split(" ").filter((word: string) => word.length > 3 && text.includes(word)).length * 10;
            return { work, score: supplierScore + keywordScore };
          })
          .sort((x, y) => y.score - x.score);
        const selectedWork = workCandidates[0]?.score > 0 ? workCandidates[0].work : null;

        if (!selectedSupplier) {
          throw new Error(`Il fornitore "${supplierName}" non è stato associato automaticamente. Prima della conferma inserisci il fornitore in Anagrafica o correggi il nome estratto dall'AI.`);
        }

        const result = await confirmCondominiumInvoiceBackend(workspaceId, {
          documentLegacyId: document.id,
          condominiumLegacyId: document.condominiumId,
          extractedData: extracted,
          supplierId: null,
          workId: selectedWork?.id ?? null,
        });

        operationalMessage = selectedWork
          ? `Fattura confermata: ${invoiceNumber ? `n. ${invoiceNumber}, ` : ""}${amount.toFixed(2)} € registrati in Contabilità e collegati al lavoro "${selectedWork.title}".`
          : `Fattura confermata: ${invoiceNumber ? `n. ${invoiceNumber}, ` : ""}${amount.toFixed(2)} € registrati in Contabilità. Nessun lavoro è stato collegato automaticamente.`;

        if (result.workId) {
          setCondominiumWorks((current) => current.map((work) => work.id === result.workId ? { ...work, documentIds: Array.from(new Set([...(work.documentIds ?? []), document.id])) } : work));
        }

        if (invoiceDate) {
          setDocuments((current) => current.map((doc) => doc.id === id ? { ...doc, date: invoiceDate } : doc));
        }
      }

      setDocuments((current) => current.map((doc) => doc.id === id ? { ...doc, aiStatus: "Confermato" } : doc));
      alert(operationalMessage);
    } catch (error: any) {
      console.error("BETHAG AI confirmation failed", error);
      alert(error?.message || "Impossibile confermare e trasferire i dati AI.");
    }
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

  const saveCondominiumWork = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!requireModulePermission("attivita", "La gestione dei lavori e delle manutenzioni")) return;
    event.preventDefault();
    if (!condominiumWorkForm.title.trim() || !condominiumWorkForm.condominiumId) { alert("Inserisci almeno condominio e titolo del lavoro."); return; }
    const normalized: CondominiumWork = { ...condominiumWorkForm, title: condominiumWorkForm.title.trim(), category: condominiumWorkForm.category.trim() || "Manutenzione", description: condominiumWorkForm.description.trim(), notes: condominiumWorkForm.notes.trim(), estimatedAmount: Math.max(0, Number(condominiumWorkForm.estimatedAmount) || 0), approvedAmount: Math.max(0, Number(condominiumWorkForm.approvedAmount) || 0), actualAmount: Math.max(0, Number(condominiumWorkForm.actualAmount) || 0), progressPercent: Math.max(0, Math.min(100, Number(condominiumWorkForm.progressPercent) || 0)), documentIds: Array.from(new Set(condominiumWorkForm.documentIds || [])) };
    const workId = selectedCondominiumWork?.id || normalized.id || crypto.randomUUID();
    const previous = condominiumWorks;
    const saved = { ...normalized, id: workId };
    setCondominiumWorks(current => selectedCondominiumWork ? current.map(item => item.id === workId ? saved : item) : [...current, saved]);
    try {
      if (supabaseConfigured && supabase && profile.workspaceId) {
        const { data: condominiumRow, error: condominiumError } = await supabase.from("condominiums").select("id").eq("workspace_id", profile.workspaceId).eq("legacy_id", normalized.condominiumId).maybeSingle();
        if (condominiumError) throw condominiumError;
        if (!condominiumRow?.id) throw new Error("Condominio non trovato sul server.");
        await syncCondominiumWorkDocumentsBackend(profile.workspaceId, workId, condominiumRow.id, normalized.documentIds);
        const changed = !selectedCondominiumWork || selectedCondominiumWork.status !== saved.status || selectedCondominiumWork.progressPercent !== saved.progressPercent || selectedCondominiumWork.actualAmount !== saved.actualAmount || selectedCondominiumWork.supplierId !== saved.supplierId;
        if (changed) await recordCondominiumWorkEventBackend(profile.workspaceId, workId, condominiumRow.id, {
          eventType: selectedCondominiumWork ? "work_updated" : "work_created",
          title: selectedCondominiumWork ? "Lavoro aggiornato" : "Lavoro creato",
          description: selectedCondominiumWork ? "Sono stati modificati dati operativi del lavoro." : "Il lavoro è stato creato in BETHAG.",
          amount: saved.actualAmount || saved.approvedAmount || saved.estimatedAmount || 0,
          data: { status: saved.status, progressPercent: saved.progressPercent, supplierId: saved.supplierId, documentIds: saved.documentIds }
        });
      }
      setSelectedCondominiumWork(null); setCondominiumWorkForm(emptyCondominiumWork); closeModal();
    } catch (error) {
      setCondominiumWorks(previous);
      alert(error instanceof Error ? "Il lavoro non è stato sincronizzato completamente.\n\n" + error.message : "Impossibile sincronizzare il lavoro.");
    }
  };
  const reconcileCondominiumWork = async (work: CondominiumWork) => {
    if (!requireModulePermission("attivita", "La riconciliazione economica dei lavori")) return;
    if (!supabaseConfigured || !supabase || !profile.workspaceId) { alert("La riconciliazione richiede il collegamento al server."); return; }
    try {
      const result = await reconcileCondominiumWorkBackend(profile.workspaceId, work.id);
      const fmt = (n:number) => "€ " + Number(n || 0).toLocaleString("it-IT",{minimumFractionDigits:2});
      const invoiceAccountingAmount = Number(result.invoiceAccountingAmount ?? result.accountingAmount ?? 0);
      const status = Math.abs(Number(result.residualToInvoices || 0)) < 0.01 &&
        (Number(result.invoiceCount || 0) === 0 || Math.abs(invoiceAccountingAmount - Number(result.invoiceAmount || 0)) < 0.01)
        ? "RICONCILIATO" : "DA VERIFICARE";
      alert("Riconciliazione " + status + "\n\n" + work.title + "\n\nDocumenti/fatture: " + result.invoiceCount + " · " + fmt(result.invoiceAmount) +
        "\nSAL: " + fmt(result.salAmount) +
        "\nContabilità fatture: " + fmt(invoiceAccountingAmount) +
        "\nContabilità SAL: " + fmt(result.salAccountingAmount ?? 0) +
        "\n\nResiduo fatture − SAL: " + fmt(result.residualToInvoices) +
        "\nResiduo fatture − Contabilità: " + fmt(Number(result.invoiceAmount || 0) - invoiceAccountingAmount) +
        (result.expectedAmount ? "\nScostamento dal preventivo approvato/stimato: " + fmt(result.residualToExpected) : "") +
        (status === "DA VERIFICARE" ? "\n\nControlla le fatture e i SAL prima di procedere con ulteriori imputazioni." : ""));
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile eseguire la riconciliazione."); }
  };
  const editCondominiumWork = (item: CondominiumWork) => { if (!requireModulePermission("attivita", "La modifica di un lavoro")) return; setSelectedCondominiumWork(item); setCondominiumWorkForm(item); openModal("condominium-work"); };
  const newWorkProgress = (work: CondominiumWork) => { if (!requireModulePermission("attivita", "La gestione degli stati di avanzamento")) return; setSelectedWorkProgress(null); setWorkProgressForm({ ...emptyWorkProgress, workId: work.id, progressNo: 1, title: "SAL " + 1, percentage: work.progressPercent, amount: 0, paidAmount: 0 }); openModal("work-progress"); };
  const saveWorkProgress = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!requireModulePermission("attivita", "La registrazione dello stato di avanzamento")) return;
    event.preventDefault();
    const f = workProgressForm;
    if (!f.workId || !f.progressDate || !f.progressNo) { alert("Completa numero e data del SAL."); return; }
    if (Number(f.paidAmount || 0) > Number(f.amount || 0) + 0.000001) { alert("L'importo pagato non può essere superiore all'importo del SAL."); return; }
    try {
      let savedProgress: any = null;
      if (supabaseConfigured && supabase && profile.workspaceId) savedProgress = await saveCondominiumWorkProgressBackend(profile.workspaceId, f.workId, { ...f, registerAccounting: false });
      const work = condominiumWorks.find(w => w.id === f.workId);
      if (work) setCondominiumWorks(current => current.map(w => w.id === work.id ? { ...w, progressPercent: Math.max(0, Math.min(100, f.percentage)), actualAmount: Number(savedProgress?.cumulativeActualAmount ?? (f.amount > 0 ? f.amount : w.actualAmount)), status: f.percentage >= 100 ? "Completato" : f.percentage > 0 ? "In corso" : w.status === "Completato" ? "In corso" : w.status, actualEndDate: f.percentage >= 100 ? f.progressDate : null } : w));
      if (savedProgress?.budgetWarning) {
        const warning = savedProgress.budgetWarning;
        alert("Attenzione: il totale cumulativo dei SAL supera " + (warning.type === "approved_amount_exceeded" ? "l'importo approvato" : "l'importo stimato") + " di € " + Number(warning.exceededBy || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }) + ". Il SAL è stato comunque registrato: verifica eventuali varianti o integrazioni.");
      }
      setWorkProgressForm(emptyWorkProgress); setSelectedWorkProgress(null); closeModal();
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile registrare il SAL."); }
  };
  const saveWorkProgressAndAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!requireModulePermission("attivita", "La registrazione contabile del SAL")) return;
    event.preventDefault();
    const f = workProgressForm;
    if (!f.workId || !f.progressDate || !f.progressNo) { alert("Completa numero e data del SAL."); return; }
    if (Number(f.paidAmount || 0) > Number(f.amount || 0) + 0.000001) { alert("L'importo pagato non può essere superiore all'importo del SAL."); return; }
    try {
      if (!supabaseConfigured || !supabase || !profile.workspaceId) throw new Error("Per registrare il SAL in contabilità è necessario il collegamento al server.");
      const savedProgress: any = await saveCondominiumWorkProgressBackend(profile.workspaceId, f.workId, { ...f, registerAccounting: true });
      const work = condominiumWorks.find(w => w.id === f.workId);
      if (work) setCondominiumWorks(current => current.map(w => w.id === work.id ? { ...w, progressPercent: f.percentage, actualAmount: Number(savedProgress?.cumulativeActualAmount ?? (f.amount || w.actualAmount)), status: f.percentage >= 100 ? "Completato" : f.percentage > 0 ? "In corso" : w.status, actualEndDate: f.percentage >= 100 ? f.progressDate : w.actualEndDate } : w));
      if (savedProgress?.budgetWarning) {
        const warning = savedProgress.budgetWarning;
        alert("Attenzione: il totale cumulativo dei SAL supera " + (warning.type === "approved_amount_exceeded" ? "l'importo approvato" : "l'importo stimato") + " di € " + Number(warning.exceededBy || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 }) + ". Il SAL è stato comunque registrato: verifica eventuali varianti o integrazioni.");
      }
      setWorkProgressForm(emptyWorkProgress); closeModal();
      alert("SAL registrato e imputato in Contabilità senza creare una seconda voce per lo stesso SAL.");
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile registrare il SAL in Contabilità."); }
  };
  const deleteCondominiumWork = async (id: string) => { if (!requireModulePermission("attivita", "L'eliminazione di un lavoro")) return; if (!confirm("Eliminare definitivamente questo lavoro?")) return; const previous = condominiumWorks; setCondominiumWorks(current => current.filter(item => item.id !== id)); if (supabaseConfigured && supabase && profile.workspaceId) { try { await deleteCondominiumWorkBackend(profile.workspaceId, id); } catch (error) { setCondominiumWorks(previous); alert(error instanceof Error ? "Il lavoro non è stato eliminato dal server.\n\n" + error.message : "Il lavoro non è stato eliminato dal server."); } } };
  const updateCondominiumWorkProgress = async (id: string, progressPercent: number) => {
    if (!requireModulePermission("attivita", "L'aggiornamento dell'avanzamento lavori")) return;
    const progress = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    const current = condominiumWorks.find(item => item.id === id);
    if (!current) return;
    const updated = {
      ...current,
      progressPercent: progress,
      status: progress >= 100 ? "Completato" : progress > 0 ? "In corso" : current.status === "Completato" ? "In corso" : current.status,
      actualEndDate: progress >= 100 ? (current.actualEndDate || localISODate()) : null,
    };
    setCondominiumWorks(items => items.map(item => item.id === id ? updated : item));
    try {
      await saveCondominiumWork(updated);
    } catch (error) {
      setCondominiumWorks(items => items.map(item => item.id === id ? current : item));
      alert(error instanceof Error ? "L'avanzamento non è stato salvato sul server.\n\n" + error.message : "L'avanzamento non è stato salvato sul server.");
    }
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

      // Manteniamo sincronizzato anche lo stato locale delle unità:
      // la proprietà appartiene all'unità e i millesimi non vengono toccati.
      setCondominiumUnits((current) =>
        current.map((unit) =>
          unit.condominiumId === member.condominiumId
            ? {
                ...unit,
                ownerMemberIds: Array.isArray(unit.ownerMemberIds)
                  ? unit.ownerMemberIds.filter((ownerId) => String(ownerId) !== String(id))
                  : [],
              }
            : unit
        )
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

  const newCondominiumWork = (condominiumId?: number) => {
    if (!requireModulePermission("attivita", "La gestione dei lavori e delle manutenzioni")) return;
    setSelectedCondominiumWork(null);
    setCondominiumWorkForm({ ...emptyCondominiumWork, id: crypto.randomUUID(), condominiumId: condominiumId ?? (condominiums[0]?.id || 0) });
    openModal("condominium-work");
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

  const activeCondominiumIds = new Set(
    condominiums
      .filter((condominium) => !condominium.archivedAt)
      .map((condominium) => condominium.id)
  );

  const activeDeadlines = deadlines.filter((deadline) =>
    activeCondominiumIds.has(deadline.condominiumId)
  );
  const activeActivities = activities.filter((activity) =>
    activeCondominiumIds.has(activity.condominiumId)
  );
  const activeCommunications = communications.filter((communication) =>
    activeCondominiumIds.has(communication.condominiumId)
  );
  const activeRequests = condominiumRequests.filter((request) =>
    activeCondominiumIds.has(request.condominiumId)
  );
  const activeDocuments = documents.filter((document) =>
    activeCondominiumIds.has(document.condominiumId)
  );

  const upcoming = [...activeDeadlines]
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
    activeActivities.filter(
      (a) =>
        a.status !==
        "Completata"
    ).length;

  const urgentDeadlines =
    activeDeadlines.filter(
      (d) =>
        d.status ===
        "In scadenza"
    ).length;

  const completedDeadlines =
    activeDeadlines.filter(
      (d) =>
        d.status ===
        "Completata"
    ).length;

  const completedActivities =
    activeActivities.filter(
      (a) =>
        a.status ===
        "Completata"
    ).length;

  const visibleCommunications =
    activeCommunications.filter(
      (c) =>
        c.publishedToPortal
    ).length;

  const todayISO = localISODate();
  const overdueDeadlines = activeDeadlines.filter(
    (d) => d.status !== "Completata" && d.dueDate && d.dueDate < todayISO
  ).length;
  const pendingRequests = activeRequests.filter(
    (request) => request.status !== "Risolta" && request.status !== "Chiusa"
  ).length;
  const documentsToVerify = activeDocuments.filter(
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

            <NavButton active={page === "lavori"} onClick={() => navigate("lavori")}><span className="nav-icon"><AppIcon name="wrench" size={18} /></span><span>Lavori e manutenzioni</span></NavButton>

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
              onNewCondominiumAi={openCondominiumAiCreation}
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
              onTransferMember={executeMemberTransfer}
              onRefreshMembers={async () => {
                if (!supabaseConfigured || !supabase || !profile.workspaceId) return;
                const refreshed = await loadBackendState(profile.workspaceId);
                setCondominiumMembers(refreshed.condominiumMembers || []);
                setCondominiumUnits(Array.isArray(refreshed.condominiumUnits) ? refreshed.condominiumUnits : []);
                setPortalMembers(refreshed.portalMembers || []);
              }}
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
              aiEnabled={hasEntitlement(subscription, "professional", "ai")}
              documents={documents.map((d) => ({ id: d.id, name: d.name, condominiumId: d.condominiumId, category: d.category, aiStatus: d.aiStatus, extractedData: d.extractedData, aiSummary: d.aiSummary }))}
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


          {page === "lavori" && (<CondominiumWorksPage works={condominiumWorks} search={search} setSearch={setSearch} onNew={newCondominiumWork} onEdit={editCondominiumWork} onDelete={deleteCondominiumWork} onProgress={updateCondominiumWorkProgress} onNewProgress={newWorkProgress} onReconcile={reconcileCondominiumWork} condominiumName={condominiumName} suppliers={suppliers} activities={activities} isAdministrator={isAdministrator || (isCollaborator && collaboratorPermissions.includes("attivita"))} />)}

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
              aiEnabled={hasEntitlement(subscription, "plus", "ai")}
              documents={documents.map((d) => ({
                id: d.id,
                name: d.name,
                condominiumId: d.condominiumId,
                category: d.category,
                aiStatus: d.aiStatus,
                extractedData: d.extractedData,
                aiSummary: d.aiSummary,
              }))}
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
                  ["lavori", "Lavori e manutenzioni", "wrench"],
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

          {modalType === "condominium-ai" && (
            <CondominiumAiCreationForm
              draft={condominiumAiDraft}
              files={condominiumAiFiles}
              processing={condominiumAiProcessing}
              largeFiles={condominiumAiLargeFiles}
              onFiles={analyzeCondominiumDocuments}
              onLargeFileDecision={handleLargeCondominiumFiles}
              onConfirm={async (draft, automatic = false) => {
                try {
                  const workspaceId = await getActiveWorkspaceId();
                  if (workspaceId && condominiumAiIntakeId) {
                    await confirmCondominiumCreationIntake(workspaceId, condominiumAiIntakeId, {
                      extractedData: {
                        name: draft.name ?? "",
                        address: draft.address ?? "",
                        cap: draft.cap ?? "",
                        city: draft.city ?? "",
                        province: draft.province ?? "",
                        fiscalCode: draft.fiscalCode ?? "",
                        units: draft.units ?? 0,
                        unitRecords: Array.isArray(draft.unitRecords) ? draft.unitRecords : [],
                      },
                      structure: draft.structure ?? {},
                      validationErrors: [],
                      warnings: draft.warnings ?? [],
                      notes: "Proposta verificata e confermata dall'amministratore; salvataggio definitivo ancora da eseguire nel modulo condominio.",
                    });
                  }

                  const confirmedUnits = Array.isArray(draft.unitRecords) ? draft.unitRecords : [];
                  const autoData: Condominium = {
                    ...emptyCondominium,
                    name: draft.name ?? "",
                    address: draft.address ?? "",
                    cap: draft.cap ?? "",
                    city: draft.city ?? "",
                    province: draft.province ?? "",
                    fiscalCode: draft.fiscalCode ?? "",
                    units: String(confirmedUnits.length),
                    structure: draft.structure,
                  };
                  setCondominiumAiConfirmedUnits(confirmedUnits);
                  if (automatic) {
                    await saveCondominium({ preventDefault: () => undefined } as React.FormEvent<HTMLFormElement>, autoData, confirmedUnits);
                    setCondominiumAiDraft(null);
                    return;
                  }
                  setEditingCondominium(autoData);
                  setCondominiumAiDraft(null);
                  setModalType("condominium");
                } catch (error: any) {
                  console.error("BETHAG condominium AI confirmation error", error);
                  alert(error?.message || "Impossibile confermare la proposta AI.");
                }
              }}
              onCancel={closeModal}
            />
          )}

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
              setSelectedDocumentFile={
                setSelectedDocumentFile
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

          {modalType === "work-progress" && (<WorkProgressForm value={workProgressForm} setValue={setWorkProgressForm} onSubmit={saveWorkProgress} onSubmitAccounting={saveWorkProgressAndAccount} onCancel={closeModal} />)}

          {modalType === "condominium-work" && (<CondominiumWorkForm value={condominiumWorkForm} setValue={setCondominiumWorkForm} condominiums={condominiums.filter((c) => !c.archivedAt)} suppliers={suppliers} activities={activities} documents={documents} onSubmit={saveCondominiumWork} onCancel={closeModal} editing={!!selectedCondominiumWork} />)}

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
                  ⚠️ <b>Incongruenza e-mail:</b> prima di autorizzare l'accesso, verifica l'identità della persona e correggi l'indirizzo e-mail nel profilo condòmino. La sola conferma dell'amministratore non sostituisce la verifica dell'account.
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
                  if (mismatch && !confirm("La richiesta presenta un'incongruenza e-mail. L'autorizzazione sarà consentita solo dopo aver verificato l'identità e corretto l'e-mail nell'anagrafica condominiale. Hai già completato queste verifiche?")) return;
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
    onTransferMember,
    onRefreshMembers,
    onDeleteMember,
    onNewRequest,
    onEditRequest,
    onDeleteRequest,
    onStatusRequest,
    onNewCommunication,
    onPrepareEmail,
    openCondominiumEmailComposer,
    onNewCondominiumAi,
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
          onTransferMember={onTransferMember}
          onRefreshMembers={onRefreshMembers}
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

      {canManageCondominium && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button type="button" className="secondary-button" onClick={onNewCondominiumAi}>✦ Crea condominio con AI</button>
        </div>
      )}

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
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferUnitId, setTransferUnitId] = useState("");
  const [transferOutgoingId, setTransferOutgoingId] = useState("");
  const [transferIncomingName, setTransferIncomingName] = useState("");
  const [transferIncomingEmail, setTransferIncomingEmail] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferType, setTransferType] = useState("Vendita");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [memberTransfers, setMemberTransfers] = useState<any[]>([]);
  const [transferReload, setTransferReload] = useState(0);
  const [closingTransferId, setClosingTransferId] = useState<string | null>(null);
  const [transferLoadError, setTransferLoadError] = useState("");
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
    onTransferMember,
    onRefreshMembers,
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

  const activeMembers = condominiumMembers.filter((member: CondominiumMember) => { const record = member as any; const positionStatus = String(record.position_status ?? record.data?.position_status ?? "Attivo").trim(); const currentOwner = record.current_owner ?? record.data?.current_owner ?? true; return member.active && positionStatus !== "In chiusura" && positionStatus !== "Archiviato" && currentOwner !== false && String(currentOwner).toLowerCase() !== "false"; });
  const transferUnitKey = condominiumUnits.map((unit: CondominiumUnit) => unit.id).filter(Boolean).join("|");
  useEffect(() => {
    let cancelled = false;
    const unitIds = transferUnitKey ? transferUnitKey.split("|") : [];
    if (!supabase || unitIds.length === 0) {
      setMemberTransfers([]);
      setTransferLoadError("");
      return () => { cancelled = true; };
    }
    const loadTransfers = async () => {
      const { data, error } = await supabase
        .from("condominium_member_transfers")
        .select("id,unit_id,outgoing_member_id,incoming_member_id,transfer_date,transfer_type,status,notes,created_at,closed_at")
        .in("unit_id", unitIds)
        .order("transfer_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("BETHAG transfer history load failed", error);
        setTransferLoadError("Impossibile caricare lo storico dei subentri. Verifica i permessi e riprova.");
        setMemberTransfers([]);
        return;
      }
      setTransferLoadError("");
      setMemberTransfers(data ?? []);
    };
    void loadTransfers();
    return () => { cancelled = true; };
  }, [transferUnitKey, transferReload]);
  const closeMemberTransfer = async (transferId: string) => {
    if (closingTransferId) return;
    const confirmed = window.confirm("Confermi la chiusura contabile del titolare uscente? Il server verificherà che non restino partite aperte.");
    if (!confirmed) return;
    setClosingTransferId(transferId);
    let closureConfirmed = false;
    try {
      const closed = await closeCondominiumMemberTransfer(transferId);
      if (!closed) throw new Error("Il server non ha confermato la chiusura.");
      closureConfirmed = true;
      // Refresh shared member, unit and portal state after the server archives the outgoing member.
      try {
        if (typeof onRefreshMembers === "function") await onRefreshMembers();
        setTransferReload((current) => current + 1);
        alert("Chiusura contabile registrata.");
      } catch (refreshError) {
        console.error("BETHAG member refresh after transfer closure failed", refreshError);
        alert("La chiusura contabile è stata registrata dal server, ma non è stato possibile aggiornare la schermata. Ricarica la pagina per visualizzare lo stato aggiornato.");
      }
    } catch (error) {
      console.error("BETHAG transfer closure failed", error);
      alert(closureConfirmed
        ? "La chiusura contabile è stata registrata, ma si è verificato un errore successivo. Ricarica la pagina."
        : error instanceof Error ? "Chiusura non eseguita.\n\n" + error.message : "Chiusura non eseguita.");
    } finally {
      setClosingTransferId(null);
    }
  };
  const openRequests = condominiumRequests.filter((request: CondominiumRequest) => request.status !== "Risolta" && request.status !== "Chiusa").length;

  const unitCollator = new Intl.Collator("it-IT", { numeric: true, sensitivity: "base" });
  const orderedActiveUnits = condominiumUnits
    .filter((unit: CondominiumUnit) => unit.active)
    .slice()
    .sort((a: CondominiumUnit, b: CondominiumUnit) => {
      const aAutonomous = !a.civicCode && !a.buildingCode && !a.staircaseCode;
      const bAutonomous = !b.civicCode && !b.buildingCode && !b.staircaseCode;
      if (aAutonomous !== bAutonomous) return aAutonomous ? 1 : -1;
      if (!aAutonomous) {
        const hierarchy = [
          a.civicCode || "",
          a.buildingCode || "",
          a.staircaseCode || "",
        ];
        const otherHierarchy = [
          b.civicCode || "",
          b.buildingCode || "",
          b.staircaseCode || "",
        ];
        for (let index = 0; index < hierarchy.length; index += 1) {
          const result = unitCollator.compare(hierarchy[index], otherHierarchy[index]);
          if (result !== 0) return result;
        }
        const aInterior = Number((a.unitCode.match(/(?:Int\.?|Interno)\s*(\d+)/i) || [])[1] || 0);
        const bInterior = Number((b.unitCode.match(/(?:Int\.?|Interno)\s*(\d+)/i) || [])[1] || 0);
        if (aInterior !== bInterior) return aInterior - bInterior;
      }
      return unitCollator.compare(a.unitCode, b.unitCode);
    });

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
            orderedActiveUnits
              .map((unit: CondominiumUnit, unitIndex: number) => {
                const previousUnit = unitIndex > 0 ? orderedActiveUnits[unitIndex - 1] : null;
                const hierarchyKey = [unit.civicCode || "", unit.buildingCode || "", unit.staircaseCode || ""].join("|");
                const previousHierarchyKey = previousUnit
                  ? [previousUnit.civicCode || "", previousUnit.buildingCode || "", previousUnit.staircaseCode || ""].join("|")
                  : "";
                const showHierarchyHeader = hierarchyKey !== previousHierarchyKey;
                const hierarchyTitle = [unit.civicCode, unit.buildingCode, unit.staircaseCode].filter(Boolean).join(" · ");
                const isAutonomous = !unit.civicCode && !unit.buildingCode && !unit.staircaseCode;
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
                  <React.Fragment key={unit.id}>
                    {showHierarchyHeader && (
                      <div className="section-title" style={{ marginTop: unitIndex === 0 ? 0 : 18, marginBottom: 8 }}>
                        <div>
                          <div className="eyebrow">{isAutonomous ? "Pertinenze autonome" : "Struttura condominiale"}</div>
                          <strong>{isAutonomous ? "Box, cantine, posti auto e altre pertinenze" : hierarchyTitle}</strong>
                        </div>
                      </div>
                    )}
                  <div className="request-card">
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
                  </React.Fragment>
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

      {isAdministrator && (
        <section className="condominium-section-card">
          <div className="section-title">
            <div><div className="eyebrow">Continuità amministrativa</div><h2>Storico subentri</h2><p className="section-subtitle">Consulta i trasferimenti registrati e completa la chiusura contabile quando le verifiche sulle partite aperte sono superate.</p></div>
          </div>
          {transferLoadError && <p role="alert" className="section-subtitle">{transferLoadError}</p>}
          {memberTransfers.length === 0 ? <Empty text={transferLoadError ? "Storico non disponibile." : "Nessun subentro registrato per le unità di questo condominio."} /> : (
            <div className="related-list">
              {memberTransfers.map((transfer: any) => {
                const unit = condominiumUnits.find((candidate: CondominiumUnit) => candidate.id === transfer.unit_id);
                const outgoing = condominiumMembers.find((member: CondominiumMember) => member.dbId === transfer.outgoing_member_id);
                const incoming = condominiumMembers.find((member: CondominiumMember) => member.dbId === transfer.incoming_member_id);
                const outgoingName = outgoing ? `${outgoing.firstName} ${outgoing.lastName}`.trim() : "Titolare uscente";
                const incomingName = incoming ? `${incoming.firstName} ${incoming.lastName}`.trim() : "Nuovo titolare";
                const isOpen = transfer.status === "Confermato";
                return <div className="request-card" key={transfer.id}>
                  <div className="request-main">
                    <b>{unit?.unitCode || "Unità"} · {transfer.transfer_type || "Subentro"}</b>
                    <span>{outgoingName} → {incomingName} · {formatDate(transfer.transfer_date)}</span>
                    {transfer.notes && <p>{transfer.notes}</p>}
                    {transfer.closed_at && <small>Chiuso il {formatDate(String(transfer.closed_at).slice(0, 10))}</small>}
                  </div>
                  <div className="request-actions">
                    <Badge value={transfer.status || "Stato non disponibile"} />
                    {isOpen && <button type="button" className="secondary-button small" disabled={Boolean(closingTransferId)} onClick={() => void closeMemberTransfer(transfer.id)}>{closingTransferId === transfer.id ? "Verifica..." : "Verifica e chiudi"}</button>}
                  </div>
                </div>;
              })}
            </div>
          )}
        </section>
      )}

      <section className="condominium-section-card">
        <div className="section-title">
          <div><div className="eyebrow">Anagrafica</div><h2>Condòmini</h2><p className="section-subtitle">Gestisci anagrafica, recapiti, interno e qualifica.</p></div>
          <div className="button-row compact condominium-members-actions">
            {isAdministrator && <button className="secondary-button" type="button" onClick={() => setTransferOpen(true)}>↔ Registra subentro</button>}
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

      {transferOpen && (
        <Modal onClose={() => { if (!transferSaving) setTransferOpen(false); }}>
          <ModalTitle title="Subentro nella titolarità dell'unità" />
          <form onSubmit={async (event) => {
            event.preventDefault();
            const unit = condominiumUnits.find((candidate: CondominiumUnit) => candidate.id === transferUnitId);
            const outgoing = condominiumMembers.find((candidate: CondominiumMember) => candidate.dbId === transferOutgoingId && candidate.active && candidate.role === "Proprietario");
            if (!unit || !outgoing || !unit.id || !outgoing.dbId || outgoing.unitId !== unit.id) {
              alert("Il proprietario uscente deve essere attivo e associato all'unità selezionata tramite il database. Verifica l'anagrafica.");
              return;
            }
            setTransferSaving(true);
            try {
              const ok = await onTransferMember({
                unitId: unit.id, outgoingMemberId: outgoing.dbId,
                incomingName: transferIncomingName.trim(),
                incomingEmail: transferIncomingEmail.trim() || null,
                transferDate, transferType, notes: transferNotes.trim(),
              });
              if (ok) {
                setTransferOpen(false); setTransferUnitId(""); setTransferOutgoingId("");
                setTransferIncomingName(""); setTransferIncomingEmail(""); setTransferDate("");
                setTransferNotes("");
              }
            } finally { setTransferSaving(false); }
          }} className="form-stack">
            <label>Unità immobiliare
              <select required value={transferUnitId} onChange={(event) => { setTransferUnitId(event.target.value); setTransferOutgoingId(""); }}>
                <option value="">Seleziona unità</option>
                {condominiumUnits.filter((unit: CondominiumUnit) => unit.active && unit.lifecycleStatus !== "Soppressa").map((unit: CondominiumUnit) => <option key={unit.id} value={unit.id}>{unit.unitCode} · {unit.unitType}</option>)}
              </select>
            </label>
            <label>Proprietario uscente
              <select required value={transferOutgoingId} onChange={(event) => setTransferOutgoingId(event.target.value)} disabled={!transferUnitId}>
                <option value="">Seleziona proprietario</option>
                {condominiumMembers.filter((member: CondominiumMember) => member.active && member.role === "Proprietario" && member.unitId === transferUnitId && member.dbId).map((member: CondominiumMember) => <option key={member.dbId} value={member.dbId}>{member.firstName} {member.lastName}{member.email ? ` · ${member.email}` : ""}</option>)}
              </select>
            </label>
            <label>Nuovo proprietario
              <input required value={transferIncomingName} onChange={(event) => setTransferIncomingName(event.target.value)} maxLength={160} placeholder="Nome e cognome" />
            </label>
            <label>E-mail (facoltativa)
              <input type="email" value={transferIncomingEmail} onChange={(event) => setTransferIncomingEmail(event.target.value)} maxLength={254} placeholder="nome@esempio.it" />
            </label>
            <label>Data del rogito / decorrenza
              <input required type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} />
            </label>
            <label>Tipo di trasferimento
              <select value={transferType} onChange={(event) => setTransferType(event.target.value)}>
                {["Vendita","Acquisto","Donazione","Successione","Altro"].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>Note (facoltative)
              <textarea value={transferNotes} onChange={(event) => setTransferNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Riferimenti dell'atto o annotazioni" />
            </label>
            <p className="section-subtitle">La conferma registra il trasferimento e aggiorna l'anagrafica dal server. Se l'unità è in comproprietà, viene trasferita la posizione del solo titolare selezionato: le quote percentuali non sono calcolate né ripartite automaticamente e richiedono verifica documentale e contabile. Per accedere al Portale, il nuovo proprietario dovrà creare un account con i propri dati; l'amministratore potrà poi verificare e autorizzare la richiesta dalla sezione Portale. Se i dati non coincidono con l'anagrafica, sarà necessaria una verifica manuale. La registrazione del subentro non attiva da sola l'accesso.</p>
            <div className="form-actions">
              <button className="secondary-button" type="button" disabled={transferSaving} onClick={() => setTransferOpen(false)}>Annulla</button>
              <button className="primary-button" type="submit" disabled={transferSaving || typeof onTransferMember !== "function"}>{transferSaving ? "Registrazione..." : "Conferma subentro"}</button>
            </div>
          </form>
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

              {d.aiDocumentType === "Fattura" && d.extractedData && (
                <div className="ai-summary">
                  <b>Proposta fattura AI</b>
                  {(() => {
                    try {
                      const invoice = JSON.parse(d.extractedData);
                      const invoiceAmount = Number(String(invoice.expenseAmount ?? invoice.amount ?? invoice.totalAmount ?? "").replace(/[^0-9,.-]/g, "").replace(",", "."));
                      return (
                        <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                          <span><strong>Fornitore:</strong> {invoice.supplier || "non riconosciuto"}</span>
                          <span><strong>N. fattura:</strong> {invoice.invoiceNumber || invoice.numeroFattura || "non rilevato"}</span>
                          <span><strong>Data:</strong> {invoice.documentDate || invoice.invoiceDate || "non rilevata"}</span>
                          <span><strong>Importo:</strong> {Number.isFinite(invoiceAmount) && invoiceAmount > 0 ? currency(String(invoiceAmount)) : "non rilevato"}</span>
                          {invoice.workReference && <span><strong>Riferimento lavoro:</strong> {invoice.workReference}</span>}
                          {Array.isArray(invoice.warnings) && invoice.warnings.length > 0 && (
                            <small>⚠️ {invoice.warnings.join(" · ")}</small>
                          )}
                          <small>La registrazione contabile e l'eventuale collegamento al lavoro vengono eseguiti solo dopo la conferma dell'amministratore.</small>
                        </div>
                      );
                    } catch {
                      return <small>Dati AI della fattura non leggibili: è necessaria una nuova analisi.</small>;
                    }
                  })()}
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
   LAVORI E MANUTENZIONI
   ========================================================= */
function CondominiumWorksPage({ works, search, setSearch, onNew, onEdit, onDelete, onProgress, onNewProgress, onReconcile, condominiumName, suppliers, activities, isAdministrator = false }: any) {
  const [statusFilter, setStatusFilter] = useState("Tutti");
  const filtered = works.filter((w: CondominiumWork) => { const supplier = suppliers.find((s: Supplier) => s.id === w.supplierId); const text = [w.title,w.category,w.description,w.status,w.priority,condominiumName(w.condominiumId),supplier?.name || ""].join(" ").toLowerCase(); return text.includes(search.toLowerCase()) && (statusFilter === "Tutti" || w.status === statusFilter); });
  const active = works.filter((w: CondominiumWork) => !["Completato","Annullato"].includes(w.status));
  const inProgress = works.filter((w: CondominiumWork) => w.status === "In corso").length;
  const completed = works.filter((w: CondominiumWork) => w.status === "Completato").length;
  const totalActual = works.reduce((sum: number,w: CondominiumWork)=>sum+(Number(w.actualAmount)||0),0);
  return <><PageHeader eyebrow="Gestione tecnica" title="Lavori e manutenzioni" action={isAdministrator ? "+ Nuovo lavoro" : undefined} onAction={isAdministrator ? onNew : undefined}/><SearchBox value={search} onChange={setSearch} placeholder="Cerca lavoro, fornitore, condominio o stato..."/><div className="quick-stats"><div className="quick-stat"><b>{works.length}</b><span>Lavori</span></div><div className="quick-stat"><b>{active.length}</b><span>In gestione</span></div><div className="quick-stat"><b>{inProgress}</b><span>In corso</span></div><div className="quick-stat"><b>{completed}</b><span>Completati</span></div><div className="quick-stat"><b>€ {totalActual.toLocaleString("it-IT",{minimumFractionDigits:2})}</b><span>Consuntivo</span></div></div><div className="filter-bar"><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Tutti</option><option>Da programmare</option><option>Preventivo richiesto</option><option>Approvato</option><option>In corso</option><option>Sospeso</option><option>Completato</option><option>Annullato</option></select></div><div className="cards-list">{filtered.map((w: CondominiumWork)=>{const supplier=suppliers.find((s:Supplier)=>s.id===w.supplierId);const activity=activities.find((a:Activity)=>a.id===w.activityId);return <article className="row-card" key={w.id}><div style={{minWidth:0,flex:1}}><b>{w.title}</b><small>{condominiumName(w.condominiumId)} · {w.category}{supplier ? " · "+supplier.name : ""}</small><span><Badge value={w.priority}/> <strong>{w.status}</strong> · Avanzamento {w.progressPercent}%</span><div style={{marginTop:10,height:7,borderRadius:99,background:"#e8edf5",overflow:"hidden"}}><div style={{width:w.progressPercent+"%",height:"100%",background:"currentColor",opacity:.7}}/></div><small style={{display:"block",marginTop:8}}>Documenti: {w.documentIds.length} · Attività: {activity?.title || "nessuna"} · Preventivo € {Number(w.estimatedAmount||0).toLocaleString("it-IT",{minimumFractionDigits:2})} · Consuntivo € {Number(w.actualAmount||0).toLocaleString("it-IT",{minimumFractionDigits:2})}</small></div>{isAdministrator&&<div className="row-actions"><select value={w.progressPercent} onChange={e=>onProgress(w.id,Number(e.target.value))}><option value={0}>0%</option><option value={25}>25%</option><option value={50}>50%</option><option value={75}>75%</option><option value={100}>100%</option></select><button className="secondary-button small" onClick={()=>onNewProgress(w)}>+ SAL</button><button className="secondary-button small" onClick={()=>onReconcile(w)}>Riconcilia</button><button className="secondary-button small" onClick={()=>onEdit(w)}>Dettagli</button><button className="mini-danger" onClick={()=>onDelete(w.id)}>×</button></div>}</article>;})}{filtered.length===0&&<Empty text="Nessun lavoro o intervento trovato."/>}</div></>;
}

function WorkProgressForm({ value, setValue, onSubmit, onSubmitAccounting, onCancel }: any) {
  const set=(key:keyof WorkProgress,next:any)=>setValue((current:WorkProgress)=>({...current,[key]:next}));
  return <form onSubmit={onSubmit}><div className="modal-header"><div><div className="eyebrow">Avanzamento lavori</div><h2>Nuovo stato di avanzamento</h2></div><button type="button" className="modal-close" onClick={onCancel}>×</button></div><div className="form-grid"><InputField label="N. SAL" type="number" value={String(value.progressNo)} onChange={(v:string)=>set("progressNo",Math.max(1,Number(v)||1))}/><InputField label="Data" type="date" value={value.progressDate} onChange={(v:string)=>set("progressDate",v)}/><InputField label="Titolo" value={value.title} onChange={(v:string)=>set("title",v)} placeholder="SAL 1"/><InputField label="Avanzamento %" type="number" value={String(value.percentage)} onChange={(v:string)=>set("percentage",Math.max(0,Math.min(100,Number(v)||0)))}/><InputField label="Importo SAL" type="number" value={String(value.amount||"")} onChange={(v:string)=>set("amount",Math.max(0,Number(v)||0))} placeholder="0,00"/><InputField label="Importo pagato" type="number" value={String(value.paidAmount||"")} onChange={(v:string)=>set("paidAmount",Math.max(0,Number(v)||0))} placeholder="0,00"/><InputField label="Stato" value={value.status} onChange={(v:string)=>set("status",v)} placeholder="In corso / Completato"/></div><TextAreaField label="Note" value={value.notes} onChange={(v:string)=>set("notes",v)} placeholder="Lavorazioni eseguite, certificazioni, fatture..."/><div className="button-row"><button type="button" className="secondary-button" onClick={onCancel}>Annulla</button><button type="submit" className="secondary-button">Salva solo SAL</button><button type="button" className="primary-button" onClick={onSubmitAccounting}>Salva + Contabilità</button></div></form>;
}

function CondominiumWorkForm({ value, setValue, condominiums, suppliers, activities, documents, onSubmit, onCancel, editing }: any) {
  const availableDocuments = documents.filter((d: DocumentItem)=>d.condominiumId===value.condominiumId);
  const availableActivities = activities.filter((a: Activity)=>a.condominiumId===value.condominiumId);
  const set=(key:keyof CondominiumWork,next:any)=>setValue((current:CondominiumWork)=>({...current,[key]:next}));
  const toggleDocument=(id:number)=>setValue((current:CondominiumWork)=>({...current,documentIds:current.documentIds.includes(id)?current.documentIds.filter(x=>x!==id):[...current.documentIds,id]}));
  return <form onSubmit={onSubmit}><div className="modal-header"><div><div className="eyebrow">Gestione tecnica</div><h2>{editing?"Modifica lavoro":"Nuovo lavoro / manutenzione"}</h2></div><button type="button" className="modal-close" onClick={onCancel}>×</button></div><div className="form-grid"><SelectField label="Condominio" value={String(value.condominiumId)} onChange={(v:string)=>set("condominiumId",Number(v))} options={condominiums.map((c:Condominium)=>[String(c.id),c.name])}/><InputField label="Titolo intervento" value={value.title} onChange={(v:string)=>set("title",v)} placeholder="Es. Rifacimento facciata"/><InputField label="Categoria" value={value.category} onChange={(v:string)=>set("category",v)} placeholder="Manutenzione, edilizia, impianti..."/><SelectField label="Priorità" value={value.priority} onChange={(v:string)=>set("priority",v)} options={[["Bassa","Bassa"],["Media","Media"],["Alta","Alta"]]}/><SelectField label="Stato" value={value.status} onChange={(v:string)=>set("status",v)} options={[["Da programmare","Da programmare"],["Preventivo richiesto","Preventivo richiesto"],["Approvato","Approvato"],["In corso","In corso"],["Sospeso","Sospeso"],["Completato","Completato"],["Annullato","Annullato"]]}/><SelectField label="Fornitore" value={value.supplierId?String(value.supplierId):""} onChange={(v:string)=>set("supplierId",v?Number(v):null)} options={[["","Nessun fornitore"],...suppliers.filter((s:Supplier)=>!s.condominiumId||s.condominiumId===value.condominiumId).map((s:Supplier)=>[String(s.id),s.name])]}/><SelectField label="Attività collegata" value={value.activityId?String(value.activityId):""} onChange={(v:string)=>set("activityId",v?Number(v):null)} options={[["","Nessuna attività"],...availableActivities.map((a:Activity)=>[String(a.id),a.title])]}/><InputField label="Data inizio" type="date" value={value.startDate} onChange={(v:string)=>set("startDate",v)}/><InputField label="Fine prevista" type="date" value={value.expectedEndDate} onChange={(v:string)=>set("expectedEndDate",v)}/><InputField label="Fine effettiva" type="date" value={value.actualEndDate} onChange={(v:string)=>set("actualEndDate",v)}/><InputField label="Importo stimato" type="number" value={String(value.estimatedAmount||"")} onChange={(v:string)=>set("estimatedAmount",Number(v)||0)} placeholder="0,00"/><InputField label="Importo approvato" type="number" value={String(value.approvedAmount||"")} onChange={(v:string)=>set("approvedAmount",Number(v)||0)} placeholder="0,00"/><InputField label="Consuntivo" type="number" value={String(value.actualAmount||"")} onChange={(v:string)=>set("actualAmount",Number(v)||0)} placeholder="0,00"/><InputField label="Avanzamento %" type="number" value={String(value.progressPercent)} onChange={(v:string)=>set("progressPercent",Math.max(0,Math.min(100,Number(v)||0)))} placeholder="0-100"/></div><TextAreaField label="Descrizione" value={value.description} onChange={(v:string)=>set("description",v)} placeholder="Descrivi l'intervento..."/><TextAreaField label="Note" value={value.notes} onChange={(v:string)=>set("notes",v)} placeholder="Note operative, economiche o contabili..."/><div className="form-section"><div className="detail-label">Documenti collegati</div>{availableDocuments.length?<div className="checkbox-list">{availableDocuments.map((d:DocumentItem)=><label key={d.id} className="checkbox-row"><input type="checkbox" checked={value.documentIds.includes(d.id)} onChange={()=>toggleDocument(d.id)}/><span>{d.name}</span></label>)}</div>:<small>Nessun documento disponibile per questo condominio.</small>}</div><div className="button-row"><button type="button" className="secondary-button" onClick={onCancel}>Annulla</button><button type="submit" className="primary-button">{editing?"Salva modifiche":"Crea lavoro"}</button></div></form>;
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


function SecuritySettingsCard() {
  const [codeEnabled, setCodeEnabled] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshSecurity = async () => {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const { data } = await supabase.from("user_security_settings").select("personal_code_enabled").eq("user_id", userId).maybeSingle();
    setCodeEnabled(Boolean(data?.personal_code_enabled));
    const { data: factors } = await supabase.auth.mfa.listFactors();
    setMfaFactors([...(factors?.totp ?? []), ...(factors?.phone ?? [])].filter((factor: any) => factor.status === "verified"));
  };

  useEffect(() => { void refreshSecurity(); }, []);

  const configureCode = async () => {
    if (!supabase) return;
    const code = window.prompt("Imposta un codice personale di sicurezza (almeno 6 caratteri):");
    if (!code) return;
    if (code.trim().length < 6) { alert("Il codice personale deve contenere almeno 6 caratteri."); return; }
    const confirmation = window.prompt("Ripeti il codice personale:");
    if (code !== confirmation) { alert("I due codici non coincidono."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.rpc("set_personal_security_code", { p_code: code, p_enabled: true });
      if (error) throw error;
      setCodeEnabled(true);
      alert("Codice personale attivato. Verrà richiesto prima delle operazioni irreversibili protette.");
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile attivare il codice personale."); }
    finally { setLoading(false); }
  };

  const disableCode = async () => {
    if (!supabase) return;
    const code = window.prompt("Inserisci il codice personale attuale per disattivarlo:");
    if (!code) return;
    setLoading(true);
    try {
      const { data: valid, error: verifyError } = await supabase.rpc("verify_personal_security_code", { p_code: code });
      if (verifyError) throw verifyError;
      if (!valid) { alert("Codice personale non valido."); return; }
      const { error } = await supabase.rpc("set_personal_security_code", { p_code: null, p_enabled: false });
      if (error) throw error;
      setCodeEnabled(false);
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile disattivare il codice personale."); }
    finally { setLoading(false); }
  };

  const startMfaEnrollment = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "BETHAG Authenticator" });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp?.qr_code ?? "");
      setEnrolling(true);
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile attivare la verifica a due fattori."); }
    finally { setLoading(false); }
  };

  const verifyMfaEnrollment = async () => {
    if (!supabase || !factorId || !verificationCode.trim()) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verificationCode.trim() });
      if (error) throw error;
      setEnrolling(false); setQrCode(""); setVerificationCode("");
      await refreshSecurity();
      alert("Autenticazione a due fattori attivata. Dal prossimo accesso BETHAG proporrà il secondo fattore, ma potrai scegliere di accedere senza utilizzarlo.");
    } catch (error) { alert(error instanceof Error ? error.message : "Codice MFA non valido."); }
    finally { setLoading(false); }
  };

  const disableMfa = async (factor: any) => {
    if (!supabase) return;
    const code = window.prompt("Inserisci il codice del secondo fattore per confermare la disattivazione:");
    if (!code) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: code.trim() });
      if (verifyError) throw verifyError;
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await refreshSecurity();
    } catch (error) { alert(error instanceof Error ? error.message : "Impossibile disattivare il secondo fattore."); }
    finally { setLoading(false); }
  };

  return <section className="card" style={{marginBottom:18}}>
    <span className="eyebrow">Sicurezza dell'account</span>
    <h2>Protezione opzionale</h2>
    <p className="section-subtitle">Entrambe le protezioni sono facoltative. Se le abiliti, BETHAG le utilizzerà senza modificare l'accesso degli utenti che scelgono di non attivarle.</p>
    <div className="workspace-grid">
      <div className="info-card">
        <b>🔢 Codice personale</b>
        <p>{codeEnabled ? "Attivo: viene richiesto solo per le operazioni ad alta sicurezza protette. Puoi disattivarlo in qualsiasi momento." : "Disattivato: nessun codice personale aggiuntivo viene richiesto. L'attivazione è facoltativa."}</p>
        <button className={codeEnabled ? "danger-button" : "secondary-button"} type="button" disabled={loading} onClick={() => void (codeEnabled ? disableCode() : configureCode())}>{codeEnabled ? "Disattiva codice" : "Attiva codice"}</button>
      </div>
      <div className="info-card">
        <b>🛡️ Autenticazione a due fattori</b>
        <p>{mfaFactors.length ? "Attiva: al login BETHAG proporrà il secondo fattore, ma potrai scegliere di accedere senza utilizzarlo. Puoi disattivarlo in qualsiasi momento." : "Disattivata: il login continua con e-mail e password. L'attivazione della 2FA è facoltativa."}</p>
        {!mfaFactors.length && <button className="secondary-button" type="button" disabled={loading} onClick={() => void startMfaEnrollment()}>Attiva 2FA</button>}
        {mfaFactors.map((factor) => <div key={factor.id} style={{marginTop:10}}><span>{factor.factor_type === "totp" ? "Authenticator TOTP" : "Telefono"}</span> <button className="danger-button" type="button" disabled={loading} onClick={() => void disableMfa(factor)}>Disattiva</button></div>)}
      </div>
    </div>
    {enrolling && <div className="form-card" style={{marginTop:16}}>
      <h3>Configura Authenticator</h3>
      <p>Scansiona il QR code con un'app autenticatrice e inserisci il codice generato per confermare.</p>
      {qrCode && <img src={qrCode} alt="QR code per autenticazione a due fattori" style={{width:220,height:220,maxWidth:"100%"}} />}
      <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} inputMode="numeric" placeholder="Codice a 6 cifre" />
      <div className="form-actions"><button className="primary-button" type="button" disabled={loading} onClick={() => void verifyMfaEnrollment()}>Conferma 2FA</button><button className="secondary-button" type="button" onClick={() => { setEnrolling(false); setQrCode(""); setFactorId(""); }}>Annulla</button></div>
    </div>}
  </section>;
}

function DeleteAccountCard() {
  const [loading, setLoading] = useState(false);

  const deleteAccount = async () => {
    if (!supabase) {
      alert("Servizio account non disponibile.");
      return;
    }

    const confirmation = window.prompt(
      'Questa operazione è irreversibile. Digita esattamente "ELIMINA" per confermare la cancellazione definitiva del profilo.'
    );
    if (confirmation !== "ELIMINA") {
      if (confirmation !== null) alert("Cancellazione annullata: la conferma non è corretta.");
      return;
    }

    let securityCode: string | undefined;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessione BETHAG non disponibile.");

      const { data: security, error: securityError } = await supabase
        .from("user_security_settings")
        .select("personal_code_enabled")
        .eq("user_id", userId)
        .maybeSingle();

      if (securityError) throw securityError;

      if (security?.personal_code_enabled) {
        securityCode = window.prompt("Inserisci il codice personale di sicurezza per confermare la cancellazione definitiva:");
        if (!securityCode) return;
      }

      setLoading(true);
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { confirmation: "ELIMINA", securityCode },
      });

      if (error) {
        let message = error.message || "Impossibile eliminare il profilo.";
        try {
          if (error.context) {
            const payload = await error.context.json();
            if (payload?.error) message = payload.error;
          }
        } catch {
          // Mantieni il messaggio originale della funzione.
        }
        throw new Error(message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Impossibile completare la cancellazione del profilo.");
      }

      await supabase.auth.signOut({ scope: "local" });
      localStorage.clear();
      sessionStorage.clear();
      alert("Profilo eliminato definitivamente. I dati del workspace restano conservati se la gestione è stata trasferita a un altro amministratore.");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossibile eliminare il profilo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ marginBottom: 18, borderColor: "#fecaca", background: "#fffafa" }}>
      <span className="eyebrow" style={{ color: "#b42318" }}>Zona irreversibile</span>
      <h2>Elimina profilo</h2>
      <p className="section-subtitle">
        Elimina definitivamente il tuo account BETHAG. I condomini e i dati del workspace non vengono cancellati automaticamente.
        Se sei l'unico amministratore di un workspace, prima dovrai trasferire la gestione a un altro amministratore.
      </p>
      <button className="danger-button" type="button" onClick={() => void deleteAccount()} disabled={loading}>
        {loading ? "Eliminazione in corso…" : "Elimina definitivamente il mio profilo"}
      </button>
    </section>
  );
}


function ProfilePage({
  profile,
  setProfile,
  subscription,
  portalMembers,
  isAdministrator = false,
  onExportBackup,
  onRestoreBackup,
  onLogout,
}: any) {
  const [saved, setSaved] =
    useState(false);

  const save = async (
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

    try {
      if (supabaseConfigured && supabase) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData.user) throw new Error("Sessione BETHAG non disponibile.");

        const currentAuthEmail = (userData.user.email || "").trim().toLowerCase();
        const profileEmail = (profile.email || "").trim().toLowerCase();

        if (profileEmail && profileEmail !== currentAuthEmail) {
          throw new Error("Per modificare l'e-mail di accesso utilizza la procedura dedicata di Supabase Auth, che richiede la verifica del nuovo indirizzo. Il resto del profilo può essere salvato normalmente.");
        }

        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: profile.name || "",
            company: profile.company || "",
            phone: profile.phone || "",
            address: profile.address || "",
            fiscal_code: profile.fiscalCode || "",
            vat: profile.vat || "",
          },
        });
        if (error) throw error;
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossibile salvare il profilo.");
    }
  };

  return (
    <>

      <PageHeader
        eyebrow="Impostazioni"
        title="Amministratore"
      />

      <section className="card" style={{ marginBottom: 18 }}>
        <span className="eyebrow">Profilo e accesso</span>
        <h2>Gestione dell'accesso</h2>
        <p className="section-subtitle">
          Da questa sezione puoi uscire da BETHAG in qualsiasi momento. La verifica a due fattori e il codice personale di sicurezza sono funzionalità opzionali: restano disattivati finché non vengono attivati dall'utente.
        </p>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={() => onLogout?.()}>
            Esci da BETHAG
          </button>
        </div>
      </section>


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


      <SecuritySettingsCard />
      <DeleteAccountCard />

      <section className="card" style={{marginBottom:18}}>
        <span className="eyebrow">Sicurezza e continuità operativa</span>
        <h2>Backup dei dati</h2>
        <p className="section-subtitle">
          Esporta una copia locale dei dati disponibili nel workspace. Il file non contiene credenziali di accesso.
        </p>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={() => onExportBackup?.()}>
            Esporta backup JSON
          </button>
          <label className="secondary-button" style={{cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
            Ripristina backup JSON
            <input
              type="file"
              accept=".json,application/json"
              style={{display:"none"}}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = "";
                if (file) void onRestoreBackup?.(file);
              }}
            />
          </label>
        </div>
        <small className="muted-text" style={{display:"block",marginTop:10}}>
          Il ripristino aggiorna i dati presenti nel backup senza eliminare i dati più recenti che non compaiono nel file.
        </small>
      </section>

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
   FORM UNITÀ IMMOBILIARE
   ========================================================= */

function CondominiumUnitForm({ value, setValue, units = [], members = [], onSubmit, onCancel, editing }: any) {
  const set = (key: keyof CondominiumUnit, val: any) => setValue({ ...value, [key]: val });
  const residentialUnits = units.filter((u: CondominiumUnit) => u.unitType === "Abitazione" && u.id !== value.id);
  const externalOwners: ExternalUnitOwner[] = Array.isArray(value.externalOwners) ? value.externalOwners : [];
  const ownerMemberIds: number[] = Array.isArray(value.ownerMemberIds) ? value.ownerMemberIds : [];

  const syncOwnerMode = (nextMemberIds: number[], nextExternalOwners: ExternalUnitOwner[]) => {
    setValue({
      ...value,
      ownerMemberIds: nextMemberIds,
      externalOwners: nextExternalOwners,
      ownerMode: nextMemberIds.length && nextExternalOwners.length ? "mixed" : nextExternalOwners.length ? "external" : "condominium_member",
    });
  };

  const toggleMemberOwner = (memberId: number) => {
    const next = ownerMemberIds.includes(memberId)
      ? ownerMemberIds.filter((id) => id !== memberId)
      : [...ownerMemberIds, memberId];
    syncOwnerMode(next, externalOwners);
  };

  const addExternalOwner = () => {
    const owner: ExternalUnitOwner = { id: "owner-" + makeId(), firstName: "", lastName: "", fiscalCode: "", email: "", phone: "", ownershipShare: "", notes: "" };
    syncOwnerMode(ownerMemberIds, [...externalOwners, owner]);
  };

  const updateExternalOwner = (id: string, patch: Partial<ExternalUnitOwner>) => {
    syncOwnerMode(ownerMemberIds, externalOwners.map((owner) => owner.id === id ? { ...owner, ...patch } : owner));
  };

  const removeExternalOwner = (id: string) => {
    syncOwnerMode(ownerMemberIds, externalOwners.filter((owner) => owner.id !== id));
  };

  return (
    <form onSubmit={onSubmit}>
      <ModalTitle title={editing ? "Modifica unità immobiliare" : "Nuova unità immobiliare"} />
      <div className="form-grid">
        <Field full label="Codice / identificativo *" value={value.unitCode} onChange={(v: string) => set("unitCode", v)} placeholder="Es. Interno 1, Garage G1, Cantina C1" /> 
        <Field label="Fabbricato / civico" value={value.buildingCode ?? ""} onChange={(v: string) => set("buildingCode", v)} placeholder="Es. 8, 10, 12" />
        <SelectField label="Tipologia" value={value.unitType} onChange={(v: string) => set("unitType", v)} options={[
          ["Abitazione","Abitazione"],["Garage","Garage / autorimessa"],["Cantina","Cantina / deposito"],["Posto auto","Posto auto"],["Altro","Altra unità"],
        ]} />
        <Field label="Categoria catastale" value={value.cadastralCategory} onChange={(v: string) => set("cadastralCategory", v)} placeholder="Es. A/2, C/2, C/6" />
        <Field label="Millesimi" value={value.millesimi} onChange={(v: string) => set("millesimi", v)} placeholder="Es. 102,35" />

        <div className="field full">
          <label className="switch-row">
            <input type="checkbox" checked={value.cadastralAutonomous} onChange={(e) => {
              const autonomous = e.target.checked;
              setValue({
                ...value,
                cadastralAutonomous: autonomous,
                relationshipToResidentialUnit: autonomous ? (value.incorporatedInUnitId ? "Pertinenza" : "Nessuna") : "Incorporata",
                ownerMode: autonomous ? (value.ownerMode === "inherited" ? "condominium_member" : value.ownerMode) : "inherited",
              });
            }} />
            <span>Unità catastalmente autonoma</span>
          </label>
          <div className="form-help">Una pertinenza autonoma può essere collegata facoltativamente a un'unità abitativa oppure rimanere autonoma. Se è catastalmente appartenente a un interno, invece, segue quell'unità e non ha millesimi propri.</div>
        </div>

        {value.cadastralAutonomous && value.unitType !== "Abitazione" && (
          <SelectField full label="Collegamento con unità abitativa (facoltativo)" value={value.incorporatedInUnitId || ""} onChange={(v: string) => set("incorporatedInUnitId", v)} options={[
            ["","Nessun collegamento: unità autonoma indipendente"], ...residentialUnits.map((u: CondominiumUnit) => [u.id, u.unitCode]),
          ]} />
        )}

        {!value.cadastralAutonomous && (
          <SelectField full label="Unità abitativa incorporante" value={value.incorporatedInUnitId || ""} onChange={(v: string) => set("incorporatedInUnitId", v)} options={[
            ["","Seleziona l'abitazione"], ...residentialUnits.map((u: CondominiumUnit) => [u.id, u.unitCode]),
          ]} />
        )}

        {value.cadastralAutonomous && (
          <div className="field full">
            <label>Proprietari dell'unità</label>
            <div className="form-help">Il proprietario può essere un condòmino, un soggetto esterno al condominio oppure più soggetti insieme. Non è necessario collegare garage o cantine a un'abitazione.</div>
            {members.length > 0 && <div className="permission-checks" style={{ marginTop: 10 }}>
              {members.map((member: CondominiumMember) => (
                <label className="permission-check" key={member.id}>
                  <input type="checkbox" checked={ownerMemberIds.includes(member.id)} onChange={() => toggleMemberOwner(member.id)} />
                  <span>{member.firstName} {member.lastName}<small style={{ display: "block", opacity: .7 }}>{member.apartment || "Unità non indicata"}</small></span>
                </label>
              ))}
            </div>}
            {externalOwners.map((owner) => (
              <div key={owner.id} className="form-grid" style={{ marginTop: 12, padding: 14, border: "1px solid #e2e8f0", borderRadius: 12 }}>
                <Field label="Nome" value={owner.firstName} onChange={(v: string) => updateExternalOwner(owner.id, { firstName: v })} />
                <Field label="Cognome / denominazione" value={owner.lastName} onChange={(v: string) => updateExternalOwner(owner.id, { lastName: v })} />
                <Field label="Codice fiscale / P.IVA" value={owner.fiscalCode} onChange={(v: string) => updateExternalOwner(owner.id, { fiscalCode: v })} />
                <Field label="Email" value={owner.email} onChange={(v: string) => updateExternalOwner(owner.id, { email: v })} />
                <Field label="Telefono" value={owner.phone} onChange={(v: string) => updateExternalOwner(owner.id, { phone: v })} />
                <Field label="Quota di proprietà" value={owner.ownershipShare} onChange={(v: string) => updateExternalOwner(owner.id, { ownershipShare: v })} placeholder="Es. 50%" />
                <Field full label="Note" value={owner.notes} onChange={(v: string) => updateExternalOwner(owner.id, { notes: v })} />
                <button type="button" className="danger-button small" onClick={() => removeExternalOwner(owner.id)}>Rimuovi proprietario esterno</button>
              </div>
            ))}
            <button type="button" className="secondary-button small" style={{ marginTop: 12 }} onClick={addExternalOwner}>+ Aggiungi proprietario esterno</button>
          </div>
        )}

        {!value.cadastralAutonomous && <div className="field full"><div className="form-help">La proprietà della pertinenza incorporata non viene duplicata: BETHAG considera come riferimento l'unità abitativa incorporante.</div></div>}
        <Field full label="Note catastali / gestionali" value={value.notes} onChange={(v: string) => set("notes", v)} textarea placeholder="Annotazioni, riferimento catastale, vincoli pertinenziali, ecc." />
      </div>
      <Actions onCancel={onCancel} />
    </form>
  );
}

/* =========================================================
   FORM CONDOMINIO
   ========================================================= */

function CondominiumAiCreationForm({
  draft, files, processing, largeFiles, onFiles, onLargeFileDecision, onConfirm, onCancel,
}: {
  draft: CondominiumCreationDraft | null;
  files: string[];
  processing: boolean;
  largeFiles: File[];
  onFiles: (files: FileList | null) => void;
  onLargeFileDecision: (mode: "both" | "analysis" | "storage") => void;
  onConfirm: (draft: CondominiumCreationDraft, automatic?: boolean) => void;
  onCancel: () => void;
}) {
  const [edited, setEdited] = useState<CondominiumCreationDraft>(draft ?? {
    sourceDocuments: [], warnings: [],
    structure: { configured: false, civics: [], autonomous: { garages: 0, cantine: 0, postiAuto: 0, altre: 0 } },
  });
  useEffect(() => { if (draft) setEdited(draft); }, [draft]);
  return (
    <div>
      <ModalTitle title="Nuovo condominio con AI" />
      <p className="form-help">Carica i documenti disponibili. BETHAG prepara una proposta; nessun dato definitivo viene creato prima della conferma dell'amministratore.</p>
      <div className="field full">
        <label>Documenti</label>
        <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt,image/*" onChange={(e) => onFiles(e.target.files)} />
        {files.length > 0 && <small>{files.join(" · ")}</small>}
      </div>
      {largeFiles.length > 0 && !processing && (
        <div className="request-card" style={{ marginTop: 12 }}>
          <div className="request-main">
            <strong>Documento di grandi dimensioni</strong>
            <p>
              {largeFiles.map((file) => file.name + " (" + (file.size / 1024 / 1024).toFixed(1) + " MB)").join(" · ")}
            </p>
            <small>
              Il file non viene bloccato. Puoi conservarlo, analizzarlo senza conservarlo,
              oppure fare entrambe le operazioni.
            </small>
            <div className="form-actions" style={{ marginTop: 10 }}>
              <button type="button" className="secondary-button" onClick={() => onLargeFileDecision("storage")}>Memorizza soltanto</button>
              <button type="button" className="secondary-button" onClick={() => onLargeFileDecision("analysis")}>Analizza senza memorizzare</button>
              <button type="button" className="primary-button" onClick={() => onLargeFileDecision("both")}>Memorizza e analizza</button>
            </div>
          </div>
        </div>
      )}
      {processing && <div className="login-success">Elaborazione documentale in corso…</div>}
      {draft && !processing && <>
        <div className="form-grid">
          <Field full label="Nome condominio" value={edited.name ?? ""} onChange={(v: string) => setEdited({ ...edited, name: v })} />
          <Field full label="Indirizzo" value={edited.address ?? ""} onChange={(v: string) => setEdited({ ...edited, address: v })} />
          <Field label="CAP" value={edited.cap ?? ""} onChange={(v: string) => setEdited({ ...edited, cap: v })} />
          <Field label="Comune" value={edited.city ?? ""} onChange={(v: string) => setEdited({ ...edited, city: v })} />
          <Field label="Provincia" value={edited.province ?? ""} onChange={(v: string) => setEdited({ ...edited, province: v })} />
          <Field label="Codice fiscale" value={edited.fiscalCode ?? ""} onChange={(v: string) => setEdited({ ...edited, fiscalCode: v })} />
          <div className="field full">
            <label>Struttura e unità</label>
            <div className="form-help">Il numero delle unità viene ricavato automaticamente dalla struttura fisica del condominio.</div>
          </div>
        </div>
        {edited.unitRecords && edited.unitRecords.length > 0 && (
          <div className="field full">
            <label>Unità, proprietari e millesimi rilevati dall'AI</label>
            <div className="related-list">
              {edited.unitRecords.map((unit, index) => (
                <div className="request-card" key={unit.unitCode + "-" + index}>
                  <div className="request-main">
                    <b>{unit.unitCode}</b>
                    <span>{unit.unitType} · {unit.millesimi ? unit.millesimi + " millesimi" : "Millesimi non rilevati"}</span>
                    <small>{[unit.civicCode, unit.buildingCode, unit.staircaseCode, unit.interior ? "Interno " + unit.interior : ""].filter(Boolean).join(" · ")}</small>
                    <p>{unit.owners.length ? <><strong>{unit.owners.length}</strong> proprietari rilevati: {unit.owners.map((owner) => (owner.firstName + " " + owner.lastName).trim()).filter(Boolean).join(", ")}</> : "Nessun proprietario rilevato"}</p>
                  </div>
                  <span className="badge">{Math.round((unit.confidence ?? edited.confidence ?? 0) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="help-detail"><strong>Verifica obbligatoria dell'amministratore</strong><p>Proprietari e millesimi possono essere acquisiti automaticamente dai documenti, ma restano dati proposti dall'AI: nessun dato viene reso definitivo senza la conferma dell'amministratore.</p>{edited.warnings.map((w) => <div className="form-help" key={w}>• {w}</div>)}</div>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Annulla</button>
          <button type="button" className="secondary-button" onClick={() => onConfirm(edited, false)}>Conferma e modifica manualmente</button>
          <button type="button" className="primary-button" onClick={() => onConfirm(edited, true)}>Conferma e crea automaticamente</button>
        </div>
      </>}
    </div>
  );
}

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

  const structure: CondominiumStructure = value.structure ?? {
    configured: false,
    civics: [],
    autonomous: { garages: 0, cantine: 0, postiAuto: 0, altre: 0 },
  };

  const makeStructureId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

  const updateStructure = (next: CondominiumStructure) => {
    const totalInteriors = next.civics.reduce(
      (total, civic) => total + civic.buildings.reduce(
        (buildingTotal, building) => buildingTotal + building.scales.reduce((scaleTotal, scale) => scaleTotal + Math.max(0, Number(scale.interiors) || 0), 0),
        0
      ),
      0
    );
    const autonomous = next.autonomous;
    const autonomousTotal =
      Math.max(0, Number(autonomous.garages) || 0) +
      Math.max(0, Number(autonomous.cantine) || 0) +
      Math.max(0, Number(autonomous.postiAuto) || 0) +
      Math.max(0, Number(autonomous.altre) || 0);
    onChange({ ...value, structure: next, units: String(totalInteriors + autonomousTotal) });
  };

  const setCivicCount = (count: number) => {
    const safe = Math.max(0, Math.min(100, Math.floor(count || 0)));
    const civics = Array.from({ length: safe }, (_, index) =>
      structure.civics[index] ?? {
        id: makeStructureId("civico", index),
        label: `Civico ${index + 1}`,
        buildings: [{
          id: `civico-${index + 1}-palazzina-1`,
          label: "Palazzina A",
          scales: [{ id: `civico-${index + 1}-palazzina-1-scala-1`, label: "Scala A", interiors: 0 }],
        }],
      }
    );
    updateStructure({ ...structure, configured: safe > 0, civics });
  };

  const setBuildingCount = (civicIndex: number, count: number) => {
    const safe = Math.max(1, Math.min(100, Math.floor(count || 1)));
    const civic = structure.civics[civicIndex];
    if (!civic) return;
    const buildings = Array.from({ length: safe }, (_, index) =>
      civic.buildings[index] ?? {
        id: `${civic.id}-palazzina-${index + 1}`,
        label: `Palazzina ${String.fromCharCode(65 + index)}`,
        scales: [{ id: `${civic.id}-palazzina-${index + 1}-scala-1`, label: "Scala A", interiors: 0 }],
      }
    );
    const civics = structure.civics.map((item, index) => index === civicIndex ? { ...item, buildings } : item);
    updateStructure({ ...structure, civics });
  };

  const setScaleCount = (civicIndex: number, buildingIndex: number, count: number) => {
    const safe = Math.max(1, Math.min(100, Math.floor(count || 1)));
    const civic = structure.civics[civicIndex];
    const building = civic?.buildings[buildingIndex];
    if (!building) return;
    const scales = Array.from({ length: safe }, (_, index) =>
      building.scales[index] ?? {
        id: `${building.id}-scala-${index + 1}`,
        label: `Scala ${String.fromCharCode(65 + index)}`,
        interiors: 0,
      }
    );
    const civics = structure.civics.map((item, ci) => ci !== civicIndex ? item : {
      ...item,
      buildings: item.buildings.map((b, bi) => bi === buildingIndex ? { ...b, scales } : b),
    });
    updateStructure({ ...structure, civics });
  };

  const setInteriorCount = (civicIndex: number, buildingIndex: number, scaleIndex: number, count: number) => {
    const civics = structure.civics.map((item, ci) => ci !== civicIndex ? item : {
      ...item,
      buildings: item.buildings.map((building, bi) => bi !== buildingIndex ? building : {
        ...building,
        scales: building.scales.map((scale, si) => si === scaleIndex ? { ...scale, interiors: Math.max(0, Math.min(999, Math.floor(count || 0))) } : scale),
      }),
    });
    updateStructure({ ...structure, civics });
  };

  const setAutonomous = (key: keyof CondominiumStructure["autonomous"], count: number) =>
    updateStructure({
      ...structure,
      autonomous: { ...structure.autonomous, [key]: Math.max(0, Math.min(9999, Math.floor(count || 0))) },
    });

  const capLookupRef = useRef(0);
  useEffect(() => {
    const cap = String(value.cap || "").replace(/\D/g, "").slice(0, 5);
    if (cap.length !== 5) return;
    const requestId = ++capLookupRef.current;
    const controller = new AbortController();
    void fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(cap)}&country=Italy&format=json&addressdetails=1&limit=5`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : [])
      .then((results: any[]) => {
        if (requestId !== capLookupRef.current || !Array.isArray(results) || results.length === 0) return;
        const address = results[0]?.address || {};
        const city = address.city || address.town || address.village || address.municipality || "";
        const isoProvince = Object.keys(address)
          .filter((key) => key.toLowerCase().startsWith("iso3166-2"))
          .map((key) => String(address[key] || ""))
          .find((code) => /^IT-[A-Z]{2}$/i.test(code));
        const province = isoProvince
          ? isoProvince.slice(-2).toUpperCase()
          : String(address.county || address.state_district || "")
              .replace(/^Provincia di\s+/i, "")
              .replace(/\s+$/, "");
        if (!city && !province) return;
        onChange({
          ...value,
          cap,
          city: city ? normalizeSentence(city) : value.city,
          province: province ? normalizeSentence(province) : value.province,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [value.cap]);

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

        <section className="field full" style={{ marginTop: 6, padding: 18, border: "1px solid #dbe4f3", borderRadius: 16, background: "#f8faff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <label style={{ marginBottom: 5 }}>Struttura del condominio</label>
              <div className="form-help">Definisci la struttura fisica. Le autorimesse, cantine, posti auto e altre pertinenze autonome restano fuori dalla gerarchia civico → palazzina → scala → interno.</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#3857d6" }}>{Number(value.units || 0)} unità/pertinenze censite</span>
          </div>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <Field label="Numero civici" type="number" value={String(structure.civics.length)} onChange={(v: string) => setCivicCount(Number(v))} />
            <div className="field">
              <label>Unità autonome</label>
              <div className="form-help">I conteggi qui sotto non richiedono civico, palazzina o scala.</div>
            </div>
          </div>

          {structure.civics.map((civic, civicIndex) => (
            <div key={civic.id} style={{ marginTop: 14, padding: 14, border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff" }}>
              <div className="form-grid">
                <Field label="Civico" value={civic.label} onChange={(v: string) => updateStructure({ ...structure, civics: structure.civics.map((item, i) => i === civicIndex ? { ...item, label: v } : item) })} />
                <Field label="Numero palazzine" type="number" value={String(civic.buildings.length)} onChange={(v: string) => setBuildingCount(civicIndex, Number(v))} />
              </div>
              {civic.buildings.map((building, buildingIndex) => (
                <div key={building.id} style={{ marginTop: 10, padding: 12, borderLeft: "3px solid #dbe4f3", background: "#fbfcff", borderRadius: 10 }}>
                  <div className="form-grid">
                    <Field label="Palazzina" value={building.label} onChange={(v: string) => updateStructure({ ...structure, civics: structure.civics.map((item, ci) => ci !== civicIndex ? item : { ...item, buildings: item.buildings.map((b, bi) => bi === buildingIndex ? { ...b, label: v } : b) }) })} />
                    <Field label="Numero scale" type="number" value={String(building.scales.length)} onChange={(v: string) => setScaleCount(civicIndex, buildingIndex, Number(v))} />
                  </div>
                  {building.scales.map((scale, scaleIndex) => (
                    <div key={scale.id} style={{ marginTop: 9 }}>
                      <div className="form-grid">
                        <Field label="Scala" value={scale.label} onChange={(v: string) => updateStructure({ ...structure, civics: structure.civics.map((item, ci) => ci !== civicIndex ? item : { ...item, buildings: item.buildings.map((b, bi) => bi !== buildingIndex ? b : { ...b, scales: b.scales.map((s, si) => si === scaleIndex ? { ...s, label: v } : s) }) }) })} />
                        <Field label="Numero interni" type="number" value={String(scale.interiors)} onChange={(v: string) => setInteriorCount(civicIndex, buildingIndex, scaleIndex, Number(v))} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
            <strong style={{ fontSize: 13 }}>Pertinenze / unità autonome</strong>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <Field label="Autorimesse / box" type="number" value={String(structure.autonomous.garages)} onChange={(v: string) => setAutonomous("garages", Number(v))} />
              <Field label="Cantine" type="number" value={String(structure.autonomous.cantine)} onChange={(v: string) => setAutonomous("cantine", Number(v))} />
              <Field label="Posti auto" type="number" value={String(structure.autonomous.postiAuto)} onChange={(v: string) => setAutonomous("postiAuto", Number(v))} />
              <Field label="Altre pertinenze" type="number" value={String(structure.autonomous.altre)} onChange={(v: string) => setAutonomous("altre", Number(v))} />
            </div>
            <div className="form-help" style={{ marginTop: 8 }}>Le pertinenze catastalmente comprese in un interno non vengono conteggiate qui: saranno collegate direttamente all'unità principale e non avranno millesimi autonomi.</div>
          </div>
        </section>

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
  setSelectedDocumentFile,
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

              setSelectedFileName(file.name);
              setSelectedDocumentFile(file);

              setValue({
                ...value,
                name: file.name,
                size: `${Math.round(file.size / 1024)} KB`,
                source,
                mimeType: file.type,
                fileSizeBytes: file.size,
              });

              if (file.size >= 25 * 1024 * 1024) {
                const proceed = window.confirm(
                  `Il documento "${file.name}" è molto grande (${(file.size / 1024 / 1024).toFixed(1)} MB).\\n\\nIl file non è bloccato: verrà memorizzato in archivio privato quando confermerai il documento. Vuoi procedere?`
                );
                if (!proceed) {
                  setSelectedFileName("");
                  setSelectedDocumentFile(null);
                  setValue({
                    ...value,
                    fileSizeBytes: undefined,
                  });
                  return;
                }
              }

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

function CondominiumMemberForm({ value, setValue, condominiums, members, units = [], onSubmit, onCancel, editing }: any) {
  const set = (key: keyof CondominiumMember, val: any) => setValue({ ...value, [key]: val });
  const sameCondominium = members.filter((m: CondominiumMember) => m.condominiumId === value.condominiumId && m.id !== value.id);
  const availableUnits = units.filter((u: CondominiumUnit) => u.condominiumId === value.condominiumId && u.active);
  const existingApartments = Array.from(new Set([
    ...availableUnits.map((u: CondominiumUnit) => u.unitCode.trim()),
    ...sameCondominium.map((m: CondominiumMember) => m.apartment.trim()).filter(Boolean),
  ]));
  const selectedApartment = value.apartment.trim();
  const apartmentAssociates = sameCondominium.filter((m: CondominiumMember) => m.apartment.trim().toLowerCase() === selectedApartment.toLowerCase());
  const unitSelection = existingApartments.includes(value.apartment)
    ? value.apartment
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
          else setValue({ ...value, apartment: e.target.value, unitId: `local-unit-${value.condominiumId}-${e.target.value.toLowerCase().replace(/\s+/g, "-")}` });
        }}>
          <option value="">Seleziona un'unità esistente</option>
          {existingApartments.map((apartment) => <option key={apartment} value={apartment}>{apartment}</option>)}
        </select>
        {apartmentAssociates.length > 0 && (
          <div className="form-help" style={{ marginTop: 8 }}>
            <strong>Già associati:</strong>{" "}
            {apartmentAssociates.map((m: CondominiumMember) => `${m.firstName} ${m.lastName} (${m.role})`).join(" · ")}
            <br />Il nuovo soggetto sarà collegato alla stessa unità abitativa.
          </div>
        )}
      </div>
      <SelectField label="Qualifica" value={value.role} onChange={(v: string) => set("role", v)} options={[["Proprietario","Proprietario"],["Inquilino","Inquilino"]]} />
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
            : value.deliveryMode === "email"
              ? "Nuova e-mail"
              : "Nuova comunicazione al Portale"
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
              disabled={value.deliveryMode === "email"}
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

      {value.condominiumId && value.deliveryMode === "email" && (
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
  maxLength,
}: any) {
  const normalizedValue = value ?? "";
  const handleChange = (raw: string) => onChange(normalizeByLabel(raw, String(label || ""), type));
  const labelText = String(label || "");
  const lowerLabel = labelText.toLocaleLowerCase("it-IT");
  const inferredMaxLength =
    maxLength ??
    (lowerLabel.includes("codice fiscale") ? 16 :
      lowerLabel.includes("iban") ? 27 :
      lowerLabel.includes("cap") ? 5 : undefined);
  const inferredType = type === "number" ? "number" : type;
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label>{label}</label>
      {textarea ? (
        <textarea
          value={normalizedValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={inferredType}
          value={normalizedValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          maxLength={inferredMaxLength}
          inputMode={inferredType === "number" || lowerLabel.includes("cap") ? "numeric" : undefined}
          autoCapitalize={lowerLabel.includes("e-mail") || lowerLabel.includes("email") ? "none" : "sentences"}
          spellCheck={false}
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

type CondominiumInsurancePolicy = {
  id: string;
  company_name: string;
  policy_number: string;
  policy_type: string;
  coverage: string;
  start_date: string | null;
  end_date: string | null;
  premium: number;
  deductible: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  active: boolean;
};

function InsurancePoliciesSection({ condominiumId, isAdministrator }: { condominiumId: number; isAdministrator: boolean }) {
  const [policies, setPolicies] = useState<CondominiumInsurancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const emptyForm = {
    company_name: "", policy_number: "", policy_type: "Globale fabbricati", coverage: "",
    start_date: "", end_date: "", premium: "0", deductible: "0",
    contact_name: "", contact_email: "", contact_phone: "", notes: "", active: true
  };
  const [form, setForm] = useState(emptyForm);

  const loadPolicies = async () => {
    if (!supabase || !supabaseConfigured) return;
    setLoading(true);
    try {
      const workspaceId = await getActiveWorkspaceId();
      if (!workspaceId) return;
      const { data: condominium } = await supabase
        .from("condominiums")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("legacy_id", condominiumId)
        .maybeSingle();
      if (!condominium?.id) return;
      const { data, error } = await supabase
        .from("condominium_insurance_policies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("condominium_id", condominium.id)
        .order("end_date", { ascending: true });
      if (error) throw error;
      setPolicies((data || []) as CondominiumInsurancePolicy[]);
    } catch (error) {
      console.error("BETHAG insurance load error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadPolicies(); }, [condominiumId]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const savePolicy = async () => {
    if (!supabase || !supabaseConfigured) return;
    if (!form.company_name.trim()) {
      alert("Inserisci la compagnia assicurativa.");
      return;
    }
    if (!form.policy_number.trim()) {
      alert("Inserisci il numero di polizza.");
      return;
    }
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return;
    const { data: condominium } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", condominiumId)
      .maybeSingle();
    if (!condominium?.id) {
      alert("Impossibile individuare il condominio.");
      return;
    }
    const payload = {
      workspace_id: workspaceId,
      condominium_id: condominium.id,
      company_name: form.company_name.trim(),
      policy_number: form.policy_number.trim(),
      policy_type: form.policy_type.trim(),
      coverage: form.coverage.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      premium: Number(form.premium) || 0,
      deductible: Number(form.deductible) || 0,
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim().toLowerCase(),
      contact_phone: form.contact_phone.trim(),
      notes: form.notes.trim(),
      active: form.active,
      updated_at: new Date().toISOString(),
    };
    const result = editing
      ? await supabase.from("condominium_insurance_policies").update(payload).eq("id", editing).eq("workspace_id", workspaceId)
      : await supabase.from("condominium_insurance_policies").insert(payload);
    if (result.error) {
      alert("ERRORE");
      return;
    }
    resetForm();
    await loadPolicies();
  };

  const editPolicy = (policy: CondominiumInsurancePolicy) => {
    setEditing(policy.id);
    setForm({
      company_name: policy.company_name || "",
      policy_number: policy.policy_number || "",
      policy_type: policy.policy_type || "Globale fabbricati",
      coverage: policy.coverage || "",
      start_date: policy.start_date || "",
      end_date: policy.end_date || "",
      premium: String(policy.premium ?? 0),
      deductible: String(policy.deductible ?? 0),
      contact_name: policy.contact_name || "",
      contact_email: policy.contact_email || "",
      contact_phone: policy.contact_phone || "",
      notes: policy.notes || "",
      active: policy.active !== false,
    });
  };

  const deletePolicy = async (policy: CondominiumInsurancePolicy) => {
    if (!supabase || !window.confirm("Sei sicuro di voler cancellare questa polizza assicurativa?")) return;
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return;
    const { error } = await supabase.from("condominium_insurance_policies").delete().eq("id", policy.id).eq("workspace_id", workspaceId);
    if (error) { alert(error.message); return; }
    await loadPolicies();
  };

  return (
    <section className="condominium-section-card">
      <div className="section-title">
        <div>
          <div className="eyebrow">Tutela assicurativa</div>
          <h2>Polizze assicurative</h2>
          <p className="section-subtitle">Polizze del fabbricato, coperture, premi, franchigie e scadenze. Le scadenze possono essere controllate direttamente dalla scheda del condominio.</p>
        </div>
        {isAdministrator && <button className="primary-button" type="button" onClick={() => { resetForm(); setEditing("new"); }}>+ Nuova polizza</button>}
      </div>

      {isAdministrator && editing && (
        <div className="form-card" style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <label>Compagnia assicurativa<input value={form.company_name} onChange={e => setForm({...form, company_name: normalizeSentence(e.target.value)})} /></label>
            <label>Numero polizza<input value={form.policy_number} onChange={e => setForm({...form, policy_number: normalizeSentence(e.target.value)})} /></label>
            <label>Tipo polizza<input value={form.policy_type} onChange={e => setForm({...form, policy_type: normalizeSentence(e.target.value)})} /></label>
            <label>Copertura<input value={form.coverage} onChange={e => setForm({...form, coverage: normalizeSentence(e.target.value)})} /></label>
            <label>Decorrenza<input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></label>
            <label>Scadenza<input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></label>
            <label>Premio<input type="number" min="0" step="0.01" value={form.premium} onChange={e => setForm({...form, premium: e.target.value.replace(/[^0-9.,-]/g, "")})} /></label>
            <label>Franchigia<input type="number" min="0" step="0.01" value={form.deductible} onChange={e => setForm({...form, deductible: e.target.value.replace(/[^0-9.,-]/g, "")})} /></label>
            <label>Referente<input value={form.contact_name} onChange={e => setForm({...form, contact_name: normalizeWords(e.target.value)})} /></label>
            <label>E-mail<input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value.toLocaleLowerCase("it-IT").replace(/\s/g, "")})} /></label>
            <label>Telefono<input inputMode="numeric" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value.replace(/[^0-9+()\s-]/g, "")})} /></label>
            <label className="form-grid-wide">Copertura / condizioni<textarea value={form.notes} onChange={e => setForm({...form, notes: normalizeSentence(e.target.value)})} /></label>
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={resetForm}>Annulla</button>
            <button className="primary-button" type="button" onClick={() => void savePolicy()}>{editing === "new" ? "Salva polizza" : "Salva modifiche"}</button>
          </div>
        </div>
      )}

      {loading ? <p>Caricamento polizze…</p> : policies.length === 0 ? (
        <Empty text="Nessuna polizza assicurativa registrata." />
      ) : (
        <div className="related-list">
          {policies.map(policy => {
            const expired = policy.end_date && new Date(policy.end_date + "T23:59:59") < new Date();
            const daysToExpiry = policy.end_date ? Math.ceil((new Date(policy.end_date + "T23:59:59").getTime() - Date.now()) / 86400000) : null;
            const warning = !expired && daysToExpiry !== null && daysToExpiry <= 30;
            return (
              <div className="request-card" key={policy.id}>
                <div className="request-main">
                  <b>🛡️ {policy.company_name} · {policy.policy_number}</b>
                  <span>{policy.policy_type}{policy.coverage ? " · " + policy.coverage : ""}</span>
                  <small>
                    {policy.start_date || "—"} → {policy.end_date || "Nessuna scadenza"}
                    {expired ? " · POLIZZA SCADUTA" : warning ? " · SCADENZA ENTRO 30 GIORNI" : ""}
                  </small>
                  <p>Premio: € {Number(policy.premium || 0).toFixed(2)} · Franchigia: € {Number(policy.deductible || 0).toFixed(2)}</p>
                  {policy.contact_name && <small>Referente: {policy.contact_name}{policy.contact_phone ? " · " + policy.contact_phone : ""}{policy.contact_email ? " · " + policy.contact_email : ""}</small>}
                </div>
                {isAdministrator && <div className="request-actions">
                  <button className="secondary-button small" type="button" onClick={() => editPolicy(policy)}>Modifica</button>
                  <button className="mini-danger" type="button" onClick={() => void deletePolicy(policy)}>×</button>
                </div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

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
.condominium-members-actions{justify-content:flex-end;align-items:center;gap:8px}
.condominium-add-member-button{white-space:nowrap}
@media (max-width:760px){
  .condominium-members-actions{width:100%;justify-content:flex-start}
  .condominium-members-actions>*{flex:1 1 auto!important}
  .condominium-add-member-button{min-width:100%}
}
.condominium-member-list{display:flex;flex-direction:column;gap:10px;margin-top:16px}.member-main-button{border:0;background:transparent;padding:0;text-align:left;cursor:pointer;color:inherit;display:flex;flex-direction:column;align-items:flex-start;flex:1;min-width:0}.member-main-button:hover b{text-decoration:underline}.condominium-member-card .related-actions{flex-wrap:wrap;justify-content:flex-end}
.condominium-member-card{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px;border:1px solid #eef2f7;border-radius:12px;background:#f8fafc}.member-main{min-width:0}.member-main b,.member-main span,.member-main small{display:block}.member-main span{margin-top:5px;color:#475569;font-size:13px}.member-main small{margin-top:4px;color:#64748b;font-size:12px;word-break:break-word}
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
.password-field-wrap{position:relative;display:flex;align-items:center;}
.password-field-wrap input{width:100%;padding-right:48px;}
.password-toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;padding:6px;line-height:1;cursor:pointer;}
.login-forgot-button{display:block;width:100%;margin:10px 0 0;border:0;background:transparent;color:#4f46e5;font-weight:700;cursor:pointer;}
.login-success{margin:12px 0;padding:10px 12px;border-radius:10px;background:#ecfdf5;color:#166534;border:1px solid #bbf7d0;font-size:13px;}
.login-error{margin-top:15px;padding:16px 14px;border:2px solid #b42318;border-radius:12px;background:#fff1f2;color:#b42318;font-size:22px;font-weight:900;letter-spacing:.08em;text-align:center;text-transform:uppercase}
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

class BethagAppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("BETHAG application render error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fb", padding: "40px 20px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", border: "1px solid #fecaca", borderRadius: 18, padding: 28, boxShadow: "0 10px 30px rgba(15,23,42,.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#b42318", letterSpacing: ".08em" }}>BETHAG · ERRORE APPLICAZIONE</div>
          <h1 style={{ margin: "10px 0", color: "#172033" }}>Si è verificato un errore</h1>
          <p style={{ color: "#64748b", lineHeight: 1.5 }}>La pagina non verrà più lasciata bianca. Questo messaggio serve a identificare esattamente il punto che interrompe il render.</p>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#fff7f7", color: "#7f1d1d", padding: 14, borderRadius: 10 }}>{this.state.message}</pre>
          <button type="button" style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: "#526dfe", color: "#fff", fontWeight: 700, cursor: "pointer" }} onClick={() => window.location.reload()}>
            Ricarica BETHAG
          </button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <React.StrictMode>
    <BethagAppErrorBoundary><App /></BethagAppErrorBoundary>
  </React.StrictMode>
);