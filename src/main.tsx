import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <main>
      <h1>BETHAG</h1>
      <p>Gestione intelligente per amministratori di condominio.</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
