"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { cacheBrowserSession, clearCachedBrowserSession } from "@/lib/browser-session-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

function shouldBridge(event: AuthChangeEvent, session: Session | null): boolean {
  if (!session?.access_token || !session.refresh_token) return false;
  return (
    event === "SIGNED_IN" ||
    event === "TOKEN_REFRESHED" ||
    event === "USER_UPDATED"
  );
}

export function AuthSessionSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token && session.refresh_token) {
        cacheBrowserSession(session);
      } else if (event === "SIGNED_OUT") {
        clearCachedBrowserSession();
      }

      if (shouldBridge(event, session)) {
        void bridgeBrowserSessionToServer().catch(() => null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
