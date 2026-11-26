import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { findAuthUserByEmail } from "../_shared/auth-user-directory.js";
import { isWorkspaceMemberLegacyIdConflict } from "../_shared/workspace-member-legacy-id-conflict.js";
import { buildCollaboratorInviteFailureState } from "../_shared/collaborator-invite-failure-state.js";
import { createSupabaseAdminClientOptions } from "../_shared/supabase-admin-client-options.js";

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
  let invited = false;
  let profileCreated = false;
  let workspaceMemberLinked = false;
  let failureStage = "request";

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
    const adminClient = createClient(supabaseUrl, secretKey, createSupabaseAdminClientOptions(secretKey));

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
      ? [...new Set(body.permissions.map((value: unknown) => String(value)).filter((value: string) => allowedPermissions.has(value)))]
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
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (existingError) throw existingError;

    // A collaborator invite must not rewrite an existing workspace administrator's role.
    if (existing?.role === "admin") {
      return json({
        error: "L'account è già amministratore del workspace e non può essere convertito in collaboratore tramite invito.",
        code: "COLLABORATOR_INVITE_ADMIN_DOWNGRADE_BLOCKED",
      }, 409);
    }

    let targetUserId = existing?.user_id || null;

    if (targetUserId) {
      const { data: existingUserData, error: existingUserError } =
        await adminClient.auth.admin.getUserById(targetUserId);
      if (existingUserError) throw existingUserError;
      const existingEmail = existingUserData.user?.email?.trim().toLowerCase() || "";
      if (!existingEmail || existingEmail !== email) {
        return json({
          error: "Il codice interno del collaboratore è già associato a un account diverso. Genera un nuovo identificativo prima di procedere.",
        }, 409);
      }
    }

    if (!targetUserId) {
      failureStage = "auth_invitation";
      const { data: invitedUser, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name: name, bethag_role: "collaborator", workspace_id: workspaceId },
          redirectTo: "https://federico1bartolucci-ctrl.github.io/BETHAG/",
        });

      if (inviteError) {
        const message = inviteError.message || "";
        if (/already.*registered|already.*exists|duplicate/i.test(message)) {
          const existingUser = await findAuthUserByEmail(adminClient, email);
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

    if (!targetUserId) throw new Error("Impossibile determinare l'utente invitato.");

    failureStage = "profile_lookup";
    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;

    const preservedRole = existingProfile?.role === "admin" ? "admin" : "collaborator";
    const profilePayload = {
      id: targetUserId,
      full_name: name,
      email,
      role: preservedRole,
      active: true,
    };
    // Preserve an existing profile until the workspace legacy ID is claimed.
    // A new Auth invite still needs its profile before the membership FK insert.
    if (!existingProfile) {
      failureStage = "profile_insert";
      const { error: profileInsertError } = await adminClient
        .from("profiles")
        .insert(profilePayload);
      if (profileInsertError) throw profileInsertError;
      profileCreated = true;
    }

    failureStage = "workspace_member_upsert";
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

    if (upsertError) {
      if (isWorkspaceMemberLegacyIdConflict(upsertError)) {
        console.error("Collaborator invitation lost a legacy identity race", {
          workspaceId,
          legacyId,
          invitationSent: invited,
          profileCreated,
        });
        return json({
          error: "Il codice collaboratore è già stato assegnato a un altro account. L'invito e-mail potrebbe essere già stato inviato; nessun collegamento duplicato è stato creato. Verifica l'account prima di riprovare.",
          code: "COLLABORATOR_LEGACY_ID_ALREADY_ASSIGNED",
          ...buildCollaboratorInviteFailureState({
            failureStage,
            invited,
            profileCreated,
            workspaceMemberLinked: false,
          }),
        }, 409);
      }
      throw upsertError;
    }

    workspaceMemberLinked = true;

    if (existingProfile) {
      failureStage = "profile_update";
      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update(profilePayload)
        .eq("id", targetUserId);
      if (profileUpdateError) throw profileUpdateError;
    }

    failureStage = "complete";
    return json({ success: true, userId: targetUserId, invited });
  } catch (error) {
    console.error("bethag-invite-collaborator", error);
    const failureState = buildCollaboratorInviteFailureState({
      failureStage,
      invited,
      profileCreated,
      workspaceMemberLinked,
    });
    return json({
      error: error instanceof Error ? error.message : "Invito collaboratore non riuscito.",
      code: failureState.requiresReconciliation
        ? "COLLABORATOR_INVITE_PARTIAL_FAILURE"
        : "COLLABORATOR_INVITE_FAILED",
      ...failureState,
    }, 500);
  }
});