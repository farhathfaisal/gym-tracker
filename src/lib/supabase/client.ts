import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions, supabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error("Missing Supabase environment variables");
  }
  return createBrowserClient(env.url, env.key, {
    cookieOptions: authCookieOptions,
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}
