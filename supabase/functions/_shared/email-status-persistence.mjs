export function recordEmailPersistenceFailure(state, label, error) {
  if (!error) return false;
  const message = error instanceof Error ? error.message : (error?.message ?? String(error));
  state.persistenceFailures += 1;
  state.persistenceFailureDetails.push(label + ": " + message);
  return true;
}

export async function persistEmailStatusUpdate(state, label, write) {
  try {
    const result = await write();
    recordEmailPersistenceFailure(state, label, result?.error);
    return result ?? { error: null };
  } catch (error) {
    recordEmailPersistenceFailure(state, label, error);
    return { error };
  }
}

export function buildEmailPersistenceWarning(state) {
  return state.persistenceFailures > 0
    ? "L'invio è stato elaborato, ma alcuni stati non sono stati salvati. I messaggi inviati non devono essere reinviati manualmente senza verifica."
    : null;
}
