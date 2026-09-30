import { withSupabase } from "npm:@supabase/server@^1";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Metodo non consentito." }, { status: 405 });
    }

    const userId = ctx.userClaims?.sub;
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

    const { data: adminMemberships, error: membershipError } = await ctx.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("active", true);

    if (membershipError) {
      return Response.json({ error: membershipError.message }, { status: 500 });
    }

    for (const membership of adminMemberships ?? []) {
      const { count, error: countError } = await ctx.supabase
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
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  }),
};
