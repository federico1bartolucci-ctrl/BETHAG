export async function establishRecoverySession(supabase, href) {
  const url = new URL(href);
  const code = url.searchParams.get("code");
  let flow = "existing";

  if (code) {
    flow = "pkce";
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { session: null, error, flow };
  } else {
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken || refreshToken) {
      flow = "implicit";
      if (!accessToken || !refreshToken) {
        return { session: null, error: new Error("Incomplete recovery tokens."), flow };
      }
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return { session: null, error, flow };
    }
  }

  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error, flow };
}
