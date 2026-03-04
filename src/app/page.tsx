import Link from "next/link";
import styles from "./page.module.css";

function PacketPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.packetCardCompact : styles.packetCard}>
      <div className={styles.packetHeader}>
        <div>
          <div className={styles.packetTitle}>AI Governance Framework</div>
          <div className={styles.packetMeta}>DeploySure - Confidential</div>
        </div>
        <div className={styles.packetBadge}>Structured Rollout</div>
      </div>

      <div className={styles.packetBody}>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Rollout Profile</div>
          <div className={styles.packetRowValue}>
            Balanced adoption posture with staged implementation.
          </div>
        </div>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Guardrail Policy</div>
          <div className={styles.packetRowValue}>
            Internal information permitted. Client data restricted.
          </div>
        </div>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Operational Guidelines</div>
          <div className={styles.packetRowValue}>
            Approved use cases and review procedures.
          </div>
        </div>
        <div className={styles.packetRow}>
          <div className={styles.packetRowLabel}>Milestone Rollout Plan</div>
          <div className={styles.packetRowValue}>
            Four structured phases with leadership checkpoints.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroKicker}>DeploySure</span>
          <h1 className={styles.heroHeadline}>Deploy AI without losing control.</h1>
          <p className={styles.heroSubheadline}>
            Generate a structured AI governance framework for your firm in under a minute.
          </p>
          <p className={styles.heroDefinition}>
            Built for professional teams adopting AI tools without a clear rollout plan.
          </p>
          <div className={styles.heroActions}>
            <Link href="/generate" className={styles.ctaPrimary}>
              Generate your framework
            </Link>
            <Link href="/how-it-works" className={styles.ctaSecondary}>
              How it works
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <PacketPreview compact />
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>The problem</p>
        <h2 className={styles.sectionHeading}>Why AI adoption becomes chaotic</h2>
        <div className={styles.prose}>
          <p>
            AI adoption often begins informally. Someone discovers a tool that saves
            time. A colleague begins using it as well. Soon the tool spreads across
            the team.
          </p>
          <p>
            By the time leadership notices, the technology may already be embedded
            in critical workflows. Organizations then attempt to add structure after
            the technology is already operational. The system provides a way to
            introduce structure before AI adoption becomes unmanaged operational risk.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>System overview</p>
        <h2 className={styles.sectionHeading}>How the system works at a glance</h2>
        <div className={styles.diagram}>
          <div className={styles.diagramBlock}>
            <p className={styles.diagramBlockLabel}>Inputs</p>
            <ul className={styles.diagramList}>
              <li>Goal</li>
              <li>Adoption level</li>
              <li>Data sensitivity</li>
              <li>Leadership posture</li>
            </ul>
          </div>
          <div className={styles.diagramArrow}>
            <div className={styles.diagramArrowLine} />
            <div className={styles.diagramArrowHead} />
          </div>
          <div className={`${styles.diagramBlock} ${styles.diagramBlockAccent}`}>
            <p className={styles.diagramBlockLabel}>Decision Engine</p>
            <p className={styles.diagramBlockSub}>
              Deterministic model evaluates inputs and determines rollout posture
            </p>
          </div>
          <div className={styles.diagramArrow}>
            <div className={styles.diagramArrowLine} />
            <div className={styles.diagramArrowHead} />
          </div>
          <div className={styles.diagramBlock}>
            <p className={styles.diagramBlockLabel}>AI Governance Framework</p>
            <p className={styles.diagramBlockSub}>
              Rollout structure, guardrails, and governance documentation
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="framework-preview">
        <p className={styles.sectionLabel}>What you receive</p>
        <h2 className={styles.sectionHeading}>Your AI Governance Framework</h2>
        <div className={styles.frameworkSection}>
          <PacketPreview />
          <div className={styles.frameworkContent}>
            <p className={styles.frameworkText}>
              The system generates a structured AI Governance Packet that defines
              how AI tools should be introduced and governed within the organization.
            </p>
            <p className={styles.frameworkText}>
              This packet becomes the operational framework for rollout. It is
              built from pre-written, locked content and is not generated by AI.
            </p>

            <div className={styles.frameworkIncludes}>
              <p className={styles.frameworkIncludesTitle}>Your framework includes:</p>
              <ul className={styles.frameworkList}>
                <li>rollout pacing guidance</li>
                <li>guardrail policy recommendations</li>
                <li>operational usage guidelines</li>
                <li>milestone-based adoption structure</li>
              </ul>
            </div>

            <p className={styles.frameworkCredibility}>
              No AI-generated policy text. Every packet is produced by the same
              deterministic process. Inputs change the output. The process does not.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Audience</p>
        <h2 className={styles.sectionHeading}>Designed for professional organizations</h2>
        <p className={styles.forIntro}>
          The system is intended for organizations that want the productivity
          benefits of AI while maintaining operational control.
        </p>
        <div className={styles.forGrid}>
          <div className={styles.forItem}>Engineering firms</div>
          <div className={styles.forItem}>Consulting firms</div>
          <div className={styles.forItem}>Architecture studios</div>
          <div className={styles.forItem}>Law firms</div>
          <div className={styles.forItem}>Financial advisory teams</div>
          <div className={styles.forItem}>Professional agencies</div>
        </div>
        <p className={styles.forNote}>
          These firms often adopt AI organically without a formal rollout plan.
          Most organizations using the system have between 10 and 100 employees.
        </p>
      </section>

      <section className={styles.bottomCta}>
        <p className={styles.bottomCtaKicker}>
          Define how AI operates in your firm before it defines itself.
        </p>
        <h2 className={styles.bottomCtaHeadline}>
          Create your AI governance framework in under a minute.
        </h2>
        <p className={styles.bottomCtaBody}>
          A clear operational framework for organizations that want to adopt AI responsibly.
        </p>
        <div className={styles.bottomCtaActions}>
          <Link href="/generate" className={styles.ctaPrimaryInverted}>
            Start framework builder
          </Link>
          <Link href="/how-it-works" className={styles.ctaSecondaryInverted}>
            How DeploySure Works
          </Link>
        </div>
      </section>
    </div>
  );
}
