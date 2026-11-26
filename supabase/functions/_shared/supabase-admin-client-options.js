/**
 * Build non-persistent Supabase admin client options.
 *
 * Modern sb_secret_* API keys belong in the apikey header only. supabase-js
 * also mirrors its apiKey into Authorization by default; the Supabase API
 * gateway may try to parse that non-JWT value as a bearer JWT (PGRST303).
 * Legacy service_role JWTs retain the normal Authorization behavior.
 */
export function createSupabaseAdminClientOptions(apiKey, fetchImpl = fetch) {
  if (typeof apiKey !== "string" || !apiKey) {
    throw new TypeError("A Supabase admin API key is required.");
  }

  const auth = {
    persistSession: false,
    autoRefreshToken: false,
  };

  if (!apiKey.startsWith("sb_secret_")) return { auth };

  return {
    auth,
    global: {
      fetch: (input, init) => {
        const request = new Request(input, init);
        const headers = new Headers(request.headers);
        headers.delete("Authorization");
        return fetchImpl(new Request(request, { headers }));
      },
    },
  };
}
