import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateInsurancePolicyForm } from "../src/lib/insurancePolicyValidation.mjs";

const valid = {
  company_name: "  Compagnia Alfa  ",
  policy_number: " POL-2026-01 ",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  premium: 1250.50,
  deductible: 250,
};

assert.equal(validateInsurancePolicyForm(valid), null, "valid policy dates and non-negative amounts must be accepted");
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "2027-01-01", end_date: "2026-12-31" }),
  "La scadenza della polizza non può precedere la decorrenza.",
  "an expiry before inception must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "2026-02-29" }),
  "Data di decorrenza non valida.",
  "an impossible non-leap-year date must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, end_date: "2026-04-31" }),
  "Data di scadenza non valida.",
  "an impossible calendar date must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "2028-02-29", end_date: "2028-02-29" }),
  null,
  "a real leap day and same-day coverage must be accepted",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, start_date: "", end_date: "" }),
  null,
  "optional dates may remain blank",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, premium: -0.01 }),
  "Il premio deve essere un importo finito e non negativo.",
  "negative premium must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, premium: Number.NaN }),
  "Il premio deve essere un importo finito e non negativo.",
  "non-finite premium must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, deductible: -1 }),
  "La franchigia deve essere un importo finito e non negativo.",
  "negative deductible must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, premium: null, deductible: null }),
  null,
  "optional monetary values may remain blank",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, company_name: "  " }),
  "Compila compagnia assicurativa e numero polizza.",
  "blank company name must be rejected",
);
assert.equal(
  validateInsurancePolicyForm({ ...valid, policy_number: "" }),
  "Compila compagnia assicurativa e numero polizza.",
  "blank policy number must be rejected",
);

const source = await readFile("src/InsurancePoliciesSection.tsx", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const save = source.slice(source.indexOf("const save = async"), source.indexOf("const remove = async"));
assert.match(save, /validateInsurancePolicyForm\(form\)[\s\S]*if \(validationError\)[\s\S]*setSaving\(true\)/, "validation must run before any save begins");
assert.ok(save.indexOf("validateInsurancePolicyForm(form)") < save.indexOf(".insert(payload)"), "invalid policies must be rejected before database insertion");
assert.ok(save.indexOf("validateInsurancePolicyForm(form)") < save.indexOf("updateInsurancePolicy("), "invalid policies must be rejected before database update");
assert.equal((packageJson.scripts.test.match(/test-insurance-policy-date-validation\.mjs/g) || []).length, 1, "the regression must be registered exactly once in npm test");

console.log("Insurance policy date-range and monetary validation regression: PASS");
