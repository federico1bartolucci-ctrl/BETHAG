/**
 * Parses currency-like amounts in Italian or mixed locale formatting.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function parseBethagAmount(value, fallback = Number.NaN) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value == null) return fallback;

  let raw = String(value).trim();
  if (!raw) return fallback;

  let negative = false;
  if (raw.startsWith("(") && raw.endsWith(")")) {
    negative = true;
    raw = raw.slice(1, -1).trim();
  }
  raw = raw.replace(/\u2212/g, "-").replace(/\s|\u00a0|\u202f/g, " ").replace(/[^\d.,+-]/g, "").replace(/\s/g, "");
  if (!raw || !/\d/.test(raw)) return fallback;

  if (/[+-]/.test(raw)) {
    if (!/^[+-]/.test(raw) || /[+-]/.test(raw.slice(1))) return fallback;
    negative = negative || raw[0] === "-";
    raw = raw.slice(1);
  }
  if (!/^\d[\d.,]*$/.test(raw) && !/^[.,]\d+$/.test(raw)) return fallback;

  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  let normalized;
  if (comma >= 0 && dot >= 0) {
    const decimalSeparator = comma > dot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    const decimalIndex = raw.lastIndexOf(decimalSeparator);
    const integerSource = raw.slice(0, decimalIndex);
    const fractionPart = raw.slice(decimalIndex + 1);

    // Mixed-locale values must have exactly one decimal separator and valid
    // three-digit thousands groups. Do not silently normalize malformed
    // groupings such as 12,34.56 or 1.23,45 into plausible but wrong amounts.
    if (!integerSource || !/^\\d+$/.test(fractionPart)) return fallback;
    const groups = integerSource.split(thousandsSeparator);
    if (groups.some((group) => !/^\\d+$/.test(group))) return fallback;
    if (
      groups.length > 1 &&
      (groups[0].length < 1 ||
        groups[0].length > 3 ||
        groups.slice(1).some((group) => group.length !== 3))
    ) {
      return fallback;
    }

    normalized = groups.join("") + "." + fractionPart;
  } else {
    const separator = comma >= 0 ? "," : dot >= 0 ? "." : null;
    if (!separator) {
      normalized = raw;
    } else {
      const groups = raw.split(separator);
      const groupedRepeated = groups.length > 2 && groups[0].length >= 1 && groups[0].length <= 3 && groups.slice(1).every((group) => group.length === 3 && /^\d+$/.test(group));
      const groupedDotThousands = separator === "." && groups.length === 2 && groups[0].length >= 1 && groups[0].length <= 3 && groups[1].length === 3 && /^\d+$/.test(groups[1]);
      if (groupedRepeated || groupedDotThousands) {
        normalized = groups.join("");
      } else {
        const decimalIndex = raw.lastIndexOf(separator);
        const integerPart = raw.slice(0, decimalIndex).replaceAll(separator, "") || "0";
        const fractionPart = raw.slice(decimalIndex + 1);
        normalized = integerPart + "." + fractionPart;
      }
    }
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return fallback;
  return negative ? -amount : amount;
}
