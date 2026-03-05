"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

type SessionStatus = {
  ok: boolean;
  payment_status?: string;
  status?: string;
  rollout_id?: string | null;
  message?: string;
};

function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentSessionId = sessionId;
    if (!currentSessionId) {
      setError("Missing checkout session.");
      return;
    }
    const sid = currentSessionId;

    let cancelled = false;
    const started = Date.now();

    async function poll() {
      try {
        const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sid)}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json()) as SessionStatus;
        if (cancelled) return;
        setStatus(data);

        if (res.ok && data.ok && data.rollout_id) {
          router.replace(`/rollouts/${data.rollout_id}`);
          return;
        }
      } catch {
        if (!cancelled) setError("Unable to verify payment status right now.");
      }

      if (Date.now() - started < 120000 && !cancelled) {
        setTimeout(poll, 2200);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

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
          <p className={styles.pending}>Still processing. This usually takes a few seconds.</p>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}
        {status && !status.ok && status.message ? <p className={styles.error}>{status.message}</p> : null}

        <div className={styles.actions}>
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
