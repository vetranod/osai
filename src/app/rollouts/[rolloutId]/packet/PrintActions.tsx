"use client";

import { useRouter } from "next/navigation";
import styles from "./packet.module.css";

export function PrintActions({ rolloutId }: { rolloutId: string }) {
  const router = useRouter();

  async function handleBackToDashboard(): Promise<void> {
    router.push(`/rollouts/${rolloutId}`);
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
