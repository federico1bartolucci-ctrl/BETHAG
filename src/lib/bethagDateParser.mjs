export function parseBethagDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const toValidIsoDate = (year, month, day) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) return toValidIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return toValidIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return "";
  try {
    return parsed.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
