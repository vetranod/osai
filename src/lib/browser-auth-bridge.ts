"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

let bridgeInFlight: Promise<boolean> | null = null;

export async function bridgeBrowserSessionToServer(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token || !session.refresh_token) {
    return false;
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
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      bridgeInFlight = null;
    });

  return bridgeInFlight;
}
