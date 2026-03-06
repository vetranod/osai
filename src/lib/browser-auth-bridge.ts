"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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

export async function bridgeBrowserSessionToServer(): Promise<BrowserAuthBridgeResult> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token || !session.refresh_token) {
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
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
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

      return {
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
