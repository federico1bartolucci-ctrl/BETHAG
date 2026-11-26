/**
 * Prevent native browser form navigation before evaluating authorization guards.
 * A denied form submission must not fall through to the browser's default GET/reload.
 */
export function runGuardedFormSubmit(event, guards) {
  if (!event || typeof event.preventDefault !== "function") return false;
  event.preventDefault();
  for (const guard of guards) {
    if (typeof guard !== "function" || !guard()) return false;
  }
  return true;
}
