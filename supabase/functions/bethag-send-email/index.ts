import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { canSendCommunication, isCommunicationPublished } from "../_shared/communication-send-guards.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = { communicationId: number | string; workspaceId: string };
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
    const legacyCommunicationId = Number(payload.communicationId);
    if (!payload.workspaceId || !Number.isSafeInteger(legacyCommunicationId) || legacyCommunicationId <= 0) {
      return json({ error: "workspaceId e communicationId validi sono obbligatori." }, 400);
    }

    const { data: communication, error: commError } = await supabase.from("communications")
      .select("id,workspace_id,condominium_id,title,body,email_status,published")
      .eq("legacy_id", legacyCommunicationId)
      .eq("workspace_id", payload.workspaceId).maybeSingle();
    if (commError) throw commError;
    if (!communication) return json({ error: "Comunicazione non trovata." }, 404);
    if (!isCommunicationPublished(communication.published)) return json({ error: "La comunicazione deve essere pubblicata prima dell'invio e-mail." }, 409);
    if (!communication.condominium_id) return json({ error: "La comunicazione non è associata a un condominio." }, 400);

    const { data: membership, error: membershipError } = await supabase.from("workspace_members")
      .select("role,active,permissions").eq("workspace_id", communication.workspace_id)
      .eq("user_id", user.id).eq("active", true).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "Non disponi dell'autorizzazione per inviare comunicazioni." }, 403);
    const canSend = canSendCommunication(membership.role, (membership as any).permissions);
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

    let sent = 0, failed = 0, persistenceFailures = 0;
    const persistenceFailureDetails: string[] = [];
    for (const recipient of recipients) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json", "Idempotency-Key": `bethag-communication-recipient-${recipient.id}` },
          body: JSON.stringify({
            from: fromEmail, to: recipient.email,
            subject: communication.title.trim(), text: (communication.body ?? "").trim(),
          }),
        });
        const resendData = await resendResponse.json();
        if (!resendResponse.ok) {
          failed++;
          const { error: recipientStatusError } = await supabase.from("communication_recipients").update({
            status: "failed", queued_at: null,
            error_message: resendData?.message ?? "Invio non riuscito.", updated_at: new Date().toISOString(),
          }).eq("id", recipient.id);
          if (recipientStatusError) {
            persistenceFailures++;
            persistenceFailureDetails.push(`recipient ${recipient.id}: ${recipientStatusError.message}`);
            console.error("BETHAG recipient failure status persistence error", recipient.id, recipientStatusError);
          }
          continue;
        }
        sent++;
        const { error: recipientStatusError } = await supabase.from("communication_recipients").update({
          status: "sent", queued_at: null, provider_message_id: resendData?.id ?? null,
          sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", recipient.id);
        if (recipientStatusError) {
          persistenceFailures++;
          persistenceFailureDetails.push(`recipient ${recipient.id}: ${recipientStatusError.message}`);
          console.error("BETHAG recipient sent status persistence error", recipient.id, recipientStatusError);
        }
      } catch (error) {
        failed++;
        const { error: recipientStatusError } = await supabase.from("communication_recipients").update({
          status: "failed", queued_at: null,
          error_message: error instanceof Error ? error.message : "Errore di rete.", updated_at: new Date().toISOString(),
        }).eq("id", recipient.id);
        if (recipientStatusError) {
          persistenceFailures++;
          persistenceFailureDetails.push(`recipient ${recipient.id}: ${recipientStatusError.message}`);
          console.error("BETHAG recipient network-failure status persistence error", recipient.id, recipientStatusError);
        }
      }
    }

    const { count: remaining, error: remainingError } = await supabase.from("communication_recipients")
      .select("id", { count: "exact", head: true }).eq("communication_id", communication.id).in("status", ["pending","queued"]);
    if (remainingError) {
      persistenceFailures++;
      persistenceFailureDetails.push(`remaining recipients query: ${remainingError.message}`);
      console.error("BETHAG remaining recipient query error", remainingError);
    }
    const status = failed === 0 && !remainingError && (remaining ?? 0) === 0 ? "Inviata" : sent > 0 ? "Parzialmente inviata" : "Errore";
    const { error: communicationStatusError } = await supabase.from("communications").update({
      email_status: status, email_prepared_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", communication.id);
    if (communicationStatusError) {
      persistenceFailures++;
      persistenceFailureDetails.push(`communication status: ${communicationStatusError.message}`);
      console.error("BETHAG communication status persistence error", communicationStatusError);
    }

    return json({
      success: true, sent, failed, remaining: remaining ?? 0, status,
      persistenceFailures,
      persistenceWarning: persistenceFailures > 0
        ? "L'invio è stato elaborato, ma alcuni stati non sono stati salvati. I messaggi inviati non devono essere reinviati manualmente senza verifica."
        : null,
      persistenceFailureDetails: persistenceFailureDetails.length ? persistenceFailureDetails : undefined,
    });
  } catch (error) {
    console.error("BETHAG send-email error", error);
    return json({ error: error instanceof Error ? error.message : "Errore interno." }, 500);
  }
});