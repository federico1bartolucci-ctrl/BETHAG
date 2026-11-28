import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseConsumptionCsv, prepareConsumptionCsvImport } from "../src/lib/consumptionCsv.mjs";
import { parseBethagAmount } from "../src/lib/parseBethagAmount.mjs";

const units = [{ id: "unit-1", condominium_id: "condo-1", unit_code: "A1" }];
const fiscalYears = [{ id: "fy-2026", name: "2026" }];
const header = "Unita;Esercizio;Lettura precedente;Lettura attuale;Consumo;Periodo inizio;Periodo fine;Note";

function legacyParseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if ((character === ';' || character === ',') && !quoted) {
      fields.push(current.trim());
      current = "";
    } else current += character;
  }
  fields.push(current.trim());
  return fields;
}

const semicolonCsv = [
  header,
  "A1;2026;1.234,5;1.244,5;10,0;2026-01-01;2026-01-31;\"lettura; principale, verificata\"",
].join("\r\n");
const legacyHeader = legacyParseCsvLine(header);
const legacyDataRow = legacyParseCsvLine(semicolonCsv.split(/\r?\n/)[1]);
assert.equal(legacyHeader.length, 8);
assert.equal(legacyDataRow.length, 11, "The old parser must reproduce the decimal-comma column split.");
const semicolonParsed = parseConsumptionCsv(semicolonCsv);
assert.equal(semicolonParsed.delimiter, ";");
assert.equal(semicolonParsed.rows[0].length, 8);
assert.equal(semicolonParsed.rows[0][2], "1.234,5");
assert.equal(semicolonParsed.rows[0][7], "lettura; principale, verificata");

const prepared = prepareConsumptionCsvImport(semicolonCsv, {
  workspaceId: "workspace-1",
  condominiumId: "condo-1",
  units,
  fiscalYears,
});
assert.equal(prepared.errors.length, 0);
assert.equal(prepared.rows.length, 1);
assert.equal(prepared.rows[0].previous_reading, 1234.5);
assert.equal(prepared.rows[0].current_reading, 1244.5);
assert.equal(prepared.rows[0].consumption, 10);
assert.equal(prepared.rows[0].unit_id, "unit-1");

const mixedLocaleHeaders = "Unita;Esercizio;Lettura precedente;Lettura attuale;Consumo;Importo";
function prepareMixedLocale(values) {
  return prepareConsumptionCsvImport(mixedLocaleHeaders + "\n" + values.join(";"), {
    workspaceId: "workspace-1",
    condominiumId: "condo-1",
    units,
    fiscalYears,
  });
}

// US grouping + decimal: the previous parser silently turned 1,234.50 into 1.23450.
const usMixedLocale = prepareMixedLocale(["A1", "2026", "1,234.50", "1,244.50", "10.00", "2,500.75"]);
assert.equal(usMixedLocale.errors.length, 0);
assert.equal(usMixedLocale.rows[0].previous_reading, 1234.5);
assert.equal(usMixedLocale.rows[0].current_reading, 1244.5);
assert.equal(usMixedLocale.rows[0].consumption, 10);
assert.equal(usMixedLocale.rows[0].charge_amount, 2500.75);

// Italian grouping + decimal remains correct.
const italianMixedLocale = prepareMixedLocale(["A1", "2026", "1.234,50", "1.244,50", "10,00", "2.500,75"]);
assert.equal(italianMixedLocale.errors.length, 0);
assert.equal(italianMixedLocale.rows[0].previous_reading, 1234.5);
assert.equal(italianMixedLocale.rows[0].current_reading, 1244.5);
assert.equal(italianMixedLocale.rows[0].consumption, 10);
assert.equal(italianMixedLocale.rows[0].charge_amount, 2500.75);

// Multi-group values are parsed in both locales; single-separator legacy semantics stay unchanged.
const usMultiGroup = prepareMixedLocale(["A1", "2026", "1,234,567.89", "1,234,577.89", "10.00", "2,500,750.25"]);
assert.equal(usMultiGroup.errors.length, 0);
assert.equal(usMultiGroup.rows[0].previous_reading, 1234567.89);
assert.equal(usMultiGroup.rows[0].charge_amount, 2500750.25);
const italianMultiGroup = prepareMixedLocale(["A1", "2026", "1.234.567,89", "1.234.577,89", "10,00", "2.500.750,25"]);
assert.equal(italianMultiGroup.errors.length, 0);
assert.equal(italianMultiGroup.rows[0].previous_reading, 1234567.89);
assert.equal(italianMultiGroup.rows[0].charge_amount, 2500750.25);
const singleSeparator = prepareSingle(["A1", "2026", "1.234", "1.244", "0.010", "", "", ""]);
assert.equal(singleSeparator.errors.length, 0);
assert.equal(singleSeparator.rows[0].previous_reading, 1.234);
assert.equal(singleSeparator.rows[0].current_reading, 1.244);

const malformedMixedLocaleAmounts = [
  "12,34.56",
  "1,23,456.78",
  "1.23,45",
  "12.34.567,89",
  "1234,567.89",
  "1,234.56.78",
  "1.234,56,78",
  "1,234.",
];
for (const value of malformedMixedLocaleAmounts) {
  assert.ok(Number.isNaN(parseBethagAmount(value)), "malformed mixed-locale grouping must be rejected: " + value);
}
for (const value of malformedMixedLocaleAmounts) {
  const rejected = prepareMixedLocale(["A1", "2026", value, "1,244.50", "10.00", "2,500.75"]);
  assert.ok(rejected.errors.length > 0, "CSV import must reject malformed numeric grouping: " + value);
  assert.equal(rejected.rows.length, 0, "malformed numeric grouping must not produce partial import rows");
}

const malformedRepeatedSeparatorAmounts = [
  "1,23,456",
  "12,34,567",
  "1.23.456",
  "12.34.567",
  "1.234.56",
  "1,234,56",
  "1234.567.890",
  "1,234,,567",
];
for (const value of malformedRepeatedSeparatorAmounts) {
  assert.ok(Number.isNaN(parseBethagAmount(value)), "malformed repeated thousands grouping must be rejected: " + value);
}
assert.equal(parseBethagAmount("1,234,567"), 1234567, "valid repeated comma grouping must remain supported");
assert.equal(parseBethagAmount("1.234.567"), 1234567, "valid repeated dot grouping must remain supported");
assert.equal(parseBethagAmount("1,234,567,890"), 1234567890, "valid long repeated comma grouping must remain supported");
assert.equal(parseBethagAmount("1.234.567.890"), 1234567890, "valid long repeated dot grouping must remain supported");
assert.equal(parseBethagAmount("1,23,456", 0), 0, "malformed repeated grouping must preserve the caller fallback");

const malformedEmbeddedTextAmounts = [
  "abc 123",
  "12abc34",
  "1e3",
  "1€2",
  "1,234.50USD",
  "1,234.50 USD",
  "1'234",
];
for (const value of malformedEmbeddedTextAmounts) {
  assert.ok(Number.isNaN(parseBethagAmount(value)), "embedded text or unsupported characters must be rejected: " + value);
}
assert.equal(parseBethagAmount("12abc34", 0), 0, "malformed OCR text must preserve the caller fallback");
assert.equal(parseBethagAmount("€ 1.234,56"), 1234.56, "leading supported currency symbol remains valid");
assert.equal(parseBethagAmount("1.234,56 €"), 1234.56, "trailing supported currency symbol remains valid");
assert.equal(parseBethagAmount("EUR 1.234,56"), 1234.56, "leading EUR marker remains valid");
assert.equal(parseBethagAmount("1.234,56 EUR"), 1234.56, "trailing EUR marker remains valid");
assert.ok(Number.isNaN(parseBethagAmount("€ 1.234,56 EUR")), "duplicated leading and trailing currency markers must be rejected");

const malformedTextCsv = prepareMixedLocale(["A1", "2026", "1,234.50USD", "1,244.50", "10.00", "2,500.75"]);
assert.ok(malformedTextCsv.errors.length > 0, "CSV import must reject amount fields containing embedded currency text");
assert.equal(malformedTextCsv.rows.length, 0, "malformed amount text must not produce partial import rows");

const supportedCurrencyCsv = prepareMixedLocale(["A1", "2026", "€ 1.234,50", "€ 1.244,50", "10,00", "€ 2.500,75"]);
assert.equal(supportedCurrencyCsv.errors.length, 0, "supported currency decorations must remain importable");
assert.equal(supportedCurrencyCsv.rows[0].previous_reading, 1234.5);
assert.equal(supportedCurrencyCsv.rows[0].charge_amount, 2500.75);

const commaCsv = [
  "Unita,Esercizio,Lettura precedente,Lettura attuale,Consumo,Note",
  "A1,2026,100,\"110,5\",\"10,5\",\"lettura, principale\"",
].join("\n");
const commaParsed = parseConsumptionCsv(commaCsv);
assert.equal(commaParsed.delimiter, ",");
assert.equal(commaParsed.rows[0].length, 6);
assert.equal(commaParsed.rows[0][3], "110,5");
assert.equal(commaParsed.rows[0][5], "lettura, principale");

const tabCsv = "Unita\tEsercizio\tNote\nA1\t2026\tok";
assert.equal(parseConsumptionCsv(tabCsv).delimiter, "\t");

const bomCsv = "\uFEFFUnita;Esercizio;Note\nA1;2026;ok";
assert.equal(parseConsumptionCsv(bomCsv).headers[0], "unita");

const multilineCsv = "Unita;Esercizio;Note\nA1;2026;\"prima riga\nseconda riga\"";
assert.equal(parseConsumptionCsv(multilineCsv).rows[0][2], "prima riga\nseconda riga");

const escapedQuoteCsv = "Unita;Esercizio;Note\nA1;2026;\"ha detto \"\"ok\"\"\"";
assert.equal(parseConsumptionCsv(escapedQuoteCsv).rows[0][2], "ha detto \"ok\"");

assert.throws(() => parseConsumptionCsv("Unita;Esercizio\nA1;2026;extra"), /colonne/);
assert.throws(() => parseConsumptionCsv("Unita;Esercizio\nA1;\"2026"), /virgolette/);
assert.throws(() => parseConsumptionCsv("Unita;Esercizio,Note\nA1;2026,x"), /ambiguo/);
assert.throws(() => parseConsumptionCsv("Unita;Unita\nA1;A2"), /duplicate/);
assert.throws(() => parseConsumptionCsv("Unita;Esercizio"), /righe dati/);

function prepareSingle(values) {
  const csv = header + "\n" + values.join(";");
  return prepareConsumptionCsvImport(csv, {
    workspaceId: "workspace-1",
    condominiumId: "condo-1",
    units,
    fiscalYears,
  });
}

assert.ok(prepareSingle(["A1", "2026", "-1", "10", "11", "", "", ""]).errors.length > 0, "negative values must be rejected");
assert.ok(prepareSingle(["A1", "2026", "11", "10", "0", "", "", ""]).errors.length > 0, "decreasing readings must be rejected");
assert.ok(prepareSingle(["A1", "2026", "1", "10", "9", "2026-02-31", "", ""]).errors.length > 0, "impossible dates must be rejected");
assert.ok(prepareSingle(["A1", "2026", "1", "10", "8", "", "", ""]).errors.length > 0, "inconsistent consumption must be rejected");
assert.ok(prepareSingle(["UNKNOWN", "2026", "1", "10", "9", "", "", ""]).errors.length > 0, "unknown units must be rejected");
assert.ok(prepareSingle(["A1", "2099", "1", "10", "9", "", "", ""]).errors.length > 0, "unknown fiscal years must be rejected");
assert.ok(prepareSingle(["A1", "2026", "1", "10", "9", "2026-02-02", "2026-02-01", ""]).errors.length > 0, "reversed periods must be rejected");

const mixedValidInvalid = semicolonCsv + "\nUNKNOWN;2026;1;2;1;2026-01-01;2026-01-31;bad";
const allOrNothing = prepareConsumptionCsvImport(mixedValidInvalid, {
  workspaceId: "workspace-1",
  condominiumId: "condo-1",
  units,
  fiscalYears,
});
assert.ok(allOrNothing.errors.length > 0);
assert.equal(allOrNothing.rows.length, 0, "a mixed valid/invalid file must never yield a partial import");

const accountingSource = await readFile("src/AccountingPage.tsx", "utf8");
const importerStart = accountingSource.indexOf("async function importConsumptionCsv");
const importerEnd = accountingSource.indexOf("async function generateConsumptionAllocation", importerStart);
assert.ok(importerStart >= 0 && importerEnd > importerStart, "Accounting CSV importer must exist");
const importer = accountingSource.slice(importerStart, importerEnd);
assert.ok(importer.includes("prepareConsumptionCsvImport"), "the real importer must use the tested parser/validator");
assert.ok(importer.includes("prepared.errors.length"), "the real importer must reject invalid rows");
assert.ok(importer.includes(".upsert(prepared.rows"), "the real importer must upsert only the prepared all-valid batch");
assert.ok(importer.indexOf("prepared.errors.length") < importer.indexOf(".upsert(prepared.rows"), "validation must precede the database write");
assert.ok(!importer.includes("parseCsvLine"), "the ambiguous dual-separator parser must be removed");
assert.ok(accountingSource.includes("!/^\\d{4}-\\d{2}-\\d{2}$/.test(d)"), "ordinary installment date validation must use a real digit matcher");
assert.ok(accountingSource.includes("!/^\\d{4}-\\d{2}-\\d{2}$/.test(yearForm.start_date)"), "fiscal-year start date validation must use a real digit matcher");
assert.ok(accountingSource.includes("!/^\\d{4}-\\d{2}-\\d{2}$/.test(yearForm.end_date)"), "fiscal-year end date validation must use a real digit matcher");
assert.ok(accountingSource.includes("!/^\\d{4}-\\d{2}-\\d{2}$/.test(d) || (i > 0"), "allocation due-date validation must use a real digit matcher");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal((packageJson.scripts.test.match(/node scripts\/test-consumption-csv-parser\.mjs/g) || []).length, 1, "runtime regression must be registered exactly once in npm test");

console.log("PASS consumption CSV delimiter, quoted-field, numeric, date, scope and all-or-nothing runtime regression.");
