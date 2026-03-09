import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { createAuthProof, type AuthProof } from "@/lib/auth-proof";
import { buildPageMetadata, SITE_NAME } from "@/app/seo";
import { getSupabaseServerAuthClient } from "@/lib/supabase-server-auth";
import "./globals.css";
import styles from "./layout.module.css";

// ---- Product identity — swap this one constant when the name is decided ----
const PRODUCT_NAME = "DeploySure";
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
    <span className={compact ? styles.brandMarkCompact : styles.brandMark} aria-hidden="true">
      <span className={styles.brandBarTop} />
      <span className={styles.brandBarMid} />
      <span className={styles.brandBarBottom} />
      <span className={styles.brandCurve} />
    </span>
  );
}

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${PRODUCT_NAME} | AI Governance Platform`,
    description:
      "DeploySure gives professional teams a structured AI governance framework with rollout guardrails, review controls, and a client-ready policy packet.",
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
    if (currentUser?.app_metadata?.demo_access === true) {
      publicEnv.demoCheckoutEnabled = true;
    }
    if (user?.email && user.email_confirmed_at) {
      authProof = createAuthProof(user.id, user.email);
    }
  } catch {
    // Auth config/runtime can be unavailable in some deploys; keep shell renderable.
    user = null;
    authProof = null;
  }

  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable}`}>
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
              <span className={styles.logoLockup}>
                <span className={styles.logoWordmark}>
                  Deploy<span className={styles.logoWordmarkAccent}>Sure</span>
                </span>
                <span className={styles.logoDescriptor}>{PRODUCT_DESCRIPTOR}</span>
              </span>
            </Link>
            <nav className={styles.nav}>
              <Link href="/how-it-works" className={styles.navLink}>How it works</Link>
              <Link href="/resources" className={styles.navLink}>Resources</Link>
              <Link href="mailto:info@deploysure.com" className={styles.navLink}>Contact</Link>
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
                <div className={styles.logoLockup}>
                  <span className={styles.logoWordmark}>
                    Deploy<span className={styles.logoWordmarkAccent}>Sure</span>
                  </span>
                  <span className={styles.logoDescriptor}>{PRODUCT_DESCRIPTOR}</span>
                </div>
              </div>
            </div>
            <div className={styles.footerColCenter}>
              <Link href="/how-it-works" className={styles.footerLink}>How it works</Link>
              <Link href="/resources" className={styles.footerLink}>Resources</Link>
              <Link href="mailto:info@deploysure.com" className={styles.footerLink}>Contact</Link>
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
