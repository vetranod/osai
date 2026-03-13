"use client";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __OSAI_PUBLIC_ENV?: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    };
  }
}

let browserClient: SupabaseClient | null = null;
let browserStorageKey: string | null = null;

function resolveBrowserEnv(): { url: string; anonKey: string } {
  const runtime = typeof window !== "undefined" ? window.__OSAI_PUBLIC_ENV : undefined;
  const url = runtime?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anonKey = runtime?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!url) {
    throw new Error("Missing public Supabase URL (runtime or NEXT_PUBLIC_SUPABASE_URL).");
  }
  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

function resolveBrowserStorageKey(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `sb-${hostname.split(".")[0]}-auth-token`;
  } catch {
    return "supabase-auth-token";
  }
}

export function clearSupabaseBrowserStorage(): void {
  if (typeof window === "undefined") return;

  const keys = new Set<string>();
  if (browserStorageKey) {
    keys.add(browserStorageKey);
    keys.add(`${browserStorageKey}-code-verifier`);
    keys.add(`${browserStorageKey}-user`);
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of keys) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore storage failures.
      }
    }
  }
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const { url, anonKey } = resolveBrowserEnv();
  browserStorageKey = resolveBrowserStorageKey(url);
  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: browserStorageKey,
    },
  });

  return browserClient;
}
