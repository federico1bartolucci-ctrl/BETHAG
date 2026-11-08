import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    address: { type: "string" },
    cap: { type: "string" },
    city: { type: "string" },
    province: { type: "string" },
    fiscalCode: { type: "string" },
    confidence: { type: "number" },
    unitRecords: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          unitCode: { type: "string" },
          unitType: { type: "string", enum: ["Abitazione","Garage","Cantina","Posto auto","Altro"] },
          millesimi: { type: "string" },
          civicCode: { type: "string" },
          buildingCode: { type: "string" },
          staircaseCode: { type: "string" },
          owners: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string" },
                taxCode: { type: "string" },
                role: { type: "string" }
              },
              required: ["firstName","lastName","email","taxCode","role"]
            }
          }
        },
        required: ["unitCode","unitType","millesimi","civicCode","buildingCode","staircaseCode","owners"]
      }
    },
    structure: {
      type: "object",
      additionalProperties: false,
      properties: {
        configured: { type: "boolean" },
        civics: { type: "array", items: { type: "object", additionalProperties: true } },
        autonomous: {
          type: "object",
          additionalProperties: false,
          properties: {
            garages: { type: "integer" },
            cantine: { type: "integer" },
            postiAuto: { type: "integer" },
            altre: { type: "integer" }
          },
          required: ["garages","cantine","postiAuto","altre"]
        }
      },
      required: ["configured","civics","autonomous"]
    },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["name","address","cap","city","province","fiscalCode","confidence","unitRecords","structure","warnings"]
};

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responseJson({ error: "Metodo non consentito." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return responseJson({ error: "Autenticazione richiesta." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    if (!supabaseUrl || !supabaseKey) return responseJson({ error: "Configurazione Supabase non disponibile." }, 503);
    if (!openaiKey) return responseJson({ error: "Servizio AI non configurato: manca OPENAI_API_KEY nelle variabili segrete della funzione." }, 503);

    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return responseJson({ error: "Sessione non valida." }, 401);

    const payload = await req.json();
    const workspaceId = String(payload.workspaceId ?? "");
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (!workspaceId || !files.length) return responseJson({ error: "Workspace o documenti mancanti." }, 400);

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role, active, permissions")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (membershipError) throw membershipError;
    const allowed = Boolean(membership) && (
      membership.role === "admin" ||
      (membership.role === "collaborator" && Array.isArray(membership.permissions) && membership.permissions.includes("condomini"))
    );
    if (!allowed) return responseJson({ error: "Non disponi dell'autorizzazione per la creazione dei condomini." }, 403);

    const content = [{
      type: "input_text",
      text: `Analizza i documenti condominiali allegati e ricostruisci una proposta strutturata per creare un nuovo condominio in BETHAG.

Regole:
- Estrai esclusivamente dati presenti o ragionevolmente leggibili nei documenti.
- Non inventare nominativi, codici fiscali, indirizzi, millesimi o numeri di unità.
- Se un dato è incerto, lascialo vuoto e aggiungi una warning.
- Associa sempre i millesimi all'unità immobiliare, mai alla persona.
- Identifica proprietari/condòmini per ciascuna unità quando il documento li collega esplicitamente.
- Riconosci abitazioni e pertinenze (garage, cantine, posti auto).
- Se sono presenti più tabelle millesimali, conserva i valori rilevati nell'unità e segnala la presenza di tabelle diverse.
- La struttura deve essere configurata solo se i documenti permettono di ricostruire con sufficiente certezza civici/edifici/scale/interni.
- Produci una proposta da sottoporre obbligatoriamente alla verifica dell'amministratore.

Documenti: ${files.map((f: any) => f.filename).join(", ")}`
    }];

    const openAIFileIds: string[] = [];
    try {
    for (const file of files) {
      const filename = String(file.filename ?? "documento");
      const storagePath = String(file.storagePath ?? "");
      if (!storagePath) throw new Error("Percorso Storage mancante per " + filename + ".");
      if (!storagePath.startsWith(workspaceId + "/")) throw new Error("Percorso documento non valido.");
      const { data: blob, error } = await supabase.storage.from("bethag-documents").download(storagePath);
      if (error || !blob) throw new Error("Impossibile leggere il documento memorizzato: " + (error?.message ?? "file non disponibile"));
      if (blob.size > 50 * 1024 * 1024) throw new Error("Il documento " + filename + " supera il limite tecnico di 50 MB per una singola analisi AI. Il file può comunque restare memorizzato in BETHAG; per l'analisi occorre suddividerlo o predisporre un'elaborazione dedicata.");
      const mime = String(file.mimeType ?? blob.type ?? "application/octet-stream").toLowerCase();
      const purpose = mime.startsWith("image/") ? "vision" : "user_data";
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("expires_after[anchor]", "created_at");
      form.append("expires_after[seconds]", "3600");
      form.append("file", new File([blob], filename, { type: mime }));
      const upload = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: { Authorization: "Bearer " + openaiKey },
        body: form,
      });
      const uploaded = await upload.json();
      if (!upload.ok || !uploaded?.id) throw new Error(uploaded?.error?.message ?? "Upload AI non riuscito.");
      const fileId = String(uploaded.id);
      openAIFileIds.push(fileId);
      content.push(
        mime.startsWith("image/")
          ? { type: "input_image", file_id: fileId, detail: "high" } as any
          : { type: "input_file", file_id: fileId, detail: "high" } as any
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + openaiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "bethag_condominium_creation",
            strict: true,
            schema
          }
        }
      })
    });

    const openaiData = await openaiResponse.json();
    if (!openaiResponse.ok) {
      console.error("OpenAI response error", openaiData);
      return responseJson({ error: openaiData?.error?.message ?? "Analisi AI non riuscita." }, 502);
    }

    const outputText = openaiData?.output_text ?? "";
    if (!outputText) return responseJson({ error: "L'AI non ha restituito dati strutturati." }, 502);

    let draft;
    try {
      draft = JSON.parse(outputText);
    } catch {
      return responseJson({ error: "Risposta AI non valida." }, 502);
    }

    draft.sourceDocuments = files.map((f: any) => f.filename);
    draft.units = Array.isArray(draft.unitRecords) ? draft.unitRecords.length : 0;
    draft.warnings = Array.from(new Set([
      ...(Array.isArray(draft.warnings) ? draft.warnings : []),
      "Dati estratti automaticamente dai documenti: verifica obbligatoria dell'amministratore prima della creazione definitiva."
    ]));

    return responseJson({ draft });
    } finally {
      await Promise.all(openAIFileIds.map(async (id) => {
        try {
          await fetch("https://api.openai.com/v1/files/" + encodeURIComponent(id), {
            method: "DELETE",
            headers: { Authorization: "Bearer " + openaiKey },
          });
        } catch (_) {}
      }));
    }
  } catch (error) {
    console.error("BETHAG AI condominium extraction error", error);
    return responseJson({ error: error instanceof Error ? error.message : "Errore interno." }, 500);
  }
});