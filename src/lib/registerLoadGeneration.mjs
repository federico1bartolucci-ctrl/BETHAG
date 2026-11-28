export function isCurrentRegisterLoad(requestId, latestRequestId) {
  return Number.isSafeInteger(requestId)
    && Number.isSafeInteger(latestRequestId)
    && requestId > 0
    && requestId === latestRequestId;
}
