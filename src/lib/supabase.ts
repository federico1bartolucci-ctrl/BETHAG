import { createClient } from "@supabase/supabase-js";

const configuredFlag = import.meta.env.VITE_SUPABASE_ENABLE as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Fail closed: never silently connect a QA or misconfigured build to Production.
export const supabaseConfigured =
  configuredFlag !== "false" && Boolean(supabaseUrl && supabasePublishableKey);

const clientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
};

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, clientOptions)
  : null;

// Dedicated client for public registration; it never shares the main session.
export const supabaseRecoveryAuth = supabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      ...clientOptions,
      auth: { ...clientOptions.auth, flowType: "pkce" },
    })
  : null;

export const supabasePublicAuth = supabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase non configurato. Imposta VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return supabase;
}
