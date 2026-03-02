import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

// ---- Product identity — swap this one constant when the name is decided ----
const PRODUCT_NAME = "DeploySure";
const PRODUCT_DESCRIPTOR = "Deploy AI without losing control.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoWordmark}>
                Deploy<span className={styles.logoWordmarkAccent}>Sure</span>
              </span>
              <span className={styles.logoDescriptor}>{PRODUCT_DESCRIPTOR}</span>
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
              <span className={styles.logoWordmark}>
                Deploy<span className={styles.logoWordmarkAccent}>Sure</span>
              </span>
              <span className={styles.logoDescriptor}>{PRODUCT_DESCRIPTOR}</span>
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
