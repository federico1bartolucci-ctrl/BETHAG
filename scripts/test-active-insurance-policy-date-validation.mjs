import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateInsurancePolicyForm } from "../src/lib/insurancePolicyValidation.mjs";

const valid = {
  company_name: "Compagnia Alfa",
  policy_number: "POL-2026-01",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  premium: "1250.50",
  deductible: "250",
};

assert.equal(validateInsurancePolicyForm(valid), null);
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "2027-01-01", end_date: "2026-12-31" }),
  "La scadenza della polizza non può precedere la decorrenza.",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "2026-02-29" }),
  "Data di decorrenza non valida.",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, end_date: "2026-04-31" }),
  "Data di scadenza non valida.",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, premium: "-0.01" }),
  "Il premio deve essere un importo finito e non negativo.",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, deductible: "Infinity" }),
  "La franchigia deve essere un importo finito e non negativo.",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "", end_date: "", premium: "", deductible: "" }),
  null,
);

const main = await readFile(new URL("../src/main.tsx", import.meta.url), "utf8");
const componentStart = main.lastIndexOf("function InsurancePoliciesSection(");
assert.ok(componentStart >= 0, "active inline insurance component must exist");
const saveStart = main.indexOf("const savePolicy = async () => {", componentStart);
const editStart = main.indexOf("const editPolicy =", saveStart);
assert.ok(saveStart > componentStart && editStart > saveStart, "active save handler must exist");
const save = main.slice(saveStart, editStart);
assert.match(main, /import \{ validateInsurancePolicyForm \} from ["']\.\/lib\/insurancePolicyValidation\.mjs["']/);
assert.match(save, /const validationError = validateInsurancePolicyForm\(form\)/);
const validationAt = save.indexOf("validateInsurancePolicyForm(form)");
assert.ok(validationAt >= 0);
for (const persistence of ['.insert(payload)', 'updateInsurancePolicy(']) {
  const persistenceAt = save.indexOf(persistence);
  assert.ok(persistenceAt > validationAt, `${persistence} must remain after validation`);
}
assert.ok(validationAt < save.indexOf("getActiveWorkspaceId()"), "invalid input must be rejected before resolving persistence context");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.equal(
  (packageJson.scripts.test.match(/test-active-insurance-policy-date-validation\.mjs/g) || []).length,
  1,
  "active-component regression must be registered exactly once in npm test",
);
console.log("Active insurance policy date and amount validation regression: PASS");
