export function createTransferHistoryScopeState(scopeKey, rows = []) {
  return { scopeKey: String(scopeKey), rows: Array.isArray(rows) ? rows : [] };
}

export function getVisibleTransferHistoryRows(state, scopeKey) {
  return state?.scopeKey === String(scopeKey) && Array.isArray(state.rows)
    ? state.rows
    : [];
}
