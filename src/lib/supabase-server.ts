import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export function getServiceRoleSupabase(): SupabaseClient {
  if (cached) return cached;

  // Prefer non-public server env var names if you have them.
  // If you only have NEXT_PUBLIC_SUPABASE_URL, we’ll use it as a fallback.
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "";

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL (fallback)."
    );
  }

  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
