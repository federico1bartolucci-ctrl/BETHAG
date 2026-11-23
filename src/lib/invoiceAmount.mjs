export function parseInvoiceAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  // Only known currency symbols, whitespace, and valid numeric punctuation are accepted.
  const cleaned = raw.replace(/[€$£¥\\s]/g, "");
  const italianGrouped = /^-?\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?$/;
  const usGrouped = /^-?\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?$/;
  const decimalComma = /^-?\\d+(?:,\\d{1,2})$/;
  const decimalDot = /^-?\\d+(?:\\.\\d{1,2})$/;
  const integer = /^-?\\d+$/;
  let normalized = cleaned;
  if (italianGrouped.test(cleaned)) normalized = cleaned.replace(/\\./g, "").replace(",", ".");
  else if (usGrouped.test(cleaned)) normalized = cleaned.replace(/,/g, "");
  else if (decimalComma.test(cleaned)) normalized = cleaned.replace(",", ".");
  else if (decimalDot.test(cleaned) || integer.test(cleaned)) normalized = cleaned;
  else return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
