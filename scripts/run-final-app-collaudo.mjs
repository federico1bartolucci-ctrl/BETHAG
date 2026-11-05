import { execFileSync } from "node:child_process";

const suites = [
  ["APP-01..04 and APP-13 — authenticated access, RLS and storage", "scripts/test-current-qa-authenticated-rls.mjs"],
  ["APP-05..07 — accounting and installments", "scripts/test-current-qa-app05-07.mjs"],
  ["APP-08..11 — transfer, authorization and financial-position guards", "scripts/test-current-qa-transfer.mjs"],
  ["APP-09 — member-level and unit-level carryovers", "scripts/test-current-qa-app09-carryovers.mjs"],
  ["APP-12 — communication publication and recipient visibility (no real email send)", "scripts/test-current-qa-app12.mjs"],
  ["APP-05/06/08/12 — authenticated browser workflows", "scripts/test-current-qa-browser-workflows.mjs"],
  ["APP-15 — role navigation, refresh and session persistence", "scripts/test-current-qa-navigation.mjs"],
];

console.log("BETHAG FINAL APP COLLAUDO — sequential execution on existing QA only");
console.log("Each suite owns its uniquely marked fixtures and must finish cleanup before the next suite.");
for (const [label, script] of suites) {
  console.log("\n=== " + label + " ===");
  execFileSync(process.execPath, [script], { stdio: "inherit", env: process.env });
}
console.log("\nBETHAG FINAL APP COLLAUDO: all automated suites completed. APP-12 provider delivery and APP-14 Production gate remain separate explicit sign-offs.");
