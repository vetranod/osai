import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.wrap}>

      {/* ---- Hero ---- */}
      <section className={styles.hero}>
        <h1 className={styles.heroHeadline}>
          Deploy AI without losing control.
        </h1>
        <p className={styles.heroSubheadline}>
          Structured rollout for small professional teams.
        </p>
        <p className={styles.heroBody}>
          AI doesn&apos;t wait for a policy meeting. By the time you start thinking
          about structure, someone has already built a workflow around a tool
          you&apos;ve never reviewed. This gives you a way to get ahead of that —
          or at least catch up cleanly.
        </p>
        <Link href="/generate" className={styles.heroCta}>
          Start Your Structured Rollout →
        </Link>
      </section>

      {/* ---- Establish section ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Establish Your AI Structure</h2>

        <div className={styles.narrative}>
          <div className={styles.narrativeBlock}>
            <h3 className={styles.narrativeHeading}>How it usually goes</h3>
            <p className={styles.narrativeBody}>
              Nobody designs an AI strategy at the start. Someone finds a tool
              that saves two hours. They mention it. It spreads because it works.
              By the time leadership weighs in, it&apos;s already load-bearing.
            </p>
            <p className={styles.narrativeBody}>
              Useful technology moves fast. Structure rarely keeps up. Not
              because firms ignore it, but because there&apos;s no clear moment
              to stop and define it.
            </p>
            <p className={styles.narrativeBody}>
              DeploySure gives you that moment — and something concrete to show
              for it.
            </p>
          </div>
        </div>
      </section>

      {/* ---- What you get ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What you&apos;re walking away with</h2>
        <ul className={styles.benefitList}>
          {[
            "A rollout posture matched to your actual risk tolerance, not a generic framework written for a hospital or a hedge fund.",
            "Guardrails calibrated to your data.",
            "Review expectations written down somewhere your team can actually find them.",
            "Staged progression so adoption doesn't drift forward unchecked.",
            "A governance packet that answers questions before they turn into debates.",
            "No consultant retainer. No recycled policy template.",
          ].map((item, i) => (
            <li key={i} className={styles.benefitItem}>
              <span className={styles.benefitCheck}>✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Why timing matters ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Why the timing matters</h2>
        <div className={styles.timingGrid}>
          <p className={styles.timingBody}>
            Once AI is woven into daily work, adding structure feels like taking
            something away — even when it isn&apos;t.
          </p>
          <p className={styles.timingBody}>
            People don&apos;t resist governance because they&apos;re difficult.
            They resist it because they don&apos;t want to lose something
            that&apos;s already working.
          </p>
          <p className={styles.timingBody}>
            It&apos;s easier to set expectations while habits are still forming.
          </p>
        </div>
      </section>

      {/* ---- Who it's for ---- */}
      <section className={styles.forSection}>
        <h2 className={styles.sectionHeading}>Built for firms already in motion</h2>
        <p className={styles.forBody}>
          10 to 50 people. Some AI use already happening, even if it&apos;s
          informal. Leadership that wants a defined position without turning this
          into a compliance initiative.
        </p>
        <p className={styles.forBody}>
          If you&apos;re somewhere between &ldquo;we should probably do
          something&rdquo; and &ldquo;we don&apos;t want to overengineer
          this,&rdquo; this fits.
        </p>
      </section>

      {/* ---- Bottom CTA ---- */}
      <section className={styles.bottomCta}>
        <p className={styles.bottomCtaKicker}>
          Define how AI operates in your firm before it defines itself.
        </p>
        <h2 className={styles.bottomCtaHeadline}>
          Start Your Structured Rollout
        </h2>
        <Link href="/generate" className={styles.heroCta}>
          Build your framework →
        </Link>
      </section>

    </div>
  );
}
