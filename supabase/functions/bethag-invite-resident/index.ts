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

    const condominiumLegacyId = Number(body.condominiumId || 0);
    if (!condominiumLegacyId) {
      return json({ error: "Condominio del condòmino non specificato." }, 400);
    }

    const { data: condominiumForMember, error: condominiumLookupError } = await adminClient
      .from("condominiums")
      .select("id, workspace_id, legacy_id, name")
      .eq("legacy_id", condominiumLegacyId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (condominiumLookupError) throw condominiumLookupError;
    if (!condominiumForMember) return json({ error: "Condominio non trovato nel workspace indicato." }, 404);

    const { data: member, error: memberError } = await adminClient
      .from("condominium_members")
      .select("id, condominium_id, user_id, name, email, role, active, permissions, data, legacy_id, unit_id")
      .eq("condominium_id", condominiumForMember.id)
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

    // A pre-linked identity must still match the member's canonical address
    // and have a verified email; never silently preserve a stale association.
    if (targetUserId) {
      const { data: linkedUserData, error: linkedUserError } =
        await adminClient.auth.admin.getUserById(targetUserId);
      if (linkedUserError) throw linkedUserError;
      const linkedUser = linkedUserData.user;
      if (
        !linkedUser ||
        linkedUser.email?.trim().toLowerCase() !== email ||
        !linkedUser.email_confirmed_at
      ) {
        return json({
          error: "Il profilo risulta già collegato a un account non verificato o con e-mail diversa. Verifica l'identità e correggi l'associazione prima di inviare un nuovo invito.",
          code: "LINKED_ACCOUNT_VERIFICATION_REQUIRED",
        }, 409);
      }
    }

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
          // listUsers is paginated; search until the exact address is found or
          // the API returns a short page. A first-page-only lookup can turn a
          // recoverable retry into a false "user not found" once the workspace
          // has more than 1,000 Auth users.
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
              error: "Esiste già un account con questa e-mail, ma l'indirizzo non risulta verificato. L'utente deve completare la verifica dell'account prima che l'amministratore possa collegarlo al profilo condominiale.",
              code: "EXISTING_ACCOUNT_EMAIL_NOT_VERIFIED",
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

    if (!targetUserId) return json({ error: "Impossibile determinare l'utente condòmino." }, 500);

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;

    const preservedRole =
      existingProfile?.role === "admin" || existingProfile?.role === "collaborator"
        ? existingProfile.role
        : "resident";

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
      condominiumId: Number(condominium.legacy_id),
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

    if (invited) {
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          full_name: name,
          bethag_role: "resident",
          bethag_invited: true,
          bethag_password_set: false,
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

    const authError = error as {
      message?: string;
      code?: string;
      status?: number;
    };

    const errorCode = String(authError?.code || "");
    const message =
      authError?.message ||
      "Invito condòmino non riuscito.";

    // Gli errori di input provenienti da Supabase Auth restano 4xx,
    // così il client può distinguere un dato non accettato da un errore server.
    const status =
      typeof authError?.status === "number" &&
      authError.status >= 400 &&
      authError.status < 500
        ? authError.status
        : errorCode === "email_address_invalid"
          ? 400
          : 500;

    return json({
      error: message,
      code: errorCode || undefined,
    }, status);
  }
});