"use client";

import type { Session } from "@supabase/supabase-js";

const SESSION_CACHE_KEY = "osai_browser_session_cache_v1";

type CachedBrowserSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  user_id: string | null;
  email: string | null;
  cached_at: number;
};

type SessionCacheSeed =
  | Pick<Session, "access_token" | "refresh_token" | "expires_at" | "user">
  | {
      access_token: string;
      refresh_token: string;
      expires_at?: number | null;
      user?: {
        id?: string | null;
        email?: string | null;
      } | null;
    };

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function cacheBrowserSession(session: SessionCacheSeed | null): void {
  if (!canUseSessionStorage()) return;
  if (!session?.access_token || !session.refresh_token) return;

  const value: CachedBrowserSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: typeof session.expires_at === "number" ? session.expires_at : null,
    user_id: session.user?.id ?? null,
    email: session.user?.email ?? null,
    cached_at: Date.now(),
  };

  try {
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures; runtime auth flow still has other fallbacks.
  }
}

export function getCachedBrowserSession(): CachedBrowserSession | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedBrowserSession>;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: typeof parsed.expires_at === "number" ? parsed.expires_at : null,
      user_id: typeof parsed.user_id === "string" ? parsed.user_id : null,
      email: typeof parsed.email === "string" ? parsed.email : null,
      cached_at: typeof parsed.cached_at === "number" ? parsed.cached_at : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearCachedBrowserSession(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
