import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailPayload = {
  workspaceId: string;
  communicationId?: number;
  condominiumId: number;
  recipients: string[];
  subject: string;
  body: string;
  audience?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Metodo non consentito." }, 405);
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Autenticazione richiesta." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("BETHAG_FROM_EMAIL");

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ success: false, error: "Configurazione Supabase incompleta." }, 500);
    }
    if (!resendApiKey || !fromEmail) {
      return json({
        success: false,
        error: "Servizio e-mail non configurato: imposta RESEND_API_KEY e BETHAG_FROM_EMAIL.",
      }, 503);
    }

    const token = authHeader.slice("Bearer ".length);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ success: false, error: "Sessione non valida." }, 401);
    }

    const payload = await request.json() as EmailPayload;
    const workspaceId = String(payload.workspaceId || "").trim();
    const condominiumId = Number(payload.condominiumId);
    const subject = String(payload.subject || "").trim();
    const body = String(payload.body || "").trim();
    const recipients = Array.from(
      new Set(
        (Array.isArray(payload.recipients) ? payload.recipients : [])
          .map((email) => String(email).trim())
          .filter((email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))
          .map((email) => email.toLowerCase())
      )
    );

    if (!workspaceId || !Number.isFinite(condominiumId) || !subject || !body || !recipients.length) {
      return json({ success: false, error: "Dati e-mail incompleti o non validi." }, 400);
    }

    const { data: membership, error: membershipError } = await userClient
      .from("workspace_members")
      .select("role, active")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .eq("active", true)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership || membership.role !== "admin") {
      return json({ success: false, error: "Autorizzazione amministratore richiesta." }, 403);
    }

    const { data: condominium, error: condominiumError } = await userClient
      .from("condominiums")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", condominiumId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium) {
      return json({ success: false, error: "Condominio non trovato nel workspace." }, 404);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        text: body,
        html: body
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\\n", "<br>"),
        headers: {
          "X-BETHAG-Workspace": workspaceId,
          "X-BETHAG-Condominium": String(condominiumId),
        },
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("BETHAG Resend error", resendData);
      return json({
        success: false,
        error: resendData?.message || "Il servizio e-mail ha rifiutato l'invio.",
      }, 502);
    }

    return json({
      success: true,
      recipients: recipients.length,
      providerId: resendData?.id ?? null,
      condominium: condominium.name,
    });
  } catch (error) {
    console.error("BETHAG email function failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Invio e-mail non riuscito.",
    }, 500);
  }
});
