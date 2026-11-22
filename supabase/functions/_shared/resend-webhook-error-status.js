export function resendWebhookErrorStatus(phase) {
  if (phase === "signature") return 401;
  if (phase === "payload") return 400;
  return 500;
}

export function resendWebhookErrorResponse(phase, error, headers) {
  const status = resendWebhookErrorStatus(phase);
  const message = error instanceof Error
    ? error.message
    : "Errore elaborazione webhook.";
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
