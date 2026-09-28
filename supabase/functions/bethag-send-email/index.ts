import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SendEmailBody = {
  workspaceId: string;
  communicationId?: number;
  condominiumId: number;
  recipients: string[];
  subject: string;
  body: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Autenticazione richiesta." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail = Deno.env.get("BETHAG_FROM_EMAIL") ?? "";

    if (!resendApiKey || !fromEmail) {
      return new Response(
        JSON.stringify({
          error: "Servizio e-mail non configurato. Impostare RESEND_API_KEY e BETHAG_FROM_EMAIL.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessione non valida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as SendEmailBody;
    const recipients = Array.from(
      new Set(
        (payload.recipients ?? [])
          .map((email) => email.trim())
          .filter(Boolean)
          .map((email) => email.toLowerCase()),
      ),
    );

    if (
      !payload.workspaceId ||
      !payload.condominiumId ||
      !payload.subject?.trim() ||
      !payload.body?.trim() ||
      !recipients.length
    ) {
      return new Response(
        JSON.stringify({ error: "Dati della comunicazione incompleti." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, active, permissions")
      .eq("workspace_id", payload.workspaceId)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const canSendEmail =
      Boolean(membership) &&
      (
        membership.role === "admin" ||
        (
          membership.role === "collaborator" &&
          Array.isArray((membership as any).permissions) &&
          (membership as any).permissions.includes("comunicazioni")
        )
      );

    if (!canSendEmail) {
      return new Response(
        JSON.stringify({ error: "Non disponi dell'autorizzazione per gestire le comunicazioni." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: condominium, error: condominiumError } = await supabase
      .from("condominiums")
      .select("id")
      .eq("workspace_id", payload.workspaceId)
      .eq("legacy_id", payload.condominiumId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium) {
      return new Response(JSON.stringify({ error: "Condominio non trovato." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: allowedMembers, error: membersError }, { data: allowedPortalMembers, error: portalMembersError }] =
      await Promise.all([
        supabase
          .from("condominium_members")
          .select("email")
          .eq("condominium_id", condominium.id)
          .eq("active", true),
        supabase
          .from("portal_access")
          .select("email")
          .eq("condominium_id", condominium.id)
          .eq("active", true),
      ]);

    if (membersError) throw membersError;
    if (portalMembersError) throw portalMembersError;

    const allowedEmails = new Set(
      [
        ...(allowedMembers ?? []).map((member) => member.email),
        ...(allowedPortalMembers ?? []).map((member) => member.email),
      ]
        .map((email) => (email ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    const unauthorized = recipients.filter((email) => !allowedEmails.has(email));
    if (unauthorized.length) {
      return new Response(
        JSON.stringify({
          error: "Uno o più destinatari non appartengono al condominio selezionato.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
        subject: payload.subject.trim(),
        text: payload.body.trim(),
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          error: resendData?.message ?? "Invio e-mail non riuscito.",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (payload.communicationId) {
      const { data: communication, error: communicationLookupError } =
        await supabase
          .from("communications")
          .select("id, data")
          .eq("workspace_id", payload.workspaceId)
          .eq("legacy_id", payload.communicationId)
          .maybeSingle();

      if (communicationLookupError) throw communicationLookupError;

      if (communication) {
        const nextData = {
          ...(communication.data ?? {}),
          emailSendId: resendData?.id ?? null,
          emailSentRecipients: recipients,
        };

        const { error: updateError } = await supabase
          .from("communications")
          .update({
            email_status: "Inviata",
            email_prepared_at: new Date().toISOString(),
            data: nextData,
          })
          .eq("id", communication.id)
          .eq("workspace_id", payload.workspaceId);

        if (updateError) throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: resendData?.id ?? null,
        recipients: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("BETHAG send-email error", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore interno.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});