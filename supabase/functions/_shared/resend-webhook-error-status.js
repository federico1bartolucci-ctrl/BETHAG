export function resendWebhookErrorStatus(phase) {
  if (phase === "signature") return 401;
  if (phase === "payload") return 400;
  return 500;
}

export function resendWebhookErrorResponse(phase, error, headers) {
  const status = resendWebhookErrorStatus(phase);
  const message = phase === "signature"
    ? "Firma webhook non valida."
    : phase === "payload"
      ? "Payload webhook non valido."
      : "Errore elaborazione webhook.";
  return new Response(JSON.stringify({ error: message }), { status, headers });
}
