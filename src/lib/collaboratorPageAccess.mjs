const PAGE_PERMISSIONS = Object.freeze({
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
});

const ADMIN_ONLY_PAGES = new Set([
  "archivio",
  "contabilita",
  "registro",
  "abbonamento",
  "amministratore",
  "collaboratori",
]);
const PAGES_ALLOWED_WITHOUT_MODULE = new Set(["homepage", "impostazioni", "aiuto"]);

export function canCollaboratorAccessPage(target, permissions) {
  if (ADMIN_ONLY_PAGES.has(target)) return false;
  if (PAGES_ALLOWED_WITHOUT_MODULE.has(target)) return true;
  const requiredPermission = PAGE_PERMISSIONS[target];
  return typeof requiredPermission === "string" && permissions.includes(requiredPermission);
}
