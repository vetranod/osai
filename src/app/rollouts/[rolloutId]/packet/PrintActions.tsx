"use client";

import { useRouter } from "next/navigation";
import styles from "./packet.module.css";

export function PrintActions({ rolloutId, printHtml }: { rolloutId: string; printHtml?: string | null }) {
  const router = useRouter();

  async function handleBackToDashboard(): Promise<void> {
    router.push(`/rollouts/${rolloutId}`);
  }

  function handlePrint(): void {
    if (!printHtml) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.printButton} onClick={handlePrint}>
        Print / Save as PDF
      </button>
      <button type="button" className={styles.backLink} onClick={() => void handleBackToDashboard()}>
        Back to dashboard
      </button>
    </div>
  );
}
