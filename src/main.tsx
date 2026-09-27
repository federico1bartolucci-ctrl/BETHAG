import React from "react";
import ReactDOM from "react-dom/client";

const stats = [
  { label: "Condomìni", value: "12", icon: "🏢" },
  { label: "Scadenze", value: "8", icon: "📅" },
  { label: "Documenti", value: "246", icon: "📁" },
  { label: "Attività aperte", value: "14", icon: "✓" },
];

const deadlines = [
  { title: "Pagamento assicurazione", building: "Condominio Aurora", date: "28 settembre", type: "Urgente" },
  { title: "Invio convocazione assemblea", building: "Residenza Europa", date: "30 settembre", type: "In programma" },
  { title: "Manutenzione ascensore", building: "Condominio Verdi", date: "3 ottobre", type: "In programma" },
];

const activities = [
  "Nuovo documento ricevuto da Condominio Aurora",
  "Preventivo manutenzione aggiunto",
  "Assemblea di Residenza Europa aggiornata",
];

function App() {
  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f5f7fb;
          color: #172033;
        }

        button {
          font: inherit;
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
          cursor: pointer;
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
          cursor: pointer;
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
          padding-bottom: 0;
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
          background: linear-gradient(135deg, #111827, #263454);
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

        @media (max-width: 850px) {
          .sidebar {
            display: none;
          }

          .content {
            padding: 20px 15px 35px;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .topbar {
            align-items: flex-start;
          }

          h1 {
            font-size: 25px;
          }
        }

        @media (max-width: 480px) {
          .stats {
            gap: 10px;
          }

          .card {
            padding: 15px;
          }

          .stat-value {
            font-size: 25px;
          }

          .profile {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            BET<span>H</span>AG
          </div>

          <nav className="nav">
            <button className="nav-item active">⌂ Dashboard</button>
            <button className="nav-item">🏢 Condomini</button>
            <button className="nav-item">📁 Documenti</button>
            <button className="nav-item">📅 Scadenze</button>
            <button className="nav-item">👥 Assemblee</button>
            <button className="nav-item">🔧 Fornitori</button>
            <button className="nav-item">✓ Attività</button>
          </nav>

          <div className="sidebar-bottom">
            BETHAG AI<br />
            <small>Assistente intelligente</small>
          </div>
        </aside>

        <main className="content">
          <header className="topbar">
            <div>
              <div className="eyebrow">Area amministratore</div>
              <h1>Buongiorno 👋</h1>
            </div>

            <div className="profile">Amministratore</div>
          </header>

          <section className="stats">
            {stats.map((stat) => (
              <div className="card" key={stat.label}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </section>

          <section className="grid">
            <div className="card">
              <div className="section-title">
                <h2>Prossime scadenze</h2>
                <button className="link">Vedi tutte</button>
              </div>

              {deadlines.map((item) => (
                <div className="deadline" key={item.title}>
                  <div>
                    <div className="deadline-title">{item.title}</div>
                    <div className="deadline-building">{item.building}</div>
                    <span className={`badge ${item.type === "Urgente" ? "urgent" : ""}`}>
                      {item.type}
                    </span>
                  </div>

                  <div className="deadline-date">{item.date}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-title">
                <h2>Attività recenti</h2>
                <button className="link">Vedi tutte</button>
              </div>

              {activities.map((activity) => (
                <div className="activity" key={activity}>
                  {activity}
                </div>
              ))}
            </div>
          </section>

          <section className="ai-card">
            <h2>✨ BETHAG AI</h2>
            <p>
              Il tuo assistente per organizzare documenti, scadenze,
              comunicazioni e attività dei condomìni.
            </p>
            <button className="ai-button">Presto disponibile</button>
          </section>
        </main>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
