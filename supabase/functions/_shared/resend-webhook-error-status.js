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

// A provider event can arrive after Resend accepts the email but before
// bethag-send-email commits provider_message_id on the recipient row.
// A missing mapping is therefore retryable, not an acknowledged discard.
export function resendWebhookEventResponse(result, headers) {
  if (result?.status === "ignored" && result?.reason === "recipient_not_found") {
    return new Response(
      JSON.stringify({ error: "Destinatario non ancora registrato; riprovare l'evento." }),
      { status: 503, headers },
    );
  }

  return new Response(JSON.stringify(result ?? { status: "ok" }), {
    status: 200,
    headers,
  });
}
