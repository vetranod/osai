"use client";

import { Suspense, FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { bridgeBrowserSessionToServer } from "@/lib/browser-auth-bridge";
import { ensureServerSession, hasRecoverableBrowserSession } from "@/lib/browser-auth-client";
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
  const intent = searchParams.get("intent");
  const requestedMode = searchParams.get("mode");
  const callbackError = useMemo(() => {
    const code = searchParams.get("auth_error");
    if (code === "exchange_failed") {
      return "We couldn't complete sign-in from that email link. Request a new login link.";
    }
    if (code === "session_required") {
      return "Your session expired. Please sign in again to continue.";
    }
    return null;
  }, [searchParams]);
  const sessionRequired = searchParams.get("auth_error") === "session_required";
  const checkoutIntent = intent === "checkout";
  const defaultMode: AuthMode = requestedMode === "sign_up" ? "sign_up" : "sign_in";

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (!sessionRequired) {
      return;
    }

    let cancelled = false;

    async function recoverSession() {
      const recoverable = await hasRecoverableBrowserSession();
      if (cancelled || !recoverable) {
        setStatus(null);
        return;
      }

      setStatus("Restoring your session...");
      const serverToken = await ensureServerSession({ attempts: 4, pauseMs: 250 });
      if (cancelled) return;

      if (serverToken) {
        window.location.assign(nextPath);
        return;
      }

      setStatus(null);
    }

    void recoverSession();
    return () => {
      cancelled = true;
    };
  }, [nextPath, sessionRequired]);

  async function handleEmailPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const supabase = getSupabaseBrowserClient();

      if (mode === "sign_in") {
        const { data, error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          AUTH_TIMEOUT_MS
        );

        if (signInError || !data.session) {
          setError(signInError?.message ?? "Sign-in failed.");
          return;
        }

        cacheBrowserSession(data.session);
        const bridged = await bridgeBrowserSessionToServer();
        const protectedTarget =
          nextPath.startsWith("/rollouts/") ||
          nextPath.startsWith("/generate/success") ||
          nextPath.startsWith("/demo/generate");

        if (!bridged.ok || protectedTarget || nextPath === "/generate") {
          await ensureServerSession({ attempts: 3, pauseMs: 200 });
        }

        // For returning users, skip the wizard entirely and go straight to
        // their dashboard.  We only do this when the login was not initiated
        // from a specific destination (i.e. nextPath is the default /generate).
        if (nextPath === "/generate") {
          try {
            const mineRes = await fetch("/api/rollouts/mine", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: data.session.access_token
                ? { Authorization: `Bearer ${data.session.access_token}` }
                : {},
            });
            if (mineRes.ok) {
              const mineData = (await mineRes.json()) as {
                ok?: boolean;
                rollout?: { dashboard_url?: string } | null;
              };
              if (mineData.ok && mineData.rollout?.dashboard_url) {
                setStatus("Welcome back. Taking you to your dashboard...");
                window.location.assign(mineData.rollout.dashboard_url);
                return;
              }
            }
          } catch {
            // Non-fatal: fall through to default redirect.
          }
        }

        setStatus("Signed in. Redirecting...");
        window.location.assign(nextPath);
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
        <h1 className={styles.title}>
          {checkoutIntent && !sessionRequired
            ? mode === "sign_up"
              ? "Create your account to continue"
              : "Sign in to continue"
            : "Sign in to Fulcral"}
        </h1>
        <p className={styles.subtitle}>
          {checkoutIntent && !sessionRequired
            ? "We need an account before payment so your rollout, purchase, and dashboard stay linked."
            : "Continue to your framework builder and rollout dashboards."}
        </p>

        <div className={styles.modeRow} role="group" aria-label="Authentication mode">
          <button
            type="button"
            aria-pressed={mode === "sign_in"}
            className={mode === "sign_in" ? styles.modeActive : styles.modeButton}
            onClick={() => setMode("sign_in")}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === "sign_up"}
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
        {checkoutIntent && !sessionRequired ? (
          <p className={styles.status}>
            New here? Create your account first. Already have one? Switch to Sign in.
          </p>
        ) : null}
        {status ? <p className={styles.status}>{status}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <p className={styles.note}>
          By continuing, you agree to use Fulcral for internal governance planning.
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
