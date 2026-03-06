"use client";

import { Suspense, FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { cacheBrowserSession } from "@/lib/browser-session-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

type AuthMode = "sign_in" | "sign_up";
const AUTH_TIMEOUT_MS = 15000;

function normalizeNextPath(raw: string | null): string {
  if (!raw) return "/generate";
  if (!raw.startsWith("/")) return "/generate";
  if (raw.startsWith("//")) return "/generate";
  return raw;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out. Please try again.")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getAuthRedirectBaseUrl(): string {
  if (typeof window === "undefined") return "";

  const runtimeAppUrl =
    (window as unknown as { __OSAI_PUBLIC_ENV?: { appUrl?: string } }).__OSAI_PUBLIC_ENV?.appUrl ??
    "";
  if (runtimeAppUrl) {
    try {
      return new URL(runtimeAppUrl).origin;
    } catch {}
  }

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (envAppUrl) {
    try {
      return new URL(envAppUrl).origin;
    } catch {}
  }

  return window.location.origin;
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => normalizeNextPath(searchParams.get("next")), [searchParams]);
  const callbackError = useMemo(() => {
    const code = searchParams.get("auth_error");
    if (code === "exchange_failed") {
      return "We couldn't complete sign-in from that email link. Request a new login link.";
    }
    if (code === "session_required") {
      return "Your session expired. Sign in again to continue to checkout.";
    }
    return null;
  }, [searchParams]);

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

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "sign_in") {
        const res = await withTimeout(
          fetch("/api/auth/sign-in", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          }),
          AUTH_TIMEOUT_MS
        );
        const signInData = (await res.json().catch(() => null)) as
          | { ok?: boolean; message?: string; access_token?: string; refresh_token?: string }
          | null;
        if (!res.ok || signInData?.ok === false) {
          setError(signInData?.message ?? "Sign-in failed.");
          return;
        }

        if (signInData?.access_token && signInData.refresh_token) {
          const supabase = getSupabaseBrowserClient();
          const { data: restored, error: restoreError } = await supabase.auth.setSession({
            access_token: signInData.access_token,
            refresh_token: signInData.refresh_token,
          });
          if (!restoreError && restored.session?.access_token) {
            cacheBrowserSession(restored.session);
            await bridgeBrowserSessionToServer();
          }
        }

        setStatus("Signed in. Redirecting...");
        window.location.assign(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const { error: signUpError } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${getAuthRedirectBaseUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        }),
        AUTH_TIMEOUT_MS
      );

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setStatus("Account created. Check your inbox for the confirmation link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await withTimeout(
        supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${getAuthRedirectBaseUrl()}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        }),
        AUTH_TIMEOUT_MS
      );

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setStatus("Login link sent. Check your inbox to continue.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
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
          className={styles.magicLinkButton}
          disabled={busy || !email}
          onClick={handleMagicLink}
        >
          Email login link
        </button>

        {callbackError ? <p className={styles.error}>{callbackError}</p> : null}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
