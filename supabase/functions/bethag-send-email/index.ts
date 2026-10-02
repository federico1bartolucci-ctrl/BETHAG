import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = { communicationId: string };
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Autenticazione richiesta." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    const supabaseKey = publishableKeys ? JSON.parse(publishableKeys)["default"] : (Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail = Deno.env.get("BETHAG_FROM_EMAIL") ?? "";
    if (!resendApiKey || !fromEmail) return json({ error: "Servizio e-mail non configurato." }, 503);

    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Sessione non valida." }, 401);

    const payload = (await req.json()) as Body;
    if (!payload.communicationId) return json({ error: "communicationId obbligatorio." }, 400);

    const { data: communication, error: commError } = await supabase.from("communications")
      .select("id,workspace_id,condominium_id,title,body,email_status,published")
      .eq("id", payload.communicationId).maybeSingle();
    if (commError) throw commError;
    if (!communication) return json({ error: "Comunicazione non trovata." }, 404);
    if (!communication.condominium_id) return json({ error: "La comunicazione non è associata a un condominio." }, 400);

    const { data: membership, error: membershipError } = await supabase.from("workspace_members")
      .select("role,active,permissions").eq("workspace_id", communication.workspace_id)
      .eq("user_id", user.id).eq("active", true).maybeSingle();
    if (membershipError) throw membershipError;
    const permissions = Array.isArray((membership as any)?.permissions) ? (membership as any).permissions : [];
    const canSend = Boolean(membership) && (membership.role === "admin" ||
      (membership.role === "collaborator" && permissions.includes("comunicazioni")));
    if (!canSend) return json({ error: "Non disponi dell'autorizzazione per inviare comunicazioni." }, 403);

    const { data: condominium, error: condoError } = await supabase.from("condominiums")
      .select("id,archived_at").eq("id", communication.condominium_id)
      .eq("workspace_id", communication.workspace_id).maybeSingle();
    if (condoError) throw condoError;
    if (!condominium) return json({ error: "Condominio non trovato." }, 404);
    if (condominium.archived_at) return json({ error: "Il condominio è archiviato." }, 409);

    const { data: prepared, error: prepareError } = await supabase.rpc("prepare_communication_recipients", { p_communication_id: communication.id });
    if (prepareError) throw prepareError;

    // Recover abandoned queued rows before claiming new work.
    const { error: resetError } = await supabase.rpc("reset_stale_communication_recipients", {
      p_communication_id: communication.id,
      p_age: "15 minutes",
    });
    if (resetError) throw resetError;

    const queuedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase.from("communication_recipients")
      .update({ status: "queued", queued_at: queuedAt, updated_at: queuedAt })
      .eq("communication_id", communication.id).eq("status", "pending")
      .select("id,email,name");
    if (claimError) throw claimError;

    const recipients = claimed ?? [];
    if (!recipients.length) {
      const { count } = await supabase.from("communication_recipients")
        .select("id", { count: "exact", head: true }).eq("communication_id", communication.id).in("status", ["sent","delivered"]);
      return json({ success: true, idempotent: true, recipientCount: count ?? 0, prepared });
    }

    let sent = 0, failed = 0;
    for (const recipient of recipients) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail, to: recipient.email,
            subject: communication.title.trim(), text: (communication.body ?? "").trim(),
          }),
        });
        const resendData = await resendResponse.json();
        if (!resendResponse.ok) {
          failed++;
          await supabase.from("communication_recipients").update({
            status: "failed", queued_at: null,
            error_message: resendData?.message ?? "Invio non riuscito.", updated_at: new Date().toISOString(),
          }).eq("id", recipient.id);
          continue;
        }
        sent++;
        await supabase.from("communication_recipients").update({
          status: "sent", queued_at: null, provider_message_id: resendData?.id ?? null,
          sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", recipient.id);
      } catch (error) {
        failed++;
        await supabase.from("communication_recipients").update({
          status: "failed", queued_at: null,
          error_message: error instanceof Error ? error.message : "Errore di rete.", updated_at: new Date().toISOString(),
        }).eq("id", recipient.id);
      }
    }

    const { count: remaining } = await supabase.from("communication_recipients")
      .select("id", { count: "exact", head: true }).eq("communication_id", communication.id).in("status", ["pending","queued"]);
    const status = failed === 0 && (remaining ?? 0) === 0 ? "Inviata" : sent > 0 ? "Parzialmente inviata" : "Errore";
    await supabase.from("communications").update({
      email_status: status, email_prepared_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", communication.id);

    return json({ success: true, sent, failed, remaining: remaining ?? 0, status });
  } catch (error) {
    console.error("BETHAG send-email error", error);
    return json({ error: error instanceof Error ? error.message : "Errore interno." }, 500);
  }
});