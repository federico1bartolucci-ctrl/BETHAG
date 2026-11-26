import { withSupabase } from "npm:@supabase/server@^1";
import { createDeleteAccountFailureResponse } from "../_shared/delete-account-error-response.js";
import { hasLastActiveWorkspaceAdmin } from "../_shared/last-admin-precheck.js";

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

      if (verifyError) {
        console.error("delete-account personal security code verification failed", verifyError);
        return Response.json({ error: "Errore durante la verifica del codice di sicurezza." }, { status: 500 });
      }
      if (valid !== true) {
        return Response.json({ error: "Codice personale di sicurezza non valido." }, { status: 403 });
      }
    }

    let lastActiveWorkspaceAdmin;
    try {
      lastActiveWorkspaceAdmin = await hasLastActiveWorkspaceAdmin(ctx.supabaseAdmin, userId);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Impossibile verificare le appartenenze amministrative.";
      return Response.json({ error: message }, { status: 500 });
    }

    if (lastActiveWorkspaceAdmin) {
      return Response.json(
        {
          error:
            "Non puoi eliminare il profilo perché sei l'unico amministratore attivo di un workspace. Prima nomina un altro amministratore o trasferisci la gestione.",
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId, false);
    if (deleteError) {
      // GoTrue may return a generic database error when the authoritative
      // workspace_members trigger rejects a concurrent last-admin removal.
      // Re-evaluate with one fresh SQL statement snapshot for HTTP 409 mapping.
      let lastActiveWorkspaceAdmin = false;
      try {
        lastActiveWorkspaceAdmin = await hasLastActiveWorkspaceAdmin(ctx.supabaseAdmin, userId);
      } catch {
        // Preserve the original Auth deletion error as HTTP 500 if the
        // diagnostic snapshot cannot be established.
      }

      return createDeleteAccountFailureResponse(deleteError, {
        lastActiveWorkspaceAdmin,
      });
    }

    return Response.json({ success: true });
  }),
};
