"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { cacheBrowserSession, getCachedBrowserSession } from "@/lib/browser-session-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

type SessionStatus = {
  ok: boolean;
  payment_status?: string;
  status?: string;
  rollout_status?: "ready" | "paid_processing" | "pending_payment";
  rollout_id?: string | null;
  message?: string;
};

async function getCheckoutStatusAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed.session?.access_token) {
    cacheBrowserSession(refreshed.session);
    await bridgeBrowserSessionToServer();
    return refreshed.session.access_token;
  }

  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();
  if (existingSession?.access_token) {
    cacheBrowserSession(existingSession);
    await bridgeBrowserSessionToServer();
    return existingSession.access_token;
  }

  const cachedSession = getCachedBrowserSession();
  if (cachedSession) {
    const { data: restored, error: restoreError } = await supabase.auth.setSession({
      access_token: cachedSession.access_token,
      refresh_token: cachedSession.refresh_token,
    });
    if (!restoreError && restored.session?.access_token) {
      cacheBrowserSession(restored.session);
      await bridgeBrowserSessionToServer();
      return restored.session.access_token;
    }
  }

  try {
    const res = await fetch("/api/auth/token", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return typeof data?.access_token === "string" && data.access_token ? data.access_token : null;
    }
  } catch {
    // Fall through to cached session token.
  }

  return getCachedBrowserSession()?.access_token ?? null;
}

function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const currentSessionId = sessionId;
    if (!currentSessionId) {
      setError("Missing checkout session.");
      return;
    }
    const sid = currentSessionId;

    let cancelled = false;
    const started = Date.now();
    setTimedOut(false);

    async function poll() {
      try {
        const accessToken = await getCheckoutStatusAccessToken();
        const headers: Record<string, string> = {};
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        if (typeof window !== "undefined" && (window as unknown as { __OSAI_AUTH_PROOF?: unknown }).__OSAI_AUTH_PROOF) {
          headers["x-osai-auth-proof"] = JSON.stringify(
            (window as unknown as { __OSAI_AUTH_PROOF?: unknown }).__OSAI_AUTH_PROOF
          );
        }

        const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sid)}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers,
        });
        const data = (await res.json()) as SessionStatus;
        if (cancelled) return;
        setStatus(data);

        if (res.status === 401) {
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set("next", `/generate/success?session_id=${encodeURIComponent(sid)}`);
          loginUrl.searchParams.set("auth_error", "session_required");
          window.location.assign(loginUrl.toString());
          return;
        }

        if (res.ok && data.ok && data.rollout_id) {
          void bridgeBrowserSessionToServer();
          router.replace(`/rollouts/${data.rollout_id}`);
          return;
        }
      } catch {
        if (!cancelled) setError("Unable to verify payment status right now.");
      }

      if (Date.now() - started < 120000 && !cancelled) {
        setTimeout(poll, 2200);
      } else if (!cancelled) {
        setTimedOut(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  const waitingMessage =
    status?.rollout_status === "paid_processing"
      ? "Payment is confirmed. We are still finalizing your rollout."
      : "Still processing. This usually takes a few seconds.";

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Payment received</p>
        <h1 className={styles.title}>Building your governance packet</h1>
        <p className={styles.body}>
          We are finalizing your rollout plan and governance documents. This page refreshes automatically.
        </p>

        {status?.rollout_id ? (
          <p className={styles.ok}>Redirecting to your rollout dashboard...</p>
        ) : (
          <p className={styles.pending}>{waitingMessage}</p>
        )}

        {timedOut ? (
          <p className={styles.error}>
            This is taking longer than expected. Your payment may be complete, but the rollout has not been linked yet.
            You can retry this page shortly or contact support with your checkout session id.
          </p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        {status && !status.ok && status.message ? <p className={styles.error}>{status.message}</p> : null}
        {timedOut && sessionId ? <p className={styles.body}>Checkout session: <code>{sessionId}</code></p> : null}

        <div className={styles.actions}>
          {sessionId ? (
            <button
              className={styles.link}
              onClick={() => window.location.reload()}
              type="button"
            >
              Check again
            </button>
          ) : null}
          <Link className={styles.link} href="/generate">
            Return to builder
          </Link>
          <Link className={styles.link} href="/">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
