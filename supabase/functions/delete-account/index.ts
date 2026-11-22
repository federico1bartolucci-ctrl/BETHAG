import { withSupabase } from "npm:@supabase/server@^1";

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

    const { error: reservationError } = await ctx.supabaseAdmin.rpc(
      "reserve_account_deletion_admins",
      { p_user_id: userId }
    );

    if (reservationError) {
      const isLastAdmin = reservationError.message?.includes("ACCOUNT_DELETION_LAST_ADMIN");
      return Response.json(
        {
          error: isLastAdmin
            ? "Non puoi eliminare il profilo perché la richiesta lascerebbe un workspace senza amministratori attivi. Nomina un altro amministratore o trasferisci la gestione."
            : reservationError.message,
        },
        { status: isLastAdmin ? 409 : 500 }
      );
    }

    let deleteError: { message: string } | null = null;
    try {
      const result = await ctx.supabaseAdmin.auth.admin.deleteUser(userId, false);
      deleteError = result.error;
    } catch (error) {
      deleteError = { message: error instanceof Error ? error.message : String(error) };
    } finally {
      try {
        const { error: releaseError } = await ctx.supabaseAdmin.rpc(
          "release_account_deletion_admin_reservations",
          { p_user_id: userId }
        );

        if (releaseError) {
          console.error("Account deletion reservation cleanup failed", releaseError);
        }
      } catch (releaseException) {
        console.error("Account deletion reservation cleanup threw", releaseException);
      }
    }

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  }),
};
