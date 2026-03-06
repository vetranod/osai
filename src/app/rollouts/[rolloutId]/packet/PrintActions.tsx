"use client";

import Link from "next/link";
import styles from "./packet.module.css";

export function PrintActions({ rolloutId }: { rolloutId: string }) {
  return (
    <div className={styles.actions}>
      <button type="button" className={styles.printButton} onClick={() => window.print()}>
        Print / Save as PDF
      </button>
      <Link href={`/rollouts/${rolloutId}`} className={styles.backLink}>
        Back to dashboard
      </Link>
    </div>
  );
}
