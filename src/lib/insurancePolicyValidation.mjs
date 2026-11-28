function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 9999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isOptionalNonNegativeAmount(value) {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "string" && value.trim() === "") return true;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0;
}

export function validateInsurancePolicyForm(form) {
  if (!form || typeof form !== "object") return "Dati polizza non validi.";
  if (
    typeof form.company_name !== "string" || !form.company_name.trim()
    || typeof form.policy_number !== "string" || !form.policy_number.trim()
  ) {
    return "Compila compagnia assicurativa e numero polizza.";
  }
  if (form.start_date && !isValidISODate(form.start_date)) {
    return "Data di decorrenza non valida.";
  }
  if (form.end_date && !isValidISODate(form.end_date)) {
    return "Data di scadenza non valida.";
  }
  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    return "La scadenza della polizza non può precedere la decorrenza.";
  }
  if (!isOptionalNonNegativeAmount(form.premium)) {
    return "Il premio deve essere un importo finito e non negativo.";
  }
  if (!isOptionalNonNegativeAmount(form.deductible)) {
    return "La franchigia deve essere un importo finito e non negativo.";
  }
  return null;
}
