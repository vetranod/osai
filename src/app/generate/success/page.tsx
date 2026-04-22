"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  buildClientAuthHeaders,
  ensureServerSession,
  refreshBrowserSessionAndBridge,
} from "@/lib/browser-auth-client";
import styles from "./page.module.css";

type SessionStatus = {
  ok: boolean;
  payment_status?: string;
  status?: string;
  rollout_status?: "ready" | "paid_processing" | "pending_payment";
  rollout_id?: string | null;
  message?: string;
};

function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [recovering, setRecovering] = useState(false);

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
        const readStatus = async (): Promise<{ res: Response; data: SessionStatus }> => {
          const requestUrl = `/api/checkout/session?session_id=${encodeURIComponent(sid)}`;
          // Await the bridge so SSR cookies are confirmed fresh before the first
          // request fires — not fire-and-forget.
          const headers = await buildClientAuthHeaders(undefined, {
            bridgeMode: "await",
          });
          let res = await fetch(requestUrl, {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            headers,
          });

          if (res.status === 401) {
            const refreshedToken = await refreshBrowserSessionAndBridge();
            if (refreshedToken) {
              const retryHeaders = await buildClientAuthHeaders();
              res = await fetch(requestUrl, {
                method: "GET",
                cache: "no-store",
                credentials: "include",
                headers: retryHeaders,
              });
            }
          }

          if (res.status === 401) {
            const serverToken = await ensureServerSession({ attempts: 4, pauseMs: 250 });
            if (serverToken) {
              const retryHeaders = await buildClientAuthHeaders(undefined, {
                preferServerToken: true,
              });
              res = await fetch(requestUrl, {
                method: "GET",
                cache: "no-store",
                credentials: "include",
                headers: retryHeaders,
              });
            }
          }

          const data = (await res.json()) as SessionStatus;
          return { res, data };
        };

        let { res, data } = await readStatus();
        if (cancelled) return;

        // Only surface status to the UI on a non-auth-error response. Showing
        // "Authentication required" as an error would be confusing — auth
        // recovery is handled internally and the poll will retry naturally.
        if (res.status !== 401) {
          setStatus(data);
        }

        if (res.ok && data.ok && data.rollout_id) {
          const dashboardPath = `/rollouts/${data.rollout_id}`;
          router.replace(dashboardPath);
          return;
        }
      } catch {
        if (!cancelled) setError("Unable to verify payment status right now.");
      }

      if (Date.now() - started < 120000 && !cancelled) {
        setTimeout(poll, 2200);
      } else if (!cancelled) {
        setTimedOut(true);
        // Payment confirmed but rollout not linked — try recovering via /mine
        void recoverFromMine();
      }
    }

    async function recoverFromMine() {
      setRecovering(true);
      try {
        const headers = await buildClientAuthHeaders();
        const res = await fetch("/api/rollouts/mine", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers,
        });
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; rollout?: { dashboard_url?: string } | null };
          if (data.ok && data.rollout?.dashboard_url) {
            router.replace(data.rollout.dashboard_url);
            return;
          }
        }
      } catch {
        // non-fatal — fall through to support message
      }
      setRecovering(false);
    }

    void poll();
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
          recovering ? (
            <p className={styles.pending}>Checking your account for a linked rollout...</p>
          ) : (
            <p className={styles.error}>
              Your payment is confirmed but the rollout is taking longer than expected to set up.
              {" "}Try reloading in a minute, or contact support with your checkout session ID below.
            </p>
          )
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        {status && !status.ok && status.message ? <p className={styles.error}>{status.message}</p> : null}
        {timedOut && sessionId ? <p className={styles.body}>Checkout session: <code>{sessionId}</code></p> : null}

        <div className={styles.actions}>
          {timedOut && !recovering ? (
            <button
              className={styles.link}
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload and try again
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
