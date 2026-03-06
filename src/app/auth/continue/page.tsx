"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function continueToTarget() {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token || !session.refresh_token) {
        if (!cancelled) setError("No active browser session was found. Sign in again to continue.");
        return;
      }

      let bridgeError: string | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const bridged = await bridgeBrowserSessionToServer();
        if (bridged.ok) {
          window.location.assign(next);
          return;
        }
        bridgeError = [
          bridged.message,
          bridged.reason ? `reason=${bridged.reason}` : null,
          bridged.details ? `details=${bridged.details}` : null,
          bridged.request_host ? `request_host=${bridged.request_host}` : null,
          bridged.app_host ? `app_host=${bridged.app_host}` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (!cancelled) {
        setError(bridgeError ?? "We could not finalize your authenticated session on the server. Sign in again to continue.");
      }
    }

    void continueToTarget();
    return () => {
      cancelled = true;
    };
  }, [next]);

  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Secure access</p>
        <h1 className={styles.title}>Finishing sign-in</h1>
        <p className={styles.subtitle}>
          We are finalizing your secure session and taking you back to your rollout.
        </p>
        {error ? (
          <>
            <p className={styles.subtitle}>{error}</p>
            <Link href={loginHref} className={styles.primaryButton}>
              Return to sign in
            </Link>
          </>
        ) : (
          <p className={styles.subtitle}>Please wait a moment.</p>
        )}
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
