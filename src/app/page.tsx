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
          AI does not wait for a policy meeting. By the time you start thinking
          about structure, someone has already built a workflow using a tool you
          never reviewed. This gives you a way to get ahead of that, or at least
          catch up cleanly.
        </p>
        <Link href="/generate" className={styles.heroCta}>
          Start Your Structured Rollout
        </Link>
      </section>

      {/* ---- How it usually goes ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What usually happens</h2>
        <div className={styles.prose}>
          <p>Most firms do not sit down and design an AI strategy.</p>
          <p>
            Someone finds a tool that saves two hours. They mention it to a
            colleague. It spreads because it works. By the time leadership weighs
            in, it is already carrying real work.
          </p>
          <p>
            Useful technology moves quickly. Structure rarely keeps pace. Not
            because firms ignore it, but because there is no clear moment to stop
            and define it.
          </p>
          <p>
            DeploySure gives you that moment and something concrete to point to
            when questions start coming up.
          </p>
        </div>
      </section>

      {/* ---- What you walk away with ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What you walk away with</h2>
        <div className={styles.prose}>
          <p>
            You will have a rollout posture that matches your actual risk
            tolerance, not something written for a bank or a hospital.
          </p>
          <p>
            You will have guardrails aligned to your data, not abstract
            categories.
          </p>
          <p>
            You will have review expectations written down somewhere your team
            can actually find them.
          </p>
          <p>
            You will have staged progression so adoption does not simply drift
            forward unchecked.
          </p>
          <p>
            You will have a governance packet that answers questions before they
            turn into debates.
          </p>
          <p className={styles.blunt}>
            No consultant retainer. No recycled policy template.
          </p>
        </div>
        <p className={styles.credibility}>
          Built as a deterministic system, not a policy generator.
        </p>
      </section>

      {/* ---- Why timing matters ---- */}
      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Why timing matters</h2>
        <div className={styles.prose}>
          <p>
            Once AI is woven into daily work, adding structure feels like taking
            something away, even when it is not.
          </p>
          <p>
            It does not feel like governance. It feels like restrictions on
            something that already works.
          </p>
          <p>It is easier to set expectations while habits are still forming.</p>
        </div>
      </section>

      {/* ---- Who it's for ---- */}
      <section className={styles.forSection}>
        <h2 className={styles.sectionHeading}>Built for firms already in motion</h2>
        <div className={styles.prose}>
          <p>
            This fits teams of 10 to 50 people with some AI use already
            happening, even if it is informal. You want a defined position without
            turning this into a compliance initiative. If you are somewhere between
            "we should probably do something" and "we do not want to overengineer
            this," this is where DeploySure fits.
          </p>
        </div>
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
          Build your framework
        </Link>
      </section>

    </div>
  );
}
