import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: `${PRODUCT_NAME} — AI Governance Platform`,
  description: "DeploySure gives your organization structured, auditable AI governance — ready to adopt in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable}`}>
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
              <Link href="#" className={styles.navLink}>How it works</Link>
              <Link href="#" className={styles.navLink}>About</Link>
              <Link href="#" className={styles.navLink}>Contact</Link>
              <Link href="/generate" className={styles.navCta}>Get started</Link>
            </nav>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerCol}>
              <div className={styles.footerBrand}>
                <BrandMark compact />
                <div className={styles.footerBrandText}>
                  <span className={styles.logoWordmark}>
                    Deploy<span className={styles.logoWordmarkAccent}>Sure</span>
                  </span>
                  <span className={styles.logoDescriptor}>{PRODUCT_DESCRIPTOR}</span>
                </div>
              </div>
            </div>
            <div className={styles.footerColCenter}>
              <Link href="#" className={styles.footerLink}>How it works</Link>
              <Link href="#" className={styles.footerLink}>About</Link>
              <Link href="#" className={styles.footerLink}>Contact</Link>
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
