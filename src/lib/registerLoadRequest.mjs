export function applyIfCurrentRequest(requestId, currentRequestId, apply) {
  if (requestId !== currentRequestId) return false;
  apply();
  return true;
}
