import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <div className={styles.wrap}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.hero}>
        <h1 className={styles.heroHeadline}>
          Deploy AI without losing control.
        </h1>
        <p className={styles.heroSubheadline}>
          Introduce AI tools into real workflows with clear rollout structure,
          guardrails, and governance.
        </p>
        <p className={styles.heroDefinition}>
          A structured system for introducing AI tools into professional teams
          with clear rollout governance and operational guardrails.
        </p>
        <div className={styles.heroActions}>
          <Link href="/generate" className={styles.ctaPrimary}>
            Start rollout design
          </Link>
          <Link href="#example-packet" className={styles.ctaSecondary}>
            See example packet
          </Link>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. CREDIBILITY STRIP
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.credibilityStrip}>
        <div className={styles.credibilityItem}>
          <span className={styles.credibilityLabel}>Deterministic decision engine</span>
        </div>
        <div className={styles.credibilityDivider} />
        <div className={styles.credibilityItem}>
          <span className={styles.credibilityLabel}>Structured governance outputs</span>
        </div>
        <div className={styles.credibilityDivider} />
        <div className={styles.credibilityItem}>
          <span className={styles.credibilityLabel}>No AI generated policy text</span>
        </div>
        <div className={styles.credibilityDivider} />
        <div className={styles.credibilityItem}>
          <span className={styles.credibilityLabel}>Designed for professional firms</span>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. SYSTEM DIAGRAM
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
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
            <p className={styles.diagramBlockLabel}>AI Governance Packet</p>
            <p className={styles.diagramBlockSub}>
              Rollout structure, guardrails, and governance documentation
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. ARTIFACT PREVIEW
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>System output</p>
        <h2 className={styles.sectionHeading}>The governance packet</h2>
        <div className={styles.artifactPreview}>
          <div className={styles.artifactDocument}>
            <div className={styles.artifactDocumentHeader}>
              <div className={styles.artifactDocumentTitle}>AI Governance Packet</div>
              <div className={styles.artifactDocumentMeta}>DeploySure — Confidential</div>
            </div>
            <div className={styles.artifactDocumentBody}>
              <div className={styles.artifactSection}>
                <div className={styles.artifactSectionLabel}>Section 1</div>
                <div className={styles.artifactSectionTitle}>AI Rollout Profile</div>
              </div>
              <div className={styles.artifactSectionDivider} />
              <div className={styles.artifactSection}>
                <div className={styles.artifactSectionLabel}>Section 2</div>
                <div className={styles.artifactSectionTitle}>Guardrail Policy</div>
              </div>
              <div className={styles.artifactSectionDivider} />
              <div className={styles.artifactSection}>
                <div className={styles.artifactSectionLabel}>Section 3</div>
                <div className={styles.artifactSectionTitle}>Milestone Plan</div>
              </div>
              <div className={styles.artifactSectionDivider} />
              <div className={styles.artifactSection}>
                <div className={styles.artifactSectionLabel}>Section 4</div>
                <div className={styles.artifactSectionTitle}>Risk Summary</div>
              </div>
              <div className={styles.artifactSectionDivider} />
              <div className={styles.artifactSection}>
                <div className={styles.artifactSectionLabel}>Section 5</div>
                <div className={styles.artifactSectionTitle}>Operational Guidance</div>
              </div>
            </div>
          </div>
          <div className={styles.artifactDescription}>
            <p className={styles.artifactDescriptionText}>
              The system generates a structured AI Governance Packet that defines
              how AI tools should be introduced and governed within the organization.
            </p>
            <p className={styles.artifactDescriptionText}>
              This packet becomes the operational framework for rollout. It is
              built from pre-written, locked content and is not generated by AI.
            </p>
            <p className={styles.artifactDescriptionCredibility}>
              Every packet is produced by the same deterministic process. Inputs
              change the output. The process does not.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. CONTEXT SECTION
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>What the system is</p>
        <h2 className={styles.sectionHeading}>Structured AI rollout for professional teams</h2>
        <div className={styles.prose}>
          <p>
            DeploySure provides a structured system for organizations introducing
            AI tools into real workflows.
          </p>
          <p>
            The system evaluates several inputs about how AI will be used and
            produces a governance structure that defines rollout pacing, guardrails,
            and review practices.
          </p>
          <p>
            The result is a complete AI Governance Packet that provides a clear
            operational framework for AI adoption.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. PROBLEM SECTION
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>The problem</p>
        <h2 className={styles.sectionHeading}>Why AI adoption becomes chaotic</h2>
        <div className={styles.prose}>
          <p>AI adoption often begins informally.</p>
          <p>Someone discovers a tool that saves time.</p>
          <p>A colleague begins using it as well.</p>
          <p>Soon the tool spreads across the team.</p>
          <p>
            By the time leadership notices, the technology may already be embedded
            in critical workflows.
          </p>
          <p>
            Organizations then attempt to add structure after the technology is
            already operational.
          </p>
          <p>
            The system provides a way to introduce structure before AI adoption
            becomes unmanaged operational risk.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. HOW THE SYSTEM WORKS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Process</p>
        <h2 className={styles.sectionHeading}>How rollout planning works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>01</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Provide rollout inputs</h3>
              <p className={styles.stepText}>
                The system asks four structured questions about how AI will be used.
              </p>
              <ul className={styles.stepList}>
                <li>Primary goal</li>
                <li>Adoption level</li>
                <li>Data sensitivity</li>
                <li>Leadership posture</li>
              </ul>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>02</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Decision model evaluation</h3>
              <p className={styles.stepText}>
                Inputs are evaluated using a deterministic decision model that
                determines rollout posture and guardrail strictness.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>03</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Governance packet creation</h3>
              <p className={styles.stepText}>
                The system produces a structured AI Governance Packet tailored
                to the organization&apos;s inputs and risk profile.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>04</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Milestone rollout</h3>
              <p className={styles.stepText}>
                Organizations introduce AI tools using a milestone based rollout
                structure with defined checkpoints and review gates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. GOVERNANCE PACKET CONTENTS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Deliverable</p>
        <h2 className={styles.sectionHeading}>Governance packet contents</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>AI Rollout Profile</h3>
            <p className={styles.cardText}>Defines rollout posture and adoption context.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Guardrail Policy</h3>
            <p className={styles.cardText}>Defines acceptable AI usage within the organization.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Rollout Milestones</h3>
            <p className={styles.cardText}>Defines how AI tools are introduced gradually with checkpoints.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Review Structure</h3>
            <p className={styles.cardText}>Defines monitoring and oversight practices.</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Operational Guidance</h3>
            <p className={styles.cardText}>Recommendations for managing adoption across the organization.</p>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9. WHO THIS IS FOR
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.forSection}>
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
          Most organizations using the system have between 10 and 100 employees.
        </p>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          10. SYSTEM DESIGN PRINCIPLES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Architecture</p>
        <h2 className={styles.sectionHeading}>System design principles</h2>
        <div className={styles.principles}>
          <div className={styles.principle}>
            <div className={styles.principleMarker} />
            <span className={styles.principleText}>Deterministic decision model</span>
          </div>
          <div className={styles.principle}>
            <div className={styles.principleMarker} />
            <span className={styles.principleText}>No training on user data</span>
          </div>
          <div className={styles.principle}>
            <div className={styles.principleMarker} />
            <span className={styles.principleText}>Structured governance outputs</span>
          </div>
          <div className={styles.principle}>
            <div className={styles.principleMarker} />
            <span className={styles.principleText}>Operational rollout focus</span>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          11. EXAMPLE GOVERNANCE PACKET
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.section} id="example-packet">
        <p className={styles.sectionLabel}>Example output</p>
        <h2 className={styles.sectionHeading}>Example governance packet</h2>
        <div className={styles.examplePacket}>
          <div className={styles.examplePacketHeader}>
            <div>
              <div className={styles.examplePacketTitle}>AI Governance Packet</div>
              <div className={styles.examplePacketOrg}>Example Organization &nbsp;&bull;&nbsp; Consulting Firm &nbsp;&bull;&nbsp; 35 employees</div>
            </div>
            <div className={styles.examplePacketBadge}>Structured Rollout</div>
          </div>
          <div className={styles.examplePacketBody}>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Rollout Profile</div>
              <div className={styles.exampleRowValue}>
                Moderate posture. Phased introduction. Internal use tools only.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Guardrail Policy</div>
              <div className={styles.exampleRowValue}>
                No client data in AI prompts. Review required before external delivery.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Milestone Plan</div>
              <div className={styles.exampleRowValue}>
                4 milestones. 60 day initial review gate. Leadership sign-off required at M2.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Risk Summary</div>
              <div className={styles.exampleRowValue}>
                Moderate data sensitivity. Workflow dependency risk flagged.
              </div>
            </div>
            <div className={styles.exampleRow}>
              <div className={styles.exampleRowLabel}>Operational Guidance</div>
              <div className={styles.exampleRowValue}>
                Designate an AI lead. Document tool decisions. Quarterly review cadence.
              </div>
            </div>
          </div>
          <div className={styles.examplePacketFooter}>
            This is a representative example. Actual packet contents are determined by your inputs.
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          12. FINAL CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className={styles.bottomCta}>
        <p className={styles.bottomCtaKicker}>
          Define how AI operates in your firm before it defines itself.
        </p>
        <h2 className={styles.bottomCtaHeadline}>
          Introduce AI with structure.
        </h2>
        <p className={styles.bottomCtaBody}>
          A clear operational framework for organizations that want to adopt AI responsibly.
        </p>
        <div className={styles.bottomCtaActions}>
          <Link href="/generate" className={styles.ctaPrimaryInverted}>
            Start rollout design
          </Link>
          <Link href="#example-packet" className={styles.ctaSecondaryInverted}>
            View example packet
          </Link>
        </div>
      </section>

    </div>
  );
}
