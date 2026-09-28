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

const portalPermissions = [
  "documenti",
  "verbali",
  "regolamento",
  "pagamenti_ordinari",
  "pagamenti_straordinari",
  "assemblee",
  "comunicazioni",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito." }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sessione non disponibile." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey =
      getNamedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_PUBLISHABLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey =
      getNamedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    if (!workspaceId || !legacyId) {
      return json({ error: "Dati condòmino incompleti." }, 400);
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

    const { data: member, error: memberError } = await adminClient
      .from("condominium_members")
      .select("id, condominium_id, user_id, name, email, role, active, permissions, data, legacy_id, unit_id")
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) return json({ error: "Condòmino non trovato." }, 404);
    if (!member.active) return json({ error: "Il profilo condòmino è disattivato." }, 409);

    const { data: condominium, error: condominiumError } = await adminClient
      .from("condominiums")
      .select("id, workspace_id, legacy_id, name")
      .eq("id", member.condominium_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (condominiumError) throw condominiumError;
    if (!condominium) return json({ error: "Il condòmino non appartiene al workspace indicato." }, 403);

    const email = String(member.email || "").trim().toLowerCase();
    const name = String(member.name || "Condòmino").trim();
    if (!email) return json({ error: "Il condòmino non ha un indirizzo e-mail." }, 400);

    let targetUserId = member.user_id || null;
    let invited = false;

    if (!targetUserId) {
      const { data: invitedUser, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: {
            full_name: name,
            bethag_role: "resident",
            bethag_invited: true,
            bethag_password_set: false,
            workspace_id: workspaceId,
          },
          redirectTo: "https://federico1bartolucci-ctrl.github.io/BETHAG/",
        });

      if (inviteError) {
        const message = inviteError.message || "";
        if (/already.*registered|already.*exists|duplicate/i.test(message)) {
          const { data: users, error: usersError } =
            await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (usersError) throw usersError;
          const existingUser = users.users.find(
            (candidate) => candidate.email?.trim().toLowerCase() === email
          );
          if (!existingUser) throw inviteError;
          targetUserId = existingUser.id;
        } else {
          throw inviteError;
        }
      } else {
        targetUserId = invitedUser.user?.id || null;
        invited = true;
      }
    }

    if (!targetUserId) return json({ error: "Impossibile determinare l'utente condòmino." }, 500);

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: targetUserId,
        full_name: name,
        email,
        role: "resident",
        active: true,
      }, { onConflict: "id" });
    if (profileError) throw profileError;

    const { error: memberUpdateError } = await adminClient
      .from("condominium_members")
      .update({ user_id: targetUserId })
      .eq("id", member.id);
    if (memberUpdateError) throw memberUpdateError;

    const apartment =
      String(member.data?.apartment || "").trim() ||
      String(member.data?.unitCode || "").trim();

    const portalData = {
      name,
      email,
      condominiumId: Number(member.legacy_id),
      apartment,
      permissions: portalPermissions,
      active: true,
    };

    const { error: portalError } = await adminClient
      .from("portal_access")
      .upsert({
        workspace_id: workspaceId,
        legacy_id: Number(member.legacy_id),
        condominium_id: member.condominium_id,
        name,
        email,
        role: "resident",
        apartment,
        permissions: portalPermissions,
        active: true,
        user_id: targetUserId,
        data: portalData,
      }, { onConflict: "workspace_id,legacy_id" });
    if (portalError) throw portalError;

    if (!invited) {
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          full_name: name,
          bethag_role: "resident",
          workspace_id: workspaceId,
        },
      });
    }

    return json({
      success: true,
      userId: targetUserId,
      invited,
      portalAccess: true,
    });
  } catch (error) {
    console.error("bethag-invite-resident", error);
    return json({
      error: error instanceof Error ? error.message : "Invito condòmino non riuscito.",
    }, 500);
  }
});