"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { cacheBrowserSession, getCachedBrowserSession } from "@/lib/browser-session-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "../confirmed/page.module.css";

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

function AuthContinuePageInner() {
  const searchParams = useSearchParams();
  const next = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);
  const [status, setStatus] = useState<string>("Finalizing your secure session.");

  useEffect(() => {
    let cancelled = false;

    async function continueToTarget() {
      // Always restore browser session from cache first, so both browser cookies
      // AND SSR cookies are in sync before we navigate to a server-guarded route.
      // Without this, the dashboard loads with SSR cookies only — if anything
      // clears those cookies (e.g. the proxy triggering a setAll on a stale token),
      // the dashboard's bearer-token fallback has nothing to fall back to.
      const supabase = getSupabaseBrowserClient();
      const cachedSession = getCachedBrowserSession();
      if (cachedSession?.access_token) {
        try {
          const { data: restored, error: restoreError } = await supabase.auth.setSession({
            access_token: cachedSession.access_token,
            refresh_token: cachedSession.refresh_token,
          });
          if (!restoreError && restored.session?.access_token) {
            cacheBrowserSession(restored.session);
          }
        } catch { /* silent */ }
        // Re-bridge so SSR cookies are fresh regardless of what path we take below.
        await bridgeBrowserSessionToServer().catch(() => null);
      }

      // Check SSR cookies — if valid, navigate immediately.
      try {
        const tokenRes = await fetch("/api/auth/token", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (tokenRes.ok) {
          window.location.assign(next);
          return;
        }
      } catch {
        // Fall through to bridge-retry recovery.
      }

      // SSR cookies are still absent — retry bridge up to 3 times.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && session.refresh_token) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const bridged = await bridgeBrowserSessionToServer();
          if (bridged.ok) {
            window.location.assign(next);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (!cancelled) setStatus("Continuing to your next page.");
      window.location.assign(next);
    }

    void continueToTarget();
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Secure access</p>
        <h1 className={styles.title}>Finishing sign-in</h1>
        <p className={styles.subtitle}>
          We are finalizing your secure session and taking you back to your rollout.
        </p>
        <p className={styles.subtitle}>{status}</p>
        <Link href={next} className={styles.primaryButton}>
          Continue now
        </Link>
      </div>
    </section>
  );
}

export default function AuthContinuePage() {
  return (
    <Suspense fallback={null}>
      <AuthContinuePageInner />
    </Suspense>
  );
}
