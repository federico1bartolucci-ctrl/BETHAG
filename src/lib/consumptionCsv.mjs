import { parseBethagAmount } from "./parseBethagAmount.mjs";

const DELIMITERS = [";", ",", "\t"];

function firstRecordDelimiter(source) {
  const counts = new Map(DELIMITERS.map((delimiter) => [delimiter, 0]));
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) break;
    if (!quoted && counts.has(character)) counts.set(character, counts.get(character) + 1);
  }
  if (quoted) throw new Error("Intestazione CSV con virgolette non chiuse.");
  const maximum = Math.max(...counts.values());
  if (maximum === 0) throw new Error("Separatore CSV non riconosciuto: usa punto e virgola, virgola o tabulazione.");
  const winners = [...counts.entries()].filter(([, count]) => count === maximum);
  if (winners.length !== 1) throw new Error("Separatore CSV ambiguo: controlla l'intestazione.");
  return winners[0][0];
}

function parseRecords(source, delimiter) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      if (field.trim() !== "" || afterQuote) throw new Error("Virgolette CSV in posizione non valida.");
      field = "";
      quoted = true;
    } else if (character === delimiter) {
      row.push(field.trim());
      field = "";
      afterQuote = false;
    } else if (character === "\n") {
      row.push(field.trim());
      if (row.some((value) => value !== "")) records.push(row);
      row = [];
      field = "";
      afterQuote = false;
    } else if (afterQuote) {
      if (!/\s/.test(character)) throw new Error("Testo inatteso dopo una virgoletta CSV di chiusura.");
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("Riga CSV con virgolette non chiuse.");
  row.push(field.trim());
  if (row.some((value) => value !== "")) records.push(row);
  return records;
}

function normalizeHeader(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function validISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseLocaleNumber(value) {
  const source = String(value ?? "").trim();
  if (!source) return null;

  // When both separators are present, use the shared locale parser to
  // distinguish Italian grouping (1.234,56) from US grouping (1,234.56).
  // Preserve the established single-separator behavior for ambiguous values.
  if (source.includes(",") && source.includes(".")) {
    return parseBethagAmount(source);
  }

  const normalized = source.includes(",") ? source.replace(/\./g, "").replace(",", ".") : source;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function parseConsumptionCsv(text) {
  if (typeof text !== "string") throw new TypeError("Il contenuto CSV deve essere una stringa.");
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const delimiter = firstRecordDelimiter(source);
  const records = parseRecords(source, delimiter);
  if (records.length < 2) throw new Error("Il CSV non contiene righe dati.");
  const headers = records[0].map(normalizeHeader);
  if (headers.some((header) => !header)) throw new Error("Il CSV contiene intestazioni vuote.");
  if (new Set(headers).size !== headers.length) throw new Error("Il CSV contiene intestazioni duplicate.");
  const rows = records.slice(1);
  rows.forEach((row, index) => {
    if (row.length !== headers.length) {
      throw new Error("Riga CSV " + (index + 2) + ": trovate " + row.length + " colonne, attese " + headers.length + ".");
    }
  });
  return { delimiter, headers, rows };
}

export function prepareConsumptionCsvImport(text, { workspaceId, condominiumId, units, fiscalYears }) {
  if (!workspaceId || !condominiumId) throw new Error("Workspace o condominio non selezionato.");
  const parsed = parseConsumptionCsv(text);
  const errors = [];
  const rows = [];
  const find = (row, names) => {
    const index = parsed.headers.findIndex((header) => names.includes(header));
    return index >= 0 ? row[index] ?? "" : "";
  };

  parsed.rows.forEach((row, index) => {
    const recordNumber = index + 2;
    const unitCode = find(row, ["unita", "unita_immobiliare", "unit_code", "unita_codice"]).trim();
    const unit = (units || []).find((candidate) =>
      String(candidate.condominium_id ?? candidate.condominiumId ?? "") === String(condominiumId)
      && String(candidate.unit_code ?? "").toLowerCase() === unitCode.toLowerCase()
    );
    if (!unit) {
      errors.push("riga " + recordNumber + ": unità \"" + (unitCode || "(vuota)") + "\" non riconosciuta nel condominio selezionato");
      return;
    }

    const fiscal = find(row, ["esercizio", "fiscal_year_id"]).trim();
    const fiscalYear = (fiscalYears || []).find((candidate) =>
      String(candidate.id) === fiscal || String(candidate.name ?? "").toLowerCase() === fiscal.toLowerCase()
    );
    if (!fiscalYear) {
      errors.push("riga " + recordNumber + ": esercizio \"" + (fiscal || "(vuoto)") + "\" non riconosciuto");
      return;
    }

    const previous = parseLocaleNumber(find(row, ["lettura_precedente", "precedente"]));
    const current = parseLocaleNumber(find(row, ["lettura_attuale", "attuale"]));
    const consumption = parseLocaleNumber(find(row, ["consumo", "consumption"]));
    const kwh = parseLocaleNumber(find(row, ["kwh"]));
    const allocationValue = parseLocaleNumber(find(row, ["valore_riparto", "allocation_value", "valore"]));
    const chargeAmount = parseLocaleNumber(find(row, ["importo", "charge_amount", "quota"]));
    const numericValues = [previous, current, consumption, kwh, allocationValue, chargeAmount];
    if (numericValues.some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      errors.push("riga " + recordNumber + ": valori numerici non validi o negativi");
      return;
    }
    if (previous !== null && current !== null && current < previous) {
      errors.push("riga " + recordNumber + ": lettura attuale inferiore alla precedente");
      return;
    }

    const periodStart = find(row, ["periodo_inizio", "period_start"]).trim();
    const periodEnd = find(row, ["periodo_fine", "period_end"]).trim();
    if ((periodStart && !validISODate(periodStart)) || (periodEnd && !validISODate(periodEnd)) || (periodStart && periodEnd && periodStart > periodEnd)) {
      errors.push("riga " + recordNumber + ": periodo/date non valide");
      return;
    }
    if (consumption !== null && previous !== null && current !== null && Math.abs(consumption - (current - previous)) > 0.001) {
      errors.push("riga " + recordNumber + ": consumo non coerente con le letture");
      return;
    }

    rows.push({
      workspace_id: workspaceId,
      condominium_id: condominiumId,
      fiscal_year_id: fiscalYear.id,
      unit_id: unit.id,
      service_type: find(row, ["servizio", "service_type"]).trim() || "Riscaldamento",
      meter_code: find(row, ["matricola", "meter_code"]).trim(),
      period_start: periodStart || null,
      period_end: periodEnd || null,
      previous_reading: previous,
      current_reading: current,
      consumption: consumption ?? (previous !== null && current !== null ? Math.max(0, current - previous) : null),
      kwh,
      allocation_value: allocationValue,
      charge_amount: chargeAmount,
      source: "Importazione CSV",
      notes: find(row, ["note", "notes"]),
      data: {},
    });
  });

  return { delimiter: parsed.delimiter, rows: errors.length ? [] : rows, errors };
}
