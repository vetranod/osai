import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.wrap}>

      {/* ---- Hero ---- */}
      <section className={styles.hero}>
        <span className={styles.heroBadge}>Governance Framework Generator</span>

        <h1 className={styles.heroHeadline}>
          Your organization&apos;s AI governance,<br />
          structured and ready to adopt.
        </h1>

        <p className={styles.heroBody}>
          Answer four questions about how your firm uses AI. DeploySure generates a
          tailored governance framework — calibrated to your risk profile and
          leadership posture — that your team can review, adopt, and act on.
        </p>

        <Link href="/generate" className={styles.heroCta}>
          Build your framework →
        </Link>
      </section>

      {/* ---- Deliverables ---- */}
      <section className={styles.deliverablesSection}>
        <p className={styles.deliverablesLabel}>What you&apos;ll get</p>
        <div className={styles.deliverables}>
          {[
            { label: "Usage Guardrails",  desc: "Clear rules on what AI can and cannot do at your firm." },
            { label: "Review Standard",   desc: "Who reviews AI output, how often, and when to escalate." },
            { label: "Adoption Plan",     desc: "A phased rollout plan with entry and exit criteria." },
            { label: "AI Usage Policy",   desc: "A formal, shareable policy document for your organization." },
          ].map(({ label, desc }) => (
            <div key={label} className={styles.deliverableItem}>
              <span className={styles.deliverableCheck}>✓</span>
              <span className={styles.deliverableLabel}>{label}</span>
              <span className={styles.deliverableDesc}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className={styles.howSection}>
        <p className={styles.howLabel}>How it works</p>
        <div className={styles.howSteps}>
          {[
            { num: "1", heading: "Answer four questions", body: "Tell us where AI is being used, how widely, what data it touches, and how leadership wants to proceed." },
            { num: "2", heading: "Framework is generated", body: "A deterministic decision engine calibrates your risk tier, rollout pace, and review depth — no AI guesswork." },
            { num: "3", heading: "Review and adopt", body: "Your governance dashboard contains every document your team needs to activate a compliant, structured rollout." },
          ].map(({ num, heading, body }) => (
            <div key={num} className={styles.howStep}>
              <span className={styles.howNum}>{num}</span>
              <strong className={styles.howHeading}>{heading}</strong>
              <p className={styles.howBody}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Bottom CTA ---- */}
      <section className={styles.bottomCta}>
        <h2 className={styles.bottomCtaHeadline}>Ready to govern your AI rollout?</h2>
        <p className={styles.bottomCtaBody}>
          Takes under five minutes. No account required.
        </p>
        <Link href="/generate" className={styles.heroCta}>
          Build your framework →
        </Link>
      </section>

    </div>
  );
}
