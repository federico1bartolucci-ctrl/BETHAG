export function sendEmailMethodResponse(method, corsHeaders) {
  if (method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo non consentito." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}
