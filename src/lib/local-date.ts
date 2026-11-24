export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function localISODateAfterDays(days: number, date = new Date()) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return localISODate(nextDate);
}
