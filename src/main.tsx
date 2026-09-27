import React, { useState } from "react";
import ReactDOM from "react-dom/client";

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
  notes: string;
};

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
    notes: "",
  },
];

const deadlines = [
  {
    title: "Pagamento assicurazione",
    building: "Condominio Aurora",
    date: "28 settembre",
    type: "Urgente",
  },
  {
    title: "Invio convocazione assemblea",
    building: "Residenza Europa",
    date: "30 settembre",
    type: "In programma",
  },
  {
    title: "Manutenzione ascensore",
    building: "Condominio Verdi",
    date: "3 ottobre",
    type: "In programma",
  },
];

const activities = [
  "Nuovo documento ricevuto da Condominio Aurora",
  "Preventivo manutenzione aggiunto",
  "Assemblea di Residenza Europa aggiornata",
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [condominiums, setCondominiums] =
    useState<Condominium[]>(initialCondominiums);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Condominium | null>(null);

  const [form, setForm] = useState({
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
    notes: "",
  });

  function updateForm(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function saveCondominium(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim() || !form.address.trim()) {
      alert("Inserisci almeno il nome e l'indirizzo del condominio.");
      return;
    }

    const newCondominium: Condominium = {
      id: Date.now(),
      ...form,
    };

    setCondominiums((current) => [
      ...current,
      newCondominium,
    ]);

    setForm({
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
      notes: "",
    });

    setShowForm(false);
    setSelected(newCondominium);
  }

  function openCondominiums() {
    setPage("condomini");
    setShowForm(false);
    setSelected(null);
  }

  function openDashboard() {
    setPage("dashboard");
    setShowForm(false);
    setSelected(null);
  }

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          background: #f5f7fb;
          color: #172033;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .app {
          min-height: 100vh;
          display: flex;
        }

        .sidebar {
          width: 250px;
          background: #111827;
          color: white;
          padding: 28px 18px;
          display: flex;
          flex-direction: column;
        }

        .logo {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 1px;
          padding: 0 12px 34px;
        }

        .logo span {
          color: #7c9cff;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .nav-item {
          border: 0;
          background: transparent;
          color: #cbd5e1;
          text-align: left;
          padding: 13px 14px;
          border-radius: 10px;
          font-size: 15px;
        }

        .nav-item.active,
        .nav-item:hover {
          background: #1f2937;
          color: white;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding: 14px;
          border-top: 1px solid #273244;
          color: #94a3b8;
          font-size: 13px;
        }

        .content {
          flex: 1;
          padding: 30px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }

        .eyebrow {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 5px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
        }

        .profile {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
        }

        .stat-icon {
          font-size: 24px;
        }

        .stat-value {
          font-size: 30px;
          font-weight: 750;
          margin-top: 14px;
        }

        .stat-label {
          color: #64748b;
          font-size: 14px;
          margin-top: 4px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 20px;
        }

        .section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 16px;
        }

        .section-title h2 {
          font-size: 19px;
          margin: 0;
        }

        .link {
          border: 0;
          background: transparent;
          color: #526dfe;
          font-size: 13px;
        }

        .deadline {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid #eef2f7;
        }

        .deadline:last-child {
          border-bottom: 0;
        }

        .deadline-title {
          font-weight: 650;
          font-size: 14px;
        }

        .deadline-building {
          color: #64748b;
          font-size: 13px;
          margin-top: 5px;
        }

        .deadline-date {
          text-align: right;
          white-space: nowrap;
          font-size: 13px;
          color: #475569;
        }

        .badge {
          display: inline-block;
          margin-top: 6px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          background: #eef2ff;
          color: #4f46e5;
        }

        .badge.urgent {
          background: #fff1f2;
          color: #be123c;
        }

        .activity {
          padding: 14px 0;
          border-bottom: 1px solid #eef2f7;
          font-size: 14px;
          line-height: 1.45;
        }

        .activity:last-child {
          border-bottom: 0;
        }

        .ai-card {
          margin-top: 20px;
          background: linear-gradient(
            135deg,
            #111827,
            #263454
          );
          color: white;
          border-radius: 18px;
          padding: 24px;
        }

        .ai-card h2 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .ai-card p {
          color: #cbd5e1;
          margin: 0 0 18px;
          line-height: 1.5;
          font-size: 14px;
        }

        .ai-button {
          border: 0;
          border-radius: 10px;
          background: white;
          color: #111827;
          padding: 11px 15px;
          font-weight: 700;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .page-header h1 {
          margin: 0;
        }

        .primary-button {
          border: 0;
          background: #526dfe;
          color: white;
          padding: 12px 17px;
          border-radius: 10px;
          font-weight: 700;
        }

        .secondary-button {
          border: 1px solid #dbe2ea;
          background: white;
          color: #334155;
          padding: 11px 16px;
          border-radius: 10px;
          font-weight: 600;
        }

        .condominiums {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .condominium-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
        }

        .condominium-card h2 {
          font-size: 18px;
          margin: 0 0 8px;
        }

        .address {
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .units {
          margin-top: 16px;
          font-size: 13px;
          color: #475569;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 18px;
        }

        .form-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 22px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-size: 13px;
          font-weight: 650;
          color: #334155;
        }

        .field input,
        .field textarea {
          width: 100%;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          padding: 12px;
          background: #fff;
          color: #172033;
          outline: none;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: #526dfe;
          box-shadow: 0 0 0 3px rgba(82, 109, 254, 0.12);
        }

        .field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        .detail-card {
          margin-top: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .detail-label {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .detail-value {
          font-weight: 600;
        }

        @media (max-width: 1000px) {
          .condominiums {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 850px) {
          .sidebar {
            display: none;
          }

          .content {
            padding: 20px 15px 35px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .topbar,
          .page-header {
            align-items: flex-start;
          }

          h1 {
            font-size: 25px;
          }
        }

        @media (max-width: 600px) {
          .stats,
          .condominiums,
          .form-grid,
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .page-header {
            flex-direction: column;
          }

          .page-header .primary-button {
            width: 100%;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }
        }
      `}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            BET<span>H</span>AG
          </div>

          <nav className="nav">
            <button
              className={`nav-item ${
                page === "dashboard" ? "active" : ""
              }`}
              onClick={openDashboard}
            >
              ⌂ Dashboard
            </button>

            <button
              className={`nav-item ${
                page === "condomini" ? "active" : ""
              }`}
              onClick={openCondominiums}
            >
              🏢 Condomini
            </button>

            <button className="nav-item">
              📁 Documenti
            </button>

            <button className="nav-item">
              📅 Scadenze
            </button>

            <button className="nav-item">
              👥 Assemblee
            </button>

            <button className="nav-item">
              🔧 Fornitori
            </button>

            <button className="nav-item">
              ✓ Attività
            </button>
          </nav>

          <div className="sidebar-bottom">
            BETHAG AI
            <br />
            <small>Assistente intelligente</small>
          </div>
        </aside>

        <main className="content">

          {page === "dashboard" && (
            <>
              <header className="topbar">
                <div>
                  <div className="eyebrow">
                    Area amministratore
                  </div>

                  <h1>Buongiorno 👋</h1>
                </div>

                <div className="profile">
                  Amministratore
                </div>
              </header>

              <section className="stats">
                <div className="card">
                  <div className="stat-icon">🏢</div>
                  <div className="stat-value">
                    {condominiums.length}
                  </div>
                  <div className="stat-label">
                    Condomini
                  </div>
                </div>

                <div className="card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-value">8</div>
                  <div className="stat-label">
                    Scadenze
                  </div>
                </div>

                <div className="card">
                  <div className="stat-icon">📁</div>
                  <div className="stat-value">246</div>
                  <div className="stat-label">
                    Documenti
                  </div>
                </div>

                <div className="card">
                  <div className="stat-icon">✓</div>
                  <div className="stat-value">14</div>
                  <div className="stat-label">
                    Attività aperte
                  </div>
                </div>
              </section>

              <section className="grid">
                <div className="card">
                  <div className="section-title">
                    <h2>Prossime scadenze</h2>
                    <button className="link">
                      Vedi tutte
                    </button>
                  </div>

                  {deadlines.map((item) => (
                    <div
                      className="deadline"
                      key={item.title}
                    >
                      <div>
                        <div className="deadline-title">
                          {item.title}
                        </div>

                        <div className="deadline-building">
                          {item.building}
                        </div>

                        <span
                          className={`badge ${
                            item.type === "Urgente"
                              ? "urgent"
                              : ""
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>

                      <div className="deadline-date">
                        {item.date}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="section-title">
                    <h2>Attività recenti</h2>
                  </div>

                  {activities.map((activity) => (
                    <div
                      className="activity"
                      key={activity}
                    >
                      {activity}
                    </div>
                  ))}
                </div>
              </section>

              <section className="ai-card">
                <h2>✨ BETHAG AI</h2>

                <p>
                  Il tuo assistente per organizzare
                  documenti, scadenze, comunicazioni e
                  attività dei condomìni.
                </p>

                <button className="ai-button">
                  Presto disponibile
                </button>
              </section>
            </>
          )}

          {page === "condomini" && !showForm && (
            <>
              <div className="page-header">
                <div>
                  <div className="eyebrow">
                    Gestione patrimonio
                  </div>

                  <h1>Condomìni</h1>
                </div>

                <button
                  className="primary-button"
                  onClick={() => setShowForm(true)}
                >
                  + Nuovo condominio
                </button>
              </div>

              <section className="condominiums">
                {condominiums.map((condominium) => (
                  <article
                    className="condominium-card"
                    key={condominium.id}
                  >
                    <h2>{condominium.name}</h2>

                    <div className="address">
                      {condominium.address}
                      <br />
                      {condominium.cap}{" "}
                      {condominium.city}
                      {condominium.province
                        ? ` (${condominium.province})`
                        : ""}
                    </div>

                    <div className="units">
                      🏠 {condominium.units || "—"} unità
                    </div>

                    <div className="card-actions">
                      <button
                        className="secondary-button"
                        onClick={() =>
                          setSelected(condominium)
                        }
                      >
                        Dettagli
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              {selected && (
                <section className="detail-card">
                  <div className="section-title">
                    <h2>{selected.name}</h2>

                    <button
                      className="link"
                      onClick={() => setSelected(null)}
                    >
                      Chiudi
                    </button>
                  </div>

                  <div className="detail-grid">
                    <div>
                      <div className="detail-label">
                        Indirizzo
                      </div>
                      <div className="detail-value">
                        {selected.address}
                      </div>
                    </div>

                    <div>
                      <div className="detail-label">
                        Codice fiscale
                      </div>
                      <div className="detail-value">
                        {selected.fiscalCode || "Non inserito"}
                      </div>
                    </div>

                    <div>
                      <div className="detail-label">
                        Referente
                      </div>
                      <div className="detail-value">
                        {selected.contact || "Non inserito"}
                      </div>
                    </div>

                    <div>
                      <div className="detail-label">
                        Email
                      </div>
                      <div className="detail-value">
                        {selected.email || "Non inserita"}
                      </div>
                    </div>

                    <div>
                      <div className="detail-label">
                        Telefono
                      </div>
                      <div className="detail-value">
                        {selected.phone || "Non inserito"}
                      </div>
                    </div>

                    <div>
                      <div className="detail-label">
                        Unità immobiliari
                      </div>
                      <div className="detail-value">
                        {selected.units || "Non inserito"}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

          {page === "condomini" && showForm && (
            <>
              <div className="page-header">
                <div>
                  <div className="eyebrow">
                    Gestione patrimonio
                  </div>

                  <h1>Nuovo condominio</h1>
                </div>
              </div>

              <form
                className="form-card"
                onSubmit={saveCondominium}
              >
                <div className="form-grid">

                  <div className="field full">
                    <label>
                      Nome del condominio *
                    </label>

                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateForm(
                          "name",
                          event.target.value
                        )
                      }
                      placeholder="Es. Condominio Magnolia"
                    />
                  </div>

                  <div className="field full">
                    <label>Indirizzo *</label>

                    <input
                      value={form.address}
                      onChange={(event) =>
                        updateForm(
                          "address",
                          event.target.value
                        )
                      }
                      placeholder="Via e numero civico"
                    />
                  </div>

                  <div className="field">
                    <label>CAP</label>

                    <input
                      inputMode="numeric"
                      value={form.cap}
                      onChange={(event) =>
                        updateForm(
                          "cap",
                          event.target.value
                        )
                      }
                      placeholder="40100"
                    />
                  </div>

                  <div className="field">
                    <label>Comune</label>

                    <input
                      value={form.city}
                      onChange={(event) =>
                        updateForm(
                          "city",
                          event.target.value
                        )
                      }
                      placeholder="Bologna"
                    />
                  </div>

                  <div className="field">
                    <label>Provincia</label>

                    <input
                      value={form.province}
                      onChange={(event) =>
                        updateForm(
                          "province",
                          event.target.value
                        )
                      }
                      placeholder="BO"
                    />
                  </div>

                  <div className="field">
                    <label>Unità immobiliari</label>

                    <input
                      inputMode="numeric"
                      value={form.units}
                      onChange={(event) =>
                        updateForm(
                          "units",
                          event.target.value
                        )
                      }
                      placeholder="24"
                    />
                  </div>

                  <div className="field full">
                    <label>Codice fiscale del condominio</label>

                    <input
                      value={form.fiscalCode}
                      onChange={(event) =>
                        updateForm(
                          "fiscalCode",
                          event.target.value
                        )
                      }
                      placeholder="Codice fiscale"
                    />
                  </div>

                  <div className="field">
                    <label>Referente</label>

                    <input
                      value={form.contact}
                      onChange={(event) =>
                        updateForm(
                          "contact",
                          event.target.value
                        )
                      }
                      placeholder="Nome e cognome"
                    />
                  </div>

                  <div className="field">
                    <label>Telefono</label>

                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateForm(
                          "phone",
                          event.target.value
                        )
                      }
                      placeholder="+39 ..."
                    />
                  </div>

                  <div className="field full">
                    <label>Email</label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateForm(
                          "email",
                          event.target.value
                        )
                      }
                      placeholder="email@esempio.it"
                    />
                  </div>

                  <div className="field full">
                    <label>Note</label>

                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        updateForm(
                          "notes",
                          event.target.value
                        )
                      }
                      placeholder="Note operative..."
                    />
                  </div>

                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowForm(false)}
                  >
                    Annulla
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    Salva condominio
                  </button>
                </div>
              </form>
            </>
          )}

        </main>
      </div>
    </>
  );
}

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
