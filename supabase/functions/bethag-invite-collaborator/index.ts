import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getNamedKey(jsonName: string, legacyName: string) {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed.default || Object.values(parsed)[0] || null;
    } catch {
      return null;
    }
  }
  return Deno.env.get(legacyName) || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sessione non disponibile." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = getNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_PUBLISHABLE_KEY")
      || Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = getNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY")
      || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !publishableKey || !secretKey) {
      return json({ error: "Configurazione Supabase server incompleta." }, 503);
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Utente non autenticato." }, 401);

    const body = await req.json();
    const workspaceId = String(body.workspaceId || "");
    const legacyId = Number(body.legacyId || 0);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const allowedPermissions = new Set([
      "condomini",
      "documenti",
      "scadenze",
      "assemblee",
      "fornitori",
      "attivita",
      "comunicazioni",
      "ai",
      "portale",
    ]);
    const permissions = Array.isArray(body.permissions)
      ? [...new Set(body.permissions.map((value) => String(value)).filter((value) => allowedPermissions.has(value)))]
      : [];

    if (!workspaceId || !legacyId || !name || !email) {
      return json({ error: "Dati collaboratore incompleti." }, 400);
    }
    if (permissions.length === 0) {
      return json({ error: "È necessario assegnare almeno un permesso valido al collaboratore." }, 400);
    }

    const { data: membership, error: membershipError } = await userClient
      .from("workspace_members")
      .select("workspace_id, role, active")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .eq("active", true)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "Operazione riservata all'Amministratore del workspace." }, 403);

    const { data: existing, error: existingError } = await adminClient
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (existingError) throw existingError;

    let targetUserId = existing?.user_id || null;
    let invited = false;

    if (targetUserId) {
      const { data: existingUserData, error: existingUserError } =
        await adminClient.auth.admin.getUserById(targetUserId);
      if (existingUserError) throw existingUserError;
      const existingEmail = existingUserData.user?.email?.trim().toLowerCase() || "";
      if (!existingEmail || existingEmail !== email || !existingUserData.user?.email_confirmed_at) {
        return json({
          error: "Il profilo collaboratore è già associato a un account con e-mail diversa o non verificata. Verifica l'identità e correggi l'associazione prima di procedere.",
          code: "LINKED_COLLABORATOR_IDENTITY_UNVERIFIED",
        }, 409);
      }
    }

    if (!targetUserId) {
      const { data: invitedUser, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: name,
            bethag_role: "collaborator",
            bethag_invited: true,
            bethag_password_set: false,
            workspace_id: workspaceId,
          },
          redirectTo: "https://federico1bartolucci-ctrl.github.io/BETHAG/",
        });

      if (inviteError) {
        const message = inviteError.message || "";
        if (/already.*registered|already.*exists|duplicate/i.test(message)) {
          let existingUser: (typeof invitedUser.user) | null = null;
          let page = 1;
          const perPage = 1000;
          while (!existingUser) {
            const { data: users, error: usersError } =
              await adminClient.auth.admin.listUsers({ page, perPage });
            if (usersError) throw usersError;
            existingUser = users.users.find(
              (candidate) => candidate.email?.trim().toLowerCase() === email
            ) ?? null;
            if (existingUser || users.users.length < perPage) break;
            page += 1;
          }
          if (!existingUser) throw inviteError;
          if (!existingUser.email_confirmed_at) {
            return json({
              error: "Esiste già un account con questa e-mail, ma l'indirizzo non risulta verificato. L'utente deve completare la verifica prima che l'amministratore possa collegarlo al workspace.",
              code: "EXISTING_COLLABORATOR_EMAIL_NOT_VERIFIED",
            }, 409);
          }
          targetUserId = existingUser.id;
        } else {
          throw inviteError;
        }
      } else {
        targetUserId = invitedUser.user?.id || null;
        invited = true;
      }
    }

    if (!targetUserId) return json({ error: "Impossibile determinare l'utente invitato." }, 500);

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;

    const preservedRole = existingProfile?.role === "admin" ? "admin" : "collaborator";

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: targetUserId,
        full_name: name,
        email,
        role: preservedRole,
        active: true,
      }, { onConflict: "id" });
    if (profileError) throw profileError;

    const { error: upsertError } = await adminClient
      .from("workspace_members")
      .upsert({
        workspace_id: workspaceId,
        user_id: targetUserId,
        role: "collaborator",
        active: true,
        permissions,
        legacy_id: legacyId,
      }, { onConflict: "workspace_id,user_id" });
    if (upsertError) throw upsertError;

    return json({ success: true, userId: targetUserId, invited });
  } catch (error) {
    console.error("bethag-invite-collaborator", error);
    return json({
      error: error instanceof Error ? error.message : "Invito collaboratore non riuscito.",
    }, 500);
  }
});