import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://tctcgptrsmvgajqjgnev.supabase.co";
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  "sb_publishable_VTickP6SdwCWp-3oUNSleA_UuA307iJ";

const configuredFlag = import.meta.env.VITE_SUPABASE_ENABLE as string | undefined;

export const supabaseConfigured =
  (configuredFlag === undefined || configuredFlag === "true") &&
  Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
        // React registers the auth listener before initialization so recovery
        // callbacks cannot be consumed before the PASSWORD_RECOVERY event.
        skipAutoInitialize: true,
      },
    })
  : null;

// Dedicated client for public registration. It does not share the main
// session/storage lock, so a first-time signup cannot be blocked by the
// application's session hydration.
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
