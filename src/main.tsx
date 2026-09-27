import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

/* =========================================================
   BETHAG
   Gestione completa amministrazione condominiale
   Single-file React / TypeScript
   ========================================================= */

type Page =
  | "dashboard"
  | "condomini"
  | "documenti"
  | "scadenze"
  | "assemblee"
  | "fornitori"
  | "attivita"
  | "amministratore";

type DeadlineStatus = "Da fare" | "In scadenza" | "Completata";
type AssemblyStatus = "Programmato" | "Svolto" | "Annullato";
type ActivityPriority = "Bassa" | "Media" | "Alta";
type ActivityStatus = "Aperta" | "In corso" | "Completata";

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
};

/* =========================================================
   STORAGE
   ========================================================= */

const KEYS = {
  condominiums: "bethag-condominiums",
  deadlines: "bethag-deadlines-v3",
  documents: "bethag-documents-v3",
  assemblies: "bethag-assemblies-v3",
  suppliers: "bethag-suppliers-v3",
  activities: "bethag-activities-v3",
  profile: "bethag-profile-v3",
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
  },
  {
    id: 2,
    name: "Polizza assicurativa.pdf",
    condominiumId: 1,
    category: "Assicurazione",
    date: "2026-09-05",
    size: "840 KB",
    notes: "",
  },
  {
    id: 3,
    name: "Verbale assemblea.pdf",
    condominiumId: 2,
    category: "Assemblea",
    date: "2026-09-10",
    size: "560 KB",
    notes: "",
  },
  {
    id: 4,
    name: "Contratto manutenzione.pdf",
    condominiumId: 3,
    category: "Contratti",
    date: "2026-09-12",
    size: "920 KB",
    notes: "",
  },
  {
    id: 5,
    name: "Preventivo lavori.pdf",
    condominiumId: 1,
    category: "Preventivi",
    date: "2026-09-15",
    size: "430 KB",
    notes: "",
  },
  {
    id: 6,
    name: "Fattura fornitore.pdf",
    condominiumId: 2,
    category: "Fatture",
    date: "2026-09-18",
    size: "210 KB",
    notes: "",
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

/* =========================================================
   EMPTY MODELS
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
  date: new Date().toISOString().slice(0, 10),
  size: "",
  notes: "",
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

const emptyProfile: AdminProfile = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  fiscalCode: "",
  vat: "",
};

/* =========================================================
   HELPERS
   ========================================================= */

function load<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function makeId() {
  return Date.now() + Math.floor(Math.random() * 1000);
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const [condominiums, setCondominiums] = useState<Condominium[]>(
    () => load(KEYS.condominiums, initialCondominiums)
  );

  const [deadlines, setDeadlines] = useState<Deadline[]>(
    () => load(KEYS.deadlines, initialDeadlines)
  );

  const [documents, setDocuments] = useState<DocumentItem[]>(
    () => load(KEYS.documents, initialDocuments)
  );

  const [assemblies, setAssemblies] = useState<Assembly[]>(
    () => load(KEYS.assemblies, initialAssemblies)
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>(
    () => load(KEYS.suppliers, initialSuppliers)
  );

  const [activities, setActivities] = useState<Activity[]>(
    () => load(KEYS.activities, initialActivities)
  );

  const [profile, setProfile] = useState<AdminProfile>(
    () => load(KEYS.profile, emptyProfile)
  );

  const [search, setSearch] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedCondominium, setSelectedCondominium] =
    useState<Condominium | null>(null);

  const [editingCondominium, setEditingCondominium] =
    useState<Condominium | null>(null);

  const [selectedDeadline, setSelectedDeadline] =
    useState<Deadline | null>(null);

  const [selectedDocument, setSelectedDocument] =
    useState<DocumentItem | null>(null);

  const [selectedAssembly, setSelectedAssembly] =
    useState<Assembly | null>(null);

  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);

  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null);

  const [showModal, setShowModal] = useState(false);

  const [modalType, setModalType] = useState("");

  const [selectedFileName, setSelectedFileName] = useState("");

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
      KEYS.profile,
      JSON.stringify(profile)
    );
  }, [profile]);

  /* =======================================================
     HELPERS APP
     ======================================================= */

  const condominiumName = (id: number | null) =>
    condominiums.find((c) => c.id === id)?.name ||
    "Tutti i condomini";

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

  const filteredCondominiums = useMemo(() => {
    const q = search.trim().toLowerCase();

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
     CONDOMINI
     ======================================================= */

  const saveCondominium = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const data = editingCondominium || emptyCondominium;

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

    if (!Number.isInteger(units) || units <= 0) {
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
          item.id === updated.id ? updated : item
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

  const deleteCondominium = (item: Condominium) => {
    const related =
      deadlines.filter((x) => x.condominiumId === item.id).length +
      documents.filter((x) => x.condominiumId === item.id).length +
      assemblies.filter((x) => x.condominiumId === item.id).length +
      suppliers.filter((x) => x.condominiumId === item.id).length +
      activities.filter((x) => x.condominiumId === item.id).length;

    const message =
      related > 0
        ? `Il condominio "${item.name}" ha ${related} elementi collegati. Eliminando il condominio verranno rimossi anche i collegamenti. Continuare?`
        : `Eliminare "${item.name}"?`;

    if (!confirm(message)) return;

    setCondominiums((current) =>
      current.filter((c) => c.id !== item.id)
    );

    setDeadlines((current) =>
      current.filter((x) => x.condominiumId !== item.id)
    );

    setDocuments((current) =>
      current.filter((x) => x.condominiumId !== item.id)
    );

    setAssemblies((current) =>
      current.filter((x) => x.condominiumId !== item.id)
    );

    setSuppliers((current) =>
      current.filter((x) => x.condominiumId !== item.id)
    );

    setActivities((current) =>
      current.filter((x) => x.condominiumId !== item.id)
    );

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
      condominiumId: condominiums[0]?.id || 0,
    });

    setSelectedDeadline(null);
    closeModal();
  };

  const editDeadline = (item: Deadline) => {
    setSelectedDeadline(item);
    setDeadlineForm(item);
    openModal("deadline");
  };

  const deleteDeadline = (id: number) => {
    if (!confirm("Eliminare questa scadenza?")) return;

    setDeadlines((current) =>
      current.filter((item) => item.id !== id)
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
      alert("Inserisci il nome del documento.");
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
        ? documentForm.size || "File locale"
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
      condominiumId: condominiums[0]?.id || 0,
    });

    setSelectedDocument(null);
    setSelectedFileName("");
    closeModal();
  };

  const editDocument = (item: DocumentItem) => {
    setSelectedDocument(item);
    setDocumentForm(item);
    setSelectedFileName("");
    openModal("document");
  };

  const deleteDocument = (id: number) => {
    if (!confirm("Eliminare questo documento?")) return;

    setDocuments((current) =>
      current.filter((item) => item.id !== id)
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
      alert("Inserisci titolo e data.");
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
      condominiumId: condominiums[0]?.id || 0,
    });

    setSelectedAssembly(null);
    closeModal();
  };

  const editAssembly = (item: Assembly) => {
    setSelectedAssembly(item);
    setAssemblyForm(item);
    openModal("assembly");
  };

  const deleteAssembly = (id: number) => {
    if (!confirm("Eliminare questa assemblea?")) return;

    setAssemblies((current) =>
      current.filter((item) => item.id !== id)
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
      alert("Inserisci fornitore e servizio.");
      return;
    }

    if (!validateEmail(supplierForm.email)) {
      alert("Controlla l'indirizzo email.");
      return;
    }

    if (selectedSupplier) {
      setSuppliers((current) =>
        current.map((item) =>
          item.id === selectedSupplier.id
            ? {
                ...supplierForm,
                id: selectedSupplier.id,
              }
            : item
        )
      );
    } else {
      setSuppliers((current) => [
        ...current,
        {
          ...supplierForm,
          id: makeId(),
        },
      ]);
    }

    setSupplierForm(emptySupplier);
    setSelectedSupplier(null);
    closeModal();
  };

  const editSupplier = (item: Supplier) => {
    setSelectedSupplier(item);
    setSupplierForm(item);
    openModal("supplier");
  };

  const deleteSupplier = (id: number) => {
    if (!confirm("Eliminare questo fornitore?")) return;

    setSuppliers((current) =>
      current.filter((item) => item.id !== id)
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
      alert("Inserisci il titolo dell'attività.");
      return;
    }

    if (selectedActivity) {
      setActivities((current) =>
        current.map((item) =>
          item.id === selectedActivity.id
            ? {
                ...activityForm,
                id: selectedActivity.id,
              }
            : item
        )
      );
    } else {
      setActivities((current) => [
        ...current,
        {
          ...activityForm,
          id: makeId(),
        },
      ]);
    }

    setActivityForm(emptyActivity);
    setSelectedActivity(null);
    closeModal();
  };

  const editActivity = (item: Activity) => {
    setSelectedActivity(item);
    setActivityForm(item);
    openModal("activity");
  };

  const deleteActivity = (id: number) => {
    if (!confirm("Eliminare questa attività?")) return;

    setActivities((current) =>
      current.filter((item) => item.id !== id)
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
     NUOVI ELEMENTI
     ======================================================= */

  const newDeadline = () => {
    setSelectedDeadline(null);

    setDeadlineForm({
      ...emptyDeadline,
      condominiumId: condominiums[0]?.id || 0,
    });

    openModal("deadline");
  };

  const newDocument = () => {
    setSelectedDocument(null);

    setDocumentForm({
      ...emptyDocument,
      condominiumId: condominiums[0]?.id || 0,
    });

    setSelectedFileName("");

    openModal("document");
  };

  const newAssembly = () => {
    setSelectedAssembly(null);

    setAssemblyForm({
      ...emptyAssembly,
      condominiumId: condominiums[0]?.id || 0,
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

  /* =======================================================
     DASHBOARD
     ======================================================= */

  const upcoming = [...deadlines]
    .filter((d) => d.status !== "Completata")
    .sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    )
    .slice(0, 5);

  const openActivities = activities.filter(
    (a) => a.status !== "Completata"
  ).length;

  const urgentDeadlines = deadlines.filter(
    (d) => d.status === "In scadenza"
  ).length;

  const completedDeadlines = deadlines.filter(
    (d) => d.status === "Completata"
  ).length;

  const completedActivities = activities.filter(
    (a) => a.status === "Completata"
  ).length;

  return (
    <>
      <style>{styles}</style>

      <div className="app">
        {/* SIDEBAR DESKTOP */}

        <aside className="sidebar">
          <div className="logo">
            BET<span>H</span>AG
          </div>

          <nav className="nav">
            <NavButton
              active={page === "dashboard"}
              onClick={() => navigate("dashboard")}
            >
              ⌂ Dashboard
            </NavButton>

            <NavButton
              active={page === "condomini"}
              onClick={() => navigate("condomini")}
            >
              🏢 Condomini
            </NavButton>

            <NavButton
              active={page === "documenti"}
              onClick={() => navigate("documenti")}
            >
              📁 Documenti
            </NavButton>

            <NavButton
              active={page === "scadenze"}
              onClick={() => navigate("scadenze")}
            >
              📅 Scadenze
            </NavButton>

            <NavButton
              active={page === "assemblee"}
              onClick={() => navigate("assemblee")}
            >
              👥 Assemblee
            </NavButton>

            <NavButton
              active={page === "fornitori"}
              onClick={() => navigate("fornitori")}
            >
              🔧 Fornitori
            </NavButton>

            <NavButton
              active={page === "attivita"}
              onClick={() => navigate("attivita")}
            >
              ✓ Attività
            </NavButton>

            <NavButton
              active={page === "amministratore"}
              onClick={() =>
                navigate("amministratore")
              }
            >
              👤 Amministratore
            </NavButton>
          </nav>

          <div className="sidebar-bottom">
            <b>BETHAG AI</b>
            <br />
            <small>
              Assistente intelligente
            </small>
          </div>
        </aside>

        <main className="content">
          {/* HEADER MOBILE */}

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
                navigate("amministratore")
              }
            >
              ⚙
            </button>
          </header>

          {/* DASHBOARD */}

          {page === "dashboard" && (
            <Dashboard
              condominiums={condominiums}
              deadlines={deadlines}
              documents={documents}
              activities={activities}
              upcoming={upcoming}
              openActivities={openActivities}
              urgentDeadlines={urgentDeadlines}
              completedDeadlines={completedDeadlines}
              completedActivities={completedActivities}
              onNavigate={navigate}
              condominiumName={condominiumName}
            />
          )}

          {/* CONDOMINI */}

          {page === "condomini" && (
            <CondominiumsPage
              condominiums={filteredCondominiums}
              allCount={condominiums.length}
              search={search}
              setSearch={setSearch}
              selected={selectedCondominium}
              setSelected={setSelectedCondominium}
              onNew={() => {
                setEditingCondominium(null);
                openModal("condominium");
              }}
              onEdit={(item: Condominium) => {
                setEditingCondominium(item);
                openModal("condominium");
              }}
              onDelete={deleteCondominium}
              deadlines={deadlines}
              documents={documents}
              assemblies={assemblies}
              suppliers={suppliers}
              activities={activities}
              condominiumName={condominiumName}
              onEditDeadline={editDeadline}
              onEditDocument={editDocument}
              onEditAssembly={editAssembly}
              onEditSupplier={editSupplier}
              onEditActivity={editActivity}
              onDeleteDeadline={deleteDeadline}
              onDeleteDocument={deleteDocument}
              onDeleteAssembly={deleteAssembly}
              onDeleteSupplier={deleteSupplier}
              onDeleteActivity={deleteActivity}
              onStatusDeadline={updateDeadlineStatus}
              onStatusAssembly={updateAssemblyStatus}
              onStatusActivity={updateActivityStatus}
            />
          )}

          {/* DOCUMENTI */}

          {page === "documenti" && (
            <DocumentsPage
              documents={documents}
              search={search}
              setSearch={setSearch}
              onNew={newDocument}
              onEdit={editDocument}
              onDelete={deleteDocument}
              condominiumName={condominiumName}
            />
          )}

          {/* SCADENZE */}

          {page === "scadenze" && (
            <DeadlinesPage
              deadlines={deadlines}
              search={search}
              setSearch={setSearch}
              onNew={newDeadline}
              onEdit={editDeadline}
              onDelete={deleteDeadline}
              onStatus={updateDeadlineStatus}
              condominiumName={condominiumName}
            />
          )}

          {/* ASSEMBLEE */}

          {page === "assemblee" && (
            <AssembliesPage
              assemblies={assemblies}
              search={search}
              setSearch={setSearch}
              onNew={newAssembly}
              onEdit={editAssembly}
              onDelete={deleteAssembly}
              onStatus={updateAssemblyStatus}
              condominiumName={condominiumName}
            />
          )}

          {/* FORNITORI */}

          {page === "fornitori" && (
            <SuppliersPage
              suppliers={suppliers}
              search={search}
              setSearch={setSearch}
              onNew={newSupplier}
              onEdit={editSupplier}
              onDelete={deleteSupplier}
              condominiumName={condominiumName}
            />
          )}

          {/* ATTIVITÀ */}

          {page === "attivita" && (
            <ActivitiesPage
              activities={activities}
              search={search}
              setSearch={setSearch}
              onNew={newActivity}
              onEdit={editActivity}
              onDelete={deleteActivity}
              onStatus={updateActivityStatus}
              condominiumName={condominiumName}
            />
          )}

          {/* AMMINISTRATORE */}

          {page === "amministratore" && (
            <ProfilePage
              profile={profile}
              setProfile={setProfile}
            />
          )}
        </main>
      </div>

      {/* =====================================================
          MENU MOBILE
         ===================================================== */}

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
                  setMobileMenuOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="mobile-nav">
              <NavButton
                active={page === "dashboard"}
                onClick={() => navigate("dashboard")}
              >
                ⌂ Dashboard
              </NavButton>

              <NavButton
                active={page === "condomini"}
                onClick={() => navigate("condomini")}
              >
                🏢 Condomini
              </NavButton>

              <NavButton
                active={page === "documenti"}
                onClick={() => navigate("documenti")}
              >
                📁 Documenti
              </NavButton>

              <NavButton
                active={page === "scadenze"}
                onClick={() => navigate("scadenze")}
              >
                📅 Scadenze
              </NavButton>

              <NavButton
                active={page === "assemblee"}
                onClick={() => navigate("assemblee")}
              >
                👥 Assemblee
              </NavButton>

              <NavButton
                active={page === "fornitori"}
                onClick={() => navigate("fornitori")}
              >
                🔧 Fornitori
              </NavButton>

              <NavButton
                active={page === "attivita"}
                onClick={() => navigate("attivita")}
              >
                ✓ Attività
              </NavButton>

              <NavButton
                active={page === "amministratore"}
                onClick={() =>
                  navigate("amministratore")
                }
              >
                👤 Amministratore
              </NavButton>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODALI
         ===================================================== */}

      {showModal && (
        <Modal onClose={closeModal}>
          {modalType === "condominium" && (
            <CondominiumForm
              value={
                editingCondominium ||
                {
                  ...emptyCondominium,
                  id: 0,
                }
              }
              onChange={setEditingCondominium}
              onSubmit={saveCondominium}
              onCancel={closeModal}
              editing={!!editingCondominium}
            />
          )}

          {modalType === "deadline" && (
            <DeadlineForm
              value={deadlineForm}
              setValue={setDeadlineForm}
              condominiums={condominiums}
              onSubmit={saveDeadline}
              onCancel={closeModal}
              editing={!!selectedDeadline}
            />
          )}

          {modalType === "document" && (
            <DocumentForm
              value={documentForm}
              setValue={setDocumentForm}
              condominiums={condominiums}
              onSubmit={saveDocument}
              onCancel={closeModal}
              selectedFileName={selectedFileName}
              setSelectedFileName={
                setSelectedFileName
              }
              editing={!!selectedDocument}
            />
          )}

          {modalType === "assembly" && (
            <AssemblyForm
              value={assemblyForm}
              setValue={setAssemblyForm}
              condominiums={condominiums}
              onSubmit={saveAssembly}
              onCancel={closeModal}
              editing={!!selectedAssembly}
            />
          )}

          {modalType === "supplier" && (
            <SupplierForm
              value={supplierForm}
              setValue={setSupplierForm}
              condominiums={condominiums}
              onSubmit={saveSupplier}
              onCancel={closeModal}
              editing={!!selectedSupplier}
            />
          )}

          {modalType === "activity" && (
            <ActivityForm
              value={activityForm}
              setValue={setActivityForm}
              condominiums={condominiums}
              onSubmit={saveActivity}
              onCancel={closeModal}
              editing={!!selectedActivity}
            />
          )}
        </Modal>
      )}
    </>
  );
}

/* =========================================================
   NAVIGATION
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

function Dashboard(props: any) {
  const {
    condominiums,
    deadlines,
    documents,
    activities,
    upcoming,
    openActivities,
    urgentDeadlines,
    completedDeadlines,
    completedActivities,
    onNavigate,
    condominiumName,
  } = props;

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">
            Area amministratore
          </div>
          <h1>Buongiorno 👋</h1>
        </div>

        <button
          className="profile"
          onClick={() =>
            onNavigate("amministratore")
          }
        >
          Amministratore
        </button>
      </header>

      <section className="stats">
        <button
          className="stat-card"
          onClick={() =>
            onNavigate("condomini")
          }
        >
          <span>🏢</span>
          <strong>{condominiums.length}</strong>
          <small>Condomini</small>
        </button>

        <button
          className="stat-card"
          onClick={() =>
            onNavigate("scadenze")
          }
        >
          <span>📅</span>
          <strong>{deadlines.length}</strong>
          <small>Scadenze</small>
        </button>

        <button
          className="stat-card"
          onClick={() =>
            onNavigate("documenti")
          }
        >
          <span>📁</span>
          <strong>{documents.length}</strong>
          <small>Documenti</small>
        </button>

        <button
          className="stat-card"
          onClick={() =>
            onNavigate("attivita")
          }
        >
          <span>✓</span>
          <strong>{openActivities}</strong>
          <small>Attività aperte</small>
        </button>
      </section>

      <section className="mini-stats">
        <div className="mini-stat">
          <b>{urgentDeadlines}</b>
          <span>Scadenze urgenti</span>
        </div>

        <div className="mini-stat">
          <b>{completedDeadlines}</b>
          <span>Scadenze completate</span>
        </div>

        <div className="mini-stat">
          <b>{completedActivities}</b>
          <span>Attività completate</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card">
          <SectionTitle
            title="Prossime scadenze"
            action="Vedi tutte"
            onClick={() =>
              onNavigate("scadenze")
            }
          />

          {upcoming.length === 0 ? (
            <Empty text="Nessuna scadenza aperta." />
          ) : (
            upcoming.map((item: Deadline) => (
              <div
                className="list-row"
                key={item.id}
              >
                <div>
                  <b>{item.title}</b>

                  <small>
                    {condominiumName(
                      item.condominiumId
                    )}
                  </small>

                  <Badge value={item.status} />
                </div>

                <strong>
                  {formatDate(item.dueDate)}
                </strong>
              </div>
            ))
          )}

          {urgentDeadlines > 0 && (
            <div className="notice">
              ⚠️ {urgentDeadlines} scadenza/e
              richiedono attenzione.
            </div>
          )}
        </div>

        <div className="card">
          <SectionTitle
            title="Attività recenti"
            action="Vedi tutte"
            onClick={() =>
              onNavigate("attivita")
            }
          />

          {activities.length === 0 ? (
            <Empty text="Nessuna attività." />
          ) : (
            activities
              .slice(-5)
              .reverse()
              .map((a: Activity) => (
                <div
                  className="activity"
                  key={a.id}
                >
                  <b>{a.title}</b>

                  <small>
                    {condominiumName(
                      a.condominiumId
                    )}{" "}
                    · {a.status}
                  </small>
                </div>
              ))
          )}
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
            Condomini, scadenze, documenti,
            assemblee, fornitori e attività
            sono collegati in un'unica
            interfaccia.
          </p>
        </div>

        <button
          className="ai-button"
          onClick={() =>
            onNavigate("condomini")
          }
        >
          Gestisci condomini
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
      <h2>{title}</h2>

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

function Badge({ value }: { value: string }) {
  const urgent =
    value === "In scadenza" ||
    value === "Alta";

  const done =
    value === "Completata" ||
    value === "Svolto";

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

function Empty({ text }: { text: string }) {
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

        <h1>{title}</h1>
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
          onChange(e.target.value)
        }
        placeholder={placeholder}
      />
    </div>
  );
}

/* =========================================================
   CONDOMINI
   ========================================================= */

function CondominiumsPage(props: any) {
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
    condominiumName,
    onEditDeadline,
    onEditDocument,
    onEditAssembly,
    onEditSupplier,
    onEditActivity,
    onDeleteDeadline,
    onDeleteDocument,
    onDeleteAssembly,
    onDeleteSupplier,
    onDeleteActivity,
    onStatusDeadline,
    onStatusAssembly,
    onStatusActivity,
  } = props;

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
        {condominiums.length} di {allCount}{" "}
        condomini visualizzati
      </div>

      <section className="cards-grid">
        {condominiums.length === 0 ? (
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

                <h2>{c.name}</h2>

                <p>
                  {c.address}
                  <br />
                  {c.cap} {c.city}{" "}
                  {c.province &&
                    `(${c.province})`}
                </p>

                <div className="meta">
                  🏠 {c.units} unità
                </div>

                <div className="button-row">
                  <button
                    className="secondary-button"
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

      {selected && (
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
          condominiumName={
            condominiumName
          }
          onEditDeadline={onEditDeadline}
          onEditDocument={onEditDocument}
          onEditAssembly={onEditAssembly}
          onEditSupplier={onEditSupplier}
          onEditActivity={onEditActivity}
          onDeleteDeadline={onDeleteDeadline}
          onDeleteDocument={onDeleteDocument}
          onDeleteAssembly={onDeleteAssembly}
          onDeleteSupplier={onDeleteSupplier}
          onDeleteActivity={onDeleteActivity}
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
      )}
    </>
  );
}

function CondominiumDetails(props: any) {
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
    onEditDeadline,
    onEditDocument,
    onEditAssembly,
    onEditSupplier,
    onEditActivity,
    onDeleteDeadline,
    onDeleteDocument,
    onDeleteAssembly,
    onDeleteSupplier,
    onDeleteActivity,
    onStatusDeadline,
    onStatusAssembly,
    onStatusActivity,
  } = props;

  return (
    <section className="detail-card">
      <div className="section-title">
        <div>
          <div className="eyebrow">
            Scheda condominio
          </div>

          <h2>{item.name}</h2>
        </div>

        <button
          className="link"
          onClick={onClose}
        >
          Chiudi
        </button>
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

      {/* SCADENZE COLLEGATE */}

      <RelatedSection
        title="Scadenze"
        count={deadlines.length}
      >
        {deadlines.length === 0 ? (
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
                    ? currency(d.amount)
                    : "Nessun importo"
                }`}
                badge={d.status}
                onEdit={() =>
                  onEditDeadline(d)
                }
                onDelete={() =>
                  onDeleteDeadline(d.id)
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

      {/* DOCUMENTI COLLEGATI */}

      <RelatedSection
        title="Documenti"
        count={documents.length}
      >
        {documents.length === 0 ? (
          <Empty text="Nessun documento collegato." />
        ) : (
          documents.map(
            (d: DocumentItem) => (
              <RelatedRow
                key={d.id}
                title={d.name}
                subtitle={`${d.category} · ${formatDate(
                  d.date
                )} · ${d.size || "Dimensione non disponibile"}`}
                onEdit={() =>
                  onEditDocument(d)
                }
                onDelete={() =>
                  onDeleteDocument(d.id)
                }
              />
            )
          )
        )}
      </RelatedSection>

      {/* ASSEMBLEE COLLEGATE */}

      <RelatedSection
        title="Assemblee"
        count={assemblies.length}
      >
        {assemblies.length === 0 ? (
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
                  a.time || "Ora non definita"
                } · ${
                  a.place ||
                  "Luogo non definito"
                }`}
                badge={a.status}
                onEdit={() =>
                  onEditAssembly(a)
                }
                onDelete={() =>
                  onDeleteAssembly(a.id)
                }
              >
                <select
                  value={a.status}
                  onChange={(e) =>
                    onStatusAssembly(
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
              </RelatedRow>
            )
          )
        )}
      </RelatedSection>

      {/* FORNITORI COLLEGATI */}

      <RelatedSection
        title="Fornitori"
        count={suppliers.length}
      >
        {suppliers.length === 0 ? (
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
                  onEditSupplier(s)
                }
                onDelete={() =>
                  onDeleteSupplier(s.id)
                }
              />
            )
          )
        )}
      </RelatedSection>

      {/* ATTIVITÀ COLLEGATE */}

      <RelatedSection
        title="Attività"
        count={activities.length}
      >
        {activities.length === 0 ? (
          <Empty text="Nessuna attività collegata." />
        ) : (
          activities.map(
            (a: Activity) => (
              <RelatedRow
                key={a.id}
                title={a.title}
                subtitle={`Scadenza ${
                  formatDate(a.dueDate)
                }`}
                badge={a.priority}
                onEdit={() =>
                  onEditActivity(a)
                }
                onDelete={() =>
                  onDeleteActivity(a.id)
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
        <h3>{title}</h3>
        <span>{count}</span>
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
        <b>{title}</b>
        <small>{subtitle}</small>

        {badge && (
          <Badge value={badge} />
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
}: any) {
  const filtered = documents.filter(
    (d: DocumentItem) =>
      `${d.name} ${d.category} ${condominiumName(
        d.condominiumId
      )} ${d.notes}`
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
  );

  return (
    <>
      <PageHeader
        eyebrow="Archivio digitale"
        title="Documenti"
        action="+ Nuovo documento"
        onAction={onNew}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca documento, categoria o condominio..."
      />

      <div className="table-card">
        <div className="table-head">
          <b>Documento</b>
          <b>Condominio</b>
          <b>Categoria</b>
          <b>Data</b>
          <b>Azioni</b>
        </div>

        {filtered.map(
          (d: DocumentItem) => (
            <div
              className="table-row"
              key={d.id}
            >
              <div>
                📄 <b>{d.name}</b>

                <small>
                  {d.size || "Dimensione non disponibile"}
                </small>

                {d.notes && (
                  <small>
                    {d.notes}
                  </small>
                )}
              </div>

              <span>
                {condominiumName(
                  d.condominiumId
                )}
              </span>

              <span>
                {d.category}
              </span>

              <span>
                {formatDate(d.date)}
              </span>

              <div className="table-actions">
                <button
                  className="mini-edit"
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
                  Elimina
                </button>
              </div>
            </div>
          )
        )}

        {filtered.length === 0 && (
          <Empty text="Nessun documento trovato." />
        )}
      </div>
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
  const filtered = deadlines
    .filter(
      (d: Deadline) =>
        `${d.title} ${d.category} ${condominiumName(
          d.condominiumId
        )} ${d.notes}`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    )
    .sort((a: Deadline, b: Deadline) =>
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

      <div className="cards-list">
        {filtered.map(
          (d: Deadline) => (
            <article
              className="row-card"
              key={d.id}
            >
              <div>
                <b>{d.title}</b>

                <small>
                  {condominiumName(
                    d.condominiumId
                  )}{" "}
                  · {d.category}
                </small>

                <span>
                  {d.amount
                    ? currency(d.amount)
                    : "Nessun importo"}{" "}
                  ·{" "}
                  {formatDate(d.dueDate)}
                </span>

                {d.notes && (
                  <small>
                    {d.notes}
                  </small>
                )}
              </div>

              <div className="row-actions">
                <Badge value={d.status} />

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

        {filtered.length === 0 && (
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
}: any) {
  const filtered = assemblies
    .filter(
      (a: Assembly) =>
        `${a.title} ${a.place} ${a.status} ${condominiumName(
          a.condominiumId
        )} ${a.notes}`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    )
    .sort((a: Assembly, b: Assembly) =>
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

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Cerca assemblea, luogo o condominio..."
      />

      <div className="cards-list">
        {filtered.map(
          (a: Assembly) => (
            <article
              className="row-card"
              key={a.id}
            >
              <div>
                <b>{a.title}</b>

                <small>
                  {condominiumName(
                    a.condominiumId
                  )}
                </small>

                <span>
                  📅{" "}
                  {formatDate(a.date)} ·{" "}
                  {a.time || "Ora non definita"}{" "}
                  ·{" "}
                  {a.place ||
                    "Luogo da definire"}
                </span>

                {a.notes && (
                  <small>
                    {a.notes}
                  </small>
                )}
              </div>

              <div className="row-actions">
                <Badge value={a.status} />

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

        {filtered.length === 0 && (
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
  const filtered = suppliers.filter(
    (s: Supplier) =>
      `${s.name} ${s.service} ${s.phone} ${s.email} ${condominiumName(
        s.condominiumId
      )} ${s.notes}`
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

              <h2>{s.name}</h2>

              <p>{s.service}</p>

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

      {filtered.length === 0 && (
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
  const filtered = activities
    .filter(
      (a: Activity) =>
        `${a.title} ${a.priority} ${a.status} ${condominiumName(
          a.condominiumId
        )} ${a.notes}`
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    )
    .sort((a: Activity, b: Activity) =>
      (a.dueDate || "9999").localeCompare(
        b.dueDate || "9999"
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

      <div className="cards-list">
        {filtered.map(
          (a: Activity) => (
            <article
              className="row-card"
              key={a.id}
            >
              <div>
                <b>{a.title}</b>

                <small>
                  {condominiumName(
                    a.condominiumId
                  )}{" "}
                  · Scadenza{" "}
                  {formatDate(a.dueDate)}
                </small>

                <span>
                  <Badge
                    value={a.priority}
                  />{" "}
                  &nbsp;
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

        {filtered.length === 0 && (
          <Empty text="Nessuna attività trovata." />
        )}
      </div>
    </>
  );
}

/* =========================================================
   PROFILO
   ========================================================= */

function ProfilePage({
  profile,
  setProfile,
}: any) {
  const [saved, setSaved] =
    useState(false);

  const save = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      profile.email &&
      !validateEmail(profile.email)
    ) {
      alert("Controlla l'indirizzo email.");
      return;
    }

    setSaved(true);

    setTimeout(
      () => setSaved(false),
      1800
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Impostazioni"
        title="Amministratore"
      />

      <form
        className="form-card"
        onSubmit={save}
      >
        <div className="form-grid">
          <Field
            full
            label="Nome e cognome"
            value={profile.name}
            onChange={(v: string) =>
              setProfile({
                ...profile,
                name: v,
              })
            }
          />

          <Field
            full
            label="Studio / società"
            value={profile.company}
            onChange={(v: string) =>
              setProfile({
                ...profile,
                company: v,
              })
            }
          />

          <Field
            label="Email"
            type="email"
            value={profile.email}
            onChange={(v: string) =>
              setProfile({
                ...profile,
                email: v,
              })
            }
          />

          <Field
            label="Telefono"
            type="tel"
            value={profile.phone}
            onChange={(v: string) =>
              setProfile({
                ...profile,
                phone: v,
              })
            }
          />

          <Field
            full
            label="Indirizzo"
            value={profile.address}
            onChange={(v: string) =>
              setProfile({
                ...profile,
                address: v,
              })
            }
          />

          <Field
            label="Codice fiscale"
            value={profile.fiscalCode}
            onChange={(v: string) =>
              setProfile({
                ...profile,
                fiscalCode: v,
              })
            }
          />

          <Field
            label="Partita IVA"
            value={profile.vat}
            onChange={(v: string) =>
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

      <div className="info-card">
        <b>Memorizzazione locale</b>

        <p>
          I dati di questa versione
          vengono salvati nel browser
          del dispositivo tramite
          localStorage.
        </p>

        <p>
          Per rendere BETHAG
          realmente multi-dispositivo,
          con utenti, database cloud e
          documenti accessibili da più
          dispositivi, servirà in seguito
          collegare un backend.
        </p>
      </div>
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
          onChange={(v: string) =>
            set("name", v)
          }
          placeholder="Es. Condominio Magnolia"
        />

        <Field
          full
          label="Indirizzo *"
          value={value.address}
          onChange={(v: string) =>
            set("address", v)
          }
          placeholder="Via e numero civico"
        />

        <Field
          label="CAP"
          value={value.cap}
          onChange={(v: string) =>
            set("cap", v)
          }
        />

        <Field
          label="Comune"
          value={value.city}
          onChange={(v: string) =>
            set("city", v)
          }
        />

        <Field
          label="Provincia"
          value={value.province}
          onChange={(v: string) =>
            set("province", v)
          }
        />

        <Field
          label="Unità immobiliari *"
          value={value.units}
          onChange={(v: string) =>
            set(
              "units",
              v.replace(/\D/g, "")
            )
          }
          type="number"
        />

        <Field
          full
          label="Codice fiscale del condominio"
          value={value.fiscalCode}
          onChange={(v: string) =>
            set("fiscalCode", v)
          }
        />

        <Field
          label="Referente"
          value={value.contact}
          onChange={(v: string) =>
            set("contact", v)
          }
        />

        <Field
          label="Telefono"
          value={value.phone}
          onChange={(v: string) =>
            set("phone", v)
          }
          type="tel"
        />

        <Field
          full
          label="Email"
          value={value.email}
          onChange={(v: string) =>
            set("email", v)
          }
          type="email"
        />

        <Field
          label="Banca"
          value={value.bank}
          onChange={(v: string) =>
            set("bank", v)
          }
        />

        <Field
          label="IBAN"
          value={value.iban}
          onChange={(v: string) =>
            set("iban", v)
          }
        />

        <Field
          full
          label="Note"
          value={value.notes}
          onChange={(v: string) =>
            set("notes", v)
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
          onChange={(v: string) =>
            setValue({
              ...value,
              title: v,
            })
          }
        />

        <SelectField
          label="Condominio"
          value={value.condominiumId}
          onChange={(v: string) =>
            setValue({
              ...value,
              condominiumId:
                Number(v),
            })
          }
          options={condominiums.map(
            (c: Condominium) => [
              c.id,
              c.name,
            ]
          )}
        />

        <Field
          label="Data *"
          value={value.dueDate}
          onChange={(v: string) =>
            setValue({
              ...value,
              dueDate: v,
            })
          }
          type="date"
        />

        <Field
          label="Importo (€)"
          value={value.amount}
          onChange={(v: string) =>
            setValue({
              ...value,
              amount: v,
            })
          }
          type="number"
        />

        <Field
          label="Categoria"
          value={value.category}
          onChange={(v: string) =>
            setValue({
              ...value,
              category: v,
            })
          }
        />

        <SelectField
          label="Stato"
          value={value.status}
          onChange={(v: string) =>
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
          ].map((x) => [
            x,
            x,
          ])}
        />

        <Field
          full
          label="Note"
          value={value.notes}
          onChange={(v: string) =>
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
            File
          </label>

          <input
            type="file"
            onChange={(e: any) => {
              const file =
                e.target.files?.[0];

              if (file) {
                setSelectedFileName(
                  file.name
                );

                setValue({
                  ...value,
                  name: file.name,
                  size: `${Math.round(
                    file.size / 1024
                  )} KB`,
                });
              }
            }}
          />

          {selectedFileName && (
            <small>
              Selezionato:{" "}
              {selectedFileName}
            </small>
          )}
        </div>

        <Field
          full
          label="Nome documento *"
          value={value.name}
          onChange={(v: string) =>
            setValue({
              ...value,
              name: v,
            })
          }
        />

        <SelectField
          label="Condominio"
          value={value.condominiumId}
          onChange={(v: string) =>
            setValue({
              ...value,
              condominiumId:
                Number(v),
            })
          }
          options={condominiums.map(
            (c: Condominium) => [
              c.id,
              c.name,
            ]
          )}
        />

        <Field
          label="Categoria"
          value={value.category}
          onChange={(v: string) =>
            setValue({
              ...value,
              category: v,
            })
          }
        />

        <Field
          label="Data"
          value={value.date}
          onChange={(v: string) =>
            setValue({
              ...value,
              date: v,
            })
          }
          type="date"
        />

        <Field
          full
          label="Note"
          value={value.notes}
          onChange={(v: string) =>
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
          value={value.title}
          onChange={(v: string) =>
            setValue({
              ...value,
              title: v,
            })
          }
        />

        <SelectField
          label="Condominio"
          value={value.condominiumId}
          onChange={(v: string) =>
            setValue({
              ...value,
              condominiumId:
                Number(v),
            })
          }
          options={condominiums.map(
            (c: Condominium) => [
              c.id,
              c.name,
            ]
          )}
        />

        <Field
          label="Data *"
          value={value.date}
          onChange={(v: string) =>
            setValue({
              ...value,
              date: v,
            })
          }
          type="date"
        />

        <Field
          label="Ora"
          value={value.time}
          onChange={(v: string) =>
            setValue({
              ...value,
              time: v,
            })
          }
          type="time"
        />

        <Field
          label="Luogo"
          value={value.place}
          onChange={(v: string) =>
            setValue({
              ...value,
              place: v,
            })
          }
        />

        <SelectField
          label="Stato"
          value={value.status}
          onChange={(v: string) =>
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
          ].map((x) => [
            x,
            x,
          ])}
        />

        <Field
          full
          label="Note"
          value={value.notes}
          onChange={(v: string) =>
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
          onChange={(v: string) =>
            setValue({
              ...value,
              name: v,
            })
          }
        />

        <Field
          label="Servizio *"
          value={value.service}
          onChange={(v: string) =>
            setValue({
              ...value,
              service: v,
            })
          }
        />

        <Field
          label="Telefono"
          value={value.phone}
          onChange={(v: string) =>
            setValue({
              ...value,
              phone: v,
            })
          }
          type="tel"
        />

        <Field
          label="Email"
          value={value.email}
          onChange={(v: string) =>
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
          onChange={(v: string) =>
            setValue({
              ...value,
              condominiumId: v
                ? Number(v)
                : null,
            })
          }
          options={[
            ["", "Tutti i condomini"],
            ...condominiums.map(
              (c: Condominium) => [
                c.id,
                c.name,
              ]
            ),
          ]}
        />

        <Field
          full
          label="Note"
          value={value.notes}
          onChange={(v: string) =>
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
          value={value.title}
          onChange={(v: string) =>
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
          onChange={(v: string) =>
            setValue({
              ...value,
              condominiumId: v
                ? Number(v)
                : null,
            })
          }
          options={[
            ["", "Tutti i condomini"],
            ...condominiums.map(
              (c: Condominium) => [
                c.id,
                c.name,
              ]
            ),
          ]}
        />

        <Field
          label="Scadenza"
          value={value.dueDate}
          onChange={(v: string) =>
            setValue({
              ...value,
              dueDate: v,
            })
          }
          type="date"
        />

        <SelectField
          label="Priorità"
          value={value.priority}
          onChange={(v: string) =>
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
          ].map((x) => [
            x,
            x,
          ])}
        />

        <SelectField
          label="Stato"
          value={value.status}
          onChange={(v: string) =>
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
          ].map((x) => [
            x,
            x,
          ])}
        />

        <Field
          full
          label="Note"
          value={value.notes}
          onChange={(v: string) =>
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

      <h2>{title}</h2>
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
      <label>{label}</label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
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
      <label>{label}</label>

      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map(
          (x: any) => (
            <option
              key={String(x[0])}
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
  width:250px;
  flex-shrink:0;
  background:#111827;
  color:#fff;
  padding:28px 18px;
  display:flex;
  flex-direction:column;
}

.logo{
  font-size:28px;
  font-weight:800;
  letter-spacing:1px;
  padding:0 12px 34px;
}

.logo span{
  color:#7c9cff;
}

.nav{
  display:flex;
  flex-direction:column;
  gap:7px;
}

.nav-item{
  border:0;
  background:transparent;
  color:#cbd5e1;
  text-align:left;
  padding:13px 14px;
  border-radius:10px;
  font-size:15px;
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

.eyebrow{
  color:#64748b;
  font-size:14px;
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
  grid-template-columns:repeat(3,1fr);
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

.card,
.form-card,
.detail-card,
.search-card,
.table-card,
.info-card{
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

.mini-edit{
  border:1px solid #dbe2ea;
  background:#fff;
  color:#334155;
  padding:6px 10px;
  border-radius:8px;
  font-size:12px;
  font-weight:600;
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

.table-card{
  padding:0;
  overflow:hidden;
}

.table-head,
.table-row{
  display:grid;
  grid-template-columns:2fr 1.3fr 1fr 1fr 1.2fr;
  gap:12px;
  align-items:center;
  padding:15px 18px;
}

.table-head{
  background:#f8fafc;
  color:#64748b;
  font-size:12px;
}

.table-row{
  border-top:1px solid #eef2f7;
  font-size:13px;
}

.table-row small{
  display:block;
  color:#64748b;
  margin-top:3px;
}

.table-actions{
  display:flex;
  gap:5px;
  flex-wrap:wrap;
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

/* =========================================================
   SEZIONI COLLEGATE
   ========================================================= */

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

/* =========================================================
   MENU MOBILE
   ========================================================= */

.mobile-menu-backdrop{
  display:none;
}

@media(max-width:1050px){

  .cards-grid{
    grid-template-columns:repeat(2,1fr);
  }

  .stats{
    grid-template-columns:repeat(2,1fr);
  }
}

@media(max-width:850px){

  .sidebar{
    display:none;
  }

  .content{
    padding:12px 15px 35px;
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
    width:min(310px,88vw);
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
    margin-top:28px;
  }

  .mobile-nav .nav-item{
    padding:15px;
    font-size:16px;
  }

  .dashboard-grid{
    grid-template-columns:1fr;
  }

  .ai-card{
    align-items:flex-start;
    flex-direction:column;
  }

  .topbar,
  .page-header{
    align-items:flex-start;
  }

  h1{
    font-size:26px;
  }
}

@media(max-width:650px){

  .stats,
  .cards-grid,
  .form-grid,
  .detail-grid,
  .mini-stats{
    grid-template-columns:1fr;
  }

  .page-header{
    flex-direction:column;
  }

  .page-header .primary-button{
    width:100%;
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

  .table-head{
    display:none;
  }

  .table-row{
    grid-template-columns:1fr 1fr;
    padding:15px;
  }

  .table-row>*:nth-child(1){
    grid-column:1/-1;
  }

  .table-actions{
    grid-column:1/-1;
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
}
`;

/* =========================================================
   RENDER
   ========================================================= */

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
