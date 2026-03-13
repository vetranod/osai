"use client";

import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { cacheBrowserSession, getCachedBrowserSession } from "@/lib/browser-session-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type BridgeMode = "await" | "background";

type ClientAccessTokenOptions = {
  preferServerToken?: boolean;
  bridgeMode?: BridgeMode;
  forceRefresh?: boolean;
};

let refreshInFlight: Promise<string | null> | null = null;

function isTokenFresh(expiresAt: number | null | undefined): boolean {
  return !expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 30;
}

function applyBridge(mode: BridgeMode): Promise<void> {
  if (mode === "background") {
    void bridgeBrowserSessionToServer().catch(() => null);
    return Promise.resolve();
  }

  return bridgeBrowserSessionToServer().then(() => undefined).catch(() => undefined);
}

export function getAuthProofHeaderValue(): string | null {
  if (typeof window === "undefined") return null;
  const proof = (window as unknown as { __OSAI_AUTH_PROOF?: unknown }).__OSAI_AUTH_PROOF;
  if (!proof) return null;

  try {
    return JSON.stringify(proof);
  } catch {
    return null;
  }
}

export async function getServerAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    return typeof data?.access_token === "string" && data.access_token ? data.access_token : null;
  } catch {
    return null;
  }
}

export async function ensureServerSession(
  options: { attempts?: number; pauseMs?: number } = {}
): Promise<string | null> {
  const attempts = options.attempts ?? 3;
  const pauseMs = options.pauseMs ?? 300;

  const initialServerToken = await getServerAccessToken();
  if (initialServerToken) return initialServerToken;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const bridged = await bridgeBrowserSessionToServer().catch(() => ({
      ok: false as const,
      message: "Bridge request failed.",
    }));
    if (bridged.ok) {
      const bridgedServerToken = await getServerAccessToken();
      if (bridgedServerToken) return bridgedServerToken;
    }

    const refreshedToken = await refreshBrowserSessionAndBridge({ bridgeMode: "await" });
    if (refreshedToken) {
      const refreshedServerToken = await getServerAccessToken();
      if (refreshedServerToken) return refreshedServerToken;
    }

    const restoredToken = await restoreBrowserSessionFromCache({ bridgeMode: "await" });
    if (restoredToken) {
      const restoredServerToken = await getServerAccessToken();
      if (restoredServerToken) return restoredServerToken;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }

  return null;
}

export async function refreshBrowserSessionAndBridge(
  options: { bridgeMode?: BridgeMode } = {}
): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const bridgeMode = options.bridgeMode ?? "await";
  refreshInFlight = (async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.refreshSession();
      const session = data.session;
      if (!session?.access_token || !session.refresh_token) return null;

      cacheBrowserSession(session);
      await applyBridge(bridgeMode);
      return session.access_token;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function restoreBrowserSessionFromCache(
  options: { bridgeMode?: BridgeMode } = {}
): Promise<string | null> {
  const bridgeMode = options.bridgeMode ?? "await";
  const cachedSession = getCachedBrowserSession();
  if (!cachedSession?.access_token || !cachedSession.refresh_token) return null;

  const supabase = getSupabaseBrowserClient();
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: cachedSession.access_token,
      refresh_token: cachedSession.refresh_token,
    });

    if (!error && data.session?.access_token && data.session.refresh_token) {
      cacheBrowserSession(data.session);
      await applyBridge(bridgeMode);
      return data.session.access_token;
    }
  } catch {
    // Fall through to raw cached token if it still appears usable.
  }

  if (isTokenFresh(cachedSession.expires_at)) {
    return cachedSession.access_token;
  }

  return null;
}

export async function getClientAccessToken(
  options: ClientAccessTokenOptions = {}
): Promise<string | null> {
  const preferServerToken = options.preferServerToken ?? false;
  const bridgeMode = options.bridgeMode ?? "await";
  const forceRefresh = options.forceRefresh ?? false;

  if (preferServerToken) {
    const serverToken = await getServerAccessToken();
    if (serverToken) return serverToken;
  }

  const supabase = getSupabaseBrowserClient();

  if (!forceRefresh) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && session.refresh_token && isTokenFresh(session.expires_at)) {
        cacheBrowserSession(session);
        await applyBridge(bridgeMode);
        return session.access_token;
      }
    } catch {
      // Continue to refresh and cache restore fallbacks.
    }
  }

  const refreshedToken = await refreshBrowserSessionAndBridge({ bridgeMode });
  if (refreshedToken) return refreshedToken;

  const restoredToken = await restoreBrowserSessionFromCache({ bridgeMode });
  if (restoredToken) return restoredToken;

  if (!preferServerToken) {
    return getServerAccessToken();
  }

  return null;
}

export async function buildClientAuthHeaders(
  headersInit?: HeadersInit,
  options: ClientAccessTokenOptions = {}
): Promise<Record<string, string>> {
  const headers = new Headers(headersInit ?? undefined);
  const accessToken = await getClientAccessToken(options);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const proofHeader = getAuthProofHeaderValue();
  if (proofHeader && !headers.has("x-osai-auth-proof")) {
    headers.set("x-osai-auth-proof", proofHeader);
  }

  return Object.fromEntries(headers.entries());
}
