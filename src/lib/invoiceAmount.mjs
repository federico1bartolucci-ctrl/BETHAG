export function parseInvoiceAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  let amountText = raw;
  const leadingCurrency = /^[€$£¥]\s*/.test(amountText) || /^EUR\s+/i.test(amountText);
  const trailingCurrency = /\s*[€$£¥]$/.test(amountText) || /\s+EUR$/i.test(amountText);
  if (leadingCurrency && trailingCurrency) return 0;
  if (leadingCurrency) amountText = amountText.replace(/^(?:[€$£¥]\s*|EUR\s+)/i, "");
  else if (trailingCurrency) amountText = amountText.replace(/(?:\s*[€$£¥]|\s+EUR)$/i, "");
  if (/[€$£¥\s]/.test(amountText)) return 0;

  const italianGrouped = /^-?[1-9]\d{0,2}(?:\.\d{3})+(?:,\d{1,2})?$/;
  const usGrouped = /^-?[1-9]\d{0,2}(?:,\d{3})+(?:\.\d{1,2})?$/;
  const decimalComma = /^-?\d+(?:,\d{1,2})$/;
  const decimalDot = /^-?\d+(?:\.\d{1,2})$/;
  const integer = /^-?\d+$/;
  let normalized = amountText;
  if (italianGrouped.test(amountText)) normalized = amountText.replace(/\./g, "").replace(",", ".");
  else if (usGrouped.test(amountText)) normalized = amountText.replace(/,/g, "");
  else if (decimalComma.test(amountText)) normalized = amountText.replace(",", ".");
  else if (decimalDot.test(amountText) || integer.test(amountText)) normalized = amountText;
  else return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
