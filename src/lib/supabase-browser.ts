"use client";

import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookieOptions: {
      sameSite: "lax",
    } satisfies CookieOptions,
  });

  return browserClient;
}

