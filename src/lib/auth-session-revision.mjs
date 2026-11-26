/**
 * Monotonic revision gate for asynchronous Supabase auth-session hydration.
 * A newer auth event invalidates every older in-flight lookup.
 */
export function createAuthSessionRevision() {
  let currentRevision = 0;

  return {
    begin() {
      currentRevision += 1;
      return currentRevision;
    },
    isCurrent(revision) {
      return Number.isSafeInteger(revision) && revision === currentRevision;
    },
  };
}
