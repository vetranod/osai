"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

type AuthMode = "sign_in" | "sign_up";

function normalizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);

  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);

    const supabase = getSupabaseBrowserClient();

    if (mode === "sign_in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setBusy(false);
        setError(signInError.message);
        return;
      }

      router.replace(nextPath);
      router.refresh();
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setStatus("Account created. Check your inbox for the confirmation link.");
  }

  async function handleMagicLink() {
    setBusy(true);
    setError(null);
    setStatus(null);

    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    setBusy(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }

    setStatus("Magic link sent. Check your inbox to continue.");
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Secure access</p>
        <h1 className={styles.title}>Sign in to DeploySure</h1>
        <p className={styles.subtitle}>
          Continue to your framework builder and rollout dashboards.
        </p>

        <div className={styles.modeRow} role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === "sign_in" ? styles.modeActive : styles.modeButton}
            onClick={() => setMode("sign_in")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "sign_up" ? styles.modeActive : styles.modeButton}
            onClick={() => setMode("sign_up")}
          >
            Create account
          </button>
        </div>

        <form className={styles.form} onSubmit={handleEmailPassword}>
          <label className={styles.label} htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="you@company.com"
          />

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder={mode === "sign_in" ? "Enter password" : "At least 8 characters"}
          />

          <button type="submit" className={styles.primaryButton} disabled={busy}>
            {busy ? "Working..." : mode === "sign_in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy || !email}
          onClick={handleMagicLink}
        >
          Email me a magic link
        </button>

        {status ? <p className={styles.status}>{status}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <p className={styles.note}>
          By continuing, you agree to use DeploySure for internal governance planning.
          <Link href="/" className={styles.noteLink}>
            Back to home
          </Link>
        </p>
      </div>
    </section>
  );
}

