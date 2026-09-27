import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

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
   Questa versione prepara l'architettura frontend.
   Autenticazione reale, isolamento reale degli account,
   database cloud, pagamenti, AI reale, OCR reale,
   trascrizione audio reale e portale online reale
   richiederanno successivamente un backend.
   ========================================================= */


/* =========================================================
   TIPI
   ========================================================= */

type Page =
  | "dashboard"
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
  | "amministratore";

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
  | "pagamenti"
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
};

type RequestStatus = "Nuova" | "In lavorazione" | "Risolta" | "Chiusa";
type RequestPriority = "Bassa" | "Media" | "Alta";

type CondominiumRequest = {
  id: number;
  condominiumId: number;
  memberId: number | null;
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
  name: string;
  email: string;
  condominiumId: number;
  role: UserRole;
  apartment: string;
  permissions: PortalPermission[];
  active: boolean;
};

type Subscription = {
  plan: PlanId;
  status: "Attivo" | "Demo";
  renewalDate: string;
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
  emailStatus?: "Non inviata" | "Predisposta";
  emailPreparedAt?: string;
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
  profile: "bethag-profile-v5",
  portalMembers: "bethag-portal-members-v2",
  subscription: "bethag-subscription-v2",
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
};


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
  id: 0, condominiumId: 1, firstName: "", lastName: "", fiscalCode: "", phone: "", email: "", apartment: "", role: "Proprietario", millesimi: "", notes: "", active: true,
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
    pagamenti: "Pagamenti",
    assemblee: "Assemblee",
    comunicazioni: "Comunicazioni",
  };

  return labels[permission];
}


/* =========================================================
   APP
   ========================================================= */

function App() {
  const [page, setPage] =
    useState<Page>("dashboard");

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

  const [subscription, setSubscription] =
    useState<Subscription>(
      () =>
        load(
          KEYS.subscription,
          initialSubscription
        )
    );

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


  /* =======================================================
     PERSISTENZA
     ======================================================= */

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


  /* =======================================================
     HELPERS
     ======================================================= */

  const condominiumName = (
    id: number | null
  ) =>
    condominiums.find(
      (c) => c.id === id
    )?.name || "Tutti i condomini";

  const navigate = (target: Page) => {
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
    feature: string
  ) => {
    if (
      hasFeature(
        subscription.plan,
        required
      )
    ) {
      return true;
    }

    const answer = confirm(
      `${feature} richiede ${PLAN_NAMES[required]}.\n\nVuoi vedere i piani disponibili?`
    );

    if (answer) {
      navigate("abbonamento");
    }

    return false;
  };


  /* =======================================================
     CONDOMINI
     ======================================================= */

  const saveCondominium = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

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

    if (editingCondominium) {
      const updated = {
        ...data,
        id: editingCondominium.id,
      };

      setCondominiums((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item
        )
      );

      setSelectedCondominium(updated);
    } else {
      const item = {
        ...data,
        id: makeId(),
      };

      setCondominiums((current) => [
        ...current,
        item,
      ]);

      setSelectedCondominium(item);
    }

    setEditingCondominium(null);
    closeModal();
  };

  const deleteCondominium = (
    item: Condominium
  ) => {
    const related =
      deadlines.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      documents.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      assemblies.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      suppliers.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      activities.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      communications.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      condominiumMembers.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      condominiumRequests.filter(
        (x) =>
          x.condominiumId === item.id
      ).length +
      portalMembers.filter(
        (x) =>
          x.condominiumId === item.id
      ).length;

    const message =
      related > 0
        ? `Il condominio "${item.name}" ha ${related} elementi collegati. Eliminando il condominio verranno rimossi anche i collegamenti. Continuare?`
        : `Eliminare "${item.name}"?`;

    if (!confirm(message)) return;

    setCondominiums((current) =>
      current.filter(
        (c) => c.id !== item.id
      )
    );

    setDeadlines((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

    setDocuments((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

    setAssemblies((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

    setSuppliers((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

    setActivities((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

    setCommunications((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

    setPortalMembers((current) =>
      current.filter(
        (x) =>
          x.condominiumId !== item.id
      )
    );

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
    setSelectedDeadline(item);
    setDeadlineForm(item);
    openModal("deadline");
  };

  const deleteDeadline = (
    id: number
  ) => {
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
    setSelectedDocument(item);
    setDocumentForm(item);
    setSelectedFileName("");
    openModal("document");
  };

  const deleteDocument = (
    id: number
  ) => {
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
    if (
      !requirePlan(
        "portal",
        "La condivisione con i condomini"
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
        "L'elaborazione automatica AI dei documenti"
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
    setSelectedAssembly(item);
    setAssemblyForm(item);
    openModal("assembly");
  };

  const deleteAssembly = (
    id: number
  ) => {
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
    if (
      !requirePlan(
        "professional",
        "La gestione dell'audio delle assemblee"
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
    if (
      !requirePlan(
        "professional",
        "La generazione automatica dei verbali"
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
    if (
      !requirePlan(
        "portal",
        "La pubblicazione dei verbali nel portale"
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
    setSelectedSupplier(item);
    setSupplierForm(item);
    openModal("supplier");
  };

  const deleteSupplier = (
    id: number
  ) => {
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
    setSelectedActivity(item);
    setActivityForm(item);
    openModal("activity");
  };

  const deleteActivity = (
    id: number
  ) => {
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

  const saveCondominiumMember = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!condominiumMemberForm.firstName.trim() || !condominiumMemberForm.lastName.trim() || !condominiumMemberForm.apartment.trim()) { alert("Inserisci nome, cognome e interno/appartamento del condòmino."); return; }
    if (!validateEmail(condominiumMemberForm.email)) { alert("Controlla l'indirizzo email del condòmino."); return; }
    const data = { ...condominiumMemberForm, firstName: condominiumMemberForm.firstName.trim(), lastName: condominiumMemberForm.lastName.trim(), apartment: condominiumMemberForm.apartment.trim() };
    if (selectedCondominiumMember) setCondominiumMembers((current) => current.map((member) => member.id === selectedCondominiumMember.id ? { ...data, id: selectedCondominiumMember.id } : member));
    else setCondominiumMembers((current) => [...current, { ...data, id: makeId() }]);
    setCondominiumMemberForm({ ...emptyCondominiumMember, condominiumId: condominiumMemberForm.condominiumId }); setSelectedCondominiumMember(null); closeModal();
  };

  const editCondominiumMember = (member: CondominiumMember) => { setSelectedCondominiumMember(member); setCondominiumMemberForm(member); openModal("condominium-member"); };
  const deleteCondominiumMember = (id: number) => { if (!confirm("Eliminare questo condòmino dall'anagrafica?")) return; setCondominiumMembers((current) => current.filter((member) => member.id !== id)); };

  const saveCondominiumRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!condominiumRequestForm.condominiumId) { alert("Seleziona il condominio della segnalazione o richiesta."); return; }
    if (!condominiumRequestForm.description.trim()) { alert("Inserisci la descrizione della segnalazione o richiesta."); return; }
    const data = { ...condominiumRequestForm, description: condominiumRequestForm.description.trim(), response: condominiumRequestForm.response.trim() };
    if (selectedCondominiumRequest) setCondominiumRequests((current) => current.map((request) => request.id === selectedCondominiumRequest.id ? { ...data, id: selectedCondominiumRequest.id } : request));
    else setCondominiumRequests((current) => [{ ...data, id: makeId() }, ...current]);
    setCondominiumRequestForm({ ...emptyCondominiumRequest, condominiumId: condominiumRequestForm.condominiumId }); setSelectedCondominiumRequest(null); closeModal();
  };

  const editCondominiumRequest = (request: CondominiumRequest) => { setSelectedCondominiumRequest(request); setCondominiumRequestForm(request); openModal("condominium-request"); };
  const deleteCondominiumRequest = (id: number) => { if (!confirm("Eliminare questa segnalazione o richiesta?")) return; setCondominiumRequests((current) => current.filter((request) => request.id !== id)); };
  const updateCondominiumRequestStatus = (id: number, status: RequestStatus) => { setCondominiumRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request)); };

  const prepareCondominiumEmail = (
    condominiumId: number,
    memberIds?: number[],
    communicationId?: number,
    emailSubject?: string,
    emailBody?: string,
    audience: CommunicationAudience = "Tutti"
  ) => {
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

    // Evita destinatari duplicati, mantenendo il primo indirizzo inserito.
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

    const bcc = uniqueRecipients.join(",");
    const subject =
      emailSubject?.trim() ||
      `Comunicazione - ${condominium?.name || "Condominio"}`;
    const body =
      emailBody?.trim() ||
      "Inserisci qui il testo della comunicazione.";

    window.location.href =
      `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (communicationId) {
      setCommunications((current) =>
        current.map((communication) =>
          communication.id === communicationId
            ? {
                ...communication,
                emailStatus: "Predisposta",
                emailPreparedAt: new Date().toISOString(),
              }
            : communication
        )
      );
    }
  };

  /* =======================================================
     COMUNICAZIONI
     ======================================================= */

  const saveCommunication = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
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
      communicationForm.audience === "Selezionati" &&
      !(communicationForm.recipientIds || []).length
    ) {
      alert("Seleziona almeno un condòmino destinatario.");
      return;
    }

    if (
      communicationForm.publishedToPortal &&
      !requirePlan(
        "portal",
        "La pubblicazione delle comunicazioni nel portale"
      )
    ) {
      return;
    }

    const data = {
      ...communicationForm,
      title: communicationForm.title.trim(),
      body: communicationForm.body.trim(),
      recipientIds: communicationForm.recipientIds || [],
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
    setSelectedCommunication(item);
    setCommunicationForm(item);
    openModal("communication");
  };

  const deleteCommunication = (
    id: number
  ) => {
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
    if (
      !requirePlan(
        "portal",
        "La pubblicazione delle comunicazioni"
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
    if (
      !requirePlan(
        "portal",
        "Il portale condomini"
      )
    )
      return;

    setPortalMembers((current) => [
      ...current,
      {
        ...member,
        id: makeId(),
      },
    ]);
  };

  const togglePortalMember = (
    id: number
  ) => {
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

  const newDeadline = () => {
    setSelectedDeadline(null);

    setDeadlineForm({
      ...emptyDeadline,
      condominiumId:
        condominiums[0]?.id || 0,
    });

    openModal("deadline");
  };

  const newDocument = () => {
    setSelectedDocument(null);

    setDocumentForm({
      ...emptyDocument,
      condominiumId:
        condominiums[0]?.id || 0,
    });

    setSelectedFileName("");

    openModal("document");
  };

  const newAssembly = () => {
    setSelectedAssembly(null);

    setAssemblyForm({
      ...emptyAssembly,
      condominiumId:
        condominiums[0]?.id || 0,
    });

    openModal("assembly");
  };

  const newSupplier = () => {
    setSelectedSupplier(null);
    setSupplierForm(emptySupplier);
    openModal("supplier");
  };

  const newActivity = () => {
    setSelectedActivity(null);
    setActivityForm(emptyActivity);
    openModal("activity");
  };

  const newCondominiumMember = (condominiumId: number) => { setSelectedCondominiumMember(null); setCondominiumMemberForm({ ...emptyCondominiumMember, condominiumId }); openModal("condominium-member"); };
  const newCondominiumRequest = (condominiumId: number) => { setSelectedCondominiumRequest(null); setCondominiumRequestForm({ ...emptyCondominiumRequest, condominiumId }); openModal("condominium-request"); };

  const newCommunication = (condominiumId?: number) => {
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

  const publishedCommunications =
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


  return (
    <>
      <style>{styles}</style>

      <div className="app">

        {/* =================================================
            SIDEBAR
           ================================================= */}

        <aside className="sidebar">

          <div className="logo">
            BET<span>H</span>AG
          </div>

          <div className="plan-sidebar">
            <span>
              {PLAN_NAMES[
                subscription.plan
              ]}
            </span>

            <small>
              {profile.workspaceId}
            </small>
          </div>

          <nav className="nav">

            <NavButton
              active={
                page === "dashboard"
              }
              onClick={() =>
                navigate("dashboard")
              }
            >
              ⌂ Dashboard
            </NavButton>

            <NavButton
              active={
                page === "condomini"
              }
              onClick={() =>
                navigate("condomini")
              }
            >
              🏢 Condomini
            </NavButton>

            <NavButton
              active={
                page === "documenti"
              }
              onClick={() =>
                navigate("documenti")
              }
            >
              📁 Documenti
            </NavButton>

            <NavButton
              active={
                page === "scadenze"
              }
              onClick={() =>
                navigate("scadenze")
              }
            >
              📅 Scadenze
            </NavButton>

            <NavButton
              active={
                page === "assemblee"
              }
              onClick={() =>
                navigate("assemblee")
              }
            >
              👥 Assemblee
            </NavButton>

            <NavButton
              active={
                page === "fornitori"
              }
              onClick={() =>
                navigate("fornitori")
              }
            >
              🔧 Fornitori
            </NavButton>

            <NavButton
              active={
                page === "attivita"
              }
              onClick={() =>
                navigate("attivita")
              }
            >
              ✓ Attività
            </NavButton>

            <NavButton
              active={
                page === "comunicazioni"
              }
              onClick={() =>
                navigate("comunicazioni")
              }
            >
              📢 Comunicazioni
            </NavButton>

            <NavButton
              active={
                page === "ai"
              }
              onClick={() =>
                navigate("ai")
              }
            >
              ✨ BETHAG AI
            </NavButton>

            <NavButton
              active={
                page === "portale"
              }
              onClick={() =>
                navigate("portale")
              }
            >
              👥 Portale condomini
            </NavButton>

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
              ⭐ Piano e upgrade
            </NavButton>

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
              👤 Amministratore
            </NavButton>

          </nav>

          <div className="sidebar-bottom">
            <b>BETHAG</b>
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
              ☰
            </button>

            <b>BETHAG</b>

            <button
              className="icon-button"
              onClick={() =>
                navigate(
                  "amministratore"
                )
              }
            >
              ⚙
            </button>

          </header>


          {page === "dashboard" && (
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
              publishedCommunications={
                publishedCommunications
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
              plan={
                subscription.plan
              }
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
              condominiumName={
                condominiumName
              }
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
              onPublication={
                toggleAssemblyPublication
              }
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
              condominiumName={
                condominiumName
              }
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
              onStatus={
                updateActivityStatus
              }
              condominiumName={
                condominiumName
              }
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
              onAdd={
                addPortalMember
              }
              onToggle={
                togglePortalMember
              }
              onDelete={
                deletePortalMember
              }
              onNavigate={
                navigate
              }
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
            page === "dashboard"
              ? "mobile-bottom-active"
              : ""
          }
          onClick={() =>
            navigate("dashboard")
          }
        >
          <span>⌂</span>
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
          <span>🏢</span>
          <small>Condomini</small>
        </button>

        <button
          className="mobile-ai-button"
          onClick={() =>
            navigate("ai")
          }
        >
          ✨
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
          <span>📅</span>
          <small>Scadenze</small>
        </button>

        <button
          className={
            page === "amministratore"
              ? "mobile-bottom-active"
              : ""
          }
          onClick={() =>
            navigate(
              "amministratore"
            )
          }
        >
          <span>👤</span>
          <small>Profilo</small>
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

              <div className="logo">
                BET<span>H</span>AG
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setMobileMenuOpen(
                    false
                  )
                }
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
                  [
                    "dashboard",
                    "⌂ Dashboard",
                  ],
                  [
                    "condomini",
                    "🏢 Condomini",
                  ],
                  [
                    "documenti",
                    "📁 Documenti",
                  ],
                  [
                    "scadenze",
                    "📅 Scadenze",
                  ],
                  [
                    "assemblee",
                    "👥 Assemblee",
                  ],
                  [
                    "fornitori",
                    "🔧 Fornitori",
                  ],
                  [
                    "attivita",
                    "✓ Attività",
                  ],
                  [
                    "comunicazioni",
                    "📢 Comunicazioni",
                  ],
                  [
                    "ai",
                    "✨ BETHAG AI",
                  ],
                  [
                    "portale",
                    "👥 Portale condomini",
                  ],
                  [
                    "abbonamento",
                    "⭐ Piano e upgrade",
                  ],
                  [
                    "amministratore",
                    "👤 Amministratore",
                  ],
                ] as [
                  Page,
                  string
                ][]
              ).map(
                ([target, label]) => (
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
                    {label}
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
                !!editingCondominium
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
            <CondominiumMemberForm value={condominiumMemberForm} setValue={setCondominiumMemberForm} condominiums={condominiums} onSubmit={saveCondominiumMember} onCancel={closeModal} editing={!!selectedCondominiumMember} />
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
  publishedCommunications,
  onNavigate,
  condominiumName,
  subscription,
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
            Buongiorno 👋
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


      <section className="stats">

        <button
          className="stat-card"
          onClick={() =>
            onNavigate(
              "condomini"
            )
          }
        >
          <span>🏢</span>

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
          <span>📅</span>

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
          <span>📁</span>

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
            {publishedCommunications}
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
              ⚠️{" "}
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
              🏢
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
              📁
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
              👥
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
              ✨
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
              🏢
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

            <button
              className="secondary-button"
              onClick={() =>
                onEdit(selected)
              }
            >
              ✏️ Modifica
            </button>

            <button
              className="danger-button"
              onClick={() =>
                onDelete(selected)
              }
            >
              🗑 Elimina
            </button>

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
                  🏢
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
                  🏠 {c.units} unità
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

  const publishedDocuments =
    documents.filter(
      (x: DocumentItem) =>
        x.publication ===
        "Condiviso"
    ).length;

  const publishedCommunications =
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
            {publishedDocuments}
          </b>
          <span>
            Documenti condivisi
          </span>
        </div>

        <div className="overview-stat">
          <b>
            {publishedCommunications}
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


      <section className="condominium-section-card">
        <div className="section-title">
          <div><div className="eyebrow">Anagrafica</div><h2>Condòmini</h2><p className="section-subtitle">Gestisci anagrafica, recapiti, interno, qualifica e millesimi.</p></div>
          <div className="button-row compact">
            <button className="secondary-button" onClick={() => onNewCommunication(item.id)}>✉️ Nuova comunicazione</button>
            <button className="primary-button" onClick={() => onPrepareEmail(item.id)}>✉️ Scrivi a tutti</button>
            <button className="secondary-button" onClick={() => onNewMember(item.id)}>+ Aggiungi condòmino</button>
          </div>
        </div>
        <div className="condominium-member-list">
          {activeMembers.length === 0 ? <Empty text="Nessun condòmino presente nell'anagrafica." /> : activeMembers.map((member: CondominiumMember) => (
            <div className="condominium-member-card" key={member.id}>
              <div className="member-main"><b>{member.firstName} {member.lastName}</b><span>{member.apartment} · {member.role} · {member.millesimi || "Millesimi non inseriti"}</span><small>{member.phone || "Telefono non inserito"}{member.email ? ` · ${member.email}` : " · E-mail non inserita"}</small></div>
              <div className="related-actions">
                {member.email && <button className="secondary-button small" onClick={() => onPrepareEmail(item.id, [member.id])}>Scrivi</button>}
                <button className="secondary-button small" onClick={() => onEditMember(member)}>Modifica</button><button className="mini-danger" onClick={() => onDeleteMember(member.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="condominium-section-card">
        <div className="section-title"><div><div className="eyebrow">Assistenza</div><h2>Segnalazioni e richieste</h2><p className="section-subtitle">Raccogli le richieste dei condòmini e gestiscine lo stato fino alla chiusura.</p></div><button className="primary-button" onClick={() => onNewRequest(item.id)}>+ Nuova segnalazione</button></div>
        <div className="request-summary"><span><b>{openRequests}</b> aperte</span><span><b>{condominiumRequests.length}</b> totali</span></div>
        <div className="related-list">
          {condominiumRequests.length === 0 ? <Empty text="Nessuna segnalazione o richiesta ricevuta." /> : condominiumRequests.map((request: CondominiumRequest) => {
            const member = condominiumMembers.find((x: CondominiumMember) => x.id === request.memberId);
            return <div className="request-card" key={request.id}>
              <div className="request-main"><b>{request.category}</b><span>{member ? `${member.firstName} ${member.lastName}` : "Richiedente non indicato"}{` · ${formatDate(request.date)}`}</span><p>{request.description}</p>{request.response && <div className="request-response"><strong>Risposta amministratore:</strong> {request.response}</div>}</div>
              <div className="request-actions"><Badge value={request.status} /><Badge value={`Priorità ${request.priority}`} /><select value={request.status} onChange={(e) => onStatusRequest(request.id, e.target.value as RequestStatus)}><option>Nuova</option><option>In lavorazione</option><option>Risolta</option><option>Chiusa</option></select><button className="secondary-button small" onClick={() => onEditRequest(request)}>Dettagli / modifica</button><button className="mini-danger" onClick={() => onDeleteRequest(request.id)}>×</button></div>
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
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  onEdit: () => void;
  onDelete: () => void;
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

        {children}

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

      <PageHeader
        eyebrow="Archivio digitale"
        title="Documenti"
        action="+ Nuovo documento"
        onAction={onNew}
      />

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


              <div className="button-row">

                <button
                  className="secondary-button"
                  onClick={() =>
                    onEdit(d)
                  }
                >
                  Modifica
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    onAI(d)
                  }
                >
                  ✨ AI
                </button>

              </div>


              {d.aiStatus ===
                "Da verificare" && (
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
                    ? "🔒 Rendi privato"
                    : "👥 Condividi con condomini"}
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

      <PageHeader
        eyebrow="Pianificazione"
        title="Scadenze"
        action="+ Nuova scadenza"
        onAction={onNew}
      />

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

      <PageHeader
        eyebrow="Riunioni"
        title="Assemblee"
        action="+ Nuova assemblea"
        onAction={onNew}
      />

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
                    ? "🔒 Nascondi"
                    : "👥 Pubblica"}
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

      <PageHeader
        eyebrow="Gestione fornitori"
        title="Fornitori"
        action="+ Nuovo fornitore"
        onAction={onNew}
      />

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

              <div className="button-row">

                <button
                  className="secondary-button"
                  onClick={() =>
                    onEdit(s)
                  }
                >
                  Modifica
                </button>

                <button
                  className="danger-button"
                  onClick={() =>
                    onDelete(s.id)
                  }
                >
                  Elimina
                </button>

              </div>

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

      <PageHeader
        eyebrow="Organizzazione"
        title="Attività"
        action="+ Nuova attività"
        onAction={onNew}
      />

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
                  onClick={() =>
                    onDelete(a.id)
                  }
                >
                  ×
                </button>

              </div>

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

      <PageHeader
        eyebrow="Comunicazioni"
        title="Comunicazioni"
        action="+ Nuova comunicazione"
        onAction={onNew}
      />


      <div className="feature-banner">

        <div>

          <b>
            📢 Comunicazioni ai condomini
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
                    ? "🔒 Ritira"
                    : "👥 Pubblica"}
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
  plan,
  onAdd,
  onToggle,
  onDelete,
  onNavigate,
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

  const publishedDocuments =
    documents.filter(
      (d: DocumentItem) =>
        d.publication ===
        "Condiviso"
    );

  const publishedMinutes =
    assemblies.filter(
      (a: Assembly) =>
        a.publishedToPortal
    );

  const publishedCommunications =
    communications.filter(
      (c: Communication) =>
        c.publishedToPortal
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

      <PageHeader
        eyebrow="Accesso esterno"
        title="Portale condomini"
        action="+ Nuovo accesso"
        onAction={() => {

          if (
            !hasFeature(
              plan,
              "portal"
            )
          ) {
            onNavigate(
              "abbonamento"
            );

            return;
          }

          setShowAdd(true);

        }}
      />


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
                publishedDocuments.length
              }
            </b>
            <span>
              documenti condivisi
            </span>
          </div>

          <div>
            <b>
              {
                publishedMinutes.length
              }
            </b>
            <span>
              verbali pubblicati
            </span>
          </div>

          <div>
            <b>
              {
                publishedCommunications.length
              }
            </b>
            <span>
              comunicazioni
            </span>
          </div>

        </div>

      </section>


      {showAdd && (
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
                  "pagamenti",
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
              📁 Documenti
            </b>

            <span>
              Regolamenti, verbali e
              documenti autorizzati.
            </span>
          </div>

          <div className="permission-box">
            <b>
              💶 Pagamenti
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
              👥 Assemblee
            </b>

            <span>
              Convocazioni e verbali
              pubblicati
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
   ABBONAMENTO
   ========================================================= */

function SubscriptionPage({
  subscription,
  setSubscription,
}: any) {
  const plans: {
    id: PlanId;
    title: string;
    description: string;
    features: string[];
  }[] = [
    {
      id: "free",
      title: "BETHAG Free",
      description:
        "Il gestionale essenziale.",
      features: [
        "Condomini",
        "Inserimento manuale",
        "Archivio documenti",
        "Scadenze",
        "Promemoria",
        "Attività",
        "Fornitori",
        "Assemblee",
      ],
    },
    {
      id: "plus",
      title: "BETHAG Plus",
      description:
        "Automazione documentale.",
      features: [
        "Tutto Free",
        "Acquisizione documenti",
        "PDF",
        "Word",
        "Excel",
        "Immagini",
        "Analisi AI",
        "Estrazione dati",
      ],
    },
    {
      id: "professional",
      title:
        "BETHAG Professional",
      description:
        "Automazione avanzata.",
      features: [
        "Tutto Plus",
        "Generazione documenti",
        "Acquisizione audio",
        "Trascrizione assemblee",
        "Bozza automatica verbale",
        "Workflow di verifica",
        "Automazioni avanzate",
      ],
    },
    {
      id: "portal",
      title: "BETHAG Portal",
      description:
        "Amministratore + condomini.",
      features: [
        "Tutto Professional",
        "Portale condomini",
        "Utenti e ruoli",
        "Permessi granulari",
        "Documenti condivisi",
        "Verbali pubblicabili",
        "Comunicazioni",
        "Accesso riservato",
      ],
    },
  ];

  const activateDemo = (
    id: PlanId
  ) => {
    setSubscription({
      plan: id,
      status: "Demo",
      renewalDate: "",
    });
  };

  return (
    <>

      <PageHeader
        eyebrow="Modello di servizio"
        title="Piano BETHAG"
      />


      <section className="subscription-current">

        <div>

          <span className="eyebrow">
            Piano attuale
          </span>

          <h2>
            {
              PLAN_NAMES[
                subscription.plan
              ]
            }
          </h2>

          <p>
            {
              PLAN_DESCRIPTIONS[
                subscription.plan
              ]
            }
          </p>

        </div>

        <Badge
          value={
            subscription.status
          }
        />

      </section>


      <section className="pricing-grid">

        {plans.map(
          (plan) => (
            <article
              className={`pricing-card ${
                subscription.plan ===
                plan.id
                  ? "current"
                  : ""
              }`}
              key={plan.id}
            >

              {subscription.plan ===
                plan.id && (
                <div className="current-plan">
                  Piano attuale
                </div>
              )}

              <div className="pricing-icon">

                {plan.id ===
                "free"
                  ? "🆓"
                  : plan.id ===
                    "plus"
                  ? "✨"
                  : plan.id ===
                    "professional"
                  ? "🚀"
                  : "👥"}

              </div>

              <h2>
                {plan.title}
              </h2>

              <p>
                {plan.description}
              </p>

              <ul>

                {plan.features.map(
                  (
                    feature
                  ) => (
                    <li
                      key={
                        feature
                      }
                    >
                      ✓{" "}
                      {
                        feature
                      }
                    </li>
                  )
                )}

              </ul>

              <button
                className={
                  subscription.plan ===
                  plan.id
                    ? "secondary-button"
                    : "primary-button"
                }
                onClick={() =>
                  activateDemo(
                    plan.id
                  )
                }
              >
                {subscription.plan ===
                plan.id
                  ? "Piano attivo"
                  : "Prova struttura"}
              </button>

            </article>
          )
        )}

      </section>


      <div className="info-card">

        <b>
          Struttura predisposta per
          gli abbonamenti
        </b>

        <p>
          I pulsanti presenti in questa
          versione servono per testare
          localmente i diversi livelli.
          Il pagamento reale verrà
          collegato successivamente a un
          sistema di abbonamento e il
          controllo del piano dovrà essere
          effettuato anche dal backend.
        </p>

      </div>

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
}: any) {
  const [saved, setSaved] =
    useState(false);

  const save = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
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

function CondominiumMemberForm({ value, setValue, condominiums, onSubmit, onCancel, editing }: any) {
  const set = (key: keyof CondominiumMember, val: any) => setValue({ ...value, [key]: val });
  return <form onSubmit={onSubmit}><ModalTitle title={editing ? "Modifica condòmino" : "Nuovo condòmino"} /><div className="form-grid">
    <SelectField full label="Condominio" value={value.condominiumId} onChange={(v: string) => set("condominiumId", Number(v))} options={condominiums.map((c: Condominium) => [c.id, c.name])} />
    <Field label="Nome *" value={value.firstName} onChange={(v: string) => set("firstName", v)} /><Field label="Cognome *" value={value.lastName} onChange={(v: string) => set("lastName", v)} />
    <Field label="Interno / appartamento *" value={value.apartment} onChange={(v: string) => set("apartment", v)} /><SelectField label="Qualifica" value={value.role} onChange={(v: string) => set("role", v)} options={[["Proprietario","Proprietario"],["Inquilino","Inquilino"]]} />
    <Field label="Millesimi" value={value.millesimi} onChange={(v: string) => set("millesimi", v)} /><Field label="Codice fiscale" value={value.fiscalCode} onChange={(v: string) => set("fiscalCode", v)} /><Field label="Telefono" value={value.phone} onChange={(v: string) => set("phone", v)} /><Field label="E-mail" value={value.email} onChange={(v: string) => set("email", v)} />
    <div className="field checkbox-field"><label>Stato</label><label className="switch-row"><input type="checkbox" checked={value.active} onChange={(e) => set("active", e.target.checked)} /><span>Condòmino attivo</span></label></div>
    <Field full label="Note" value={value.notes} onChange={(v: string) => set("notes", v)} textarea />
  </div><Actions onCancel={onCancel} /></form>;
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
    <SelectField label="Fornitore collegato" value={value.supplierId ?? ""} onChange={(v: string) => set("supplierId", v ? Number(v) : null)} options={[["","Nessun fornitore"],...suppliers.map((s: Supplier) => [s.id,s.name])]} />
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
        <div className="communication-email-actions"><button type="button" className="secondary-button" onClick={() => onPrepareEmail(value.condominiumId, value.audience === "Selezionati" ? value.recipientIds || [] : undefined, value.id || undefined, value.title, value.body, value.audience)}>✉️ Predisponi e-mail</button><span>{value.emailStatus === "Predisposta" ? "E-mail predisposta nel client di posta." : "Apre il client e-mail con i destinatari in BCC."}</span></div>
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
  z-index:100;
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

`;

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
