import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:svix";
import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers });
  try {
    const secret = Deno.env.get("RESEND_WEBHOOK_SIGNING_SECRET") ?? "";
    if (!secret) return new Response(JSON.stringify({error:"Webhook non configurato."}), {status:503,headers});
    const raw = await req.text();
    const id = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");
    const signature = req.headers.get("svix-signature");
    if (!id || !timestamp || !signature) return new Response(JSON.stringify({error:"Firma webhook mancante."}), {status:401,headers});

    // Verify the exact raw bytes first, then parse those same bytes as JSON.
    new Webhook(secret).verify(raw, {"svix-id":id,"svix-timestamp":timestamp,"svix-signature":signature});
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const data = parsed.data && typeof parsed.data === "object"
      ? parsed.data as Record<string, unknown>
      : {};
    const type = typeof parsed.type === "string" ? parsed.type : "";
    const messageId = String(data.email_id ?? data.id ?? data.message_id ?? "");
    const rawTo = data.to;
    const recipient = Array.isArray(rawTo) ? String(rawTo[0] ?? "") : String(rawTo ?? "");
    const eventAt = String(data.created_at ?? parsed.created_at ?? new Date().toISOString());

    if (!type || !messageId) {
      console.error("Resend event missing required fields", {
        topLevelKeys:Object.keys(parsed), dataKeys:Object.keys(data),
        typePresent:Boolean(type), messageIdPresent:Boolean(messageId),
      });
      return new Response(JSON.stringify({error:"Evento Resend incompleto."}), {status:400,headers});
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const key = keys ? JSON.parse(keys).default : (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    if (!key) throw new Error("Chiave Supabase server non configurata.");
    const supabase = createClient(url,key);
    const {data:result,error} = await supabase.rpc("apply_resend_communication_event",{
      p_provider_message_id:messageId,
      p_event_id:id,
      p_event_type:type,
      p_email:recipient,
      p_event_at:eventAt,
    });
    if (error) throw error;
    return new Response(JSON.stringify(result ?? {status:"ok"}),{status:200,headers});
  } catch (error) {
    console.error("BETHAG resend-webhook error",error);
    return new Response(JSON.stringify({error:error instanceof Error ? error.message : "Evento non autorizzato."}),{status:401,headers});
  }
});