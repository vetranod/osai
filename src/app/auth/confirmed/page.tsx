import Link from "next/link";
import styles from "./page.module.css";

function sanitizeNextPath(raw: string | undefined): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AuthConfirmedPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Account confirmed</p>
        <h1 className={styles.title}>You&apos;re signed in.</h1>
        <p className={styles.subtitle}>
          Your email was verified successfully. Continue to finish your framework and payment.
        </p>
        <Link href={next} className={styles.primaryButton}>
          Continue
        </Link>
      </div>
    </section>
  );
}
