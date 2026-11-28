export async function readVerifiedSecuritySettings(client) {
  if (!client) throw new Error("Supabase non configurato.");

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Sessione utente non disponibile.");

  const { data: settings, error: settingsError } = await client
    .from("user_security_settings")
    .select("personal_code_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (settings !== null && typeof settings?.personal_code_enabled !== "boolean") {
    throw new Error("Risposta delle impostazioni di sicurezza non valida.");
  }

  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
  if (factorsError) throw factorsError;
  if (!Array.isArray(factors?.totp) || !Array.isArray(factors?.phone)) {
    throw new Error("Risposta MFA non valida.");
  }

  return {
    codeEnabled: settings?.personal_code_enabled === true,
    mfaFactors: [...factors.totp, ...factors.phone].filter((factor) => factor?.status === "verified"),
  };
}
