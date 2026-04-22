"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cacheBrowserSession } from "@/lib/browser-session-cache";
import {
  ensureServerSession,
} from "@/lib/browser-auth-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "../confirmed/page.module.css";

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

async function applyHashSessionToBrowser(): Promise<boolean> {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresAt = params.get("expires_at");

  if (!accessToken || !refreshToken) return false;

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.session) return false;

  cacheBrowserSession(data.session);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}

function AuthContinuePageInner() {
  const searchParams = useSearchParams();
  const next = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);
  const [status, setStatus] = useState<string>("Finalizing your secure session.");

  useEffect(() => {
    let cancelled = false;

    async function continueToTarget() {
      const restoredFromHash = await applyHashSessionToBrowser().catch(() => false);

      if (restoredFromHash) {
        // Give Supabase browser client time to commit the session to IndexedDB
        // before the bridge attempts to read it back.
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const serverToken = await ensureServerSession({ attempts: 4, pauseMs: 400 });
      if (serverToken) {
        window.location.assign(next);
        return;
      }

      if (!cancelled) setStatus("Secure session not found. Sending you to sign in.");
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("auth_error", "session_required");
      window.location.assign(loginUrl.toString());
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
