export function parseInvoiceDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  let year, month, day;
  const italian = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (italian) {
    day = Number(italian[1]);
    month = Number(italian[2]);
    year = Number(italian[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
