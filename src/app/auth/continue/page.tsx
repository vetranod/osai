"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import {
  getServerAccessToken,
  refreshBrowserSessionAndBridge,
  restoreBrowserSessionFromCache,
} from "@/lib/browser-auth-client";
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
      await restoreBrowserSessionFromCache().catch(() => null);

      const serverToken = await getServerAccessToken();
      if (serverToken) {
        window.location.assign(next);
        return;
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const refreshedToken = await refreshBrowserSessionAndBridge();
        if (refreshedToken) {
          window.location.assign(next);
          return;
        }

        const bridged = await bridgeBrowserSessionToServer();
        if (bridged.ok) {
          window.location.assign(next);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
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
