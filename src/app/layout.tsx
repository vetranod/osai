import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { AuthSessionSync } from "@/app/AuthSessionSync";
import { createAuthProof, type AuthProof } from "@/lib/auth-proof";
import { buildPageMetadata, SITE_NAME } from "@/app/seo";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import "./globals.css";
import styles from "./layout.module.css";

// ---- Product identity — swap this one constant when the name is decided ----
const PRODUCT_NAME = "Fulcral";
const PRODUCT_DESCRIPTOR = "Deploy AI without losing control.";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src={compact ? "/brand/fulcral-mark-nav-light.svg" : "/brand/fulcral-mark-light.svg"}
      alt=""
      aria-hidden="true"
      width={compact ? 52 : 58}
      height={compact ? 52 : 58}
      className={compact ? styles.brandMarkCompact : styles.brandMark}
      priority
    />
  );
}

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${PRODUCT_NAME} | AI Governance Platform`,
    description:
      "Fulcral gives professional teams a structured AI governance framework with rollout guardrails, review controls, and a client-ready policy packet.",
    path: "/",
    keywords: [
      "AI governance",
      "AI policy generator",
      "AI rollout framework",
      "AI guardrails",
      "small business AI governance",
      "professional services AI policy",
    ],
  }),
  applicationName: SITE_NAME,
  category: "business",
  other: {
    "websitelaunches-verification": "0ffdb6c05be9e11034065b24af8c053b",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32 16x16", type: "image/x-icon" },
      { url: "/brand/fulcral-favicon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publicEnv = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    demoCheckoutEnabled: process.env.NEXT_PUBLIC_DEMO_CHECKOUT_ENABLED === "true",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? process.env.SITE_URL ?? "",
  };

  let user: { id: string; email: string | null; email_confirmed_at: string | null } | null = null;
  let authProof: AuthProof | null = null;
  try {
    const supabase = await getSupabaseServerAuthClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser
      ? {
          id: currentUser.id,
          email: currentUser.email ?? null,
          email_confirmed_at: currentUser.email_confirmed_at ?? null,
        }
      : null;
    // Invited demo users (app_metadata.demo_access) see the demo button without the global env flag.
    const hasDemoAccess = currentUser?.app_metadata?.demo_access === true;
    if (hasDemoAccess) {
      publicEnv.demoCheckoutEnabled = true;
    }
    if (user?.email && user.email_confirmed_at) {
      authProof = createAuthProof(user.id, user.email, hasDemoAccess);
    }
  } catch {
    // Auth config/runtime can be unavailable in some deploys; keep shell renderable.
    user = null;
    authProof = null;
  }

  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable}`}>
        <AuthSessionSync />
        <script
          id="osai-public-env"
          dangerouslySetInnerHTML={{
            __html: `window.__OSAI_PUBLIC_ENV=${JSON.stringify(publicEnv)};`,
          }}
        />
        <script
          id="osai-auth-proof"
          dangerouslySetInnerHTML={{
            __html: `window.__OSAI_AUTH_PROOF=${JSON.stringify(authProof)};`,
          }}
        />
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              <BrandMark />
              <span className={styles.logoWordmark}>
                Fulcral
              </span>
            </Link>
            <nav className={styles.nav}>
              <Link href="/how-it-works" className={styles.navLink}>How it works</Link>
              <Link href="/resources" className={styles.navLink}>Resources</Link>
              <Link href="mailto:info@fulcral.org" className={styles.navLink}>Contact</Link>
              {user ? (
                <Link href="/auth/signout" className={styles.navLink}>Sign out</Link>
              ) : (
                <Link href="/login" className={styles.navLink}>Sign in</Link>
              )}
              <Link href="/generate" className={styles.navCta}>Get started</Link>
            </nav>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerCol}>
              <div className={styles.footerBrand}>
                <BrandMark />
                <span className={styles.logoWordmark}>
                  Fulcral
                </span>
              </div>
            </div>
            <div className={styles.footerColCenter}>
              <Link href="/how-it-works" className={styles.footerLink}>How it works</Link>
              <Link href="/resources" className={styles.footerLink}>Resources</Link>
              <Link href="mailto:info@fulcral.org" className={styles.footerLink}>Contact</Link>
            </div>
            <div className={styles.footerColRight}>
              <p className={styles.footerLegal}>
                &copy; 2025 {PRODUCT_NAME}. All rights reserved.
              </p>
              <p className={styles.footerDisclaimer}>
                This product provides internal governance structure. It is not legal advice.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
