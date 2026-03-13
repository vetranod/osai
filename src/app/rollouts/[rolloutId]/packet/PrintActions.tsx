"use client";

import { useRouter } from "next/navigation";
import { ensureServerSession } from "@/lib/browser-auth-client";
import styles from "./packet.module.css";

export function PrintActions({ rolloutId }: { rolloutId: string }) {
  const router = useRouter();

  async function handleBackToDashboard(): Promise<void> {
    const dashboardPath = `/rollouts/${rolloutId}`;
    const serverToken = await ensureServerSession({ attempts: 3, pauseMs: 200 });
    if (serverToken) {
      router.push(dashboardPath);
      return;
    }

    router.push(`/auth/continue?next=${encodeURIComponent(dashboardPath)}`);
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.printButton} onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <button type="button" className={styles.backLink} onClick={() => void handleBackToDashboard()}>
        Back to dashboard
      </button>
    </div>
  );
}
