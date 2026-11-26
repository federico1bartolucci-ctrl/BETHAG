import { withSupabase } from "npm:@supabase/server@^1";
import { createDeleteAccountFailureResponse } from "../_shared/delete-account-error-response.js";
import { listActiveAdminMemberships } from "../_shared/active-admin-memberships.js";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Metodo non consentito." }, { status: 405 });
    }

    const subject = ctx.userClaims?.id;
    const userId = typeof subject === "string" && subject.length > 0 ? subject : null;
    if (!userId) {
      return Response.json({ error: "Sessione non autenticata." }, { status: 401 });
    }

    let body: { confirmation?: string; securityCode?: string } = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Richiesta non valida." }, { status: 400 });
    }

    if (body.confirmation !== "ELIMINA") {
      return Response.json({ error: "Conferma di eliminazione non valida." }, { status: 400 });
    }

    const { data: security, error: securityError } = await ctx.supabase
      .from("user_security_settings")
      .select("personal_code_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (securityError) {
      return Response.json({ error: securityError.message }, { status: 500 });
    }

    if (security?.personal_code_enabled) {
      const code = typeof body.securityCode === "string" ? body.securityCode.trim() : "";
      if (!code) {
        return Response.json({ error: "Il codice personale di sicurezza è richiesto per eliminare il profilo." }, { status: 403 });
      }

      const { data: valid, error: verifyError } = await ctx.supabase.rpc(
        "verify_personal_security_code",
        { p_code: code }
      );

      if (verifyError || valid !== true) {
        return Response.json({ error: "Codice personale di sicurezza non valido." }, { status: 403 });
      }
    }

    let adminMemberships;
    try {
      // Use the service-role client so RLS cannot hide an administrator
      // membership from this account-deletion safety check.
      adminMemberships = await listActiveAdminMemberships(ctx.supabaseAdmin, userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossibile verificare le appartenenze amministrative.";
      return Response.json({ error: message }, { status: 500 });
    }

    for (const membership of adminMemberships) {
      const { count, error: countError } = await ctx.supabaseAdmin
        .from("workspace_members")
        .select("user_id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspace_id)
        .eq("role", "admin")
        .eq("active", true);

      if (countError) {
        return Response.json({ error: countError.message }, { status: 500 });
      }

      if ((count ?? 0) <= 1) {
        return Response.json(
          {
            error:
              "Non puoi eliminare il profilo perché sei l'unico amministratore attivo di un workspace. Prima nomina un altro amministratore o trasferisci la gestione.",
          },
          { status: 409 }
        );
      }
    }

    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId, false);
    if (deleteError) {
      // GoTrue may return a generic "Database error deleting user" for a
      // PostgreSQL trigger rejection. Re-read the caller's current memberships
      // after the failed, atomic Auth deletion so a concurrent last-admin guard
      // failure can be reported as a conflict without misclassifying unrelated
      // Auth/database deletion failures.
      let lastActiveWorkspaceAdmin = false;
      let currentAdminMemberships = null;
      try {
        currentAdminMemberships = await listActiveAdminMemberships(ctx.supabaseAdmin, userId);
      } catch {
        // Preserve the original deletion error as HTTP 500 if the diagnostic
        // membership snapshot cannot be established completely.
      }

      if (currentAdminMemberships !== null) {
        for (const membership of currentAdminMemberships) {
          const { count, error: currentCountError } = await ctx.supabaseAdmin
            .from("workspace_members")
            .select("user_id", { count: "exact", head: true })
            .eq("workspace_id", membership.workspace_id)
            .eq("role", "admin")
            .eq("active", true);

          if (!currentCountError && count === 1) {
            lastActiveWorkspaceAdmin = true;
            break;
          }
        }
      }

      return createDeleteAccountFailureResponse(deleteError, {
        lastActiveWorkspaceAdmin,
      });
    }

    return Response.json({ success: true });
  }),
};
