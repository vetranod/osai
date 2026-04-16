import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../seo";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Governance Consulting Services | Fulcral",
  description:
    "Hands-on AI governance consulting for small and mid-size firms. Private infrastructure, staff training, guided framework development, and ongoing advisory — for teams without a dedicated technical staff.",
  path: "/services",
  keywords: [
    "AI governance consulting",
    "AI implementation consulting",
    "private AI infrastructure",
    "AI staff training",
    "AI policy consulting small business",
  ],
});

export default function ServicesPage() {
  return (
    <div className={styles.wrap}>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Consulting Services</span>
        <h1 className={styles.title}>
          Some teams want to do this themselves.<br />
          Others want a partner in the room.
        </h1>
        <p className={styles.intro}>
          Fulcral gives teams a structured starting point they can run independently.
          Our consulting work is for firms that want an expert involved — whether
          that means building the framework together from scratch, standing up private
          infrastructure, or training the people who have to live with it.
        </p>
      </section>

      {/* ── TWO PATHS ── */}
      <section className={styles.pathsSection}>
        <div className={styles.pathsGrid}>
          <div className={styles.pathCard}>
            <div className={styles.pathIcon}>◎</div>
            <h2 className={styles.pathTitle}>Platform</h2>
            <p className={styles.pathSub}>Right for you if</p>
            <ul className={styles.pathList}>
              <li>You want to move quickly and independently</li>
              <li>Your team can own the governance process day-to-day</li>
              <li>You want a structured output without a consulting engagement</li>
              <li>Budget is the primary constraint</li>
            </ul>
            <Link href="/generate" className={styles.pathCta}>
              Get started free →
            </Link>
          </div>
          <div className={`${styles.pathCard} ${styles.pathCardAccent}`}>
            <div className={styles.pathIcon}>◈</div>
            <h2 className={styles.pathTitle}>Consulting</h2>
            <p className={styles.pathSub}>Right for you if</p>
            <ul className={styles.pathList}>
              <li>You want someone accountable for the outcome</li>
              <li>Your team doesn&apos;t have the bandwidth or technical depth to drive this</li>
              <li>You need infrastructure decisions made, not just documented</li>
              <li>You want guidance that adapts to how your firm actually works</li>
            </ul>
            <Link href="/contact" className={styles.pathCtaAccent}>
              Start a conversation →
            </Link>
          </div>
        </div>
        <p className={styles.pathsNote}>
          Neither path is a consolation prize. They serve different buyers.
          If you&apos;re not sure which fits, the conversation costs nothing.
        </p>
      </section>

      {/* ── SERVICES ── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>What we help with</span>
        <h2 className={styles.sectionHeading}>Four areas where firms need more than a document</h2>
        <div className={styles.serviceGrid}>

          <div className={styles.serviceCard}>
            <div className={styles.serviceNumber}>01</div>
            <h3 className={styles.serviceTitle}>Guided governance from scratch</h3>
            <p className={styles.serviceText}>
              You don&apos;t need to have the platform output to work with us.
              We assess your current AI usage, identify the real risks and gaps,
              and build a governance framework alongside your team — not handed
              off for you to interpret.
            </p>
            <p className={styles.serviceNote}>Good for: firms with no existing governance, teams new to AI, leadership that wants expert input on the decisions</p>
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceNumber}>02</div>
            <h3 className={styles.serviceTitle}>Framework implementation</h3>
            <p className={styles.serviceText}>
              If you&apos;ve already generated a Fulcral framework, that&apos;s
              our starting point — not a blank page. We turn the output into
              running practice: review checkpoints, approval flows, escalation
              paths, and accountability structures your team will actually use.
            </p>
            <p className={styles.serviceNote}>Good for: firms that generated the framework but stalled on making it operational</p>
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceNumber}>03</div>
            <h3 className={styles.serviceTitle}>Private AI infrastructure</h3>
            <p className={styles.serviceText}>
              For firms where data sensitivity makes shared cloud tools a
              liability. We scope, procure, and configure private server or
              on-premises deployments — so your team gets the productivity
              benefit without the exposure.
            </p>
            <p className={styles.serviceNote}>Good for: legal, healthcare, financial, and professional services firms with client confidentiality obligations</p>
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceNumber}>04</div>
            <h3 className={styles.serviceTitle}>Staff training &amp; adoption</h3>
            <p className={styles.serviceText}>
              Role-by-role training so your team understands what they&apos;re
              allowed to use, how, and why — not just a policy PDF on a shared
              drive. We cover practical usage, guardrail rationale, and what
              to do when something falls outside the boundaries.
            </p>
            <p className={styles.serviceNote}>Good for: firms rolling out AI tools to staff who weren't part of the governance decisions</p>
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceNumber}>05</div>
            <h3 className={styles.serviceTitle}>Ongoing advisory</h3>
            <p className={styles.serviceText}>
              A named contact as your AI usage evolves. Not an open-ended
              retainer that bills for emails — a structured check-in model
              with clear scope. Useful when tools change, team composition
              shifts, or a new use case lands outside your existing guardrails.
            </p>
            <p className={styles.serviceNote}>Good for: firms that want a knowledgeable outside perspective without a full-time hire</p>
          </div>

        </div>
      </section>

      {/* ── WHO THIS IS FOR ── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Who we work with</span>
        <h2 className={styles.sectionHeading}>Built for firms without a dedicated technical team</h2>
        <div className={styles.forGrid}>
          <div className={styles.forProse}>
            <p>
              Our consulting clients are typically 15 to 100 people. Professional
              services firms, regional practices, owner-operated businesses that
              have grown into the territory where AI is genuinely useful but
              governance is genuinely overdue.
            </p>
            <p>
              They don&apos;t have a Chief AI Officer. They don&apos;t have an
              IT department that can evaluate an on-prem deployment. They have
              real work to do and a legitimate concern that AI tools — used
              without structure — create risk they can&apos;t see yet.
            </p>
            <p>
              That&apos;s the gap we work in.
            </p>
          </div>
          <div className={styles.forChecks}>
            {[
              "15–100 employees",
              "No dedicated IT or AI staff",
              "AI tools already in use, governance not yet formalized",
              "Data sensitivity or client confidentiality concerns",
              "Leadership wants accountability, not just documentation",
              "Budget for doing this properly, not just cheaply",
            ].map((item) => (
              <div key={item} className={styles.forCheck}>{item}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.section}>
        <span className={styles.sectionLabel}>How it works</span>
        <h2 className={styles.sectionHeading}>Three steps, no open-ended commitments</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <h3 className={styles.stepTitle}>Start a conversation</h3>
            <p className={styles.stepText}>
              A 30-minute call. No obligation, no pitch deck. We ask about your
              current situation, what you&apos;re worried about, and what you&apos;ve
              already tried. You&apos;ll know by the end whether there&apos;s a fit.
            </p>
          </div>
          <div className={styles.stepConnector} aria-hidden="true" />
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <h3 className={styles.stepTitle}>Scoped proposal</h3>
            <p className={styles.stepText}>
              Fixed scope wherever possible. We define what we&apos;re doing,
              what we&apos;re not doing, the timeline, and the cost — before
              anything starts. No surprises mid-engagement.
            </p>
          </div>
          <div className={styles.stepConnector} aria-hidden="true" />
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <h3 className={styles.stepTitle}>Delivery</h3>
            <p className={styles.stepText}>
              We work alongside your team, not around them. The goal is a firm
              that can operate its governance independently — not one that needs
              us indefinitely.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>
          Not sure what you need yet?<br />That&apos;s fine.
        </h2>
        <p className={styles.ctaBody}>
          Most of our clients weren&apos;t sure either. Tell us where you are
          and what&apos;s worrying you. We&apos;ll figure out the rest together.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/contact" className={styles.ctaPrimary}>
            Get in touch
          </Link>
          <Link href="/generate" className={styles.ctaSecondary}>
            Try the platform first
          </Link>
        </div>
      </section>

    </div>
  );
}
