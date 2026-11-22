import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/InsurancePoliciesSection.tsx", "utf8");
const saveHandler = source.slice(source.indexOf("const save = async"), source.indexOf("const remove = async"));
assert.match(saveHandler, /Number\.isFinite\(form\.premium\)/, "Premium must be finite");
assert.match(saveHandler, /form\.premium < 0/, "Premium cannot be negative");
assert.match(saveHandler, /Number\.isFinite\(form\.deductible\)/, "Deductible must be finite");
assert.match(saveHandler, /form\.deductible < 0/, "Deductible cannot be negative");
assert.match(saveHandler, /form\.start_date > form\.end_date/, "Start date cannot be after end date");
assert.ok(saveHandler.indexOf("form.start_date > form.end_date") < saveHandler.indexOf("setSaving(true)"), "Validation must run before saving begins");

const statusHelper = source.slice(source.indexOf("function effectiveStatus"), source.indexOf("function money"));
assert.match(statusHelper, /startDate && startDate > today/, "Future-start policies must not be marked active");
assert.match(source, /effectiveStatus\(p\.start_date \|\| "", p\.end_date \|\| "", p\.active\)/, "Summary must use policy start date");
assert.match(source, /effectiveStatus\(policy\.start_date \|\| "", policy\.end_date \|\| "", policy\.active\)/, "Policy card must use policy start date");

console.log("Insurance policy validation regression checks passed.");
