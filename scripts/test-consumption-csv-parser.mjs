import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseConsumptionCsv, prepareConsumptionCsvImport } from "../src/lib/consumptionCsv.mjs";

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
assert.ok(packageJson.scripts.test.includes("test-consumption-csv-parser.mjs"), "runtime regression must be wired into npm test");

console.log("PASS consumption CSV delimiter, quoted-field, numeric, date, scope and all-or-nothing runtime regression.");
