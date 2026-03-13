"use client";

import {
  cacheBrowserSession,
  clearCachedBrowserSession,
  getCachedBrowserSession,
} from "@/lib/browser-session-cache";
import { clearSupabaseBrowserStorage, getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type BrowserAuthBridgeResult =
  | { ok: true }
  | {
      ok: false;
      status?: number;
      message: string;
      reason?: string | null;
      details?: string | null;
      request_host?: string | null;
      app_host?: string | null;
    };

let bridgeInFlight: Promise<BrowserAuthBridgeResult> | null = null;

function isTokenFresh(expiresAt: number | null | undefined): boolean {
  return !expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 30;
}

async function clearInvalidBrowserSession(): Promise<void> {
  clearCachedBrowserSession();
  clearSupabaseBrowserStorage();
}

async function getBridgeableBrowserSession(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const supabase = getSupabaseBrowserClient();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token && session.refresh_token && isTokenFresh(session.expires_at)) {
      cacheBrowserSession(session);
      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      };
    }

    if (session?.refresh_token) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session?.access_token && data.session.refresh_token) {
        cacheBrowserSession(data.session);
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }
    }
  } catch {
    // Fall through to cached-session recovery.
  }

  const cachedSession = getCachedBrowserSession();
  if (cachedSession?.access_token && cachedSession.refresh_token) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: cachedSession.access_token,
        refresh_token: cachedSession.refresh_token,
      });

      if (!error && data.session?.access_token && data.session.refresh_token) {
        cacheBrowserSession(data.session);
        return {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        };
      }
    } catch {
      // Fall through to clearing invalid local auth state.
    }
  }

  await clearInvalidBrowserSession();
  return null;
}

export async function bridgeBrowserSessionToServer(): Promise<BrowserAuthBridgeResult> {
  const browserSession = await getBridgeableBrowserSession();
  const accessToken = browserSession?.accessToken ?? "";
  const refreshToken = browserSession?.refreshToken ?? "";

  if (!accessToken || !refreshToken) {
    return {
      ok: false,
      message: "No active browser session was found.",
      reason: "missing_browser_session",
    };
  }

  if (bridgeInFlight) return bridgeInFlight;

  bridgeInFlight = fetch("/api/auth/bridge-session", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
    }),
  })
    .then(async (res) => {
      if (res.ok) return { ok: true } satisfies BrowserAuthBridgeResult;

      let body: Record<string, unknown> | null = null;
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        body = null;
      }

      const failure = {
        ok: false,
        status: res.status,
        message:
          typeof body?.message === "string"
            ? body.message
            : `Bridge request failed with HTTP ${res.status}.`,
        reason: typeof body?.reason === "string" ? body.reason : null,
        details: typeof body?.details === "string" ? body.details : null,
        request_host: typeof body?.request_host === "string" ? body.request_host : null,
        app_host: typeof body?.app_host === "string" ? body.app_host : null,
      } satisfies BrowserAuthBridgeResult;

      if (
        failure.reason === "invalid_access_token" ||
        failure.reason === "set_session_failed" ||
        failure.status === 401
      ) {
        await clearInvalidBrowserSession();
      }

      return failure;
    })
    .catch(() => ({
      ok: false,
      message: "Bridge request failed.",
      reason: "network_error",
    }))
    .finally(() => {
      bridgeInFlight = null;
    });

  return bridgeInFlight;
}
